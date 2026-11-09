/**
 * Construtores de relatórios. Recebem a aplicação para reutilizar DTOs e escopo.
 */
import {
  LIMITES,
  RESULTADO_ROTULO,
  ESTADO_RETORNO_ROTULO,
  SITUACAO_EQUIPAMENTO_ROTULO,
  SITUACAO_EVENTO_ROTULO,
  SITUACAO_SOLICITACAO_ROTULO,
  SITUACOES_EQUIPAMENTO,
  SITUACOES_EVENTO,
  SITUACOES_SOLICITACAO,
  SINALIZACOES,
  STATUS_PRAZO_ROTULO,
  TIPO_EVENTO_ROTULO,
  TIPO_INDICACAO_ABREVIADO,
  TIPOS_EVENTO
} from '../../shared/constants.js';
import { ErroApp } from '../../shared/errors.js';
import { escopoLaboratorio } from '../domain/permissions.js';
import {
  adicionarDias,
  arredondar,
  centavosParaNumero,
  contem,
  formatarBRL,
  formatarDataBR,
  formatarNumero,
  hojeISO,
  somarMeses
} from '../../shared/utils.js';
import { COL, periodo, tituloPeriodo, equipamentosVisiveis, nomeLab, nomeItem, somaCentavos } from './model.js';

export function construirInventario(app, filtros = {}, usuario) {
  const hoje = app.hoje;
  const { de, ate } = periodo(filtros, hoje);
  const { escopo, lista } = equipamentosVisiveis(app, usuario, filtros.laboratorioId);
  const indices = app._indices();
  const equipamentos = lista
    .filter((e) => e.situacao === SITUACOES_EQUIPAMENTO.ATIVO)
    .filter((e) => !filtros.busca || contem(e.tag, filtros.busca) || contem(e.patrimonio, filtros.busca) || contem(nomeItem(app, e), filtros.busca))
    .sort((a, b) => nomeLab(app, a.laboratorioId).localeCompare(nomeLab(app, b.laboratorioId)) || a.tag.localeCompare(b.tag));

  const divergenciasPorEquipamento = new Map();
  for (const evento of app.estado.eventos) {
    if (evento.tipo !== TIPOS_EVENTO.DIVERGENCIA_INVENTARIO) continue;
    const data = evento.dataRealizacao ?? evento.dataPrevista;
    if (!data || data < de || data > ate) continue;
    const listaDiv = divergenciasPorEquipamento.get(evento.equipamentoId) ?? [];
    listaDiv.push(evento);
    divergenciasPorEquipamento.set(evento.equipamentoId, listaDiv);
  }

  const linhas = equipamentos.map((equipamento) => {
    const dto = app._dtoEquipamento(equipamento, indices);
    const divergencias = divergenciasPorEquipamento.get(equipamento.id) ?? [];
    return {
      laboratorio: dto.laboratorio?.sigla ?? '—',
      patrimonio: dto.patrimonio ?? '—',
      tag: dto.tag,
      equipamento: dto.item?.nome ?? '—',
      marca: dto.item?.fabricante ?? '—',
      localizacao: dto.localizacao ?? '—',
      ultimaCalibracao: dto.ultimaCalibracao?.dataRealizacao ?? null,
      proximaCalibracao: dto.proximaCalibracao,
      dias: dto.diasParaVencimentoCalibracao,
      status: STATUS_PRAZO_ROTULO[dto.statusCalibracao],
      divergencias: divergencias.length,
      ultimaDivergencia: divergencias.length
        ? `${divergencias[divergencias.length - 1].dataRealizacao}: ${divergencias[divergencias.length - 1].descricao}`
        : null
    };
  });

  const porLab = {};
  for (const linha of linhas) porLab[linha.laboratorio] = (porLab[linha.laboratorio] ?? 0) + 1;

  return {
    id: 'inventario',
    titulo: 'Inventário de Equipamentos Ativos',
    subtitulo: `${tituloPeriodo(de, ate)} • ${linhas.length} equipamento(s) ativo(s)`,
    geradoEm: app.agora,
    filtros: { de, ate, laboratorioId: escopo, busca: filtros.busca ?? null },
    colunas: [
      COL.texto('laboratorio', 'Laboratório', 0.9),
      COL.texto('patrimonio', 'Patrimônio', 1.2),
      COL.texto('tag', 'TAG', 1.4),
      COL.texto('equipamento', 'Equipamento', 2.6),
      COL.texto('marca', 'Marca', 1.2),
      COL.texto('localizacao', 'Localização', 1.6),
      COL.data('ultimaCalibracao', 'Última calibração', 1.2),
      COL.data('proximaCalibracao', 'Próxima calibração', 1.2),
      COL.inteiro('dias', 'Dias p/ venc.', 0.8),
      COL.texto('status', 'Status', 1),
      COL.inteiro('divergencias', 'Diverg.', 0.7),
      COL.texto('ultimaDivergencia', 'Última divergência', 2.4)
    ],
    linhas,
    resumo: [
      { rotulo: 'Equipamentos ativos', valor: String(linhas.length) },
      { rotulo: 'Laboratórios', valor: String(Object.keys(porLab).length) },
      { rotulo: 'Com divergência no período', valor: String(new Set(linhas.filter((l) => l.divergencias > 0).map((l) => l.tag)).size) },
      { rotulo: 'Vencidos', valor: String(linhas.filter((l) => l.dias !== null && l.dias < 0).length) }
    ]
  };
}

