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

export const RELATORIOS = [
  { id: 'inventario', titulo: 'Inventário de ativos', desc: 'RF05 • equipamentos ativos por laboratório', permissao: 'inventario.gerar' },
  { id: 'situacao', titulo: 'Situação dos equipamentos', desc: 'Calibração, verificação, sinais e completude', permissao: 'relatorios.operacionais' },
  { id: 'historico', titulo: 'Histórico de eventos', desc: 'RF14 • filtros por período, tipo e status', permissao: 'relatorios.operacionais' },
  { id: 'calibracoes', titulo: 'Anexo 4 — status das calibrações', desc: 'Compatível com a planilha de acompanhamento', permissao: 'relatorios.operacionais' },
  { id: 'manutencoes-preventivas', titulo: 'Anexo 5 — manutenções preventivas', desc: 'Programação e periodicidade (PMP)', permissao: 'relatorios.operacionais' },
  { id: 'manutencoes-corretivas', titulo: 'Anexo 2 — manutenções corretivas', desc: 'Problema, retorno, custo e fornecedor', permissao: 'relatorios.operacionais' },
  { id: 'ficha', titulo: 'Anexo 1 — ficha do equipamento', desc: 'Dados cadastrais e histórico completo', permissao: 'equipamentos.consultar' },
  { id: 'custos', titulo: 'Custos x receita', desc: 'RF15 • indicadores financeiros por laboratório', permissao: 'indicadores.custos' }
];

