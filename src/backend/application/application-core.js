import {
  ACOES_LOG,
  ACAO_LOG_ROTULO,
  ESTADOS_RETORNO,
  FUNCIONALIDADES,
  LIMITES,
  NIVEIS_ALERTA,
  PARAMETROS_PADRAO,
  PERFIL_ROTULO,
  PERFIS,
  PERMISSOES_POR_PERFIL,
  RESULTADO_ROTULO,
  SITUACAO_EQUIPAMENTO_ROTULO,
  SITUACAO_EVENTO_ROTULO,
  SITUACAO_POR_ESTADO_RETORNO,
  SITUACAO_SOLICITACAO_ROTULO,
  SITUACOES_EQUIPAMENTO,
  SITUACOES_EVENTO,
  SITUACOES_SOLICITACAO,
  SINALIZACOES,
  STATUS_PRAZO,
  STATUS_PRAZO_ROTULO,
  TIPO_EVENTO_ROTULO,
  TIPO_INDICACAO_ABREVIADO,
  TIPO_INDICACAO_ROTULO,
  TIPOS_EVENTO,
  TIPOS_EVENTO_MANUTENCAO,
  TIPOS_EVENTO_METROLOGICOS,
  TIPOS_INDICACAO,
  TABELAS_AUDITADAS
} from '../../shared/constants.js';
import { ErroApp, CODIGOS_ERRO } from '../../shared/errors.js';
import {
  PERMISSOES,
  exigirEscopo,
  exigirPermissao,
  exigirAdministrador,
  exigirGestorLaboratorio,
  exigirGestorGeral,
  escopoLaboratorio,
  funcionalidadesPara,
  pode,
  podeVerLaboratorio
} from '../domain/permissions.js';
import {
  CAMPOS_OBRIGATORIOS_EQUIPAMENTO,
  ROTULO_CAMPO,
  calcularMetricas,
  calcularResultado,
  caEfetivo,
  camposPendentesEquipamento,
  equipamentoCompleto,
  periodicidadeEfetiva,
  statusPrazo
} from '../domain/metrology.js';
import {
  adicionarDias,
  agoraISO,
  clonar,
  contem,
  formatarBRL,
  formatarDataBR,
  hojeISO,
  normalizar,
  ordenarPor,
  paginar,
  somarMeses,
  toISO
} from '../../shared/utils.js';
import { Validador, cnpjValido, formatarCNPJ, normalizarEmail, senhaValida } from '../../shared/validation.js';
import { criarCredenciais } from '../infrastructure/session.js';
import {
  construirInventario,
  construirSituacao,
  construirHistorico,
  construirCalibracoes,
  construirManutencoesPreventivas,
  construirManutencoesCorretivas,
  construirFichaEquipamento,
  construirCustos,
  exportarTabela
} from '../reports/index.js';

/* ------------------------------------------------------------------ */

import { sanitizar, proximoId, localizar, mesmo, exigirMotivo } from './helpers.js';

export class ApplicationCore {

  constructor({ banco, sessoes, clock, exportadores, semente }) {
    this.banco = banco;
    this.sessoes = sessoes;
    this.clock = clock;
    this.exportadores = exportadores;
    this.semente = semente;
    this.aoAlterar = null;

  }

  get estado() { return this.banco.estado; }

  get hoje() { return hojeISO(this.clock); }

  get agora() { return agoraISO(this.clock); }

  get parametros() { return this.estado.parametros; }

  ctx(permissao) {
    const { usuario, ip, token } = this.sessoes.exigirSessao();
    if (permissao) exigirPermissao(usuario, permissao);
    return { usuario, ip, token };
  }

  ctxLeitura() {
    return this.ctx(null);
  }

