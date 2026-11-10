/**
 * Paleta de comandos (Ctrl+K / Cmd+K).
 *
 * Atalho de navegação para as dezoito rotas do console. O índice é montado
 * a partir das funcionalidades visíveis da sessão, de modo que a paleta
 * jamais oferece um módulo que o perfil não pode acessar.
 */

import { esc } from './ui.js';
import { icone } from './icons.js';
import { ROTAS } from '../router.js';

const ICONE_ROTA = {
  '/painel': 'painel',
  '/equipamentos': 'caixa',
  '/itens': 'pasta',
  '/eventos': 'ficha',
  '/solicitacoes': 'usuario',
  '/fornecedores': 'caixa',
  '/laboratorios': 'pasta',
  '/usuarios': 'usuario',
  '/relatorios': 'grafico',
  '/inventario': 'ficha',
  '/custos': 'grafico',
  '/auditoria': 'escudo',
  '/config': 'ajustes',
  '/backup': 'baixar',
  '/agenda': 'calendario',
  '/privacidade': 'escudo',
  '/ajuda': 'livro'
};

let dialogo = null;

function garantirDialogo() {
  if (dialogo) return dialogo;
  dialogo = document.createElement('dialog');
  dialogo.className = 'paleta';
  dialogo.innerHTML = `
    <div class="paleta-caixa">
      <input type="text" class="paleta-busca" id="paleta-busca" placeholder="Buscar módulo ou ação…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="paleta-lista" aria-autocomplete="list" />
      <ul class="paleta-lista" id="paleta-lista" role="listbox" aria-label="Comandos disponíveis"></ul>
      <div class="paleta-rodape">
        <span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span>
        <span><kbd>Enter</kbd> abrir</span>
        <span><kbd>Esc</kbd> fechar</span>
      </div>
    </div>`;
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
  document.body.appendChild(dialogo);
  return dialogo;
}

function normalizar(texto) {
  return String(texto ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function indiceComandos(sessao) {
  const acessiveis = new Set(
    (sessao?.funcionalidades ?? []).filter((f) => f.acessivel).map((f) => f.rota.replace('#', ''))
  );
  return Object.entries(ROTAS)
    .filter(([rota, definicao]) => !definicao.feature || acessiveis.has(rota))
    .map(([rota, definicao]) => ({
      rota,
      titulo: definicao.titulo,
      descricao: `Ir para ${definicao.titulo}`,
      icone: ICONE_ROTA[rota] ?? 'painel'
    }));
}
function filtrar(comandos, termo) {
  const alvo = normalizar(termo);
  if (!alvo) return comandos;
  return comandos.filter((c) => normalizar(`${c.titulo} ${c.rota}`).includes(alvo));
}

export function montarPaletaComandos(obterSessao) {
  const d = garantirDialogo();
  const entrada = d.querySelector('#paleta-busca');
  const lista = d.querySelector('#paleta-lista');
  let comandos = indiceComandos(obterSessao());
  let visiveis = comandos;
  let indice = 0;

  function desenhar() {
    if (!visiveis.length) {
      lista.innerHTML = '<li class="paleta-vazio">Nenhum comando encontrado.</li>';
      return;
    }
    lista.innerHTML = visiveis.map((c, i) => `
      <li class="paleta-item" role="option" id="paleta-opcao-${i}" aria-selected="${i === indice}" data-rota="${esc(c.rota)}">
        ${icone(c.icone, { classe: 'ucs-icone--sm' })}
        <strong>${esc(c.titulo)}</strong>
        <small>${esc(c.rota)}</small>
      </li>`).join('');
    lista.querySelectorAll('[data-rota]').forEach((item) => {
      item.addEventListener('click', () => abrir(item.dataset.rota));
      item.addEventListener('mousemove', () => {
        indice = visiveis.findIndex((c) => c.rota === item.dataset.rota);
        atualizarSelecao();
      });
    });
  }

  function atualizarSelecao() {
    lista.querySelectorAll('[role="option"]').forEach((opcao, i) => {
      opcao.setAttribute('aria-selected', String(i === indice));
    });
    const ativa = lista.querySelector(`#paleta-opcao-${indice}`);
    ativa?.scrollIntoView({ block: 'nearest' });
  }

  function abrir(rota) {
    d.close();
    window.location.hash = `#${rota}`;
  }

  entrada.addEventListener('input', () => {
    visiveis = filtrar(comandos, entrada.value);
    indice = 0;
    desenhar();
    atualizarSelecao();
  });

  entrada.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      indice = Math.min(indice + 1, visiveis.length - 1);
      atualizarSelecao();
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      indice = Math.max(indice - 1, 0);
      atualizarSelecao();
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const alvo = visiveis[indice];
      if (alvo) abrir(alvo.rota);
    }
  });

  return {
    dialogo: d,
    abrir() {
      comandos = indiceComandos(obterSessao());
      visiveis = comandos;
      indice = 0;
      entrada.value = '';
      desenhar();
      if (!d.open) d.showModal();
      entrada.focus();
      atualizarSelecao();
    }
  };
}

/** Registra o atalho global e o botão do topo institucional. */
export function registrarPaletaComandos(obterSessao) {
  const paleta = montarPaletaComandos(obterSessao);

  document.addEventListener('keydown', (evento) => {
    const combo = evento.ctrlKey || evento.metaKey;
    if (combo && evento.key.toLowerCase() === 'k') {
      evento.preventDefault();
      if (paleta.dialogo?.open) paleta.dialogo.close();
      else paleta.abrir();
    }
  });

  document.addEventListener('click', (evento) => {
    if (evento.target.closest?.('#abrir-paleta')) paleta.abrir();
  });

  return paleta;
}