/* ------------------------------------------------------------------ */
/* Situação dos equipamentos                                           */
/* ------------------------------------------------------------------ */

export function construirSituacao(app, filtros = {}, usuario) {
  const hoje = app.hoje;
  const { escopo, lista } = equipamentosVisiveis(app, usuario, filtros.laboratorioId);
  const indices = app._indices();
  let dtos = lista.map((e) => app._dtoEquipamento(e, indices));

  if (filtros.situacao) dtos = dtos.filter((d) => d.situacao === filtros.situacao);
  if (filtros.categoriaId) dtos = dtos.filter((d) => d.item?.categoriaId === Number(filtros.categoriaId));
  if (filtros.sinal) dtos = dtos.filter((d) => d.sinalizacoes.some((s) => s.codigo === filtros.sinal));
  if (filtros.busca) dtos = dtos.filter((d) => contem(d.tag, filtros.busca) || contem(d.item?.nome, filtros.busca) || contem(d.patrimonio, filtros.busca));
  dtos = dtos.sort((a, b) => (a.laboratorio?.sigla ?? '').localeCompare(b.laboratorio?.sigla ?? '') || a.tag.localeCompare(b.tag));

  const linhas = dtos.map((d) => ({
    laboratorio: d.laboratorio?.sigla ?? '—',
    tag: d.tag,
    patrimonio: d.patrimonio ?? '—',
    equipamento: d.item?.nome ?? '—',
    categoria: d.item?.categoriaNome ?? '—',
    situacao: d.situacaoRotulo,
    calibracao: STATUS_PRAZO_ROTULO[d.statusCalibracao],
    proximaCalibracao: d.proximaCalibracao,
    dias: d.diasParaVencimentoCalibracao,
    verificacao: STATUS_PRAZO_ROTULO[d.statusVerificacao],
    sinais: d.sinalizacoes.map((s) => s.rotulo).join('; ') || '—',
    completude: d.completude === 'PARCIAL' ? 'Parcial' : 'Completa'
  }));

  return {
    id: 'situacao',
    titulo: 'Situação dos Equipamentos',
    subtitulo: `${hoje} • ${linhas.length} equipamento(s)`,
    geradoEm: app.agora,
    filtros: { ...filtros, laboratorioId: escopo },
    colunas: [
      COL.texto('laboratorio', 'Laboratório', 0.8),
      COL.texto('tag', 'TAG', 1.2),
      COL.texto('patrimonio', 'Patrimônio', 1),
      COL.texto('equipamento', 'Equipamento', 2.4),
      COL.texto('categoria', 'Categoria', 1.6),
      COL.texto('situacao', 'Situação', 1),
      COL.texto('calibracao', 'Calibração', 1),
      COL.data('proximaCalibracao', 'Próxima cal.', 1.1),
      COL.inteiro('dias', 'Dias', 0.6),
      COL.texto('verificacao', 'Verificação', 1),
      COL.texto('sinais', 'Sinalizações', 2.4),
      COL.texto('completude', 'Cadastro', 0.9)
    ],
    linhas,
    resumo: [
      { rotulo: 'Total', valor: String(linhas.length) },
      { rotulo: 'Conformes', valor: String(dtos.filter((d) => d.situacaoMetrologica === 'CONFORME').length) },
      { rotulo: 'Em atenção', valor: String(dtos.filter((d) => d.situacaoMetrologica === 'ATENCAO').length) },
      { rotulo: 'Não conformes', valor: String(dtos.filter((d) => d.situacaoMetrologica === 'NAO_CONFORME').length) },
      { rotulo: 'Sem dados', valor: String(dtos.filter((d) => d.situacaoMetrologica === 'SEM_DADOS').length) }
    ]
  };
}