  escopoLaboratorio(usuario, laboratorioId = null, { escrita = false } = {}) {
    if (usuario.perfil === PERFIS.ADMIN && escrita) {
      throw ErroApp.permissao('O Administrador possui acesso somente leitura aos dados operacionais.');
    }
    if (usuario.perfil === PERFIS.GESTOR_LAB || usuario.perfil === PERFIS.TECNICO) {
      if (laboratorioId && Number(laboratorioId) !== usuario.laboratorioId) {
        throw ErroApp.permissao('Você só pode acessar dados do seu laboratório.');
      }
      return usuario.laboratorioId;
    }
    return laboratorioId ? Number(laboratorioId) : null;
  }

  _registrarLog(ctx, { acao, tabela, registroId = null, antes = null, depois = null, motivo = null }) {
    const estado = this.estado;
    const id = proximoId(estado, 'logs');
    estado.logs.push({
      id,
      usuarioId: ctx?.usuario?.id ?? null,
      tabelaAfetada: tabela,
      registroId,
      dataHora: this.agora,
      acao,
      dadosAnteriores: sanitizar(antes),
      dadosNovos: sanitizar(depois),
      motivo: motivo ?? null,
      ip: ctx?.ip ?? 'sistema'
    });
  }

  _mutar(fn) {
    const resultado = this.banco.commit(fn);
    this.aoAlterar?.();
    return resultado;
  }

  _indices() {
    const estado = this.estado;
    const itens = new Map(estado.itens.map((i) => [i.id, i]));
    const laboratorios = new Map(estado.laboratorios.map((l) => [l.id, l]));
    const categorias = new Map(estado.categorias.map((c) => [c.id, c]));
    const subcategorias = new Map(estado.subcategorias.map((s) => [s.id, s]));
    const fornecedores = new Map(estado.fornecedores.map((f) => [f.id, f]));
    const usuarios = new Map(estado.usuarios.map((u) => [u.id, u]));
    const eventosPorEquipamento = new Map();
    for (const evento of estado.eventos) {
      if (!eventosPorEquipamento.has(evento.equipamentoId)) eventosPorEquipamento.set(evento.equipamentoId, []);
      eventosPorEquipamento.get(evento.equipamentoId).push(evento);
    }
    return { itens, laboratorios, categorias, subcategorias, fornecedores, usuarios, eventosPorEquipamento };
  }

