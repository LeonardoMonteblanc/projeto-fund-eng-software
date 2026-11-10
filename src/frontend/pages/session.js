import {
  ESTADOS_RETORNO, PERFIS, SITUACOES_EQUIPAMENTO, SITUACOES_EVENTO,
  TIPOS_EVENTO, TIPO_EVENTO_ROTULO
} from '../../shared/constants.js';
import {
  abrirModal, badge, badgeSinal, badgeSituacao, badgeStatusPrazo, baixarArquivo, campo, esc,
  fecharModal, fmtData, fmtDataHora, fmtMoeda, fmtNumero, formatarCelula, hoje, iniciais,
  lerCampos, marcarErros, paginacao, tabela, toast, tratarErro, confirmar
} from '../components/ui.js';
import {
  cartaoIndicador, filtrosBarra, formularioModal, linkEquipamento, opcoesCategoria,
  opcoesEquipamentos, opcoesFornecedor, opcoesItem, opcoesLab, opcoesPerfil, opcoesSinal,
  opcoesSituacaoEquipamento, opcoesSituacaoEvento, opcoesSituacaoSolicitacao,
  opcoesSubcategoria, opcoesTipoEvento, pedirMotivo, rotuloPerfil, secao, valorReais
} from '../components/common.js';
import { estadoTelas } from '../state.js';
import { temPermissao, recarregar } from '../session-context.js';
import { icone } from '../components/icons.js';
import { caixaGrafico, graficoEquipamentosPorLaboratorio } from '../components/charts.js';

export function paginaLogin(app) {
  const credito = app.creditarBase();
  const demo = [
    ['admin@labucs.local', 'Administrador', 'Administrador'],
    ['gestor.geral@labucs.local', 'Gestor Geral', 'Gestor Geral'],
    ['gestor.lasfi@labucs.local', 'Gestor LASFI', 'Gestor de Laboratório'],
    ['tecnico.lasfi@labucs.local', 'Técnico LASFI', 'Técnico']
  ];
  const html = `<div class="login-tela">
    <div class="login-painel">
      <div class="login-marca">
        <img class="login-logo" src="./src/frontend/assets/logo-ucs-branco.png" alt="Universidade de Caxias do Sul" />
        <span class="marca-sigla">LabUcs • Sistema de Gestão de Equipamentos</span>
        <h1>Gestão de equipamentos laboratoriais</h1>
        <p>POC local-first de calibrações, verificações, manutenções, custos e auditoria — alinhada à ISO/IEC 17025 e à LGPD.</p>
        <ul class="login-lista">
          <li>${credito.equipamentos} equipamentos reais importados</li>
          <li>10 laboratórios e 4 perfis de acesso</li>
          <li>Dados no navegador, sem servidor</li>
        </ul>
        <p class="login-nota">Demonstração acadêmica. Não use em produção: não há autenticação server-side.</p>
      </div>
      <div class="login-card">
        <h2>Entrar</h2>
        <form id="form-login" novalidate>
          <label for="login-email">E-mail</label>
          <input id="login-email" name="email" type="email" class="controle" autocomplete="username" required placeholder="seu.email@labucs.local" />
          <label for="login-senha">Senha</label>
          <input id="login-senha" name="senha" type="password" class="controle" autocomplete="current-password" required placeholder="Senha@123" />
          <p class="erro-geral" data-erro-geral></p>
          <button type="submit" class="btn btn-primario btn-bloco" id="btn-entrar">Entrar</button>
        </form>
        <div class="demo-contas">
          <p>Contas de demonstração <span class="mono">(Senha@123)</span></p>
          <div class="demo-botoes">
            ${demo.map(([email, nome, perfil]) => `<button type="button" class="demo-conta" data-email="${esc(email)}"><strong>${esc(nome)}</strong><span>${esc(perfil)}</span></button>`).join('')}
          </div>
        </div>
        <p class="login-rodape">Base: ${esc(credito.origem?.fonte ?? 'sintética')}</p>
      </div>
    </div>
  </div>`;

  return {
    html,
    publica: true,
    montar() {
      const form = document.getElementById('form-login');
      form.querySelectorAll('.demo-conta').forEach((b) => b.addEventListener('click', () => {
        form.elements.email.value = b.dataset.email;
        form.elements.senha.value = 'Senha@123';
        form.elements.senha.focus();
      }));
      form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const erro = form.querySelector('[data-erro-geral]');
        erro.textContent = '';
        const botao = document.getElementById('btn-entrar');
        botao.disabled = true;
        botao.textContent = 'Entrando…';
        try {
          await app.auth.login(form.elements.email.value, form.elements.senha.value);
          window.location.hash = '#/painel';
          recarregar();
        } catch (e) {
          erro.textContent = e.message;
          form.elements.senha.focus();
          botao.disabled = false;
          botao.textContent = 'Entrar';
        }
      });
    }
  };
}