/* ------------------------------------------------------------------ */
/* RF14 — Histórico de eventos                                         */
/* ------------------------------------------------------------------ */

export function construirHistorico(app, filtros = {}, usuario) {
  const hoje = app.hoje;
  const { de, ate } = periodo(filtros, hoje);
  const indices = app._indices();
  const escopo = escopoLaboratorio(usuario) ?? (filtros.laboratorioId ? Number(filtros.laboratorioId) : null);
  const idsLab = escopo === null ? null : new Set(app.estado.equipamentos.filter((e) => e.laboratorioId === escopo).map((e) => e.id));

  let eventos = app.estado.eventos.filter((e) => {
    const data = e.dataRealizacao ?? e.dataPrevista;
    if (!data || data < de || data > ate) return false;
    if (idsLab && !idsLab.has(e.equipamentoId)) return false;
    if (filtros.tipo && e.tipo !== filtros.tipo) return false;
    if (filtros.situacao && e.situacao !== filtros.situacao) return false;
    if (filtros.resultado && e.resultado !== filtros.resultado) return false;
    if (filtros.equipamentoId && e.equipamentoId !== Number(filtros.equipamentoId)) return false;
    if (filtros.fornecedorId && e.fornecedorId !== Number(filtros.fornecedorId)) return false;
    return true;
  });

  if (filtros.busca) {
    eventos = eventos.filter((e) => {
      const eq = app.estado.equipamentos.find((x) => x.id === e.equipamentoId);
      return contem(eq?.tag, filtros.busca) || contem(e.numeroCertificado, filtros.busca) || contem(e.descricao, filtros.busca);
    });
  }

  eventos = eventos.sort((a, b) => String(b.dataRealizacao ?? b.dataPrevista).localeCompare(String(a.dataRealizacao ?? a.dataPrevista)) || b.id - a.id);
  const linhas = eventos.map((e) => {
    const dto = app._dtoEvento(e, indices);
    return {
      data: dto.dataReferencia,
      tipo: dto.tipoRotulo,
      equipamento: dto.equipamentoTag,
      laboratorio: dto.laboratorioSigla,
      fornecedor: dto.fornecedorNome ?? '—',
      certificado: dto.numeroCertificado ?? '—',
      erro: dto.erroMedido,
      incerteza: dto.incerteza,
      ca: dto.caEfetivo,
      erroMaisU: dto.erroMedido === null || dto.incerteza === null ? null : arredondar(Math.abs(dto.erroMedido) + dto.incerteza, 6),
      resultado: dto.resultado ? RESULTADO_ROTULO[dto.resultado] : '—',
      custo: dto.custoRealizadoCentavos,
      situacao: dto.situacaoRotulo,
      responsavel: dto.usuarioNome ?? 'Importado/sistema'
    };
  });

  return {
    id: 'historico',
    titulo: 'Histórico de Eventos',
    subtitulo: `${tituloPeriodo(de, ate)} • ${linhas.length} evento(s)`,
    geradoEm: app.agora,
    filtros: { de, ate, laboratorioId: escopo, tipo: filtros.tipo ?? null, situacao: filtros.situacao ?? null },
    colunas: [
      COL.data('data', 'Data', 1),
      COL.texto('tipo', 'Tipo', 1.4),
      COL.texto('equipamento', 'Equipamento', 1.4),
      COL.texto('laboratorio', 'Lab.', 0.7),
      COL.texto('fornecedor', 'Fornecedor', 1.6),
      COL.texto('certificado', 'Certificado', 1.1),
      COL.numero('erro', 'Erro', 0.8),
      COL.numero('incerteza', 'U', 0.7),
      COL.numero('ca', 'CA', 0.8),
      COL.numero('erroMaisU', 'Erro+U', 0.9),
      COL.texto('resultado', 'Resultado', 0.9),
      COL.moeda('custo', 'Custo', 1),
      COL.texto('situacao', 'Situação', 0.9),
      COL.texto('responsavel', 'Responsável', 1.4)
    ],
    linhas,
    resumo: [
      { rotulo: 'Eventos', valor: String(linhas.length) },
      { rotulo: 'Calibrações', valor: String(eventos.filter((e) => e.tipo === TIPOS_EVENTO.CALIBRACAO).length) },
      { rotulo: 'Verificações', valor: String(eventos.filter((e) => e.tipo === TIPOS_EVENTO.VERIFICACAO).length) },
      { rotulo: 'Manutenções', valor: String(eventos.filter((e) => e.tipo === TIPOS_EVENTO.MANUTENCAO_CORRETIVA || e.tipo === TIPOS_EVENTO.MANUTENCAO_PREVENTIVA).length) },
      { rotulo: 'Custo realizado', valor: formatarBRL(somaCentavos(eventos)) }
    ]
  };
}

