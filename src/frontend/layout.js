/**
 * Shell institucional LabUcs.
 *
 * A identidade visual segue o portal da UCS: Roboto, azul institucional da área
 * de Exatas (#1d4975), cinza institucional (#343a40), bordas de 2 px e cantos retos.
 */

import { esc, iniciais } from './components/ui.js';

function navInstitucional() {
  const links = [
    ['Portal UCS', 'https://www.ucs.br/site/'],
    ['Graduação', 'https://www.ucs.br/site/graduacao/'],
    ['Especializações e MBAs', 'https://www.ucs.br/site/especializacao/'],
    ['Mestrados e Doutorados', 'https://www.ucs.br/site/pos-graduacao/formacao-stricto-sensu/'],
    ['Cursos de Extensão', 'https://sou.ucs.br/extensao/']
  ];
  return links.map(([rotulo, url]) => `<a href="${url}" target="_blank" rel="noopener">${esc(rotulo)}</a>`).join('');
}

function navAplicacao(sessao, caminho) {
  return sessao.funcionalidades
    .filter((f) => f.acessivel && f.codigo !== 'F16')
    .map((f) => {
      const rota = f.rota.replace('#', '');
      const ativo = caminho === rota || (rota !== '/painel' && caminho.startsWith(rota));
      return `<a class="ucs-nav-item ${ativo ? 'ativo' : ''}" href="${esc(f.rota)}">${esc(f.nome)}</a>`;
    }).join('');
}

export function layout(conteudo, caminho, sessao, app) {
  const usuario = sessao.usuario;
  const laboratorio = usuario.laboratorioSigla ?? 'Visão consolidada';
  return `<a class="ucs-skip" href="#conteudo">Ir para o conteúdo</a>
  <div class="ucs-site">
    <header class="ucs-topo">
      <div class="ucs-container ucs-topo-inner">
        <a class="ucs-logo" href="#/painel" aria-label="LabUcs — início">
          <img src="./src/frontend/assets/logo-ucs-branco.png" alt="Universidade de Caxias do Sul" />
        </a>
        <div class="ucs-assinatura">
          <strong>LabUcs</strong>
          <span>Gestão de Equipamentos Laboratoriais</span>
        </div>
        <nav class="ucs-topo-links" aria-label="Links institucionais">${navInstitucional()}</nav>
        <div class="ucs-topo-user">
          <span class="ucs-user-avatar" aria-hidden="true">${esc(iniciais(usuario.nome))}</span>
          <div><strong>${esc(usuario.nome)}</strong><small>${esc(usuario.perfilRotulo)}</small></div>
        </div>
      </div>
    </header>

    <div class="ucs-appnav">
      <div class="ucs-container ucs-appnav-inner">
        <nav class="ucs-nav" aria-label="Módulos do sistema">${navAplicacao(sessao, caminho)}</nav>
        <div class="ucs-nav-contexto">
          <span class="ucs-nav-lab">${esc(laboratorio)}</span>
          <span class="ucs-nav-sessao">Sessão <b id="sessao-tempo">--:--</b></span>
        </div>
      </div>
    </div>

    <main id="conteudo" class="ucs-main" tabindex="-1">
      <div class="ucs-container">${conteudo}</div>
    </main>

    <footer class="ucs-footer">
      <div class="ucs-container ucs-footer-grid">
        <div>
          <h3>Campus-Sede</h3>
          <p>Rua Francisco Getúlio Vargas, 1130<br />CEP 95070-560 — Caxias do Sul</p>
          <a href="https://www.ucs.br/site/institucional/enderecos-das-unidades-universitarias/" target="_blank" rel="noopener">Todos os campi — como chegar</a>
        </div>
        <div>
          <h3>Central de Atendimento</h3>
          <p><a href="https://www.ucs.br/site/central-de-atendimento/" target="_blank" rel="noopener">Faça contato</a></p>
          <p><a href="tel:+555432182145">(54) 3218-2145</a><br /><a href="mailto:atendimento@ucs.br">atendimento@ucs.br</a></p>
        </div>
        <div class="ucs-footer-logos">
          <img src="./src/frontend/assets/logo-fucs-rodape.png" alt="Fundação Universidade de Caxias do Sul" />
          <img src="./src/frontend/assets/logo-ucs-rodape.png" alt="Universidade de Caxias do Sul" />
        </div>
      </div>
      <div class="ucs-container ucs-footer-base">
        <p>© 2001–2026 Universidade de Caxias do Sul. Todos os direitos reservados.</p>
        <p>LabUcs v${esc(app.versao)} — POC acadêmica de demonstração, sem uso institucional.</p>
        <button type="button" class="ucs-footer-sair" id="btn-sair">Sair do sistema</button>
      </div>
    </footer>
  </div>`;
}

export function mensagemSemPermissao(modulo) {
  return `<div class="ucs-aviso ucs-aviso-alerta">
    <strong>Acesso restrito.</strong> Seu perfil não possui permissão para <strong>${esc(modulo)}</strong>.
    A funcionalidade permanece oculta e a API a bloqueia.
    <a href="#/painel">Voltar ao painel</a>
  </div>`;
}

export function telaCarregando(mensagem) {
  return `<div class="ucs-boot">
    <img src="./src/frontend/assets/logo-ucs-branco.png" alt="Universidade de Caxias do Sul" />
    <strong>LabUcs</strong>
    <p>${esc(mensagem)}</p>
    <div class="ucs-boot-barra"><span></span></div>
    <small>Universidade de Caxias do Sul • POC estática</small>
  </div>`;
}