export function paginaPainel(app) {
  const sessao = app.auth.sessao();
  const resumo = app.painel.resumo({});
  const cards = resumo.cards;
  const alertas = resumo.alertas ?? [];
  const labs = resumo.porLaboratorio ?? [];
  const nome = sessao.usuario.nome.split(' ')[0];

  const totalEquipamentos = labs.reduce((acc, l) => acc + l.total, 0);
  const totalVencidas = labs.reduce((acc, l) => acc + l.vencidas, 0);
  const labsEmAlerta = labs.filter((l) => l.vencidas > 0).length;

  const faixaItems = labs.map((l) => `<span class="faixa-item"><b>${esc(l.sigla)}</b><span class="faixa-numeros">${l.total} equipamentos${l.vencidas ? ` · <b class="faixa-alerta">${l.vencidas} vencidas</b>` : ''}</span></span>`).join('');

  const ranking = labs.filter((l) => l.vencidas > 0).slice(0, 8);
  const maiorVencida = ranking.length ? Math.max(...ranking.map((l) => l.vencidas)) : 1;
  const cartaoRanking = `
    <section class="cartao-ranking">
      <h3 class="grafico-titulo">Ranking de atraso</h3>
      <p class="subtexto">Calibrações vencidas por laboratório</p>
      <ol class="ranking-lista">
        ${ranking.map((l) => `<li class="ranking-item">
          <span class="ranking-sigla">${esc(l.sigla)}</span>
          <span class="ranking-trilha"><span class="ranking-barra" style="width:${Math.round((l.vencidas / maiorVencida) * 100)}%"></span></span>
          <span class="ranking-valor">${l.vencidas}</span>
        </li>`).join('')}
      </ol>
      ${ranking.length ? '' : '<p class="vazio">Nenhuma calibração vencida.</p>'}
    </section>`;

  const hero = `
    <section class="painel-hero" data-revelar>
      <div class="painel-hero-texto">
        <p class="eyebrow">Visão geral</p>
        <h1><img class="tipografia-inline" src="./src/frontend/assets/logo-ucs-simbolo.png" alt="" />Olá, <strong>${esc(nome)}</strong></h1>
        <p class="subtitulo" data-varrer>${resumo.escopoLaboratorioId ? 'Dados do seu laboratório' : 'Visão consolidada dos 10 laboratórios'} — atualizado em ${esc(fmtDataHora(resumo.atualizadoEm))}. Acompanhe calibrações vencidas, custos do mês e a agenda de manutenção em um só lugar.</p>
        <div class="painel-hero-acoes">
          <a class="btn btn-primario" href="#/agenda">Ver agenda</a>
          ${temPermissao(app, 'eventos.registrar') ? '<a class="btn btn-secundario" href="#/eventos/novo">Registrar evento</a>' : ''}
        </div>
      </div>
      <aside class="painel-hero-status">
        <h2>Estado agora</h2>
        <dl>
          <dt>Equipamentos no escopo</dt><dd>${totalEquipamentos}</dd>
          <dt>Calibrações vencidas</dt><dd class="${totalVencidas ? 'texto-erro' : ''}">${totalVencidas}</dd>
          <dt>Laboratórios em alerta</dt><dd class="${labsEmAlerta ? 'texto-alerta' : ''}">${labsEmAlerta} de ${labs.length}</dd>
          <dt>Custos do mês</dt><dd>${esc(cards.custosMes)}</dd>
        </dl>
      </aside>
    </section>`;

  const indicadores = `
    <div class="bento">
      <div class="bento-4 bento-ocupa-2 bento-grafico">
        ${caixaGrafico({
          titulo: 'Equipamentos por laboratório',
          subtitulo: 'Ativos e calibrações vencidas em cada unidade',
          id: 'grafico-laboratorios',
          legenda: [{ cor: 'azul', rotulo: 'Ativos' }, { cor: 'erro', rotulo: 'Vencidos' }]
        })}
      </div>
      <div class="bento-2 bento-ocupa-2">${cartaoRanking}</div>
      ${cartaoIndicador({ rotulo: 'Calibrações vencidas', valor: cards.calibracoesVencidas, detalhe: 'Sinalizadas em aberto', variante: 'erro', href: '#/equipamentos?sinal=CALIBRACAO_VENCIDA', classe: 'bento-2', empilhar: true })}
      ${cartaoIndicador({ rotulo: 'Calibrações a vencer', valor: cards.calibracoesAVencer, detalhe: 'Próximos 30 dias', variante: 'alerta', href: '#/equipamentos?statusCalibracao=A_VENCER', classe: 'bento-2', empilhar: true })}
      ${cartaoIndicador({ rotulo: 'Calibrações reprovadas', valor: cards.calibracoesReprovadas, detalhe: 'Erro + U acima do CA', variante: 'erro', href: '#/equipamentos?sinal=CALIBRACAO_REPROVADA', classe: 'bento-2', empilhar: true })}
      ${cartaoIndicador({ rotulo: 'Manutenções pendentes', valor: cards.manutencoesPendentes, detalhe: 'Preventivas agendadas', variante: 'info', href: '#/eventos?tipo=MANUTENCAO_PREVENTIVA', classe: 'bento-2', empilhar: true })}
      ${cartaoIndicador({ rotulo: 'Equipamentos ativos', valor: cards.equipamentosAtivos, detalhe: `de ${totalEquipamentos} no escopo`, variante: 'ok', href: '#/equipamentos', classe: 'bento-2', empilhar: true })}
      ${cartaoIndicador({ rotulo: 'Em manutenção', valor: cards.equipamentosEmManutencao, detalhe: 'Indisponíveis para uso', variante: 'alerta', href: '#/equipamentos?situacao=EM_MANUTENCAO', classe: 'bento-2', empilhar: true })}
      ${cartaoIndicador({ rotulo: 'Solicitações pendentes', valor: cards.solicitacoesPendentes, detalhe: 'Aguardando aprovação', variante: 'info', href: '#/solicitacoes', classe: 'bento-2', empilhar: true })}
      ${cartaoIndicador({ rotulo: 'Custos do mês', valor: cards.custosMes, detalhe: 'Eventos realizados', variante: 'neutro', href: temPermissao(app, 'indicadores.custos') ? '#/custos' : '#/relatorios', classe: 'bento-2', empilhar: true })}
    </div>`;

  const faixa = labs.length ? `
    <div class="faixa" data-faixa aria-label="Resumo por laboratório">
      <div class="faixa-trilha">${faixaItems}</div>
    </div>` : '';

  const atalhos = `
    <div class="acordeao" data-revelar>
      <a class="acordeao-fatia" href="#/inventario">${icone('caixa')}<strong>Inventário</strong><span>Equipamentos ativos por laboratório, com situação e completude do cadastro.</span></a>
      <a class="acordeao-fatia" href="#/relatorios">${icone('grafico')}<strong>Relatórios</strong><span>Inventário, histórico e anexos exportáveis em PDF, Excel e CSV.</span></a>
      <a class="acordeao-fatia" href="#/agenda">${icone('calendario')}<strong>Agenda</strong><span>Calendário mensal das calibrações, verificações e manutenções programadas.</span></a>
      <a class="acordeao-fatia" href="#/privacidade">${icone('escudo')}<strong>Privacidade</strong><span>Aviso LGPD, tratamento dos dados e saída de emergência.</span></a>
    </div>`;

  const colunas = `
    <div class="duas-colunas">
      ${secao('Alertas recentes', alertas.length ? `<ul class="lista-alertas">${alertas.map((a) => `
        <li class="alerta alerta-${esc(a.nivel.toLowerCase())}">
          <div class="alerta-icone">${icone(a.nivel === 'CRITICO' ? 'alerta' : a.nivel === 'ALTO' ? 'relogio' : a.nivel === 'MEDIO' ? 'info' : 'ok')}</div>
          <div class="alerta-corpo">
            <a class="alerta-titulo" href="${esc(a.rota)}">${esc(a.titulo)}</a>
            <span class="alerta-desc">${esc(a.descricao)}</span>
          </div>
          <span class="alerta-lab">${esc(a.laboratorioSigla ?? '')}</span>
        </li>`).join('')}</ul>` : '<p class="vazio">Nenhum alerta no momento.</p>',
        '<a class="link" href="#/equipamentos?sinal=CALIBRACAO_VENCIDA">Ver todos</a>')}
      ${secao('Situação por laboratório', `<table class="tabela tabela-compacta"><caption class="sr-only">Situação dos equipamentos em cada laboratório</caption><thead><tr><th scope="col">Laboratório</th><th scope="col" class="num">Equipamentos</th><th scope="col" class="num">Ativos</th><th scope="col" class="num">Vencidos</th></tr></thead><tbody>
        ${labs.map((l) => `<tr><td>${esc(l.sigla)}</td><td class="num">${l.total}</td><td class="num">${l.ativos}</td><td class="num ${l.vencidas ? 'texto-erro' : ''}">${l.vencidas}</td></tr>`).join('')}
      </tbody></table>`)}
    </div>`;

  const html = `
    ${hero}
    ${cards.equipamentosParciais ? `<div class="aviso-inline aviso-alerta">
      <span>${icone('alerta')}</span>
      <span><strong>${cards.equipamentosParciais} cadastro(s) parcial(is).</strong> A base real não possui patrimônio, série, datas de aquisição/uso e valor em parte dos registros. Complete pelo cadastro do equipamento.</span>
      <a href="#/equipamentos?completude=PARCIAL">Ver equipamentos</a>
    </div>` : ''}
    ${indicadores}
    ${faixa}
    ${atalhos}
    ${colunas}
  `;

  return {
    html,
    montar() {
      graficoEquipamentosPorLaboratorio('#grafico-laboratorios', labs).catch((erro) => console.warn('Gráfico indisponível:', erro));
    }
  };
}
