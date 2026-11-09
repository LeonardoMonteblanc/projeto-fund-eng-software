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

export function paginaEventos(app) {
  const st = estadoTelas.eventos;
  const sessao = app.auth.sessao();
  const global = [PERFIS.ADMIN, PERFIS.GESTOR_GERAL].includes(sessao.usuario.perfil);
  const pagina = app.eventos.listar({ ...st, tamanho: 25 });
  const podeRegistrar = temPermissao(app, 'eventos.registrar');

  const html = `
    <div class="pagina-cabecalho">
      <div><p class="eyebrow">RF08 · RF10 · RF11 · RF14</p><h1>Eventos</h1>
      <p class="subtitulo">${pagina.total} evento(s) • calibrações, verificações e manutenções</p></div>
      <div class="cabecalho-acoes">
        <a class="btn btn-secundario" href="#/agenda">Agenda</a>
        ${podeRegistrar ? '<a class="btn btn-primario" href="#/eventos/novo">Registrar evento</a>' : ''}
      </div>
    </div>
    ${filtrosBarra(`
      ${campo({ nome: 'busca', rotulo: 'Buscar', tipo: 'text', valor: st.busca, placeholder: 'TAG, certificado ou descrição', largura: 'half' })}
      ${global ? campo({ nome: 'laboratorioId', rotulo: 'Laboratório', tipo: 'select', valor: st.laboratorioId, opcoes: opcoesLab(app, { incluirTodos: true }), largura: 'half' }) : ''}
      ${campo({ nome: 'tipo', rotulo: 'Tipo', tipo: 'select', valor: st.tipo, opcoes: [{ valor: '', rotulo: 'Todos' }, ...opcoesTipoEvento({ incluirDivergencia: true })], largura: 'half' })}
      ${campo({ nome: 'situacao', rotulo: 'Situação', tipo: 'select', valor: st.situacao, opcoes: [{ valor: '', rotulo: 'Todas' }, ...opcoesSituacaoEvento()], largura: 'half' })}
      ${campo({ nome: 'de', rotulo: 'De', tipo: 'date', valor: st.de, largura: 'half' })}
      ${campo({ nome: 'ate', rotulo: 'Até', tipo: 'date', valor: st.ate, largura: 'half' })}
    `, { limpar: true })}
    ${tabela([
      { chave: 'dataReferencia', rotulo: 'Data', render: (l) => esc(fmtData(l.dataReferencia)) },
      { chave: 'tipoRotulo', rotulo: 'Tipo', render: (l) => esc(l.tipoRotulo) },
      { chave: 'equipamentoTag', rotulo: 'Equipamento', render: (l) => linkEquipamento(l.equipamentoId, l.equipamentoTag) },
      { chave: 'laboratorioSigla', rotulo: 'Lab.', render: (l) => esc(l.laboratorioSigla ?? '—') },
      { chave: 'numeroCertificado', rotulo: 'Certificado', render: (l) => esc(l.numeroCertificado ?? '—') },
      { chave: 'resultado', rotulo: 'Resultado', render: (l) => l.resultado ? badgeSituacao(l.resultado, l.resultadoRotulo) : '<span class="subtexto">—</span>' },
      { chave: 'custoRealizadoCentavos', rotulo: 'Custo', render: (l) => esc(fmtMoeda(l.custoRealizadoCentavos)) },
      { chave: 'situacaoRotulo', rotulo: 'Situação', render: (l) => badgeSituacao(l.situacao, l.situacaoRotulo) }
    ], pagina.itens, {
      vazio: 'Nenhum evento encontrado.',
      acoes: (l) => {
        let botoes = `<a class="btn btn-mini btn-secundario" href="#/equipamentos/${l.equipamentoId}">Equip.</a>`;
        if (l.situacao === 'AGENDADO' && podeRegistrar) {
          botoes += `<button class="btn btn-mini btn-primario" data-realizar="${l.id}">Realizar</button>`;
          botoes += `<button class="btn btn-mini btn-perigo" data-cancelar="${l.id}">Cancelar</button>`;
        }
        return botoes;
      }
    })}
    ${paginacao(pagina)}
  `;

  return {
    html,
    montar() {
      const form = document.querySelector('[data-form-filtros]');
      form?.addEventListener('submit', (evento) => {
        evento.preventDefault();
        Object.assign(st, {
          busca: form.elements.busca?.value ?? '', laboratorioId: form.elements.laboratorioId?.value ?? '',
          tipo: form.elements.tipo?.value ?? '', situacao: form.elements.situacao?.value ?? '',
          de: form.elements.de?.value ?? '', ate: form.elements.ate?.value ?? '', pagina: 1
        });
        recarregar();
      });
      document.querySelector('[data-limpar-filtros]')?.addEventListener('click', () => {
        Object.assign(st, { busca: '', laboratorioId: '', tipo: '', situacao: '', de: '', ate: '', pagina: 1 });
        recarregar();
      });
      document.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => { st.pagina = Number(b.dataset.pagina); recarregar(); }));
      document.querySelectorAll('[data-realizar]').forEach((b) => b.addEventListener('click', () => abrirRealizarEvento(app, Number(b.dataset.realizar))));
      document.querySelectorAll('[data-cancelar]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Cancelar evento', mensagem: 'Informe o motivo do cancelamento. O evento permanecerá no histórico como cancelado.', textoConfirmar: 'Cancelar evento', perigo: true });
        if (!motivo) return;
        try { app.eventos.cancelar(Number(b.dataset.cancelar), motivo); toast('Evento cancelado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
      const qs = location.hash.split('?')[1] ?? '';
      if (qs && st._ultimaQuery !== qs) {
        st._ultimaQuery = qs;
        const query = new URLSearchParams(qs);
        let alterou = false;
        if (query.get('tipo') && query.get('tipo') !== st.tipo) { st.tipo = query.get('tipo'); alterou = true; }
        if (query.get('situacao') && query.get('situacao') !== st.situacao) { st.situacao = query.get('situacao'); alterou = true; }
        if (alterou) { st.pagina = 1; recarregar(); }
      }
    }
  };
}