/* ------------------------------------------------------------------ */
/* Anexo 4 — Status das calibrações                                    */
/* ------------------------------------------------------------------ */

export function construirCalibracoes(app, filtros = {}, usuario) {
  const hoje = app.hoje;
  const { escopo, lista } = equipamentosVisiveis(app, usuario, filtros.laboratorioId);
  const indices = app._indices();
  const equipamentos = lista
    .filter((e) => e.situacao !== SITUACOES_EQUIPAMENTO.INATIVO)
    .sort((a, b) => nomeLab(app, a.laboratorioId).localeCompare(nomeLab(app, b.laboratorioId)) || a.tag.localeCompare(b.tag));

  const solicitacoesCalibracao = new Map();
  for (const s of app.estado.solicitacoes) {
    if (s.tipoEvento === TIPOS_EVENTO.CALIBRACAO && (s.situacao === SITUACOES_SOLICITACAO.PENDENTE || s.situacao === SITUACOES_SOLICITACAO.APROVADA)) {
      const listaSolic = solicitacoesCalibracao.get(s.equipamentoId) ?? [];
      listaSolic.push(s);
      solicitacoesCalibracao.set(s.equipamentoId, listaSolic);
    }
  }

  const linhas = equipamentos.map((equipamento) => {
    const dto = app._dtoEquipamento(equipamento, indices);
    const solicitacoes = solicitacoesCalibracao.get(equipamento.id) ?? [];
    const perMeses = dto.periodicidadeCalibracaoMeses?.valor;
    return {
      laboratorio: dto.laboratorio?.sigla ?? '—',
      id: dto.id,
      tag: dto.tag,
      equipamento: dto.item?.nome ?? '—',
      indicacao: dto.tipoIndicacao ? TIPO_INDICACAO_ABREVIADO[dto.tipoIndicacao] : '—',
      dataCalibracao: dto.ultimaCalibracao?.dataRealizacao ?? null,
      proximaCalibracao: dto.proximaCalibracao,
      pcAnos: perMeses ? arredondar(perMeses / 12, 2) : null,
      dias: dto.diasParaVencimentoCalibracao,
      status: STATUS_PRAZO_ROTULO[dto.statusCalibracao],
      cs: solicitacoes.length ? `Sim (${solicitacoes.map((s) => `nº ${s.id}`).join(', ')})` : 'Não'
    };
  });

  return {
    id: 'calibracoes',
    titulo: 'Anexo 4 — Status das Calibrações',
    subtitulo: `${hoje} • ${linhas.length} equipamento(s) • Pc em anos`,
    geradoEm: app.agora,
    filtros: { laboratorioId: escopo },
    colunas: [
      COL.texto('laboratorio', 'Laboratório', 0.9),
      COL.inteiro('id', 'Id', 0.5),
      COL.texto('tag', 'Equipamento', 1.6),
      COL.texto('equipamento', 'Descrição', 2.6),
      COL.texto('indicacao', 'A/D', 0.5),
      COL.data('dataCalibracao', 'Data da calibração', 1.2),
      COL.data('proximaCalibracao', 'Próx. calibração', 1.2),
      COL.numero('pcAnos', 'Pc (anos)', 0.8),
      COL.inteiro('dias', 'Dias p/ venc.', 0.9),
      COL.texto('status', 'Status', 1),
      COL.texto('cs', 'CS', 1.4)
    ],
    linhas,
    resumo: [
      { rotulo: 'Equipamentos', valor: String(linhas.length) },
      { rotulo: 'Vencidos', valor: String(linhas.filter((l) => l.dias !== null && l.dias < 0).length) },
      { rotulo: 'A vencer (30 dias)', valor: String(linhas.filter((l) => l.dias !== null && l.dias >= 0 && l.dias <= 30).length) },
      { rotulo: 'Sem calibração', valor: String(linhas.filter((l) => !l.dataCalibracao).length) },
      { rotulo: 'Com solicitação', valor: String(linhas.filter((l) => l.cs !== 'Não').length) }
    ]
  };
}

/* ------------------------------------------------------------------ */
/* Anexo 5 — Manutenções preventivas                                   */
/* ------------------------------------------------------------------ */

