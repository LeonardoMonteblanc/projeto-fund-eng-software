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
  const nome = sessao.usuario.nome.split(' ')[0];
  const html = `
    <div class="pagina-cabecalho">
      <div><p class="eyebrow">VISÃO GERAL</p><h1>Olá, ${esc(nome)}</h1>
      <p class="subtitulo">${resumo.escopoLaboratorioId ? 'Dados do seu laboratório' : 'Visão consolidada dos 10 laboratórios'} • atualizado em ${esc(fmtDataHora(resumo.atualizadoEm))}</p></div>
      <div class="cabecalho-acoes">
        <a class="btn btn-secundario" href="#/agenda">Agenda</a>
        ${temPermissao(app, 'eventos.registrar') ? '<a class="btn btn-primario" href="#/eventos/novo">Registrar evento</a>' : ''}
      </div>
    </div>

    <div class="grade-indicadores">
      ${cartaoIndicador({ rotulo: 'Calibrações vencidas', valor: cards.calibracoesVencidas, detalhe: 'RF17 • sinalizadas', variante: 'erro', href: '#/equipamentos?sinal=CALIBRACAO_VENCIDA' })}
      ${cartaoIndicador({ rotulo: 'Calibrações a vencer', valor: cards.calibracoesAVencer, detalhe: 'Próximos 30 dias', variante: 'alerta', href: '#/equipamentos?statusCalibracao=A_VENCER' })}
      ${cartaoIndicador({ rotulo: 'Calibrações reprovadas', valor: cards.calibracoesReprovadas, detalhe: 'Erro + U acima do CA', variante: 'erro', href: '#/equipamentos?sinal=CALIBRACAO_REPROVADA' })}
      ${cartaoIndicador({ rotulo: 'Manutenções pendentes', valor: cards.manutencoesPendentes, detalhe: 'Preventivas agendadas', variante: 'info', href: '#/eventos?tipo=MANUTENCAO_PREVENTIVA' })}
      ${cartaoIndicador({ rotulo: 'Equipamentos ativos', valor: cards.equipamentosAtivos, detalhe: `de ${cards.equipamentosAtivos + cards.equipamentosInativos + cards.equipamentosEmManutencao}`, variante: 'ok', href: '#/equipamentos' })}
      ${cartaoIndicador({ rotulo: 'Em manutenção', valor: cards.equipamentosEmManutencao, detalhe: 'Indisponíveis para uso', variante: 'alerta', href: '#/equipamentos?situacao=EM_MANUTENCAO' })}
      ${cartaoIndicador({ rotulo: 'Solicitações pendentes', valor: cards.solicitacoesPendentes, detalhe: 'Aguardando aprovação', variante: 'info', href: '#/solicitacoes' })}
      ${cartaoIndicador({ rotulo: 'Custos do mês', valor: cards.custosMes, detalhe: 'Eventos realizados', variante: 'neutro', href: temPermissao(app, 'indicadores.custos') ? '#/custos' : '#/relatorios' })}
    </div>

    ${cards.equipamentosParciais ? `<div class="aviso-inline aviso-alerta">
      <strong>${cards.equipamentosParciais} cadastro(s) parcial(is).</strong> A base real não possui patrimônio, série, datas de aquisição/uso e valor em parte dos registros. Complete pelo cadastro do equipamento. <a href="#/equipamentos?completude=PARCIAL">Ver equipamentos</a>
    </div>` : ''}

    <div class="duas-colunas">
      ${secao('Alertas recentes', alertas.length ? `<ul class="lista-alertas">${alertas.map((a) => `
        <li class="alerta alerta-${esc(a.nivel.toLowerCase())}">
          <div class="alerta-icone">${a.nivel === 'CRITICO' ? '!' : a.nivel === 'ALTO' ? '▲' : a.nivel === 'MEDIO' ? '•' : 'i'}</div>
          <div class="alerta-corpo">
            <a class="alerta-titulo" href="${esc(a.rota)}">${esc(a.titulo)}</a>
            <span class="alerta-desc">${esc(a.descricao)}</span>
          </div>
          <span class="alerta-lab">${esc(a.laboratorioSigla ?? '')}</span>
        </li>`).join('')}</ul>` : '<p class="vazio">Nenhum alerta no momento.</p>',
        '<a class="link" href="#/equipamentos?sinal=CALIBRACAO_VENCIDA">Ver todos</a>')}
      ${secao('Situação por laboratório', `<table class="tabela tabela-compacta"><thead><tr><th>Laboratório</th><th class="dir">Equipamentos</th><th class="dir">Ativos</th><th class="dir">Vencidos</th></tr></thead><tbody>
        ${(resumo.porLaboratorio ?? []).map((l) => `<tr><td>${esc(l.sigla)}</td><td class="dir">${l.total}</td><td class="dir">${l.ativos}</td><td class="dir ${l.vencidas ? 'texto-erro' : ''}">${l.vencidas}</td></tr>`).join('')}
      </tbody></table>`)}
    </div>

    <div class="grade-atalhos">
      <a class="atalho" href="#/inventario"><strong>Inventário</strong><span>Equipamentos ativos por laboratório</span></a>
      <a class="atalho" href="#/relatorios"><strong>Relatórios</strong><span>Histórico, anexos e exportação</span></a>
      <a class="atalho" href="#/agenda"><strong>Agenda</strong><span>Eventos programados</span></a>
      <a class="atalho" href="#/privacidade"><strong>Privacidade</strong><span>Aviso LGPD e seus dados</span></a>
    </div>`;

  return { html, montar() {} };
}
