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
import { abrirFormularioSolicitacao, abrirRealizarEvento } from './operations.js';

export function paginaEquipamentos(app) {
  const sessao = app.auth.sessao();
  const global = [PERFIS.ADMIN, PERFIS.GESTOR_GERAL].includes(sessao.usuario.perfil);
  const st = estadoTelas.equipamentos;
  const consulta = {
    ...st,
    laboratorioId: global ? st.laboratorioId : '',
    tamanho: 25
  };
  const pagina = app.equipamentos.listar(consulta);
  const podeGerenciar = temPermissao(app, 'equipamentos.gerenciar');

  const html = `
    <div class="pagina-cabecalho">
      <div><p class="eyebrow">RF02 · RF03 · RF04 · RF17</p><h1>Equipamentos</h1>
      <p class="subtitulo">${pagina.total} registro(s) • ${pagina.resumo.ativos} ativo(s) • ${pagina.resumo.parciais} com cadastro parcial</p></div>
      <div class="cabecalho-acoes">
        <a class="btn btn-secundario" href="#/itens">Catálogo de itens</a>
        ${podeGerenciar ? '<button type="button" class="btn btn-primario" id="novo-equipamento">Novo equipamento</button>' : ''}
      </div>
    </div>
    ${filtrosBarra(`
      ${campo({ nome: 'busca', rotulo: 'Buscar', tipo: 'text', valor: st.busca, placeholder: 'TAG, patrimônio, série ou item', largura: 'half' })}
      ${global ? campo({ nome: 'laboratorioId', rotulo: 'Laboratório', tipo: 'select', valor: st.laboratorioId, opcoes: opcoesLab(app, { incluirTodos: true }), largura: 'half' }) : ''}
      ${campo({ nome: 'categoriaId', rotulo: 'Categoria', tipo: 'select', valor: st.categoriaId, opcoes: [{ valor: '', rotulo: 'Todas' }, ...opcoesCategoria(app)], largura: 'half' })}
      ${campo({ nome: 'situacao', rotulo: 'Situação', tipo: 'select', valor: st.situacao, opcoes: [{ valor: '', rotulo: 'Todas' }, ...opcoesSituacaoEquipamento()], largura: 'half' })}
      ${campo({ nome: 'sinal', rotulo: 'Sinalização', tipo: 'select', valor: st.sinal, opcoes: opcoesSinal(), largura: 'half' })}
      ${campo({ nome: 'completude', rotulo: 'Cadastro', tipo: 'select', valor: st.completude, opcoes: [{ valor: '', rotulo: 'Todos' }, { valor: 'COMPLETA', rotulo: 'Completo' }, { valor: 'PARCIAL', rotulo: 'Parcial' }], largura: 'half' })}
    `, { limpar: true })}
    ${tabela([
      { chave: 'tag', rotulo: 'TAG', render: (l) => linkEquipamento(l.id, l.tag) },
      { chave: 'item.nome', rotulo: 'Equipamento', render: (l) => `${esc(l.item?.nome ?? '—')}<small class="subtexto">${esc(l.item?.fabricante ?? '')}${l.item?.modelo ? ` • ${esc(l.item.modelo)}` : ''}</small>` },
      { chave: 'laboratorio.sigla', rotulo: 'Lab.', render: (l) => esc(l.laboratorio?.sigla ?? '—') },
      { chave: 'situacaoRotulo', rotulo: 'Situação', render: (l) => badgeSituacao(l.situacao, l.situacaoRotulo) },
      { chave: 'proximaCalibracao', rotulo: 'Próx. calibração', render: (l) => `${esc(fmtData(l.proximaCalibracao))}<div>${badgeStatusPrazo(l.statusCalibracao, l.statusCalibracao === 'VENCIDO' ? 'Vencida' : l.statusCalibracao === 'A_VENCER' ? 'A vencer' : l.statusCalibracao === 'EM_DIA' ? 'Em dia' : 'Sem data', l.diasParaVencimentoCalibracao)}</div>` },
      { chave: 'sinalizacoes', rotulo: 'Sinalizações', render: (l) => l.sinalizacoes.length ? l.sinalizacoes.slice(0, 2).map(badgeSinal).join(' ') : '<span class="subtexto">—</span>' },
      { chave: 'completude', rotulo: 'Cadastro', render: (l) => l.completude === 'PARCIAL' ? `<span class="chip chip-info" title="${esc(l.camposPendentesRotulo.join(', '))}">Parcial</span>` : '<span class="chip chip-ok">Completo</span>' }
    ], pagina.itens, {
      vazio: 'Nenhum equipamento encontrado com os filtros atuais.',
      acoes: (l) => `<a class="btn btn-mini btn-secundario" href="#/equipamentos/${l.id}">Abrir</a>${podeGerenciar ? `<button type="button" class="btn btn-mini btn-secundario" data-editar="${l.id}">Editar</button>` : ''}`
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
          busca: form.elements.busca?.value ?? '',
          laboratorioId: form.elements.laboratorioId?.value ?? '',
          categoriaId: form.elements.categoriaId?.value ?? '',
          situacao: form.elements.situacao?.value ?? '',
          sinal: form.elements.sinal?.value ?? '',
          completude: form.elements.completude?.value ?? '',
          statusCalibracao: '',
          pagina: 1
        });
        recarregar();
      });
      document.querySelector('[data-limpar-filtros]')?.addEventListener('click', () => {
        Object.assign(st, { busca: '', laboratorioId: '', categoriaId: '', situacao: '', sinal: '', completude: '', statusCalibracao: '', pagina: 1 });
        recarregar();
      });
      document.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => {
        st.pagina = Number(b.dataset.pagina);
        recarregar();
      }));
      document.getElementById('novo-equipamento')?.addEventListener('click', () => abrirFormularioEquipamento(app));
      document.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => {
        try { abrirFormularioEquipamento(app, app.equipamentos.obter(b.dataset.editar)); }
        catch (e) { tratarErro(e); }
      }));
      // Links diretos do painel com filtros (aplicados uma vez por querystring).
      const qs = location.hash.split('?')[1] ?? '';
      if (qs && st._ultimaQuery !== qs) {
        st._ultimaQuery = qs;
        const query = new URLSearchParams(qs);
        let alterou = false;
        if (query.get('sinal') && query.get('sinal') !== st.sinal) { st.sinal = query.get('sinal'); alterou = true; }
        if (query.get('completude') && query.get('completude') !== st.completude) { st.completude = query.get('completude'); alterou = true; }
        if (query.get('situacao') && query.get('situacao') !== st.situacao) { st.situacao = query.get('situacao'); alterou = true; }
        if (query.get('statusCalibracao') && query.get('statusCalibracao') !== st.statusCalibracao) { st.statusCalibracao = query.get('statusCalibracao'); alterou = true; }
        if (alterou) { st.pagina = 1; recarregar(); }
      }
    }
  };
}

function camposEquipamento(app, valores = {}) {
  const sessao = app.auth.sessao();
  const global = [PERFIS.ADMIN, PERFIS.GESTOR_GERAL].includes(sessao.usuario.perfil);
  const labs = opcoesLab(app);
  const itens = opcoesItem(app);
  return [
    { nome: 'laboratorioId', rotulo: 'Laboratório', tipo: 'select', opcoes: global ? labs : labs.filter((l) => l.valor === sessao.usuario.laboratorioId), obrigatorio: true, largura: 'half', desabilitado: Boolean(valores.id) },
    { nome: 'itemId', rotulo: 'Item (modelo)', tipo: 'select', opcoes: itens, obrigatorio: true, largura: 'half', ajuda: 'O equipamento herda CA e periodicidade do item quando não informados.' },
    { nome: 'tag', rotulo: 'TAG', tipo: 'text', obrigatorio: true, largura: 'half', placeholder: 'Ex.: BAL 01' },
    { nome: 'patrimonio', rotulo: 'Nº de patrimônio', tipo: 'text', obrigatorio: !valores.id, largura: 'half', placeholder: 'Ex.: 013644' },
    { nome: 'numeroSerie', rotulo: 'Nº de série', tipo: 'text', obrigatorio: !valores.id, largura: 'half', placeholder: 'Ex.: 246777' },
    { nome: 'localizacao', rotulo: 'Localização', tipo: 'text', obrigatorio: !valores.id, largura: 'half', placeholder: 'Ex.: Sala 206 — Bloco G' },
    { nome: 'dataAquisicao', rotulo: 'Data de aquisição', tipo: 'date', obrigatorio: !valores.id, largura: 'half' },
    { nome: 'dataColocacaoUso', rotulo: 'Data de colocação em uso', tipo: 'date', obrigatorio: !valores.id, largura: 'half' },
    { nome: 'valorAquisicaoCentavos', rotulo: 'Valor de aquisição (R$)', tipo: 'dinheiro', obrigatorio: !valores.id, largura: 'half', placeholder: '0,00' },
    { nome: 'caCalibracao', rotulo: 'CA de calibração (opcional)', tipo: 'number', largura: 'half', passo: 'any', ajuda: 'Preencha para especializar o CA do item.' },
    { nome: 'caVerificacao', rotulo: 'CA de verificação (opcional)', tipo: 'number', largura: 'half', passo: 'any' },
    { nome: 'periodicidadeCalibracaoMeses', rotulo: 'Periodicidade de calibração (meses)', tipo: 'number', largura: 'half', passo: '1', min: 0, ajuda: '0 indica periodicidade não definida (RF17).' },
    { nome: 'periodicidadeVerificacaoMeses', rotulo: 'Periodicidade de verificação (meses)', tipo: 'number', largura: 'half', passo: '1', min: 0 },
    { nome: 'periodicidadeManutencaoPreventivaMeses', rotulo: 'Periodicidade de manutenção preventiva (meses)', tipo: 'number', largura: 'half', passo: '1', min: 0 },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', largura: 'full' }
  ];
}

export function abrirFormularioEquipamento(app, dto = null) {
  const editando = Boolean(dto?.id);
  const valores = dto ? {
    ...dto,
    valorAquisicaoCentavos: valorReais(dto.valorAquisicaoCentavos),
    caCalibracao: dto.caCalibracaoEfetivo?.origem === 'EQUIPAMENTO' ? dto.caCalibracaoEfetivo.valor : '',
    caVerificacao: dto.caVerificacaoEfetivo?.origem === 'EQUIPAMENTO' ? dto.caVerificacaoEfetivo.valor : '',
    periodicidadeCalibracaoMeses: dto.periodicidadeCalibracaoMeses?.origem === 'EQUIPAMENTO' ? dto.periodicidadeCalibracaoMeses.valor : '',
    periodicidadeVerificacaoMeses: dto.periodicidadeVerificacaoMeses?.origem === 'EQUIPAMENTO' ? dto.periodicidadeVerificacaoMeses.valor : '',
    periodicidadeManutencaoPreventivaMeses: dto.periodicidadeManutencaoPreventivaMeses?.origem === 'EQUIPAMENTO' ? dto.periodicidadeManutencaoPreventivaMeses.valor : ''
  } : {};
  const campos = camposEquipamento(app, valores);
  if (editando) campos.push({ nome: 'motivo', rotulo: 'Motivo da alteração', tipo: 'textarea', obrigatorio: true, largura: 'full' });
  const sessao = app.auth.sessao();
  if (!valores.laboratorioId && sessao.usuario.laboratorioId) valores.laboratorioId = sessao.usuario.laboratorioId;

  formularioModal({
    titulo: editando ? `Editar equipamento ${dto.tag}` : 'Novo equipamento',
    campos,
    valores,
    textoSalvar: editando ? 'Salvar alterações' : 'Cadastrar equipamento',
    largura: '860px',
    onSalvar: async (dados) => {
      if (editando) {
        await app.equipamentos.atualizar(dto.id, dados);
        toast('Equipamento atualizado.', 'sucesso');
      } else {
        await app.equipamentos.criar(dados);
        toast('Equipamento cadastrado.', 'sucesso');
      }
      recarregar();
    }
  });
}

export function paginaEquipamentoDetalhe(app, id) {
  const dto = app.equipamentos.obter(id);
  const podeGerenciar = temPermissao(app, 'equipamentos.gerenciar');
  const podeEvento = temPermissao(app, 'eventos.registrar');
  const podeSolicitar = temPermissao(app, 'solicitacoes.criar');
  const historico = app.equipamentos.historico(id, {});
  const pendentes = dto.camposPendentesRotulo ?? [];

  const html = `
    <div class="breadcrumb"><a href="#/equipamentos">Equipamentos</a> <span>/</span> ${esc(dto.tag)}</div>
    <div class="pagina-cabecalho">
      <div>
        <p class="eyebrow">${esc(dto.laboratorio?.sigla ?? '—')} • ${esc(dto.item?.categoriaNome ?? '—')}</p>
        <h1>${esc(dto.tag)} ${badgeSituacao(dto.situacao, dto.situacaoRotulo)}</h1>
        <p class="subtitulo">${esc(dto.item?.nome ?? '—')} • ${esc(dto.item?.fabricante ?? '')} ${dto.item?.modelo ? `• ${esc(dto.item.modelo)}` : ''} • ${esc(dto.localizacao ?? 'local não informado')}</p>
        <div class="chips">${dto.sinalizacoes.map(badgeSinal).join(' ') || '<span class="chip chip-ok">Sem sinalizações</span>'}</div>
      </div>
      <div class="cabecalho-acoes">
        ${podeEvento ? `<a class="btn btn-primario" href="#/eventos/novo?equipamento=${dto.id}">Registrar evento</a>` : ''}
        ${podeSolicitar ? `<button type="button" class="btn btn-secundario" id="btn-solicitar">Solicitar evento</button>` : ''}
        ${podeGerenciar ? `<button type="button" class="btn btn-secundario" id="btn-editar">Editar</button>` : ''}
        ${podeGerenciar ? (dto.situacao === 'INATIVO' ? '<button type="button" class="btn btn-secundario" id="btn-reativar">Reativar</button>' : '<button type="button" class="btn btn-perigo" id="btn-inativar">Inativar</button>') : ''}
      </div>
    </div>

    ${pendentes.length ? `<div class="aviso-inline aviso-alerta"><strong>Cadastro parcial.</strong> Pendentes: ${esc(pendentes.join(', '))}. ${podeGerenciar ? '<button type="button" class="link-botao" id="btn-completar">Completar cadastro</button>' : ''}</div>` : ''}

    <div class="grade-ficha">
      <div class="painel-ficha">
        <h2>Identificação</h2>
        <dl class="dados">
          <dt>Patrimônio</dt><dd>${esc(dto.patrimonio ?? '—')}</dd>
          <dt>Nº de série</dt><dd>${esc(dto.numeroSerie ?? '—')}</dd>
          <dt>Item</dt><dd>${esc(dto.item?.nome ?? '—')}</dd>
          <dt>Fabricante / modelo</dt><dd>${esc(dto.item?.fabricante ?? '—')} ${dto.item?.modelo ? ` / ${esc(dto.item.modelo)}` : ''}</dd>
          <dt>Categoria</dt><dd>${esc(dto.item?.categoriaNome ?? '—')} › ${esc(dto.item?.subcategoriaNome ?? '—')}</dd>
          <dt>Laboratório</dt><dd>${esc(dto.laboratorio?.sigla ?? '—')}</dd>
          <dt>Aquisição</dt><dd>${esc(fmtData(dto.dataAquisicao))} • ${esc(fmtMoeda(dto.valorAquisicaoCentavos))}</dd>
          <dt>Colocação em uso</dt><dd>${esc(fmtData(dto.dataColocacaoUso))}</dd>
          <dt>Fonte</dt><dd class="mono">${esc(dto.fonte ?? 'manual')}</dd>
        </dl>
      </div>
      <div class="painel-ficha">
        <h2>Dados metrológicos</h2>
        <dl class="dados">
          <dt>CA de calibração</dt><dd>${esc(fmtNumero(dto.caCalibracaoEfetivo.valor))} <span class="subtexto">(${esc(dto.caCalibracaoEfetivo.origem === 'ITEM' ? 'herdado do item' : dto.caCalibracaoEfetivo.origem === 'EQUIPAMENTO' ? 'do equipamento' : 'não definido')})</span></dd>
          <dt>Periodicidade de calibração</dt><dd>${dto.periodicidadeCalibracaoMeses.valor === null ? '—' : `${dto.periodicidadeCalibracaoMeses.valor} meses`}</dd>
          <dt>CA de verificação</dt><dd>${esc(fmtNumero(dto.caVerificacaoEfetivo.valor))}</dd>
          <dt>Periodicidade de verificação</dt><dd>${dto.periodicidadeVerificacaoMeses.valor === null ? '—' : `${dto.periodicidadeVerificacaoMeses.valor} meses`}</dd>
          <dt>Manutenção preventiva</dt><dd>${dto.periodicidadeManutencaoPreventivaMeses.valor === null ? '—' : `${dto.periodicidadeManutencaoPreventivaMeses.valor} meses`}</dd>
          <dt>Capacidade / resolução</dt><dd>${esc(dto.item?.capacidadeMedicao ?? '—')} • ${esc(dto.item?.resolucao ?? '—')}</dd>
          <dt>Tipo de indicação</dt><dd>${esc(dto.item?.tipoIndicacaoRotulo ?? '—')}</dd>
        </dl>
      </div>
      <div class="painel-ficha">
        <h2>Situação</h2>
        <div class="situacao-linha">
          ${badgeStatusPrazo(dto.statusCalibracao, 'Calibração', dto.diasParaVencimentoCalibracao)}
          ${badgeStatusPrazo(dto.statusVerificacao, 'Verificação', dto.diasParaVencimentoVerificacao)}
          ${badgeStatusPrazo(dto.statusManutencao, 'Manutenção', dto.diasParaVencimentoManutencao)}
        </div>
        <dl class="dados">
          <dt>Última calibração</dt><dd>${dto.ultimaCalibracao ? `${esc(fmtData(dto.ultimaCalibracao.dataRealizacao))} ${dto.ultimaCalibracao.resultado ? badgeSituacao(dto.ultimaCalibracao.resultado, dto.ultimaCalibracao.resultado === 'APROVADO' ? 'Aprovado' : 'Reprovado') : '<span class="subtexto">resultado importado não informado</span>'}` : '—'}</dd>
          <dt>Próxima calibração</dt><dd>${esc(fmtData(dto.proximaCalibracao))}</dd>
          <dt>Última verificação</dt><dd>${esc(fmtData(dto.ultimaVerificacao?.dataRealizacao))}</dd>
          <dt>Próxima verificação</dt><dd>${esc(fmtData(dto.proximaVerificacao))}</dd>
          <dt>Próxima manutenção</dt><dd>${esc(fmtData(dto.proximaManutencaoPreventiva))}</dd>
        </dl>
      </div>
    </div>

    ${secao(`Histórico de eventos (${historico.total})`, tabela([
      { chave: 'dataReferencia', rotulo: 'Data', render: (l) => esc(fmtData(l.dataReferencia)) },
      { chave: 'tipoRotulo', rotulo: 'Tipo', render: (l) => esc(l.tipoRotulo) },
      { chave: 'situacaoRotulo', rotulo: 'Situação', render: (l) => badgeSituacao(l.situacao, l.situacaoRotulo) },
      { chave: 'numeroCertificado', rotulo: 'Certificado', render: (l) => esc(l.numeroCertificado ?? '—') },
      { chave: 'resultado', rotulo: 'Resultado', render: (l) => l.resultado ? badgeSituacao(l.resultado, l.resultadoRotulo) : '<span class="subtexto">—</span>' },
      { chave: 'erroMedido', rotulo: 'Erro', render: (l) => esc(fmtNumero(l.erroMedido)) },
      { chave: 'incerteza', rotulo: 'U', render: (l) => esc(fmtNumero(l.incerteza)) },
      { chave: 'custoRealizadoCentavos', rotulo: 'Custo', render: (l) => esc(fmtMoeda(l.custoRealizadoCentavos)) },
      { chave: 'fornecedorNome', rotulo: 'Fornecedor', render: (l) => esc(l.fornecedorNome ?? '—') },
      { chave: 'usuarioNome', rotulo: 'Responsável', render: (l) => esc(l.usuarioNome ?? 'Importado') }
    ], historico.itens, {
      vazio: 'Nenhum evento registrado.',
      acoes: (l) => l.situacao === 'AGENDADO' && podeEvento ? `<button class="btn btn-mini btn-secundario" data-realizar="${l.id}">Realizar</button>` : ''
    }))}
  `;

  return {
    html,
    montar() {
      document.getElementById('btn-editar')?.addEventListener('click', () => abrirFormularioEquipamento(app, dto));
      document.getElementById('btn-completar')?.addEventListener('click', () => abrirFormularioEquipamento(app, dto));
      document.getElementById('btn-inativar')?.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Inativar equipamento', mensagem: `O equipamento <strong>${esc(dto.tag)}</strong> será inativado (exclusão lógica), preservando o histórico.`, textoConfirmar: 'Inativar', perigo: true });
        if (!motivo) return;
        try { app.equipamentos.inativar(dto.id, motivo); toast('Equipamento inativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      });
      document.getElementById('btn-reativar')?.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Reativar equipamento', mensagem: `Reativar <strong>${esc(dto.tag)}</strong>?`, textoConfirmar: 'Reativar' });
        if (!motivo) return;
        try { app.equipamentos.reativar(dto.id, motivo); toast('Equipamento reativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      });
      document.getElementById('btn-solicitar')?.addEventListener('click', () => abrirFormularioSolicitacao(app, dto));
      document.querySelectorAll('[data-realizar]').forEach((b) => b.addEventListener('click', () => abrirRealizarEvento(app, Number(b.dataset.realizar))));
    }
  };
}

export function paginaItens(app) {
  const sessao = app.auth.sessao();
  const st = estadoTelas.itens;
  const pagina = app.itens.listar({ ...st, tamanho: 25 });
  const podeGerenciar = temPermissao(app, 'itens.gerenciar');
  const podeCatalogo = temPermissao(app, 'catalogo.gerenciar');
  const categorias = app.categorias.listar({}).itens;

  const html = `
    <div class="pagina-cabecalho">
      <div><p class="eyebrow">RF02</p><h1>Itens e catálogo</h1>
      <p class="subtitulo">${pagina.total} item(ns) • o item é o modelo abstrato; o equipamento é a unidade física</p></div>
      <div class="cabecalho-acoes">
        ${podeCatalogo ? '<button type="button" class="btn btn-secundario" id="nova-categoria">Nova categoria</button>' : ''}
        ${podeGerenciar ? '<button type="button" class="btn btn-primario" id="novo-item">Novo item</button>' : ''}
      </div>
    </div>
    ${filtrosBarra(`
      ${campo({ nome: 'busca', rotulo: 'Buscar', tipo: 'text', valor: st.busca, placeholder: 'Nome, fabricante ou modelo', largura: 'half' })}
      ${campo({ nome: 'categoriaId', rotulo: 'Categoria', tipo: 'select', valor: st.categoriaId, opcoes: [{ valor: '', rotulo: 'Todas' }, ...opcoesCategoria(app)], largura: 'half' })}
      ${campo({ nome: 'subcategoriaId', rotulo: 'Subcategoria', tipo: 'select', valor: st.subcategoriaId, opcoes: [{ valor: '', rotulo: 'Todas' }, ...opcoesSubcategoria(app)], largura: 'half' })}
      ${campo({ nome: 'ativo', rotulo: 'Situação', tipo: 'select', valor: st.ativo, opcoes: [{ valor: '', rotulo: 'Todos' }, { valor: 'true', rotulo: 'Ativos' }, { valor: 'false', rotulo: 'Inativos' }], largura: 'half' })}
    `, { limpar: true })}
    ${tabela([
      { chave: 'nome', rotulo: 'Item', render: (l) => `${esc(l.nome)}<small class="subtexto">${esc(l.fabricante)}${l.modelo ? ` • ${esc(l.modelo)}` : ''}</small>` },
      { chave: 'categoriaNome', rotulo: 'Categoria', render: (l) => `${esc(l.categoriaNome ?? '—')}<small class="subtexto">${esc(l.subcategoriaNome ?? '')}</small>` },
      { chave: 'caCalibracao', rotulo: 'CA calibração', render: (l) => esc(fmtNumero(l.caCalibracao)) },
      { chave: 'periodicidadeCalibracaoMeses', rotulo: 'Periodicidade', render: (l) => l.periodicidadeCalibracaoMeses === null ? '—' : `${l.periodicidadeCalibracaoMeses} meses` },
      { chave: 'equipamentosTotal', rotulo: 'Equipamentos', render: (l) => `${l.equipamentosAtivos} ativo(s) / ${l.equipamentosTotal}` },
      { chave: 'ativo', rotulo: 'Situação', render: (l) => badgeSituacao(l.ativo ? 'ATIVO' : 'INATIVO', l.ativo ? 'Ativo' : 'Inativo') }
    ], pagina.itens, {
      vazio: 'Nenhum item encontrado.',
      acoes: (l) => `${podeGerenciar ? `<button class="btn btn-mini btn-secundario" data-editar-item="${l.id}">Editar</button>` : ''}${podeGerenciar ? (l.ativo ? `<button class="btn btn-mini btn-perigo" data-inativar-item="${l.id}">Inativar</button>` : `<button class="btn btn-mini btn-secundario" data-reativar-item="${l.id}">Reativar</button>`) : ''}`
    })}
    ${paginacao(pagina)}

    ${secao('Categorias e subcategorias', `<div class="catalogo-categorias">${categorias.map((c) => `
      <div class="categoria-card">
        <div class="categoria-topo"><strong>${esc(c.nome)}</strong>${c.ativo ? '' : badge('Inativa', 'cinza')}</div>
        <div class="subcategorias">${c.subcategorias.map((s) => `<span class="chip chip-neutro">${esc(s.nome)} <em>${s.itens}</em></span>`).join('') || '<span class="subtexto">Sem subcategorias</span>'}</div>
      </div>`).join('')}</div>`)}
  `;

  return {
    html,
    montar() {
      const form = document.querySelector('[data-form-filtros]');
      form?.addEventListener('submit', (evento) => {
        evento.preventDefault();
        Object.assign(st, {
          busca: form.elements.busca?.value ?? '',
          categoriaId: form.elements.categoriaId?.value ?? '',
          subcategoriaId: form.elements.subcategoriaId?.value ?? '',
          ativo: form.elements.ativo?.value ?? '',
          pagina: 1
        });
        recarregar();
      });
      document.querySelector('[data-limpar-filtros]')?.addEventListener('click', () => {
        Object.assign(st, { busca: '', categoriaId: '', subcategoriaId: '', ativo: '', pagina: 1 });
        recarregar();
      });
      document.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => { st.pagina = Number(b.dataset.pagina); recarregar(); }));
      document.getElementById('novo-item')?.addEventListener('click', () => abrirFormularioItem(app));
      document.getElementById('nova-categoria')?.addEventListener('click', () => abrirFormularioCategoria(app));
      document.querySelectorAll('[data-editar-item]').forEach((b) => b.addEventListener('click', () => abrirFormularioItem(app, app.itens.obter(Number(b.dataset.editarItem)))));
      document.querySelectorAll('[data-inativar-item]').forEach((b) => b.addEventListener('click', async () => {
        const item = app.itens.obter(Number(b.dataset.inativarItem));
        const motivo = await pedirMotivo({ titulo: 'Inativar item', mensagem: `Inativar o item <strong>${esc(item.nome)}</strong>?`, textoConfirmar: 'Inativar', perigo: true });
        if (!motivo) return;
        try { app.itens.inativar(item.id, motivo); toast('Item inativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
      document.querySelectorAll('[data-reativar-item]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = await pedirMotivo({ titulo: 'Reativar item', mensagem: 'Reativar este item?', textoConfirmar: 'Reativar' });
        if (!motivo) return;
        try { app.itens.reativar(Number(b.dataset.reativarItem), motivo); toast('Item reativado.', 'sucesso'); recarregar(); } catch (e) { tratarErro(e); }
      }));
    }
  };
}

function camposItem(app, dto = null) {
  const importado = dto?.origem === 'IMPORTADO';
  return [
    { nome: 'nome', rotulo: 'Nome do item', tipo: 'text', obrigatorio: true, largura: 'half' },
    { nome: 'fabricante', rotulo: 'Fabricante', tipo: 'text', obrigatorio: true, largura: 'half' },
    { nome: 'modelo', rotulo: 'Modelo', tipo: 'text', obrigatorio: !importado, largura: 'half' },
    { nome: 'subcategoriaId', rotulo: 'Subcategoria', tipo: 'select', opcoes: opcoesSubcategoria(app), obrigatorio: true, largura: 'half' },
    { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea', obrigatorio: true, largura: 'full' },
    { nome: 'capacidadeMedicao', rotulo: 'Capacidade de medição', tipo: 'text', largura: 'half' },
    { nome: 'resolucao', rotulo: 'Resolução / divisão de escala', tipo: 'text', largura: 'half' },
    { nome: 'tipoIndicacao', rotulo: 'Tipo de indicação', tipo: 'select', opcoes: [{ valor: '', rotulo: '—' }, { valor: 'ANALOGICO', rotulo: 'Analógico' }, { valor: 'DIGITAL', rotulo: 'Digital' }], largura: 'half' },
    { nome: 'caCalibracao', rotulo: 'CA de calibração', tipo: 'number', obrigatorio: true, passo: 'any', min: 0, largura: 'half' },
    { nome: 'caVerificacao', rotulo: 'CA de verificação', tipo: 'number', obrigatorio: !importado, passo: 'any', min: 0, largura: 'half' },
    { nome: 'periodicidadeCalibracaoMeses', rotulo: 'Periodicidade de calibração (meses)', tipo: 'number', obrigatorio: true, min: 0, passo: '1', largura: 'half' },
    { nome: 'periodicidadeVerificacaoMeses', rotulo: 'Periodicidade de verificação (meses)', tipo: 'number', obrigatorio: !importado, min: 0, passo: '1', largura: 'half' },
    { nome: 'periodicidadeManutencaoPreventivaMeses', rotulo: 'Periodicidade de manutenção preventiva (meses)', tipo: 'number', min: 0, passo: '1', largura: 'half' }
  ];
}

export function abrirFormularioItem(app, dto = null) {
  const campos = camposItem(app, dto);
  if (dto?.id) campos.push({ nome: 'motivo', rotulo: 'Motivo da alteração', tipo: 'textarea', obrigatorio: true, largura: 'full' });
  formularioModal({
    titulo: dto ? `Editar item ${dto.nome}` : 'Novo item',
    campos,
    valores: dto ?? {},
    onSalvar: async (dados) => {
      if (dto) { await app.itens.atualizar(dto.id, dados); toast('Item atualizado.', 'sucesso'); }
      else { await app.itens.criar(dados); toast('Item cadastrado.', 'sucesso'); }
      recarregar();
    }
  });
}

function abrirFormularioCategoria(app) {
  formularioModal({
    titulo: 'Nova categoria',
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'text', obrigatorio: true, largura: 'half' },
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'text', largura: 'half' },
      { nome: 'subcategoriaNome', rotulo: 'Subcategoria inicial (opcional)', tipo: 'text', largura: 'full' }
    ],
    onSalvar: async (dados) => {
      const categoria = app.categorias.criar({ nome: dados.nome, descricao: dados.descricao });
      if (dados.subcategoriaNome) app.categorias.criarSubcategoria({ nome: dados.subcategoriaNome, categoriaId: categoria.id });
      toast('Categoria criada.', 'sucesso');
      recarregar();
    }
  });
}