export function paginaRelatorios(app, relatorioForcado = null) {
  const disponiveis = RELATORIOS.filter((r) => temPermissao(app, r.permissao));
  if (!disponiveis.length) return { html: '<div class="estado-vazio"><h3>Sem acesso a relatórios</h3><p>Seu perfil não possui permissão para gerar relatórios.</p></div>', montar() {} };
  const st = estadoTelas.relatorios;
  if (relatorioForcado) st.relatorio = relatorioForcado;
  if (!disponiveis.some((r) => r.id === st.relatorio)) st.relatorio = disponiveis[0].id;
  const def = disponiveis.find((r) => r.id === st.relatorio);
  const f = st.filtros;
  const aberto = st.relatorio;

  const filtrosHtml = () => {
    const comum = `
      ${campo({ nome: 'laboratorioId', rotulo: 'Laboratório', tipo: 'select', valor: f.laboratorioId ?? '', opcoes: opcoesLab(app, { incluirTodos: true }), largura: 'half' })}
      ${['inventario', 'historico', 'manutencoes-corretivas', 'custos'].includes(aberto) ? `
        ${campo({ nome: 'de', rotulo: 'De', tipo: 'date', valor: f.de ?? '', largura: 'half' })}
        ${campo({ nome: 'ate', rotulo: 'Até', tipo: 'date', valor: f.ate ?? '', largura: 'half' })}` : ''}
      ${aberto === 'historico' ? `
        ${campo({ nome: 'tipo', rotulo: 'Tipo', tipo: 'select', valor: f.tipo ?? '', opcoes: [{ valor: '', rotulo: 'Todos' }, ...opcoesTipoEvento({ incluirDivergencia: true })], largura: 'half' })}
        ${campo({ nome: 'situacao', rotulo: 'Situação', tipo: 'select', valor: f.situacao ?? '', opcoes: [{ valor: '', rotulo: 'Todas' }, ...opcoesSituacaoEvento()], largura: 'half' })}` : ''}
      ${aberto === 'ficha' ? `${campo({ nome: 'equipamentoId', rotulo: 'Equipamento', tipo: 'select', opcoes: opcoesEquipamentos(app), valor: f.equipamentoId ?? '', obrigatorio: true, largura: 'full' })}` : ''}
      ${aberto === 'situacao' ? `${campo({ nome: 'situacao', rotulo: 'Situação do equipamento', tipo: 'select', valor: f.situacao ?? '', opcoes: [{ valor: '', rotulo: 'Todas' }, ...Object.entries({ ATIVO: 'Ativo', INATIVO: 'Inativo', EM_MANUTENCAO: 'Em manutenção' }).map(([v, r]) => ({ valor: v, rotulo: r }))], largura: 'half' })}` : ''}
    `;
    return `<form class="filtros" data-form-relatorio><div class="filtros-campos">${comum}</div><div class="filtros-acoes"><button class="btn btn-primario" type="submit">Gerar</button></div></form>`;
  };

  let tabelaHtml = '';
  let resumo = [];
  let total = 0;
  try {
    const fnMap = {
      inventario: () => app.relatorios.inventario(f),
      situacao: () => app.relatorios.situacao(f),
      historico: () => app.relatorios.historico(f),
      calibracoes: () => app.relatorios.calibracoes(f),
      'manutencoes-preventivas': () => app.relatorios.manutencoesPreventivas(f),
      'manutencoes-corretivas': () => app.relatorios.manutencoesCorretivas(f),
      ficha: () => app.relatorios.fichaEquipamento(f.equipamentoId),
      custos: () => app.relatorios.custos(f)
    };
    if (aberto === 'ficha' && !f.equipamentoId) {
      tabelaHtml = '<p class="vazio">Selecione um equipamento para gerar a ficha.</p>';
    } else {
      const t = fnMap[aberto]();
      total = t.linhas.length;
      resumo = t.resumo;
      tabelaHtml = tabela(t.colunas, t.linhas.slice(0, 200), { vazio: 'Nenhum registro para os filtros.' }) + (t.linhas.length > 200 ? `<p class="subtexto">Prévia limitada a 200 de ${t.linhas.length} linhas. A exportação inclui todas.</p>` : '');
    }
  } catch (e) {
    tabelaHtml = `<p class="vazio">${esc(e.message)}</p>`;
  }

  const html = `
    <div class="pagina-cabecalho"><div><p class="eyebrow">RF05 · RF14 · RF15 · ANEXOS</p><h1>Relatórios</h1>
    <p class="subtitulo">Relatórios operacionais compatíveis com as planilhas atuais, com exportação em PDF, Excel e CSV.</p></div></div>
    <div class="abas-relatorios">
      ${disponiveis.map((r) => `<button class="aba ${r.id === aberto ? 'aba-ativa' : ''}" data-relatorio="${r.id}"><strong>${esc(r.titulo)}</strong><span>${esc(r.desc)}</span></button>`).join('')}
    </div>
    ${filtrosHtml()}
    <div class="resultado-relatorio">
      <div class="resultado-topo">
        <div><h2>${esc(def.titulo)}</h2><p class="subtexto">${total} linha(s)</p></div>
        <div class="exportacoes">
          <button class="btn btn-secundario" data-exportar="pdf">Baixar PDF</button>
          <button class="btn btn-secundario" data-exportar="xlsx">Baixar Excel</button>
          <button class="btn btn-secundario" data-exportar="csv">Baixar CSV</button>
        </div>
      </div>
      ${resumo.length ? `<div class="resumos">${resumo.map((r) => `<div class="resumo-item"><span>${esc(r.rotulo)}</span><strong>${esc(r.valor)}</strong></div>`).join('')}</div>` : ''}
      ${tabelaHtml}
    </div>
  `;

  return {
    html,
    montar() {
      document.querySelectorAll('[data-relatorio]').forEach((b) => b.addEventListener('click', () => {
        st.relatorio = b.dataset.relatorio;
        st.filtros = {};
        recarregar();
      }));
      document.querySelector('[data-form-relatorio]')?.addEventListener('submit', (evento) => {
        evento.preventDefault();
        const form = evento.currentTarget;
        const novos = {};
        for (const el of form.elements) {
          if (!el.name) continue;
          if (el.value === '') continue;
          novos[el.name] = ['laboratorioId', 'equipamentoId'].includes(el.name) ? Number(el.value) : el.value;
        }
        st.filtros = novos;
        recarregar();
      });
      document.querySelectorAll('[data-exportar]').forEach((b) => b.addEventListener('click', async () => {
        b.disabled = true;
        try {
          const r = app.relatorios.exportar(st.relatorio, b.dataset.exportar, st.filtros);
          baixarArquivo(r.nomeArquivo, r.mime, r.bytes);
          toast(`Arquivo gerado: ${r.nomeArquivo}`, 'sucesso');
        } catch (e) { tratarErro(e); }
        b.disabled = false;
      }));
    }
  };
}

