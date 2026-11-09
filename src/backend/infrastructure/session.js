/**
 * Autenticação local do POC.
 *
 * ATENÇÃO: em um site estático não existe servidor de autenticação. As credenciais
 * ficam no armazenamento do navegador e a sessão é do tipo "demonstração". O hash
 * PBKDF2-SHA256 protege a senha em repouso, mas isto NÃO substitui autenticação
 * server-side em produção. O POC não é destinado ao mundo real.
 */

import { ErroApp, CODIGOS_ERRO } from '../../shared/errors.js';
import { agoraISO, clonar } from '../../shared/utils.js';

const ITERACOES_PADRAO = 120000;
const TAMANHO_SAL = 16;
const TAMANHO_HASH = 32;

/* ------------------------------------------------------------------ */
/* Base64 universal                                                    */
/* ------------------------------------------------------------------ */

export function bytesParaBase64(bytes) {
  const arr = new Uint8Array(bytes);
  if (typeof globalThis.btoa === 'function') {
    let bin = '';
    for (const b of arr) bin += String.fromCharCode(b);
    return globalThis.btoa(bin);
  }
  return Buffer.from(arr).toString('base64');
}

export function base64ParaBytes(texto) {
  if (typeof globalThis.atob === 'function') {
    const bin = globalThis.atob(texto);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  return new Uint8Array(Buffer.from(texto, 'base64'));
}

function aleatorio(tamanho) {
  const bytes = new Uint8Array(tamanho);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < tamanho; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function exigirCripto() {
  if (!globalThis.crypto?.subtle) {
    throw new ErroApp(
      CODIGOS_ERRO.INTERNO,
      'Este navegador não disponibiliza Web Crypto. Abra o POC via HTTPS (GitHub Pages) ou localhost.'
    );
  }
}

/** Deriva o hash PBKDF2-SHA256 da senha. */
export async function derivarSenha(senha, sal, iteracoes = ITERACOES_PADRAO) {
  exigirCripto();
  const chave = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(senha)),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(sal), iterations: Number(iteracoes), hash: 'SHA-256' },
    chave,
    TAMANHO_HASH * 8
  );
  return bytesParaBase64(bits);
}

/** Cria credenciais para um novo usuário. */
export async function criarCredenciais(senha, iteracoes = ITERACOES_PADRAO) {
  const sal = aleatorio(TAMANHO_SAL);
  const hash = await derivarSenha(senha, sal, iteracoes);
  return { senhaHash: hash, senhaSal: bytesParaBase64(sal), senhaIteracoes: Number(iteracoes) };
}

/** Verifica a senha em tempo aproximadamente constante. */
export async function verificarSenha(senha, usuario) {
  if (!usuario?.senhaHash || !usuario?.senhaSal) return false;
  const sal = base64ParaBytes(usuario.senhaSal);
  const calculado = await derivarSenha(senha, sal, usuario.senhaIteracoes ?? ITERACOES_PADRAO);
  const a = calculado;
  const b = usuario.senhaHash;
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i += 1) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

/* ------------------------------------------------------------------ */
/* Persistência da sessão                                              */
/* ------------------------------------------------------------------ */

export class PersistenciaSessaoMemoria {
  constructor() { this.registro = null; }
  async obter() { return this.registro ? clonar(this.registro) : null; }
  async definir(registro) { this.registro = clonar(registro); }
  async remover() { this.registro = null; }
}

class PersistenciaSessaoNavegador {
  constructor(chave = 'labucs.sessao.v1') { this.chave = chave; }
  async obter() {
    try {
      const bruto = globalThis.sessionStorage?.getItem(this.chave);
      return bruto ? JSON.parse(bruto) : null;
    } catch { return null; }
  }
  async definir(registro) {
    try { globalThis.sessionStorage?.setItem(this.chave, JSON.stringify(registro)); } catch { /* ignora */ }
  }
  async remover() {
    try { globalThis.sessionStorage?.removeItem(this.chave); } catch { /* ignora */ }
  }
}

export function criarPersistenciaSessao() {
  try {
    if (globalThis.sessionStorage) return new PersistenciaSessaoNavegador();
  } catch { /* modo privado */ }
  return new PersistenciaSessaoMemoria();
}

/* ------------------------------------------------------------------ */
/* Sessões                                                            */
/* ------------------------------------------------------------------ */

export class GerenciadorSessoes {
  /**
   * @param {object} opcoes
   * @param {() => Date} opcoes.clock
   * @param {() => number} opcoes.timeoutMinutos
   * @param {() => {usuarios: any[]}} opcoes.obterEstado
   * @param {object} [opcoes.persistencia]
   * @param {() => string} [opcoes.ip]
   */
  constructor({ clock, timeoutMinutos, obterEstado, persistencia, ip }) {
    this.clock = clock;
    this.timeoutMinutos = timeoutMinutos;
    this.obterEstado = obterEstado;
    this.persistencia = persistencia ?? criarPersistenciaSessao();
    this.ip = ip ?? (() => 'local (POC estático)');
    this._registro = null;
    this._tentativas = new Map();
  }

