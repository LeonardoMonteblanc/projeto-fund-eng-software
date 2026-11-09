#!/usr/bin/env node
/**
 * Inspeção headless via Chrome DevTools Protocol (sem dependências).
 * Uso: node scripts/inspecionar.js [url] [--login=email] [--senha=...]
 * Gera .tmp_console.png e imprime erros de console/exceções.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const URL_ALVO = process.argv[2] ?? 'http://127.0.0.1:4173/';
const LOGIN = process.argv.find((a) => a.startsWith('--login='))?.slice('--login='.length) ?? null;
const SENHA = process.argv.find((a) => a.startsWith('--senha='))?.slice('--senha='.length) ?? 'Senha@123';
const IR_PARA = process.argv.find((a) => a.startsWith('--goto='))?.slice('--goto='.length) ?? null;
const EXPRESSAO = process.argv.find((a) => a.startsWith('--eval='))?.slice('--eval='.length) ?? null;
const PORTA = 9333;

const perfis = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
];
const executavel = perfis.find((p) => fs.existsSync(p));
if (!executavel) throw new Error('Chrome/Edge não encontrado.');

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'labucs-cdp-'));
const chrome = spawn(executavel, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--disable-extensions', '--disable-background-networking',
  '--remote-debugging-port=' + PORTA, '--remote-allow-origins=*',
  '--user-data-dir=' + perfil, 'about:blank'
], { stdio: 'ignore' });

function esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function obterJson(caminho, opcoes) {
  const resposta = await fetch(`http://127.0.0.1:${PORTA}${caminho}`, opcoes);
  return resposta.json();
}

async function conectar() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const alvo = await obterJson(`/json/new?${encodeURIComponent(URL_ALVO)}`, { method: 'PUT' });
      if (alvo?.webSocketDebuggerUrl) return alvo.webSocketDebuggerUrl;
    } catch { /* ainda subindo */ }
    await esperar(250);
  }
  throw new Error('Chrome não abriu a porta de depuração.');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pendentes = new Map();
    this.eventos = [];
    ws.addEventListener('message', (evento) => {
      const msg = JSON.parse(evento.data);
      if (msg.id && this.pendentes.has(msg.id)) {
        const { resolve, reject } = this.pendentes.get(msg.id);
        this.pendentes.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.eventos.push(msg);
      }
    });
  }

  enviar(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pendentes.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function principal() {
  const wsUrl = await conectar();
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const cdp = new Cdp(ws);
  await cdp.enviar('Page.enable');
  await cdp.enviar('Runtime.enable');
  await cdp.enviar('Log.enable');
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await cdp.enviar('Page.navigate', { url: URL_ALVO }).catch(() => {});
  await esperar(9000);

  const ler = async (expressao) => {
    const r = await cdp.enviar('Runtime.evaluate', { expression: expressao, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { erro: r.exceptionDetails.text, detalhe: r.exceptionDetails.exception?.description };
    return r.result.value;
  };

  console.log('URL/READY:', await ler('JSON.stringify({url: document.URL, ready: document.readyState, titulo: document.title})'));
  console.log('TEXTO INICIAL:\n', (await ler('document.body.innerText')).slice(0, 1200));
  console.log('ESTADO APP:', await ler('JSON.stringify({temApp: Boolean(window.__labucsAtualizar), html: document.getElementById("app")?.innerHTML.slice(0,120)})'));

  if (LOGIN) {
    await ler(`(() => {
      const form = document.getElementById('form-login');
      if (!form) return 'sem formulário';
      form.elements.email.value = ${JSON.stringify(LOGIN)};
      form.elements.senha.value = ${JSON.stringify(SENHA)};
      form.requestSubmit();
      return 'enviado';
    })()`);
    await esperar(7000);
    console.log('\nAPÓS LOGIN:\n', (await ler('document.body.innerText')).slice(0, 1800));
  }

  if (IR_PARA) {
    await ler(`location.hash = ${JSON.stringify(IR_PARA)}`);
    await esperar(3500);
    console.log(`\nTELA ${IR_PARA}:\n`, (await ler('document.body.innerText')).slice(0, 2600));
  }

  if (EXPRESSAO) {
    console.log('\nEVAL:', await ler(EXPRESSAO));
    await esperar(4000);
    console.log('\nTEXTO APÓS EVAL:\n', (await ler('document.body.innerText')).slice(0, 2600));
    console.log('TOASTS:', await ler('JSON.stringify([...document.querySelectorAll(".aviso")].map(a=>a.innerText))'));
  }

  const erros = cdp.eventos.filter((e) => e.method === 'Runtime.exceptionThrown' || e.method === 'Log.entryAdded' || e.method === 'Runtime.consoleAPICalled');
  console.log('\nEVENTOS DE ERRO/CONSOLE:', JSON.stringify(erros.slice(-40), null, 1).slice(0, 6000));

  const screenshot = await cdp.enviar('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.resolve('.tmp_console.png'), Buffer.from(screenshot.data, 'base64'));
  console.log('\nScreenshot: .tmp_console.png');
  ws.close();
}

principal()
  .catch((erro) => { console.error(erro); process.exitCode = 1; })
  .finally(async () => {
    await esperar(300);
    chrome.kill();
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { /* ignora */ }
  });