export function construirManutencoesPreventivas(app, filtros = {}, usuario) {
  const { escopo, lista } = equipamentosVisiveis(app, usuario, filtros.laboratorioId);
  const indices = app._indices();
  const linhas = [];

  for (const equipamento of lista) {
    const dto = app._dtoEquipamento(equipamento, indices);
    const eventos = (indices.eventosPorEquipamento.get(equipamento.id) ?? [])
      .filter((e) => e.tipo === TIPOS_EVENTO.MANUTENCAO_PREVENTIVA)
      .sort((a, b) => String(b.dataRealizacao ?? b.dataPrevista ?? '').localeCompare(String(a.dataRealizacao ?? a.dataPrevista ?? '')));
    const per = dto.periodicidadeManutencaoPreventivaMeses?.valor;
    if (!eventos.length && !(per > 0)) continue;
    const agendado = eventos.find((e) => e.situacao === SITUACOES_EVENTO.AGENDADO);
    const ultimo = eventos.find((e) => e.situacao === SITUACOES_EVENTO.REALIZADO);
    const proxima = agendado?.dataPrevista ?? dto.proximaManutencaoPreventiva ?? null;
    const dias = proxima ? Math.round((Date.parse(proxima) - Date.parse(app.hoje)) / 86400000) : null;
    linhas.push({
      laboratorio: dto.laboratorio?.sigla ?? '—',
      patrimonio: dto.patrimonio ?? '—',
      tag: dto.tag,
      equipamento: dto.item?.nome ?? '—',
      dataProgramada: proxima,
      descricao: agendado?.descricao ?? ultimo?.descricao ?? '—',
      pmp: per ?? null,
      proxima,
      dias,
      status: dias === null ? 'Sem programação' : dias < 0 ? 'Vencida' : dias <= 30 ? 'A vencer' : 'Programada'
    });
    if (linhas.length > 4000) break;
  }

  linhas.sort((a, b) => String(a.laboratorio).localeCompare(String(b.laboratorio)) || String(a.proxima ?? '9999').localeCompare(String(b.proxima ?? '9999')));

  return {
    id: 'manutencoes-preventivas',
    titulo: 'Anexo 5 — Acompanhamento das Manutenções Preventivas',
    subtitulo: `${app.hoje} • ${linhas.length} equipamento(s) com manutenção preventiva`,
    geradoEm: app.agora,
    filtros: { laboratorioId: escopo },
    colunas: [
      COL.texto('laboratorio', 'Laboratório', 0.8),
      COL.texto('patrimonio', 'Nº patrimônio', 1.1),
      COL.texto('tag', 'ID / TAG', 1.2),
      COL.texto('equipamento', 'Equipamento', 2.6),
      COL.data('dataProgramada', 'Data programada', 1.1),
      COL.texto('descricao', 'Descrição', 2.2),
      COL.inteiro('pmp', 'PMP (meses)', 0.8),
      COL.data('proxima', 'Data da próxima', 1.1),
      COL.texto('status', 'Status', 0.9)
    ],
    linhas,
    resumo: [
      { rotulo: 'Com manutenção', valor: String(linhas.length) },
      { rotulo: 'Vencidas', valor: String(linhas.filter((l) => l.status === 'Vencida').length) },
      { rotulo: 'A vencer', valor: String(linhas.filter((l) => l.status === 'A vencer').length) },
      { rotulo: 'Programadas', valor: String(linhas.filter((l) => l.status === 'Programada').length) }
    ]
  };
}

/* ------------------------------------------------------------------ */
/* Anexo 2 — Manutenções corretivas                                    */
/* ------------------------------------------------------------------ */

