/**
 * Entrada da camada visual LabUcs.
 *
 * A interface conversa apenas com a fachada do backend (`criarAplicacao`) e não
 * recalcula regras metrológicas, permissões, prazos ou relatórios.
 */

import { criarAplicacao } from '../backend/index.js';
import { esc, toast, tratarErro } from './components/ui.js';
import { layout, mensagemSemPermissao, telaCarregando } from './layout.js';
import { ROTAS, parseHash, rotaEquipamento, tituloDaRota } from './router.js';
import { paginaLogin } from './pages/session.js';
import { paginaEquipamentoDetalhe } from './pages/equipment.js';
import { registrarPaletaComandos } from './components/palette.js';
import { iniciarMovimento } from './components/motion.js'; // UI enhancements

const raiz = document.getElementById('app');
let app = null;
let ultimaRenovacao = 0;
let paleta = null;

async function render() {
  if (!app) return;
  const { caminho, query } = parseHash();

  if (!app.temSessao()) {
    if (caminho !== '/login') {
      window.location.hash = '#/login';
      return;
    }
    const login = paginaLogin(app);
    raiz.innerHTML = login.html;
    login.montar?.();
    document.title = 'Entrar — LabUcs';
    return;
  }

  if (caminho === '/login') {
    window.location.hash = '#/painel';
    return;
  }

  let sessao;
  try {
    sessao = app.auth.sessao();
  } catch (erro) {
    if (erro?.codigo === 'SESSAO_EXPIRADA' || erro?.codigo === 'NAO_AUTENTICADO') {
      expirarSessao();
      return;
    }
    throw erro;
  }

  let pagina;
  try {
    const idEquipamento = rotaEquipamento(caminho);
    if (idEquipamento) {
      const acessaEquipamentos = sessao.funcionalidades.find((f) => f.codigo === 'F02')?.acessivel;
      pagina = acessaEquipamentos
        ? paginaEquipamentoDetalhe(app, idEquipamento)
        : { html: mensagemSemPermissao('Equipamentos'), montar() {} };
    } else {
      const rota = ROTAS[caminho];
      if (!rota) {
        pagina = {
          html: `<div class="ucs-estado-vazio"><h3>Página não encontrada</h3><p>O endereço <span class="mono">${esc(caminho)}</span> não existe.</p><a class="btn btn-primario" href="#/painel">Ir para o painel</a></div>`,
          montar() {}
        };
      } else if (rota.feature && !sessao.funcionalidades.find((f) => f.codigo === rota.feature)?.acessivel) {
        pagina = { html: mensagemSemPermissao(rota.titulo), montar() {} };
      } else {
        pagina = await rota.view(app, query);
      }
    }
  } catch (erro) {
    console.error(erro);
    if (erro?.codigo === 'NAO_AUTENTICADO' || erro?.codigo === 'SESSAO_EXPIRADA') {
      expirarSessao();
      return;
    }
    pagina = {
      html: `<div class="ucs-estado-vazio"><h3>Não foi possível abrir a página</h3><p>${esc(erro?.message ?? 'Erro inesperado.')}</p><a class="btn btn-primario" href="#/painel">Voltar ao painel</a></div>`,
      montar() {}
    };
    tratarErro(erro);
  }

  raiz.innerHTML = layout(pagina.html, caminho, sessao, app);
  document.title = `${tituloDaRota(caminho)} — LabUcs`;
  pagina.montar?.();
  paleta ??= registrarPaletaComandos(() => {
    try { return app?.auth.sessao(); } catch { return null; }
  });
  iniciarMovimento();
  atualizarTempoSessao();
  document.getElementById('btn-sair')?.addEventListener('click', sair);
}

function atualizarTempoSessao() {
  const el = document.getElementById('sessao-tempo');
  if (!el || !app?.temSessao()) return;
  const segundos = app.segundosSessao();
  el.textContent = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  el.classList.toggle('tempo-baixo', segundos < 300);
}

async function sair() {
  try {
    await app.auth.logout('Logout solicitado pelo usuário');
  } catch { /* sessão já encerrada */ }
  window.location.hash = '#/login';
  render();
}

function expirarSessao() {
  if (!app?.temSessao()) return;
  toast('Sessão encerrada por inatividade. Faça login novamente.', 'alerta', 6000);
  app.sessoes.sair().finally(() => {
    window.location.hash = '#/login';
    render();
  });
}

function renovarPorAtividade() {
  if (!app?.temSessao()) return;
  const agora = Date.now();
  if (agora - ultimaRenovacao < 60000) return;
  ultimaRenovacao = agora;
  app.sessoes.renovar().catch(() => {});
}

async function iniciar() {
  raiz.innerHTML = telaCarregando('Carregando a base de equipamentos da UCS…');
  let baseReal = null;
  let baseIndisponivel = false;
  try {
    const resposta = await fetch('./data/base-real.json', { cache: 'no-store' });
    if (resposta.ok) baseReal = await resposta.json();
    else baseIndisponivel = true;
  } catch {
    baseIndisponivel = true;
  }

  try {
    raiz.innerHTML = telaCarregando('Preparando o banco local e as credenciais…');
    app = await criarAplicacao({ baseReal, iteracoesSenha: 120000 });
    app.definirTratadorErroPersistencia((erro) => toast(`Falha ao gravar dados locais: ${erro?.message ?? erro}`, 'erro', 9000));
    if (baseIndisponivel) toast('A base real não pôde ser carregada; usando a base sintética de demonstração.', 'alerta', 9000);

    window.__labucsAtualizar = () => render().catch((erro) => { console.error(erro); tratarErro(erro); });
    window.addEventListener('hashchange', () => render().catch((erro) => { console.error(erro); tratarErro(erro); }));

    document.addEventListener('click', renovarPorAtividade, { passive: true });
    document.addEventListener('keydown', renovarPorAtividade);
    document.addEventListener('mousemove', renovarPorAtividade, { passive: true });
    document.addEventListener('touchstart', renovarPorAtividade, { passive: true });

    window.addEventListener('labucs:sessao-expirada', expirarSessao);
    window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') app.flush().catch(() => {}); });
    window.addEventListener('pagehide', () => { app.flush().catch(() => {}); });

    setInterval(() => {
      if (!app?.temSessao()) return;
      atualizarTempoSessao();
      if (app.segundosSessao() <= 0) expirarSessao();
    }, 15000);

    setInterval(() => {
      app?.garantirBackupDiario?.().catch((erro) => console.warn('Backup diário:', erro));
    }, 3600000);

    await app.flush();
    await render();
  } catch (erro) {
    console.error(erro);
    raiz.innerHTML = `<div class="ucs-estado-vazio"><h3>Falha ao iniciar o LabUcs</h3>
      <p>${esc(erro?.message ?? 'Erro inesperado.')}</p>
      <p class="subtexto">Abra via HTTPS ou localhost. Se o problema persistir, limpe os dados do site e recarregue.</p>
      <button class="btn btn-primario" onclick="location.reload()">Recarregar</button></div>`;
  }
}

iniciar();
