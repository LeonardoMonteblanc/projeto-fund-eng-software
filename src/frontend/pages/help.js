import { esc } from '../components/ui.js';

export function paginaAjuda(app) {
  const s = app.auth.sessao();
  return {
    html: `<div class="pagina-cabecalho"><div><p class="eyebrow">DOCUMENTAÇÃO</p><h1>Ajuda e arquitetura</h1>
      <p class="subtitulo">Interface LabUcs com a identidade institucional da UCS. O núcleo de negócio é independente e reutilizável.</p></div></div>
      <div class="duas-colunas">
        <section class="secao"><h2>Como este POC funciona</h2>
          <ul class="lista-limites">
            <li><strong>100% estático:</strong> compatível com GitHub Pages, sem backend, banco remoto ou variáveis de ambiente.</li>
            <li><strong>Domínio em <span class="mono">src/backend/</span>:</strong> cálculos metrológicos, prazos, RBAC, auditoria, relatórios e exportações.</li>
            <li><strong>Persistência:</strong> IndexedDB no navegador; backup diário e exportação/importação JSON.</li>
            <li><strong>Base real:</strong> 1.911 equipamentos de 10 laboratórios, importados de EQUIP.xlsx/FG 020/FG 006. Campos ausentes permanecem nulos e são sinalizados.</li>
            <li><strong>Não é produção:</strong> autenticação local de demonstração, sem IP real nem SLA.</li>
          </ul>
          <h3>Documentos</h3>
          <ul class="lista-limites">
            <li><a class="link" href="./docs/01-VISAO-E-ESCOPO.md">Visão, escopo e rastreabilidade</a></li>
            <li><a class="link" href="./docs/02-MODELO-DE-DADOS.md">Modelo de dados e decisões</a></li>
            <li><a class="link" href="./docs/03-REGRAS-DE-NEGOCIO.md">Regras de negócio e memória de cálculo</a></li>
            <li><a class="link" href="./docs/04-API-DE-SERVICOS.md">Contrato de serviços para a camada visual</a></li>
            <li><a class="link" href="./docs/05-VALIDACAO-E-TESTES.md">Plano de validação</a></li>
            <li><a class="link" href="./docs/06-DEPLOY-GITHUB-PAGES.md">Deploy no GitHub Pages</a></li>
            <li><a class="link" href="./data/RELATORIO-IMPORTACAO.md">Relatório de importação da base real</a></li>
          </ul>
        </section>
        <section class="secao"><h2>Sessão e suporte</h2>
          <dl class="dados">
            <dt>Usuário</dt><dd>${esc(s.usuario.nome)} (${esc(s.usuario.perfilRotulo)})</dd>
            <dt>Laboratório</dt><dd>${esc(s.usuario.laboratorioSigla ?? 'Global')}</dd>
            <dt>E-mail</dt><dd>${esc(s.usuario.email)}</dd>
            <dt>Permissões</dt><dd>${s.permissoes.length} permissão(ões)</dd>
            <dt>Timeout de inatividade</dt><dd>${s.timeoutMinutos} minutos</dd>
            <dt>Versão</dt><dd>${esc(app.versao)}</dd>
          </dl>
          <h3>Contas de demonstração</h3>
          <p class="subtexto">Senha <span class="mono">Senha@123</span> para todas.</p>
          <ul class="lista-limites">
            <li><span class="mono">admin@labucs.local</span> — Administrador</li>
            <li><span class="mono">gestor.geral@labucs.local</span> — Gestor Geral</li>
            <li><span class="mono">gestor.lasfi@labucs.local</span> — Gestor de Laboratório</li>
            <li><span class="mono">tecnico.lasfi@labucs.local</span> — Técnico</li>
          </ul>
        </section>
      </div>`,
    montar() {}
  };
}