export function construirManutencoesCorretivas(app, filtros = {}, usuario) {
  const hoje = app.hoje;
  const { de, ate } = periodo(filtros, hoje);
  const indices = app._indices();
  const escopo = escopoLaboratorio(usuario) ?? (filtros.laboratorioId ? Number(filtros.laboratorioId) : null);
  const idsLab = escopo === null ? null : new Set(app.estado.equipamentos.filter((e) => e.laboratorioId === escopo).map((e) => e.id));
  const eventos = app.estado.eventos
    .filter((e) => e.tipo === TIPOS_EVENTO.MANUTENCAO_CORRETIVA && e.situacao === SITUACOES_EVENTO.REALIZADO)
    .filter((e) => e.dataRealizacao && e.dataRealizacao >= de && e.dataRealizacao <= ate)
    .filter((e) => !idsLab || idsLab.has(e.equipamentoId))
    .sort((a, b) => String(b.dataRealizacao).localeCompare(String(a.dataRealizacao)));

  const linhas = eventos.map((e) => {
    const dto = app._dtoEvento(e, indices);
    return {
      laboratorio: dto.laboratorioSigla,
      data: e.dataRealizacao,
      equipamento: dto.equipamentoTag,
      patrimonio: dto.equipamentoPatrimonio ?? '—',
      problema: e.problemaServico ?? e.descricao ?? '—',
      dataRetorno: e.dataRealizacao,
      estadoRetorno: e.estadoRetorno ? (ESTADO_RETORNO_ROTULO[e.estadoRetorno] ?? e.estadoRetorno) : '—',
      situacao: dto.situacaoRotulo,
      custo: dto.custoRealizadoCentavos,
      fornecedor: dto.fornecedorNome ?? '—'
    };
  });

  return {
    id: 'manutencoes-corretivas',
    titulo: 'Anexo 2 — Acompanhamento das Manutenções Corretivas',
    subtitulo: `${tituloPeriodo(de, ate)} • ${linhas.length} manutenção(ões)`,
    geradoEm: app.agora,
    filtros: { de, ate, laboratorioId: escopo },
    colunas: [
      COL.texto('laboratorio', 'Laboratório', 0.8),
      COL.data('data', 'Data', 1),
      COL.texto('equipamento', 'Equipamento', 1.4),
      COL.texto('patrimonio', 'Patrimônio', 1),
      COL.texto('problema', 'Problema apresentado', 3),
      COL.data('dataRetorno', 'Data de retorno', 1.1),
      COL.texto('estadoRetorno', 'Estado de retorno', 1.4),
      COL.texto('situacao', 'Situação', 0.9),
      COL.moeda('custo', 'Custo', 1),
      COL.texto('fornecedor', 'Fornecedor', 1.8)
    ],
    linhas,
    resumo: [
      { rotulo: 'Manutenções', valor: String(linhas.length) },
      { rotulo: 'Custo total', valor: formatarBRL(somaCentavos(eventos)) },
      { rotulo: 'Equipamentos', valor: String(new Set(eventos.map((e) => e.equipamentoId)).size) }
    ]
  };
}

/* ------------------------------------------------------------------ */
/* Anexo 1 — Ficha do equipamento                                      */
/* ------------------------------------------------------------------ */