export function paginaEventoNovo(app, query = new URLSearchParams()) {
  const equipamentoId = query.get('equipamento') ?? '';
  const equipamentos = opcoesEquipamentos(app);
  const fornecedores = opcoesFornecedor(app);
  const camposComuns = [
    { nome: 'equipamentoId', rotulo: 'Equipamento', tipo: 'select', opcoes: equipamentos, obrigatorio: true, largura: 'full' },
    { nome: 'tipo', rotulo: 'Tipo de evento', tipo: 'select', opcoes: opcoesTipoEvento({ incluirDivergencia: true }), obrigatorio: true, largura: 'half' },
    { nome: 'fornecedorId', rotulo: 'Fornecedor', tipo: 'select', opcoes: fornecedores, largura: 'half' }
  ];
  const blocoMetro = [
    { nome: 'dataRealizacao', rotulo: 'Data de realização', tipo: 'date', valor: hoje(), largura: 'half', ajuda: 'Deixe em branco para agendar sem resultado.' },
    { nome: 'dataPrevista', rotulo: 'Data prevista (agendamento)', tipo: 'date', largura: 'half' },
    { nome: 'numeroCertificado', rotulo: 'Nº do certificado', tipo: 'text', largura: 'half', placeholder: 'Obrigatório para calibração realizada' },
    { nome: 'custoRealizadoCentavos', rotulo: 'Custo realizado (R$)', tipo: 'dinheiro', largura: 'half' },
    { nome: 'erroMedido', rotulo: 'Erro medido', tipo: 'number', passo: 'any', largura: 'half' },
    { nome: 'incerteza', rotulo: 'Incerteza (U)', tipo: 'number', passo: 'any', largura: 'half' }
  ];
  const blocoPrev = [
    { nome: 'dataPrevista', rotulo: 'Data prevista', tipo: 'date', valor: hoje(), largura: 'half' },
    { nome: 'dataRealizacao', rotulo: 'Data de realização (se já realizada)', tipo: 'date', largura: 'half' },
    { nome: 'descricao', rotulo: 'Descrição do serviço', tipo: 'text', largura: 'full' },
    { nome: 'custoEstimadoCentavos', rotulo: 'Custo estimado (R$)', tipo: 'dinheiro', largura: 'half' },
    { nome: 'custoRealizadoCentavos', rotulo: 'Custo realizado (R$)', tipo: 'dinheiro', largura: 'half' },
    { nome: 'recorrente', rotulo: 'Manutenção recorrente (gera próxima data)', tipo: 'checkbox', valor: true, largura: 'full' }
  ];
  const blocoCorr = [
    { nome: 'dataRealizacao', rotulo: 'Data de realização', tipo: 'date', valor: hoje(), largura: 'half' },
    { nome: 'problemaServico', rotulo: 'Problema / serviço realizado', tipo: 'textarea', largura: 'full' },
    { nome: 'estadoRetorno', rotulo: 'Estado de retorno', tipo: 'select', opcoes: Object.entries(ESTADOS_RETORNO).map(([v, r]) => ({ valor: v, rotulo: r })), largura: 'half' },
    { nome: 'custoRealizadoCentavos', rotulo: 'Custo realizado (R$)', tipo: 'dinheiro', largura: 'half' }
  ];
  const blocoDiv = [
    { nome: 'dataRealizacao', rotulo: 'Data da divergência', tipo: 'date', valor: hoje(), largura: 'half' },
    { nome: 'descricao', rotulo: 'Descrição da divergência', tipo: 'textarea', largura: 'full' }
  ];

  const campos = [
    ...camposComuns,
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largura: 'full' },
    { nome: 'motivo', rotulo: 'Motivo / justificativa do registro', tipo: 'text', largura: 'full' }
  ];

  const html = `
    <div class="breadcrumb"><a href="#/eventos">Eventos</a> <span>/</span> Novo evento</div>
    <div class="pagina-cabecalho"><div><p class="eyebrow">RF08 · RF10 · RF11</p><h1>Registrar evento</h1>
    <p class="subtitulo">O resultado é calculado por |erro| + U ≤ CA (aceitação simples). Campos de resultado são obrigatórios apenas quando há data de realização.</p></div></div>
    <form id="form-evento" class="formulario-pagina" novalidate>
      <div class="grid-campos">${campos.map((c) => campo({ ...c, valor: c.nome === 'equipamentoId' ? equipamentoId : c.valor ?? '' })).join('')}</div>
      <div class="bloco-tipo" data-bloco="METRO">
        <h3>Resultado metrológico</h3>
        <div class="grid-campos">${blocoMetro.map((c) => campo({ ...c, valor: c.nome === 'dataRealizacao' ? hoje() : '' })).join('')}</div>
        <div class="previa" id="previa-calculo" hidden></div>
      </div>
      <div class="bloco-tipo" data-bloco="PREVENTIVA" hidden>
        <h3>Manutenção preventiva</h3>
        <div class="grid-campos">${blocoPrev.map((c) => campo({ ...c })).join('')}</div>
      </div>
      <div class="bloco-tipo" data-bloco="CORRETIVA" hidden>
        <h3>Manutenção corretiva</h3>
        <div class="grid-campos">${blocoCorr.map((c) => campo({ ...c })).join('')}</div>
      </div>
      <div class="bloco-tipo" data-bloco="DIVERGENCIA" hidden>
        <h3>Divergência de inventário</h3>
        <div class="grid-campos">${blocoDiv.map((c) => campo({ ...c })).join('')}</div>
      </div>
      <p class="erro-geral" data-erro-geral></p>
      <div class="form-acoes">
        <a class="btn btn-secundario" href="#/eventos">Cancelar</a>
        <button type="submit" class="btn btn-primario">Registrar evento</button>
      </div>
    </form>`;

  return {
    html,
    montar() {
      const form = document.getElementById('form-evento');
      const tipo = form.elements.tipo;
      const equipamento = form.elements.equipamentoId;
      const previa = document.getElementById('previa-calculo');
      const todosCampos = [...campos, ...blocoMetro, ...blocoPrev, ...blocoCorr, ...blocoDiv];

      const atualizarBlocos = () => {
        const t = tipo.value;
        const bloco = t === 'CALIBRACAO' || t === 'VERIFICACAO' ? 'METRO'
          : t === 'MANUTENCAO_PREVENTIVA' ? 'PREVENTIVA'
            : t === 'MANUTENCAO_CORRETIVA' ? 'CORRETIVA' : 'DIVERGENCIA';
        form.querySelectorAll('[data-bloco]').forEach((b) => { b.hidden = b.dataset.bloco !== bloco; });
      };
      tipo.addEventListener('change', atualizarBlocos);
      atualizarBlocos();

      const calcular = () => {
        if (!['CALIBRACAO', 'VERIFICACAO'].includes(tipo.value)) { previa.hidden = true; return; }
        const erro = form.elements.erroMedido.value;
        const incerteza = form.elements.incerteza.value;
        if (erro === '' || incerteza === '') { previa.hidden = true; return; }
        try {
          const r = app.eventos.calcularPrevia({ equipamentoId: Number(equipamento.value), tipo: tipo.value, erroMedido: erro, incerteza });
          previa.hidden = false;
          previa.className = `previa ${r.aprovado ? 'previa-ok' : 'previa-erro'}`;
          previa.innerHTML = `<strong>${r.aprovado ? 'Aprovado' : 'Reprovado'}</strong>
            <span>|erro| + U = <b>${fmtNumero(r.erroMaisU)}</b> • CA = <b>${fmtNumero(r.ca)}</b> • margem ${fmtNumero(r.margem)} • CA ${r.caOrigem === 'ITEM' ? 'herdado do item' : r.caOrigem === 'EQUIPAMENTO' ? 'do equipamento' : 'informado'}</span>`;
        } catch (e) {
          previa.hidden = false;
          previa.className = 'previa previa-erro';
          previa.textContent = e.message;
        }
      };
      form.elements.erroMedido?.addEventListener('input', calcular);
      form.elements.incerteza?.addEventListener('input', calcular);
      equipamento?.addEventListener('change', calcular);

      form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const dados = {};
        for (const def of todosCampos) {
          const seletor = `[name="${def.nome}"]`;
          const noBlocoVisivel = form.querySelector(`[data-bloco]:not([hidden]) ${seletor}`);
          const el = noBlocoVisivel ?? form.querySelector(seletor);
          if (!el) continue;
          if (def.tipo === 'checkbox') dados[def.nome] = el.checked;
          else if (def.tipo === 'dinheiro') dados[def.nome] = el.value === '' ? null : Number(String(el.value).replace(/\./g, '').replace(',', '.'));
          else if (def.tipo === 'number') dados[def.nome] = el.value === '' ? null : Number(el.value);
          else if (def.tipo === 'select') dados[def.nome] = el.value === '' ? null : (['equipamentoId', 'fornecedorId'].includes(def.nome) ? Number(el.value) : el.value);
          else dados[def.nome] = el.value === '' ? null : el.value;
        }
        try {
          const ev = app.eventos.criar(dados);
          toast(`Evento nº ${ev.id} registrado.`, 'sucesso');
          window.location.hash = `#/equipamentos/${ev.equipamentoId}`;
        } catch (e) {
          const formErro = form.querySelector('[data-erro-geral]');
          formErro.textContent = e.message;
          if (e.campos) {
            for (const [nome, msg] of Object.entries(e.campos)) {
              const el = form.querySelector(`[data-bloco]:not([hidden]) [name="${nome}"]`) ?? form.elements[nome];
              if (el && el.classList) el.classList.add('invalido');
              const span = form.querySelector(`[data-erro="${nome}"]`);
              if (span) span.textContent = msg;
            }
          }
        }
      });
    }
  };
}