export function paginaAuditoria(app) {
  const st = estadoTelas.auditoria;
  const pagina = app.auditoria.listar({ ...st, tamanho: 50 });
  return {
    html: `
      <div class="pagina-cabecalho"><div><p class="eyebrow">RNF03</p><h1>Log de auditoria</h1>
      <p class="subtitulo">${pagina.total} registro(s) • consulta exclusiva do Gestor Geral; imutável</p></div></div>
      ${filtrosBarra(`
        ${campo({ nome: 'busca', rotulo: 'Buscar', tipo: 'text', valor: st.busca, placeholder: 'Motivo ou dados alterados', largura: 'half' })}
        ${campo({ nome: 'tabela', rotulo: 'Tabela', tipo: 'select', valor: st.tabela, opcoes: [{ valor: '', rotulo: 'Todas' }, ...Object.entries({ sistema: 'Sistema', usuarios: 'Usuários', laboratorios: 'Laboratórios', fornecedores: 'Fornecedores', categorias: 'Categorias', subcategorias: 'Subcategorias', itens: 'Itens', equipamentos: 'Equipamentos', solicitacoes: 'Solicitações', eventos: 'Eventos', relatorios: 'Relatórios', configuracoes: 'Configurações' }).map(([v, r]) => ({ valor: v, rotulo: r }))], largura: 'half' })}
        ${campo({ nome: 'acao', rotulo: 'Ação', tipo: 'select', valor: st.acao, opcoes: [{ valor: '', rotulo: 'Todas' }, ...Object.entries({ CRIAR: 'Criação', ATUALIZAR: 'Alteração', INATIVAR: 'Inativação', REATIVAR: 'Reativação', APROVAR: 'Aprovação', REJEITAR: 'Rejeição', REALIZAR: 'Realização', CANCELAR: 'Cancelamento', LOGIN: 'Login', LOGIN_FALHA: 'Falha de login', LOGOUT: 'Logout', EXPORTAR: 'Exportação', BACKUP: 'Backup', RESTAURAR: 'Restauração', IMPORTAR: 'Importação', ANONIMIZAR: 'Anonimização', REDEFINIR_SENHA: 'Senha', REINICIAR: 'Reinício' }).map(([v, r]) => ({ valor: v, rotulo: r }))], largura: 'half' })}
        ${campo({ nome: 'de', rotulo: 'De', tipo: 'date', valor: st.de, largura: 'half' })}
        ${campo({ nome: 'ate', rotulo: 'Até', tipo: 'date', valor: st.ate, largura: 'half' })}
      `, { limpar: true })}
      ${tabela([
        { chave: 'dataHora', rotulo: 'Data/hora', render: (l) => esc(fmtDataHora(l.dataHora)) },
        { chave: 'usuarioNome', rotulo: 'Usuário', render: (l) => `${esc(l.usuarioNome)}<small class="subtexto">${esc(l.usuarioEmail ?? '')}</small>` },
        { chave: 'acaoRotulo', rotulo: 'Ação' },
        { chave: 'tabelaRotulo', rotulo: 'Tabela' },
        { chave: 'registroId', rotulo: 'Registro', render: (l) => esc(String(l.registroId ?? '—')) },
        { chave: 'motivo', rotulo: 'Motivo', render: (l) => esc(l.motivo ?? '—') },
        { chave: 'ip', rotulo: 'IP' }
      ], pagina.itens, { acoes: (l) => `<button class="btn btn-mini btn-secundario" data-log="${l.id}">Detalhes</button>` })}
      ${paginacao(pagina)}
    `,
    montar() {
      const form = document.querySelector('[data-form-filtros]');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        Object.assign(st, { busca: form.elements.busca.value, tabela: form.elements.tabela.value, acao: form.elements.acao.value, de: form.elements.de.value, ate: form.elements.ate.value, pagina: 1 });
        recarregar();
      });
      document.querySelector('[data-limpar-filtros]')?.addEventListener('click', () => {
        Object.assign(st, { busca: '', tabela: '', acao: '', de: '', ate: '', pagina: 1 }); recarregar();
      });
      document.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => { st.pagina = Number(b.dataset.pagina); recarregar(); }));
      document.querySelectorAll('[data-log]').forEach((b) => b.addEventListener('click', () => {
        try {
          const log = app.auditoria.obter(Number(b.dataset.log));
          abrirModal(`<div class="modal-cabecalho"><h2>Registro de auditoria #${log.id}</h2><button class="icone" data-fechar>✕</button></div>
            <dl class="dados"><dt>Data/hora</dt><dd>${esc(fmtDataHora(log.dataHora))}</dd><dt>Usuário</dt><dd>${esc(log.usuarioNome)}</dd>
            <dt>Ação</dt><dd>${esc(log.acaoRotulo)} em ${esc(log.tabelaRotulo)} #${esc(String(log.registroId ?? '—'))}</dd>
            <dt>IP</dt><dd>${esc(log.ip)}</dd><dt>Motivo</dt><dd>${esc(log.motivo ?? '—')}</dd></dl>
            <h3>Dados anteriores</h3><pre class="json">${esc(JSON.stringify(log.dadosAnteriores, null, 2))}</pre>
            <h3>Dados novos</h3><pre class="json">${esc(JSON.stringify(log.dadosNovos, null, 2))}</pre>`, { largura: '820px' });
          document.querySelectorAll('[data-fechar]').forEach((x) => x.addEventListener('click', fecharModal));
        } catch (e) { tratarErro(e); }
      }));
    }
  };
}