  _dtoUsuario(usuario, indices = null) {
    if (!usuario) return null;
    const labs = indices?.laboratorios ?? new Map(this.estado.laboratorios.map((l) => [l.id, l]));
    const lab = usuario.laboratorioId ? labs.get(usuario.laboratorioId) : null;
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      perfilRotulo: PERFIL_ROTULO[usuario.perfil] ?? usuario.perfil,
      laboratorioId: usuario.laboratorioId ?? null,
      laboratorioSigla: lab?.sigla ?? null,
      laboratorioNome: lab?.nome ?? null,
      ativo: usuario.ativo,
      anonimizado: Boolean(usuario.anonimizado),
      criadoEm: usuario.criadoEm,
      ultimoAcessoEm: usuario.ultimoAcessoEm ?? null
    };
  }

  _dtoLaboratorio(lab) {
    const equipamentos = this.estado.equipamentos.filter((e) => e.laboratorioId === lab.id);
    return {
      ...lab,
      equipamentosAtivos: equipamentos.filter((e) => e.situacao === SITUACOES_EQUIPAMENTO.ATIVO).length,
      equipamentosInativos: equipamentos.filter((e) => e.situacao === SITUACOES_EQUIPAMENTO.INATIVO).length,
      equipamentosEmManutencao: equipamentos.filter((e) => e.situacao === SITUACOES_EQUIPAMENTO.EM_MANUTENCAO).length,
      totalEquipamentos: equipamentos.length,
      receitaMensal: lab.receitaMensalCentavos === null || lab.receitaMensalCentavos === undefined
        ? null
        : lab.receitaMensalCentavos / 100
    };
  }

  _dtoFornecedor(fornecedor) {
    return {
      ...fornecedor,
      cnpjFormatado: formatarCNPJ(fornecedor.cnpj),
      totalEventos: this.estado.eventos.filter((e) => e.fornecedorId === fornecedor.id).length
    };
  }

  _dtoItem(item, indices) {
    if (!item) return null;
    const categoria = indices.categorias.get(item.categoriaId);
    const subcategoria = indices.subcategorias.get(item.subcategoriaId);
    return {
      ...item,
      categoriaNome: categoria?.nome ?? null,
      subcategoriaNome: subcategoria?.nome ?? null,
      tipoIndicacaoRotulo: item.tipoIndicacao ? TIPO_INDICACAO_ROTULO[item.tipoIndicacao] : null,
      tipoIndicacaoAbreviado: item.tipoIndicacao ? TIPO_INDICACAO_ABREVIADO[item.tipoIndicacao] : null,
      parametrosEstimados: item.parametrosEstimados ?? []
    };
  }

  _dtoEquipamento(equipamento, indices, eventos = null) {
    const item = indices.itens.get(equipamento.itemId);
    const laboratorio = indices.laboratorios.get(equipamento.laboratorioId);
    const listaEventos = eventos ?? indices.eventosPorEquipamento.get(equipamento.id) ?? [];
    const metricas = calcularMetricas({
      equipamento,
      item,
      eventos: listaEventos,
      hoje: this.hoje,
      diasAlerta: Number(this.parametros.diasAlertaVencimento ?? 30)
    });
    const dtoItem = this._dtoItem(item, indices);
    const caCal = metricas.efetivos.caCalibracao;
    const caVer = metricas.efetivos.caVerificacao;
    const perCal = metricas.efetivos.periodicidadeCalibracao;
    const perVer = metricas.efetivos.periodicidadeVerificacao;
    const perPmp = metricas.efetivos.periodicidadeManutencao;
    const pendentes = camposPendentesEquipamento(equipamento);

    return {
      id: equipamento.id,
      tag: equipamento.tag,
      tagOriginal: equipamento.tagOriginal ?? equipamento.tag,
      patrimonio: equipamento.patrimonio,
      numeroSerie: equipamento.numeroSerie,
      localizacao: equipamento.localizacao,
      situacao: equipamento.situacao,
      situacaoRotulo: SITUACAO_EQUIPAMENTO_ROTULO[equipamento.situacao] ?? equipamento.situacao,
      itemId: equipamento.itemId,
      item: dtoItem,
      laboratorioId: equipamento.laboratorioId,
      laboratorio: laboratorio ? { id: laboratorio.id, sigla: laboratorio.sigla, nome: laboratorio.nome } : null,
      dataAquisicao: equipamento.dataAquisicao,
      dataColocacaoUso: equipamento.dataColocacaoUso,
      valorAquisicaoCentavos: equipamento.valorAquisicaoCentavos,
      valorAquisicao: equipamento.valorAquisicaoCentavos === null ? null : equipamento.valorAquisicaoCentavos / 100,
      caCalibracaoEfetivo: caCal,
      caVerificacaoEfetivo: caVer,
      periodicidadeCalibracaoMeses: perCal,
      periodicidadeVerificacaoMeses: perVer,
      periodicidadeManutencaoPreventivaMeses: perPmp,
      tipoIndicacao: equipamento.tipoIndicacao ?? item?.tipoIndicacao ?? null,
      ...metricas,
      diasParaVencimento: metricas.diasParaVencimento,
      statusPrazoRotulo: STATUS_PRAZO_ROTULO[metricas.statusCalibracao] ?? metricas.statusCalibracao,
      completude: pendentes.length ? 'PARCIAL' : 'COMPLETA',
      camposPendentes: pendentes.length ? pendentes : [],
      camposPendentesRotulo: (pendentes.length ? pendentes : []).map((c) => ROTULO_CAMPO[c] ?? c),
      origem: equipamento.origem ?? 'MANUAL',
      observacoes: equipamento.observacoes ?? null,
      fonte: equipamento.fonte ?? null,
      certificadoImportado: equipamento.certificadoImportado ?? null,
      parametrosDemonstracao: equipamento.parametrosDemonstracao ?? [],
      criadoEm: equipamento.criadoEm,
      atualizadoEm: equipamento.atualizadoEm,
      totalEventos: listaEventos.length
    };
  }

  _dtoEvento(evento, indices) {
    const equipamento = this.estado.equipamentos.find((e) => e.id === evento.equipamentoId);
    const lab = equipamento ? indices.laboratorios.get(equipamento.laboratorioId) : null;
    const fornecedor = evento.fornecedorId ? indices.fornecedores.get(evento.fornecedorId) : null;
    const usuario = evento.usuarioId ? indices.usuarios.get(evento.usuarioId) : null;
    return {
      ...evento,
      tipoRotulo: TIPO_EVENTO_ROTULO[evento.tipo] ?? evento.tipo,
      situacaoRotulo: SITUACAO_EVENTO_ROTULO[evento.situacao] ?? evento.situacao,
      resultadoRotulo: evento.resultado ? RESULTADO_ROTULO[evento.resultado] : null,
      equipamentoTag: equipamento?.tag ?? null,
      equipamentoNome: equipamento?.itemId ? indices.itens.get(equipamento.itemId)?.nome ?? null : null,
      equipamentoPatrimonio: equipamento?.patrimonio ?? null,
      laboratorioId: equipamento?.laboratorioId ?? null,
      laboratorioSigla: lab?.sigla ?? null,
      fornecedorNome: fornecedor?.razaoSocial ?? null,
      usuarioNome: usuario?.nome ?? null,
      custoRealizado: evento.custoRealizadoCentavos === null || evento.custoRealizadoCentavos === undefined
        ? null
        : evento.custoRealizadoCentavos / 100,
      custoEstimado: evento.custoEstimadoCentavos === null || evento.custoEstimadoCentavos === undefined
        ? null
        : evento.custoEstimadoCentavos / 100,
      dataReferencia: evento.dataRealizacao ?? evento.dataPrevista,
      editavel: evento.situacao === SITUACOES_EVENTO.AGENDADO,
      podeRealizar: evento.situacao === SITUACOES_EVENTO.AGENDADO,
      podeCancelar: evento.situacao === SITUACOES_EVENTO.AGENDADO
    };
  }

  _dtoSolicitacao(solicitacao, indices) {
    const equipamento = this.estado.equipamentos.find((e) => e.id === solicitacao.equipamentoId);
    const lab = equipamento ? indices.laboratorios.get(equipamento.laboratorioId) : null;
    const solicitante = indices.usuarios.get(solicitacao.solicitanteId);
    const avaliador = solicitacao.avaliadorId ? indices.usuarios.get(solicitacao.avaliadorId) : null;
    return {
      ...solicitacao,
      tipoEventoRotulo: TIPO_EVENTO_ROTULO[solicitacao.tipoEvento] ?? solicitacao.tipoEvento,
      situacaoRotulo: SITUACAO_SOLICITACAO_ROTULO[solicitacao.situacao] ?? solicitacao.situacao,
      equipamentoTag: equipamento?.tag ?? null,
      equipamentoNome: equipamento?.itemId ? indices.itens.get(equipamento.itemId)?.nome ?? null : null,
      laboratorioId: equipamento?.laboratorioId ?? null,
      laboratorioSigla: lab?.sigla ?? null,
      solicitanteNome: solicitante?.nome ?? null,
      avaliadorNome: avaliador?.nome ?? null
    };
  }

  _solicitacoesPendentesVisiveis(usuario, indices) {
    return this.estado.solicitacoes.filter((s) => {
      if (s.situacao !== SITUACOES_SOLICITACAO.PENDENTE) return false;
      if (usuario.perfil === PERFIS.GESTOR_GERAL || usuario.perfil === PERFIS.ADMIN) return true;
      const eq = this.estado.equipamentos.find((e) => e.id === s.equipamentoId);
      if (!eq || eq.laboratorioId !== usuario.laboratorioId) return false;
      if (usuario.perfil === PERFIS.TECNICO) return s.solicitanteId === usuario.id;
      return true;
    });
  }

}