export function abrirRealizarEvento(app, id) {
  let dto;
  try { dto = app.eventos.obter(id); } catch (e) { tratarErro(e); return; }
  const fornecedores = opcoesFornecedor(app);
  const comuns = [
    { nome: 'dataRealizacao', rotulo: 'Data de realização', tipo: 'date', valor: hoje(), obrigatorio: true, largura: 'half' },
    { nome: 'custoRealizadoCentavos', rotulo: 'Custo realizado (R$)', tipo: 'dinheiro', largura: 'half' },
    { nome: 'fornecedorId', rotulo: 'Fornecedor', tipo: 'select', opcoes: fornecedores, largura: 'half' }
  ];
  const porTipo = {
    CALIBRACAO: [
      { nome: 'numeroCertificado', rotulo: 'Nº do certificado', tipo: 'text', obrigatorio: true, largura: 'half' },
      { nome: 'erroMedido', rotulo: 'Erro medido', tipo: 'number', obrigatorio: true, passo: 'any', largura: 'half' },
      { nome: 'incerteza', rotulo: 'Incerteza (U)', tipo: 'number', obrigatorio: true, passo: 'any', largura: 'half' }
    ],
    VERIFICACAO: [
      { nome: 'erroMedido', rotulo: 'Erro medido', tipo: 'number', obrigatorio: true, passo: 'any', largura: 'half' },
      { nome: 'incerteza', rotulo: 'Incerteza (U)', tipo: 'number', obrigatorio: true, passo: 'any', largura: 'half' }
    ],
    MANUTENCAO_PREVENTIVA: [
      { nome: 'descricao', rotulo: 'Descrição do serviço', tipo: 'text', obrigatorio: true, largura: 'full' },
      { nome: 'recorrente', rotulo: 'Recorrente (gera próxima data)', tipo: 'checkbox', valor: true, largura: 'full' }
    ],
    MANUTENCAO_CORRETIVA: [
      { nome: 'problemaServico', rotulo: 'Problema / serviço', tipo: 'textarea', obrigatorio: true, largura: 'full' },
      { nome: 'estadoRetorno', rotulo: 'Estado de retorno', tipo: 'select', opcoes: Object.entries(ESTADOS_RETORNO).map(([v, r]) => ({ valor: v, rotulo: r })), obrigatorio: true, largura: 'half' }
    ]
  };
  const campos = [
    ...comuns,
    ...(porTipo[dto.tipo] ?? []),
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largura: 'full' },
    { nome: 'motivo', rotulo: 'Motivo', tipo: 'text', largura: 'full', valor: `Realização do evento nº ${id}` },
    { nome: 'previa', rotulo: '', tipo: 'hidden' }
  ].filter((c) => c.tipo !== 'hidden');

  formularioModal({
    titulo: `Realizar evento nº ${id} — ${dto.tipoRotulo}`,
    campos,
    valores: { fornecedorId: dto.fornecedorId ?? '', dataRealizacao: hoje() },
    textoSalvar: 'Confirmar realização',
    onSalvar: async (dados) => {
      await app.eventos.realizar(id, dados);
      toast('Evento realizado.', 'sucesso');
      recarregar();
    }
  });
}