  async iniciar() {
    const registro = await this.persistencia.obter();
    if (!registro?.token) return null;
    const sessao = this._validarRegistro(registro, { silencioso: true });
    this._registro = sessao ?? null;
    if (!sessao) await this.persistencia.remover();
    return this._registro;
  }

  get token() { return this._registro?.token ?? null; }

  get ativa() { return Boolean(this._registro); }

  usuarioAtual() {
    if (!this._registro) return null;
    return this.obterEstado().usuarios.find((u) => u.id === this._registro.usuarioId && u.ativo) ?? null;
  }

  _validarRegistro(registro, { silencioso = false } = {}) {
    const usuario = this.obterEstado().usuarios.find((u) => u.id === registro.usuarioId);
    if (!usuario || !usuario.ativo || usuario.anonimizado) {
      if (!silencioso) throw new ErroApp(CODIGOS_ERRO.SESSAO_EXPIRADA, 'Sessão inválida. Faça login novamente.');
      return null;
    }
    const agora = this.clock().getTime();
    const ultimo = new Date(registro.ultimoAcesso ?? registro.criadoEm).getTime();
    if (!Number.isFinite(ultimo) || agora - ultimo > this.timeoutMinutos() * 60000) {
      if (!silencioso) throw ErroApp.sessaoExpirada();
      return null;
    }
    return { ...registro, usuarioId: usuario.id };
  }

  async entrar(email, senha, { ip } = {}) {
    const chave = String(email ?? '').trim().toLowerCase();
    const bloqueio = this._tentativas.get(chave);
    const agora = this.clock().getTime();
    if (bloqueio && bloqueio.ate > agora) {
      const segundos = Math.ceil((bloqueio.ate - agora) / 1000);
      throw new ErroApp(CODIGOS_ERRO.LIMITE, `Muitas tentativas. Aguarde ${segundos} segundo(s) e tente novamente.`);
    }

    const usuario = this.obterEstado().usuarios.find(
      (u) => u.email === chave && u.ativo && !u.anonimizado
    );

    const senhaOk = usuario ? await verificarSenha(senha, usuario) : false;
    if (!usuario || !senhaOk) {
      const atual = this._tentativas.get(chave) ?? { tentativas: 0, ate: 0 };
      atual.tentativas += 1;
      if (atual.tentativas >= 5) {
        atual.ate = agora + 120000;
        atual.tentativas = 0;
      }
      this._tentativas.set(chave, atual);
      return { ok: false, usuario: null, motivo: 'Credenciais inválidas.', codigo: 'CREDENCIAIS_INVALIDAS' };
    }

    this._tentativas.delete(chave);
    const token = bytesParaBase64(aleatorio(32)).replace(/[+/=]/g, '');
    const registro = {
      token,
      usuarioId: usuario.id,
      criadoEm: new Date(agora).toISOString(),
      ultimoAcesso: new Date(agora).toISOString(),
      ip: ip ?? this.ip()
    };
    this._registro = registro;
    await this.persistencia.definir(registro);
    return { ok: true, usuario, token };
  }

  async sair() {
    const token = this._registro?.token ?? null;
    this._registro = null;
    await this.persistencia.remover();
    return token;
  }

  /**
   * Valida a sessão a cada operação e renova o marco de inatividade.
   * Síncrono: a sessão já foi carregada por iniciar(); a persistência é best-effort.
   * @returns {{token: string, usuario: object, ip: string}}
   */
  exigirSessao() {
    if (!this._registro) throw ErroApp.naoAutenticado();
    const sessao = this._validarRegistro(this._registro);
    const usuario = this.obterEstado().usuarios.find((u) => u.id === sessao.usuarioId);
    if (!usuario || !usuario.ativo) throw ErroApp.naoAutenticado('Usuário inativo. Faça login novamente.');
    const agora = this.clock();
    const ultimo = new Date(sessao.ultimoAcesso).getTime();
    // Atualiza o marco no máximo a cada 20 s para reduzir escritas no sessionStorage.
    if (agora.getTime() - ultimo > 20000) {
      this._registro = { ...sessao, ultimoAcesso: agoraISO(this.clock), ip: sessao.ip };
      void this.persistencia.definir(this._registro);
    }
    return { token: this._registro.token, usuario, ip: this._registro.ip };
  }

  segundosRestantes() {
    if (!this._registro) return 0;
    const ultimo = new Date(this._registro.ultimoAcesso).getTime();
    const restante = this.timeoutMinutos() * 60000 - (this.clock().getTime() - ultimo);
    return Math.max(0, Math.floor(restante / 1000));
  }

  async renovar() {
    if (!this._registro) return false;
    const sessao = this._validarRegistro(this._registro);
    this._registro = { ...sessao, ultimoAcesso: agoraISO(this.clock) };
    await this.persistencia.definir(this._registro);
    return true;
  }
}

export { ITERACOES_PADRAO };