export function construirFichaEquipamento(app, equipamentoId, usuario) {
  if (!equipamentoId) throw ErroApp.validacao({ equipamentoId: 'Selecione o equipamento.' });
  const dto = app.obterEquipamento(equipamentoId);
  const linhas = [];
  const add = (secao, campo, valor) => linhas.push({ secao, campo, valor: valor === null || valor === undefined || valor === '' ? '—' : String(valor) });

  add('Identificação', 'TAG', dto.tag);
  add('Identificação', 'Nº de patrimônio', dto.patrimonio);
  add('Identificação', 'Nº de série', dto.numeroSerie);
  add('Identificação', 'Equipamento (item)', dto.item?.nome);
  add('Identificação', 'Fabricante', dto.item?.fabricante);
  add('Identificação', 'Modelo', dto.item?.modelo);
  add('Identificação', 'Categoria', dto.item?.categoriaNome);
  add('Identificação', 'Subcategoria', dto.item?.subcategoriaNome);
  add('Identificação', 'Laboratório', dto.laboratorio?.sigla);
  add('Identificação', 'Localização', dto.localizacao);
  add('Identificação', 'Situação', dto.situacaoRotulo);
  add('Identificação', 'Data de aquisição', formatarDataBR(dto.dataAquisicao));
  add('Identificação', 'Data de colocação em uso', formatarDataBR(dto.dataColocacaoUso));
  add('Identificação', 'Valor de aquisição', dto.valorAquisicaoCentavos === null ? '—' : formatarBRL(dto.valorAquisicaoCentavos));

  add('Dados metrológicos', 'CA da calibração', dto.caCalibracaoEfetivo.valor === null ? '—' : `${formatarNumero(dto.caCalibracaoEfetivo.valor, 6)} (${dto.caCalibracaoEfetivo.origem ?? '—'})`);
  add('Dados metrológicos', 'Periodicidade de calibração', dto.periodicidadeCalibracaoMeses.valor === null ? '—' : `${dto.periodicidadeCalibracaoMeses.valor} meses`);
  add('Dados metrológicos', 'CA da verificação', dto.caVerificacaoEfetivo.valor === null ? '—' : `${formatarNumero(dto.caVerificacaoEfetivo.valor, 6)} (${dto.caVerificacaoEfetivo.origem ?? '—'})`);
  add('Dados metrológicos', 'Periodicidade de verificação', dto.periodicidadeVerificacaoMeses.valor === null ? '—' : `${dto.periodicidadeVerificacaoMeses.valor} meses`);
  add('Dados metrológicos', 'Periodicidade de manutenção preventiva', dto.periodicidadeManutencaoPreventivaMeses.valor === null ? '—' : `${dto.periodicidadeManutencaoPreventivaMeses.valor} meses`);
  add('Dados metrológicos', 'Capacidade de medição', dto.item?.capacidadeMedicao);
  add('Dados metrológicos', 'Resolução / divisão de escala', dto.item?.resolucao);
  add('Dados metrológicos', 'Tipo de indicação', dto.tipoIndicacao ? TIPO_INDICACAO_ABREVIADO[dto.tipoIndicacao] : '—');

  add('Situação atual', 'Última calibração', dto.ultimaCalibracao ? `${formatarDataBR(dto.ultimaCalibracao.dataRealizacao)} — ${dto.ultimaCalibracao.resultado ? RESULTADO_ROTULO[dto.ultimaCalibracao.resultado] : 'resultado não informado'}` : '—');
  add('Situação atual', 'Próxima calibração', `${formatarDataBR(dto.proximaCalibracao)}${dto.diasParaVencimentoCalibracao === null ? '' : ` (${dto.diasParaVencimentoCalibracao} dias)`}`);
  add('Situação atual', 'Última verificação', dto.ultimaVerificacao ? formatarDataBR(dto.ultimaVerificacao.dataRealizacao) : '—');
  add('Situação atual', 'Próxima verificação', formatarDataBR(dto.proximaVerificacao));
  add('Situação atual', 'Sinalizações', dto.sinalizacoes.map((s) => s.rotulo).join('; ') || 'Nenhuma');
  add('Situação atual', 'Completude do cadastro', `${dto.completude}${dto.camposPendentes.length ? ` — pendentes: ${dto.camposPendentes.join(', ')}` : ''}`);

  for (const evento of dto.eventos ?? []) {
    const data = formatarDataBR(evento.dataRealizacao ?? evento.dataPrevista);
    add('Histórico de eventos', `#${evento.id} ${data} — ${evento.tipoRotulo}`, [
      evento.situacaoRotulo,
      evento.numeroCertificado ? `Certificado ${evento.numeroCertificado}` : null,
      evento.erroMedido !== null ? `Erro ${formatarNumero(evento.erroMedido, 6)}` : null,
      evento.incerteza !== null ? `U ${formatarNumero(evento.incerteza, 6)}` : null,
      evento.resultado ? RESULTADO_ROTULO[evento.resultado] : null,
      evento.fornecedorNome,
      evento.custoRealizadoCentavos === null ? null : formatarBRL(evento.custoRealizadoCentavos)
    ].filter(Boolean).join(' • '));
  }

  return {
    id: 'ficha',
    titulo: `Ficha do Equipamento — ${dto.tag}`,
    subtitulo: `${dto.item?.nome ?? '—'} • ${dto.laboratorio?.sigla ?? '—'} • ${dto.situacaoRotulo}`,
    geradoEm: app.agora,
    filtros: { equipamentoId: dto.id },
    colunas: [COL.texto('secao', 'Seção', 1.2), COL.texto('campo', 'Campo', 2.4), COL.texto('valor', 'Valor', 4.4)],
    linhas,
    resumo: [
      { rotulo: 'TAG', valor: dto.tag },
      { rotulo: 'Patrimônio', valor: dto.patrimonio ?? '—' },
      { rotulo: 'Laboratório', valor: dto.laboratorio?.sigla ?? '—' }
    ]
  };
}

/* ------------------------------------------------------------------ */
/* RF15 — Custos x receita                                             */
/* ------------------------------------------------------------------ */