export function paginaSolicitacoes(app) {
  const st = estadoTelas.solicitacoes;
  const sessao = app.auth.sessao();
  const global = [PERFIS.ADMIN, PERFIS.GESTOR_GERAL].includes(sessao.usuario.perfil);
  const pagina = app.solicitacoes.listar({ ...st, tamanho: 25 });
  const podeAprovar = temPermissao(app, 'solicitacoes.aprovar');
  const podeCriar = temPermissao(app, 'solicitacoes.criar');

  const html = `
    <div class="pagina-cabecalho">
      <div><p class="eyebrow">RF12</p><h1>Solicitações de evento</h1>
      <p class="subtitulo">${pagina.total} solicitação(ões) • aprovação pelo Gestor de Laboratório, com segregação de funções</p></div>
      <div class="cabecalho-acoes">${podeCriar ? '<button class="btn btn-primario" id="nova-solicitacao">Solicitar evento</button>' : ''}</div>
    </div>
    ${filtrosBarra(`
      ${campo({ nome: 'situacao', rotulo: 'Situação', tipo: 'select', valor: st.situacao, opcoes: [{ valor: '', rotulo: 'Todas' }, ...opcoesSituacaoSolicitacao()], largura: 'half' })}
      ${global ? campo({ nome: 'laboratorioId', rotulo: 'Laboratório', tipo: 'select', valor: st.laboratorioId, opcoes: opcoesLab(app, { incluirTodos: true }), largura: 'half' }) : ''}
    `, { limpar: true })}
    ${tabela([
      { chave: 'id', rotulo: 'Nº', render: (l) => `#${l.id}` },
      { chave: 'dataSolicitacao', rotulo: 'Solicitada em', render: (l) => esc(fmtData(l.dataSolicitacao)) },
      { chave: 'equipamentoTag', rotulo: 'Equipamento', render: (l) => linkEquipamento(l.equipamentoId, l.equipamentoTag) },
      { chave: 'tipoEventoRotulo', rotulo: 'Tipo', render: (l) => esc(l.tipoEventoRotulo) },
      { chave: 'solicitanteNome', rotulo: 'Solicitante', render: (l) => esc(l.solicitanteNome ?? '—') },
      { chave: 'dataDesejada', rotulo: 'Desejada', render: (l) => esc(fmtData(l.dataDesejada)) },
      { chave: 'situacao', rotulo: 'Situação', render: (l) => badgeSituacao(l.situacao, l.situacaoRotulo) },
      { chave: 'avaliadorNome', rotulo: 'Avaliador', render: (l) => esc(l.avaliadorNome ?? '—') }
    ], pagina.itens, {
      vazio: 'Nenhuma solicitação encontrada.',
      acoes: (l) => {
        if (l.situacao !== 'PENDENTE' || !podeAprovar) return '';
        return `<button class="btn btn-mini btn-primario" data-aprovar="${l.id}">Aprovar</button><button class="btn btn-mini btn-perigo" data-rejeitar="${l.id}">Rejeitar</button>`;
      }
    })}
    ${paginacao(pagina)}
  `;

  return {
    html,
    montar() {
      const form = document.querySelector('[data-form-filtros]');
      form?.addEventListener('submit', (evento) => {
        evento.preventDefault();
        Object.assign(st, { situacao: form.elements.situacao?.value ?? '', laboratorioId: form.elements.laboratorioId?.value ?? '', pagina: 1 });
        recarregar();
      });
      document.querySelector('[data-limpar-filtros]')?.addEventListener('click', () => {
        Object.assign(st, { situacao: '', laboratorioId: '', pagina: 1 }); recarregar();
      });
      document.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => { st.pagina = Number(b.dataset.pagina); recarregar(); }));
      document.getElementById('nova-solicitacao')?.addEventListener('click', () => abrirFormularioSolicitacao(app));
      document.querySelectorAll('[data-aprovar]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Aprovar solicitação', mensagem: 'A aprovação cria automaticamente um evento agendado.', textoConfirmar: 'Aprovar' });
        if (!motivo) return;
        try { await app.solicitacoes.aprovar(Number(b.dataset.aprovar), { motivo }); toast('Solicitação aprovada.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
      document.querySelectorAll('[data-rejeitar]').forEach((b) => b.addEventListener('click', () => {
        const id = Number(b.dataset.rejeitar);
        const caixa = abrirModal(`<form id="form-rejeitar">
          <div class="modal-cabecalho"><h2>Rejeitar solicitação</h2><button type="button" class="icone" data-fechar>✕</button></div>
          ${campo({ nome: 'justificativaRejeicao', rotulo: 'Justificativa da rejeição', tipo: 'textarea', obrigatorio: true, largura: 'full' })}
          <p class="erro-geral" data-erro-geral></p>
          <div class="modal-acoes"><button type="button" class="btn btn-secundario" data-fechar>Cancelar</button><button type="submit" class="btn btn-perigo">Rejeitar</button></div>
        </form>`);
        caixa.querySelectorAll('[data-fechar]').forEach((x) => x.addEventListener('click', fecharModal));
        caixa.querySelector('form').addEventListener('submit', async (evento) => {
          evento.preventDefault();
          try { await app.solicitacoes.rejeitar(id, { justificativaRejeicao: caixa.querySelector('textarea').value }); fecharModal(); toast('Solicitação rejeitada.', 'sucesso'); recarregar(); }
          catch (e) { caixa.querySelector('[data-erro-geral]').textContent = e.message; }
        });
      }));
    }
  };
}

export function abrirFormularioSolicitacao(app, equipamento = null) {
  const equipamentos = opcoesEquipamentos(app);
  formularioModal({
    titulo: 'Solicitar evento',
    campos: [
      { nome: 'equipamentoId', rotulo: 'Equipamento', tipo: 'select', opcoes: equipamentos, obrigatorio: true, largura: 'full' },
      { nome: 'tipoEvento', rotulo: 'Tipo de evento', tipo: 'select', opcoes: opcoesTipoEvento(), obrigatorio: true, largura: 'half' },
      { nome: 'dataDesejada', rotulo: 'Data desejada', tipo: 'date', largura: 'half' },
      { nome: 'justificativa', rotulo: 'Justificativa', tipo: 'textarea', obrigatorio: true, largura: 'full' }
    ],
    valores: { equipamentoId: equipamento?.id ?? '' },
    onSalvar: async (dados) => {
      await app.solicitacoes.criar(dados);
      toast('Solicitação registrada e encaminhada ao Gestor de Laboratório.', 'sucesso');
      recarregar();
    }
  });
}

export function paginaAgenda(app) {
  const st = estadoTelas.agenda;
  const de = st.de || hoje();
  const ate = st.ate || (() => { const d = new Date(`${hoje()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 120); return d.toISOString().slice(0, 10); })();
  const dados = app.painel.agenda({ de, ate, laboratorioId: st.laboratorioId || undefined });
  const html = `
    <div class="pagina-cabecalho">
      <div><p class="eyebrow">RF13 · RF14</p><h1>Agenda de eventos</h1>
      <p class="subtitulo">${dados.itens.length} evento(s) entre ${esc(fmtData(de))} e ${esc(fmtData(ate))}</p></div>
      <div class="cabecalho-acoes">${temPermissao(app, 'eventos.registrar') ? '<a class="btn btn-primario" href="#/eventos/novo">Registrar evento</a>' : ''}</div>
    </div>
    ${filtrosBarra(`
      ${campo({ nome: 'de', rotulo: 'De', tipo: 'date', valor: de, largura: 'half' })}
      ${campo({ nome: 'ate', rotulo: 'Até', tipo: 'date', valor: ate, largura: 'half' })}
      ${campo({ nome: 'laboratorioId', rotulo: 'Laboratório', tipo: 'select', valor: st.laboratorioId, opcoes: opcoesLab(app, { incluirTodos: true }), largura: 'half' })}
    `)}
    ${tabela([
      { chave: 'dataReferencia', rotulo: 'Data', render: (l) => esc(fmtData(l.dataReferencia)) },
      { chave: 'tipoRotulo', rotulo: 'Tipo', render: (l) => esc(l.tipoRotulo) },
      { chave: 'equipamentoTag', rotulo: 'Equipamento', render: (l) => linkEquipamento(l.equipamentoId, l.equipamentoTag) },
      { chave: 'laboratorioSigla', rotulo: 'Lab.', render: (l) => esc(l.laboratorioSigla ?? '—') },
      { chave: 'fornecedorNome', rotulo: 'Fornecedor', render: (l) => esc(l.fornecedorNome ?? '—') },
      { chave: 'situacaoRotulo', rotulo: 'Situação', render: (l) => badgeSituacao(l.situacao, l.situacaoRotulo) },
      { chave: 'descricao', rotulo: 'Descrição', render: (l) => esc(l.descricao ?? '—') }
    ], dados.itens, { vazio: 'Nenhum evento programado no período.' })}
  `;
  return {
    html,
    montar() {
      const form = document.querySelector('[data-form-filtros]');
      form?.addEventListener('submit', (evento) => {
        evento.preventDefault();
        st.de = form.elements.de.value; st.ate = form.elements.ate.value; st.laboratorioId = form.elements.laboratorioId?.value ?? '';
        recarregar();
      });
    }
  };
}