export function construirCustos(app, filtros = {}, usuario) {
  const hoje = app.hoje;
  const { de, ate } = periodo(filtros, hoje);
  const escopo = escopoLaboratorio(usuario) ?? (filtros.laboratorioId ? Number(filtros.laboratorioId) : null);
  const laboratorios = app.estado.laboratorios.filter((l) => escopo === null || l.id === escopo);

  const meses = (() => {
    const inicio = Date.parse(`${de}T00:00:00Z`);
    const fim = Date.parse(`${ate}T00:00:00Z`);
    const dias = Math.max(1, Math.round((fim - inicio) / 86400000));
    return Math.max(1, Math.round(dias / 30.4375));
  })();

  const linhas = [];
  const totais = { calibracao: 0, verificacao: 0, preventiva: 0, corretiva: 0, total: 0 };
  let labsComCusto = 0;
  let labsComReceita = 0;

  for (const lab of laboratorios) {
    const ids = new Set(app.estado.equipamentos.filter((e) => e.laboratorioId === lab.id).map((e) => e.id));
    const eventos = app.estado.eventos.filter((e) => e.situacao === SITUACOES_EVENTO.REALIZADO
      && e.dataRealizacao && e.dataRealizacao >= de && e.dataRealizacao <= ate
      && ids.has(e.equipamentoId)
      && e.custoRealizadoCentavos !== null && e.custoRealizadoCentavos !== undefined);
    const porTipo = {
      calibracao: somaCentavos(eventos.filter((e) => e.tipo === TIPOS_EVENTO.CALIBRACAO)),
      verificacao: somaCentavos(eventos.filter((e) => e.tipo === TIPOS_EVENTO.VERIFICACAO)),
      preventiva: somaCentavos(eventos.filter((e) => e.tipo === TIPOS_EVENTO.MANUTENCAO_PREVENTIVA)),
      corretiva: somaCentavos(eventos.filter((e) => e.tipo === TIPOS_EVENTO.MANUTENCAO_CORRETIVA))
    };
    const custoTotal = eventos.length ? Object.values(porTipo).reduce((a, b) => a + b, 0) : null;
    const receitaMensal = lab.receitaMensalCentavos ?? null;
    const receitaPeriodo = receitaMensal === null ? null : receitaMensal * meses;
    const relacao = custoTotal !== null && receitaPeriodo ? custoTotal / receitaPeriodo : null;

    if (custoTotal !== null) labsComCusto += 1;
    if (receitaMensal !== null) labsComReceita += 1;
    if (custoTotal !== null) {
      totais.calibracao += porTipo.calibracao;
      totais.verificacao += porTipo.verificacao;
      totais.preventiva += porTipo.preventiva;
      totais.corretiva += porTipo.corretiva;
      totais.total += custoTotal;
    }

    linhas.push({
      laboratorio: lab.sigla,
      nome: lab.nome,
      meses,
      receitaMensal,
      receitaPeriodo,
      custoCalibracao: eventos.length ? porTipo.calibracao : null,
      custoVerificacao: eventos.length ? porTipo.verificacao : null,
      custoPreventiva: eventos.length ? porTipo.preventiva : null,
      custoCorretiva: eventos.length ? porTipo.corretiva : null,
      custoTotal,
      relacao,
      eventosComCusto: eventos.length,
      situacao: receitaMensal === null ? 'RECEITA_NAO_INFORMADA' : custoTotal === null ? 'SEM_DADOS' : 'CALCULADO'
    });
  }

  linhas.sort((a, b) => a.laboratorio.localeCompare(b.laboratorio));

  return {
    id: 'custos',
    titulo: 'Indicadores de Custos x Receita por Laboratório',
    subtitulo: `${tituloPeriodo(de, ate)} • ${meses} mês(es) • receita mensal informada para ${labsComReceita}/${laboratorios.length} laboratório(s)`,
    geradoEm: app.agora,
    filtros: { de, ate, laboratorioId: escopo },
    colunas: [
      COL.texto('laboratorio', 'Laboratório', 0.8),
      COL.inteiro('meses', 'Meses', 0.5),
      COL.moeda('receitaMensal', 'Receita mensal', 1.2),
      COL.moeda('receitaPeriodo', 'Receita período', 1.3),
      COL.moeda('custoCalibracao', 'Calibração', 1.1),
      COL.moeda('custoVerificacao', 'Verificação', 1.1),
      COL.moeda('custoPreventiva', 'Man. preventiva', 1.2),
      COL.moeda('custoCorretiva', 'Man. corretiva', 1.2),
      COL.moeda('custoTotal', 'Custo total', 1.2),
      COL.percentual('relacao', 'Custo/receita', 1),
      COL.inteiro('eventosComCusto', 'Eventos', 0.7)
    ],
    linhas,
    resumo: [
      { rotulo: 'Custo total', valor: formatarBRL(totais.total) },
      { rotulo: 'Calibração', valor: formatarBRL(totais.calibracao) },
      { rotulo: 'Verificação', valor: formatarBRL(totais.verificacao) },
      { rotulo: 'Manutenção preventiva', valor: formatarBRL(totais.preventiva) },
      { rotulo: 'Manutenção corretiva', valor: formatarBRL(totais.corretiva) },
      { rotulo: 'Laboratórios com custo', valor: `${labsComCusto}/${laboratorios.length}` },
      { rotulo: 'Receita informada', valor: `${labsComReceita}/${laboratorios.length}` }
    ]
  };
}

/* ------------------------------------------------------------------ */
/* Formatação de células                                              */
/* ------------------------------------------------------------------ */
