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

import { RegistryApplication } from './registry-application.js';

export class OperationsApplication extends RegistryApplication {

  _equipamentosVisiveis(usuario, laboratorioId = null) {
    const escopo = this.escopoLaboratorio(usuario, laboratorioId);
    return this.estado.equipamentos.filter((e) => escopo === null || e.laboratorioId === escopo);
  }

  _eventosVisiveis(usuario, laboratorioId = null) {
    const escopo = this.escopoLaboratorio(usuario, laboratorioId);
    if (escopo === null) return this.estado.eventos;
    const ids = new Set(this.estado.equipamentos.filter((e) => e.laboratorioId === escopo).map((e) => e.id));
    return this.estado.eventos.filter((e) => ids.has(e.equipamentoId));
  }

  resumoPainel(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.PAINEL_CONSULTAR);
    const indices = this._indices();
    const equipamentos = this._equipamentosVisiveis(ctx.usuario, filtros.laboratorioId);
    const dtos = equipamentos.map((e) => this._dtoEquipamento(e, indices));
    const eventos = this._eventosVisiveis(ctx.usuario, filtros.laboratorioId);
    const mesAtual = this.hoje.slice(0, 7);
    const custosMes = eventos
      .filter((e) => e.situacao === SITUACOES_EVENTO.REALIZADO && e.dataRealizacao?.startsWith(mesAtual))
      .reduce((acc, e) => acc + (e.custoRealizadoCentavos ?? 0), 0);
    const pendentes = this._solicitacoesPendentesVisiveis(ctx.usuario, indices);
    const porLab = new Map();
    for (const eq of dtos) {
      const chave = eq.laboratorio?.sigla ?? '—';
      const atual = porLab.get(chave) ?? { sigla: chave, total: 0, vencidas: 0, ativos: 0 };
      atual.total += 1;
      atual.vencidas += eq.sinalizacoes.some((s) => s.codigo === SINALIZACOES.CALIBRACAO_VENCIDA) ? 1 : 0;
      atual.ativos += eq.situacao === SITUACOES_EQUIPAMENTO.ATIVO ? 1 : 0;
      porLab.set(chave, atual);
    }

    return {
      cards: {
        calibracoesVencidas: dtos.filter((e) => e.sinalizacoes.some((s) => s.codigo === SINALIZACOES.CALIBRACAO_VENCIDA)).length,
        calibracoesAVencer: dtos.filter((e) => e.statusCalibracao === STATUS_PRAZO.A_VENCER).length,
        calibracoesReprovadas: dtos.filter((e) => e.sinalizacoes.some((s) => s.codigo === SINALIZACOES.CALIBRACAO_REPROVADA)).length,
        manutencoesPendentes: eventos.filter((e) => e.tipo === TIPOS_EVENTO.MANUTENCAO_PREVENTIVA && e.situacao === SITUACOES_EVENTO.AGENDADO).length,
        equipamentosAtivos: dtos.filter((e) => e.situacao === SITUACOES_EQUIPAMENTO.ATIVO).length,
        equipamentosInativos: dtos.filter((e) => e.situacao === SITUACOES_EQUIPAMENTO.INATIVO).length,
        equipamentosEmManutencao: dtos.filter((e) => e.situacao === SITUACOES_EQUIPAMENTO.EM_MANUTENCAO).length,
        equipamentosParciais: dtos.filter((e) => e.completude === 'PARCIAL').length,
        solicitacoesPendentes: pendentes.length,
        custosMesCentavos: custosMes,
        custosMes: formatarBRL(custosMes)
      },
      porLaboratorio: [...porLab.values()].sort((a, b) => b.vencidas - a.vencidas),
      alertas: this.listarAlertas({ ...filtros, limite: 8 }).itens,
      atualizadoEm: this.agora,
      escopoLaboratorioId: escopoLaboratorio(ctx.usuario)
    };
  }

  listarAlertas(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.PAINEL_CONSULTAR);
    const indices = this._indices();
    const equipamentos = this._equipamentosVisiveis(ctx.usuario, filtros.laboratorioId);
    const limite = Math.min(200, Number(filtros.limite ?? 100));
    const alertas = [];

    for (const equipamento of equipamentos) {
      const dto = this._dtoEquipamento(equipamento, indices);
      const lab = dto.laboratorio?.sigla ?? '—';
      const base = {
        equipamentoId: equipamento.id,
        equipamentoTag: equipamento.tag,
        laboratorioSigla: lab,
        rota: `#/equipamentos/${equipamento.id}`
      };
      if (dto.statusCalibracao === STATUS_PRAZO.VENCIDO) {
        alertas.push({
          ...base,
          id: `CAL-V-${equipamento.id}`,
          tipo: 'CALIBRACAO_VENCIDA',
          nivel: NIVEIS_ALERTA.CRITICO,
          titulo: `Calibração vencida — ${equipamento.tag}`,
          descricao: `Vencida em ${formatarDataBR(dto.proximaCalibracao)} (${Math.abs(dto.diasParaVencimentoCalibracao)} dia(s)).`,
          dias: dto.diasParaVencimentoCalibracao,
          data: dto.proximaCalibracao
        });
      } else if (dto.statusCalibracao === STATUS_PRAZO.A_VENCER) {
        alertas.push({
          ...base,
          id: `CAL-A-${equipamento.id}`,
          tipo: 'CALIBRACAO_A_VENCER',
          nivel: NIVEIS_ALERTA.ALTO,
          titulo: `Calibração a vencer — ${equipamento.tag}`,
          descricao: `Vence em ${formatarDataBR(dto.proximaCalibracao)} (${dto.diasParaVencimentoCalibracao} dia(s)).`,
          dias: dto.diasParaVencimentoCalibracao,
          data: dto.proximaCalibracao
        });
      }
      if (dto.sinalizacoes.some((s) => s.codigo === SINALIZACOES.CALIBRACAO_REPROVADA)) {
        alertas.push({
          ...base,
          id: `CAL-R-${equipamento.id}`,
          tipo: 'CALIBRACAO_REPROVADA',
          nivel: NIVEIS_ALERTA.CRITICO,
          titulo: `Calibração reprovada — ${equipamento.tag}`,
          descricao: dto.sinalizacoes.find((s) => s.codigo === SINALIZACOES.CALIBRACAO_REPROVADA)?.detalhe ?? '',
          dias: null,
          data: dto.ultimaCalibracao?.dataRealizacao ?? null
        });
      }
      if (dto.statusVerificacao === STATUS_PRAZO.VENCIDO) {
        alertas.push({
          ...base,
          id: `VER-V-${equipamento.id}`,
          tipo: 'VERIFICACAO_VENCIDA',
          nivel: NIVEIS_ALERTA.ALTO,
          titulo: `Verificação vencida — ${equipamento.tag}`,
          descricao: `Vencida em ${formatarDataBR(dto.proximaVerificacao)}.`,
          dias: dto.diasParaVencimentoVerificacao,
          data: dto.proximaVerificacao
        });
      } else if (dto.statusVerificacao === STATUS_PRAZO.A_VENCER) {
        alertas.push({
          ...base,
          id: `VER-A-${equipamento.id}`,
          tipo: 'VERIFICACAO_A_VENCER',
          nivel: NIVEIS_ALERTA.MEDIO,
          titulo: `Verificação a vencer — ${equipamento.tag}`,
          descricao: `Vence em ${formatarDataBR(dto.proximaVerificacao)} (${dto.diasParaVencimentoVerificacao} dia(s)).`,
          dias: dto.diasParaVencimentoVerificacao,
          data: dto.proximaVerificacao
        });
      }
      if (dto.statusManutencao === STATUS_PRAZO.VENCIDO) {
        alertas.push({
          ...base,
          id: `PMP-V-${equipamento.id}`,
          tipo: 'MANUTENCAO_VENCIDA',
          nivel: NIVEIS_ALERTA.ALTO,
          titulo: `Manutenção preventiva vencida — ${equipamento.tag}`,
          descricao: `Prevista para ${formatarDataBR(dto.proximaManutencaoPreventiva)}.`,
          dias: dto.diasParaVencimentoManutencao,
          data: dto.proximaManutencaoPreventiva
        });
      } else if (dto.statusManutencao === STATUS_PRAZO.A_VENCER) {
        alertas.push({
          ...base,
          id: `PMP-A-${equipamento.id}`,
          tipo: 'MANUTENCAO_A_VENCER',
          nivel: NIVEIS_ALERTA.MEDIO,
          titulo: `Manutenção preventiva a vencer — ${equipamento.tag}`,
          descricao: `Prevista para ${formatarDataBR(dto.proximaManutencaoPreventiva)} (${dto.diasParaVencimentoManutencao} dia(s)).`,
          dias: dto.diasParaVencimentoManutencao,
          data: dto.proximaManutencaoPreventiva
        });
      }
    }

    for (const solicitacao of this._solicitacoesPendentesVisiveis(ctx.usuario, indices)) {
      const dto = this._dtoSolicitacao(solicitacao, indices);
      alertas.push({
        id: `SOL-${solicitacao.id}`,
        tipo: 'SOLICITACAO_PENDENTE',
        nivel: NIVEIS_ALERTA.INFO,
        titulo: `Solicitação nº ${solicitacao.id} aguardando aprovação`,
        descricao: `${dto.tipoEventoRotulo} — ${dto.equipamentoTag} (${dto.laboratorioSigla}).`,
        equipamentoId: dto.equipamentoId,
        equipamentoTag: dto.equipamentoTag,
        laboratorioSigla: dto.laboratorioSigla,
        dias: null,
        data: solicitacao.dataSolicitacao,
        rota: '#/solicitacoes'
      });
    }

    const ordem = { CRITICO: 4, ALTO: 3, MEDIO: 2, INFO: 1 };
    alertas.sort((a, b) => {
      const diff = (ordem[b.nivel] ?? 0) - (ordem[a.nivel] ?? 0);
      if (diff) return diff;
      if (a.dias !== null && b.dias !== null) return a.dias - b.dias;
      return String(a.data ?? '').localeCompare(String(b.data ?? ''));
    });
    const porNivel = alertas.reduce((acc, a) => {
      acc[a.nivel] = (acc[a.nivel] ?? 0) + 1;
      return acc;
    }, {});
    return { itens: alertas.slice(0, limite), total: alertas.length, porNivel };
  }

  listarAgenda(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_CONSULTAR);
    const indices = this._indices();
    const de = filtros.de ?? this.hoje;
    const ate = filtros.ate ?? adicionarDias(this.hoje, 365);
    const escopo = this.escopoLaboratorio(ctx.usuario, filtros.laboratorioId);
    const itens = [];
    for (const evento of this._eventosVisiveis(ctx.usuario, filtros.laboratorioId)) {
      const data = evento.dataPrevista ?? evento.dataRealizacao;
      if (!data || data < de || data > ate) continue;
      if (filtros.tipo && evento.tipo !== filtros.tipo) continue;
      if (filtros.situacao && evento.situacao !== filtros.situacao) continue;
      const dto = this._dtoEvento(evento, indices);
      if (filtros.laboratorioId && Number(dto.laboratorioId) !== Number(filtros.laboratorioId)) continue;
      if (escopo !== null && dto.laboratorioId !== escopo) continue;
      itens.push(dto);
    }
    itens.sort((a, b) => String(a.dataReferencia ?? '').localeCompare(String(b.dataReferencia ?? '')));
    return { de, ate, itens };
  }

  listarSolicitacoes(filtros = {}) {
    const ctx = this.ctxLeitura();
    const indices = this._indices();
    const escopo = this.escopoLaboratorio(ctx.usuario, filtros.laboratorioId);
    let lista = this.estado.solicitacoes.filter((s) => {
      const eq = this.estado.equipamentos.find((e) => e.id === s.equipamentoId);
      if (!eq) return false;
      if (escopo !== null && eq.laboratorioId !== escopo) return false;
      if (ctx.usuario.perfil === PERFIS.TECNICO) {
        return s.solicitanteId === ctx.usuario.id || eq.laboratorioId === ctx.usuario.laboratorioId;
      }
      return true;
    });
    if (filtros.situacao) lista = lista.filter((s) => s.situacao === filtros.situacao);
    if (filtros.tipoEvento) lista = lista.filter((s) => s.tipoEvento === filtros.tipoEvento);
    if (filtros.equipamentoId) lista = lista.filter((s) => s.equipamentoId === Number(filtros.equipamentoId));
    if (filtros.busca) lista = lista.filter((s) => {
      const eq = this.estado.equipamentos.find((e) => e.id === s.equipamentoId);
      return contem(eq?.tag, filtros.busca) || contem(s.justificativa, filtros.busca);
    });
    lista = lista.slice().sort((a, b) => String(b.dataSolicitacao).localeCompare(String(a.dataSolicitacao)) || b.id - a.id);
    const pagina = paginar(lista, filtros.pagina ?? 1, filtros.tamanho ?? 25);
    return { ...pagina, itens: pagina.itens.map((s) => this._dtoSolicitacao(s, indices)) };
  }

  obterSolicitacao(id) {
    const ctx = this.ctxLeitura();
    const solicitacao = localizar(this.estado, 'solicitacoes', id, 'Solicitação');
    const equipamento = localizar(this.estado, 'equipamentos', solicitacao.equipamentoId, 'Equipamento');
    if (!podeVerLaboratorio(ctx.usuario, equipamento.laboratorioId)) throw ErroApp.naoEncontrado('Solicitação', id);
    return this._dtoSolicitacao(solicitacao, this._indices());
  }

  criarSolicitacao(dados) {
    const ctx = this.ctx(PERMISSOES.SOLICITACOES_CRIAR);
    const equipamento = localizar(this.estado, 'equipamentos', dados.equipamentoId, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    if (equipamento.situacao === SITUACOES_EQUIPAMENTO.INATIVO) throw ErroApp.regra('Equipamento inativo não pode receber solicitações.');
    const v = new Validador();
    const tipoEvento = v.enum('tipoEvento', dados.tipoEvento, [
      TIPOS_EVENTO.CALIBRACAO, TIPOS_EVENTO.VERIFICACAO, TIPOS_EVENTO.MANUTENCAO_PREVENTIVA, TIPOS_EVENTO.MANUTENCAO_CORRETIVA
    ], { rotulo: 'Tipo de evento' });
    const justificativa = v.texto('justificativa', dados.justificativa, { min: 10, max: LIMITES.JUSTIFICATIVA, rotulo: 'Justificativa' });
    const dataDesejada = v.data('dataDesejada', dados.dataDesejada ?? null, { obrigatorio: false, rotulo: 'Data desejada', min: this.hoje });
    v.manual('equipamentoId', !this.estado.solicitacoes.some((s) => s.equipamentoId === equipamento.id && s.tipoEvento === tipoEvento && s.situacao === SITUACOES_SOLICITACAO.PENDENTE), 'Já existe uma solicitação pendente deste tipo para o equipamento.');
    v.lancar();
    return this._mutar(() => {
      const id = proximoId(this.estado, 'solicitacoes');
      const solicitacao = {
        id,
        equipamentoId: equipamento.id,
        solicitanteId: ctx.usuario.id,
        tipoEvento,
        justificativa,
        dataSolicitacao: this.hoje,
        dataDesejada: dataDesejada ?? null,
        situacao: SITUACOES_SOLICITACAO.PENDENTE,
        avaliadorId: null,
        dataAvaliacao: null,
        justificativaRejeicao: null,
        eventoId: null,
        criadoEm: this.agora,
        atualizadoEm: this.agora
      };
      this.estado.solicitacoes.push(solicitacao);
      this._registrarLog(ctx, { acao: ACOES_LOG.CRIAR, tabela: 'solicitacoes', registroId: id, depois: solicitacao, motivo: 'Solicitação de evento' });
      return this._dtoSolicitacao(solicitacao, this._indices());
    });
  }

  aprovarSolicitacao(id, dados = {}) {
    const ctx = this.ctx(PERMISSOES.SOLICITACOES_APROVAR);
    exigirGestorLaboratorio(ctx.usuario);
    const solicitacao = localizar(this.estado, 'solicitacoes', id, 'Solicitação');
    const equipamento = localizar(this.estado, 'equipamentos', solicitacao.equipamentoId, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    if (solicitacao.situacao !== SITUACOES_SOLICITACAO.PENDENTE) {
      throw ErroApp.regra('Esta solicitação já foi avaliada e não está mais pendente.');
    }
    if (!this.parametros.permitirAutoAprovacao && solicitacao.solicitanteId === ctx.usuario.id) {
      throw ErroApp.regra('Segregação de funções: o solicitante não pode aprovar a própria solicitação. Solicite a outro gestor.');
    }
    const motivo = exigirMotivo(dados.motivo ?? 'Aprovação de solicitação de evento', 5);
    return this._mutar(() => {
      const antes = clonar(solicitacao);
      const evento = this._criarEventoInterno({
        tipo: solicitacao.tipoEvento,
        equipamentoId: equipamento.id,
        usuarioId: ctx.usuario.id,
        solicitacaoId: solicitacao.id,
        dataPrevista: solicitacao.dataDesejada && solicitacao.dataDesejada >= this.hoje
          ? solicitacao.dataDesejada
          : adicionarDias(this.hoje, 7),
        situacao: SITUACOES_EVENTO.AGENDADO,
        descricao: `Evento gerado pela solicitação nº ${solicitacao.id}`,
        observacoes: `Aprovada por ${ctx.usuario.nome}.`
      });
      solicitacao.situacao = SITUACOES_SOLICITACAO.APROVADA;
      solicitacao.avaliadorId = ctx.usuario.id;
      solicitacao.dataAvaliacao = this.hoje;
      solicitacao.eventoId = evento.id;
      solicitacao.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.APROVAR, tabela: 'solicitacoes', registroId: solicitacao.id, antes, depois: solicitacao, motivo });
      this._registrarLog(ctx, { acao: ACOES_LOG.CRIAR, tabela: 'eventos', registroId: evento.id, depois: evento, motivo: `Evento criado pela aprovação da solicitação nº ${solicitacao.id}` });
      return { solicitacao: this._dtoSolicitacao(solicitacao, this._indices()), evento: this._dtoEvento(evento, this._indices()) };
    });
  }

  rejeitarSolicitacao(id, dados = {}) {
    const ctx = this.ctx(PERMISSOES.SOLICITACOES_APROVAR);
    exigirGestorLaboratorio(ctx.usuario);
    const solicitacao = localizar(this.estado, 'solicitacoes', id, 'Solicitação');
    const equipamento = localizar(this.estado, 'equipamentos', solicitacao.equipamentoId, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    if (solicitacao.situacao !== SITUACOES_SOLICITACAO.PENDENTE) throw ErroApp.regra('Esta solicitação já foi avaliada.');
    const v = new Validador();
    const justificativa = v.texto('justificativaRejeicao', dados.justificativaRejeicao ?? dados.justificativa, { min: 5, max: LIMITES.JUSTIFICATIVA, rotulo: 'Justificativa da rejeição' });
    const motivo = v.motivo('motivo', dados.motivo ?? justificativa, { min: 5 });
    v.lancar();
    return this._mutar(() => {
      const antes = clonar(solicitacao);
      solicitacao.situacao = SITUACOES_SOLICITACAO.REJEITADA;
      solicitacao.avaliadorId = ctx.usuario.id;
      solicitacao.dataAvaliacao = this.hoje;
      solicitacao.justificativaRejeicao = justificativa;
      solicitacao.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.REJEITAR, tabela: 'solicitacoes', registroId: solicitacao.id, antes, depois: solicitacao, motivo });
      return this._dtoSolicitacao(solicitacao, this._indices());
    });
  }

  listarEventos(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_CONSULTAR);
    const indices = this._indices();
    const escopo = this.escopoLaboratorio(ctx.usuario, filtros.laboratorioId);
    let lista = this._eventosVisiveis(ctx.usuario, filtros.laboratorioId);
    if (filtros.tipo) lista = lista.filter((e) => e.tipo === filtros.tipo);
    if (filtros.situacao) lista = lista.filter((e) => e.situacao === filtros.situacao);
    if (filtros.resultado) lista = lista.filter((e) => e.resultado === filtros.resultado);
    if (filtros.equipamentoId) lista = lista.filter((e) => e.equipamentoId === Number(filtros.equipamentoId));
    if (filtros.fornecedorId) lista = lista.filter((e) => e.fornecedorId === Number(filtros.fornecedorId));
    if (filtros.de) lista = lista.filter((e) => (e.dataRealizacao ?? e.dataPrevista ?? '') >= filtros.de);
    if (filtros.ate) lista = lista.filter((e) => (e.dataRealizacao ?? e.dataPrevista ?? '') <= filtros.ate);
    if (filtros.busca) {
      lista = lista.filter((e) => {
        const eq = this.estado.equipamentos.find((x) => x.id === e.equipamentoId);
        return contem(eq?.tag, filtros.busca) || contem(e.numeroCertificado, filtros.busca)
          || contem(e.descricao, filtros.busca) || contem(indices.itens.get(eq?.itemId)?.nome, filtros.busca);
      });
    }
    if (escopo !== null) {
      const ids = new Set(this.estado.equipamentos.filter((e) => e.laboratorioId === escopo).map((e) => e.id));
      lista = lista.filter((e) => ids.has(e.equipamentoId));
    }
    lista = lista.slice().sort((a, b) => String(b.dataRealizacao ?? b.dataPrevista ?? '').localeCompare(String(a.dataRealizacao ?? a.dataPrevista ?? '')) || b.id - a.id);
    const pagina = paginar(lista, filtros.pagina ?? 1, filtros.tamanho ?? 25);
    return { ...pagina, itens: pagina.itens.map((e) => this._dtoEvento(e, indices)) };
  }

  obterEvento(id) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_CONSULTAR);
    const evento = localizar(this.estado, 'eventos', id, 'Evento');
    const equipamento = localizar(this.estado, 'equipamentos', evento.equipamentoId, 'Equipamento');
    if (!podeVerLaboratorio(ctx.usuario, equipamento.laboratorioId)) throw ErroApp.naoEncontrado('Evento', id);
    return this._dtoEvento(evento, this._indices());
  }

  _validarFornecedorAtivo(fornecedorId) {
    if (!fornecedorId) return null;
    const fornecedor = this.estado.fornecedores.find((f) => f.id === Number(fornecedorId));
    if (!fornecedor) throw ErroApp.validacao({ fornecedorId: 'Fornecedor inválido.' });
    if (!fornecedor.ativo) throw ErroApp.validacao({ fornecedorId: 'O fornecedor está inativo.' });
    return fornecedor.id;
  }

  _validarDadosEvento(tipo, dados, equipamento, item) {
    const v = new Validador();
    const fornecedorId = this._validarFornecedorAtivo(dados.fornecedorId);
    const descricao = v.texto('descricao', dados.descricao, { obrigatorio: false, max: LIMITES.DESCRICAO, rotulo: 'Descrição' });
    const observacoes = v.texto('observacoes', dados.observacoes, { obrigatorio: false, max: LIMITES.OBSERVACOES, rotulo: 'Observações' });
    const custoEstimado = v.decimal('custoEstimadoCentavos', dados.custoEstimadoCentavos ?? null, { obrigatorio: false, min: 0, rotulo: 'Custo estimado' });
    const custoRealizado = v.decimal('custoRealizadoCentavos', dados.custoRealizadoCentavos ?? null, { obrigatorio: false, min: 0, rotulo: 'Custo realizado' });
    const dataRealizacao = v.data('dataRealizacao', dados.dataRealizacao ?? null, { obrigatorio: false, rotulo: 'Data de realização', max: this.hoje });
    const dataPrevista = v.data('dataPrevista', dados.dataPrevista ?? null, { obrigatorio: false, rotulo: 'Data prevista', min: this.hoje });

    if (TIPOS_EVENTO_METROLOGICOS.includes(tipo)) {
      const realizado = Boolean(dataRealizacao);
      if (realizado) {
        const erro = v.decimal('erroMedido', dados.erroMedido, { rotulo: 'Erro medido' });
        const incerteza = v.decimal('incerteza', dados.incerteza, { min: 0, rotulo: 'Incerteza (U)' });
        if (tipo === TIPOS_EVENTO.CALIBRACAO) {
          const certificado = v.texto('numeroCertificado', dados.numeroCertificado, { min: 1, max: 80, rotulo: 'Nº do certificado' });
          if (certificado) dados.numeroCertificado = certificado;
        }
        const ca = caEfetivo(equipamento, item, tipo);
        if (ca.valor === null || ca.valor <= 0) {
          throw ErroApp.regra(`O equipamento não possui CA de ${tipo === TIPOS_EVENTO.CALIBRACAO ? 'calibração' : 'verificação'} definido. Complete o cadastro do item/equipamento antes de registrar.`);
        }
        v.lancar();
        const calculo = calcularResultado(erro, incerteza, ca.valor);
        return {
          tipo, fornecedorId, descricao: descricao ?? null, observacoes: observacoes ?? null,
          custoEstimadoCentavos: custoEstimado === null ? null : Math.round(custoEstimado),
          custoRealizadoCentavos: custoRealizado === null ? null : Math.round(custoRealizado),
          dataRealizacao, dataPrevista: null, situacao: SITUACOES_EVENTO.REALIZADO,
          numeroCertificado: dados.numeroCertificado ? String(dados.numeroCertificado).trim() : null,
          erroMedido: erro, incerteza, caEfetivo: ca.valor, resultado: calculo.resultado
        };
      }
      if (!dataPrevista) v.falhar('dataPrevista', 'Informe a data prevista para o agendamento.');
      v.lancar();
      return {
        tipo, fornecedorId, descricao: descricao ?? null, observacoes: observacoes ?? null,
        custoEstimadoCentavos: custoEstimado === null ? null : Math.round(custoEstimado),
        custoRealizadoCentavos: null, dataRealizacao: null, dataPrevista,
        situacao: SITUACOES_EVENTO.AGENDADO, numeroCertificado: null,
        erroMedido: null, incerteza: null, caEfetivo: null, resultado: null
      };
    }

    if (tipo === TIPOS_EVENTO.MANUTENCAO_PREVENTIVA) {
      if (!descricao) v.falhar('descricao', 'Descreva o serviço de manutenção preventiva.');
      const recorrente = v.booleano('recorrente', dados.recorrente, { padrao: true });
      if (dataRealizacao) {
        v.lancar();
        return {
          tipo, fornecedorId, descricao, observacoes: observacoes ?? null,
          custoEstimadoCentavos: custoEstimado === null ? null : Math.round(custoEstimado),
          custoRealizadoCentavos: custoRealizado === null ? null : Math.round(custoRealizado),
          dataRealizacao, dataPrevista: dataPrevista ?? null, situacao: SITUACOES_EVENTO.REALIZADO,
          recorrente, numeroCertificado: null, erroMedido: null, incerteza: null, caEfetivo: null, resultado: null
        };
      }
      if (!dataPrevista) v.falhar('dataPrevista', 'Informe a data prevista para o agendamento.');
      v.lancar();
      return {
        tipo, fornecedorId, descricao, observacoes: observacoes ?? null,
        custoEstimadoCentavos: custoEstimado === null ? null : Math.round(custoEstimado),
        custoRealizadoCentavos: null, dataRealizacao: null, dataPrevista,
        situacao: SITUACOES_EVENTO.AGENDADO, recorrente, numeroCertificado: null,
        erroMedido: null, incerteza: null, caEfetivo: null, resultado: null
      };
    }

    if (tipo === TIPOS_EVENTO.MANUTENCAO_CORRETIVA) {
      const problemaServico = v.texto('problemaServico', dados.problemaServico, { min: 5, max: LIMITES.DESCRICAO, rotulo: 'Problema/serviço' });
      const estadoRetorno = v.enum('estadoRetorno', dados.estadoRetorno, Object.values(ESTADOS_RETORNO), { rotulo: 'Estado de retorno' });
      if (!fornecedorId) v.falhar('fornecedorId', 'Selecione o fornecedor da manutenção corretiva.');
      if (!dataRealizacao) v.falhar('dataRealizacao', 'Informe a data de realização da manutenção.');
      v.lancar();
      return {
        tipo, fornecedorId, descricao: descricao ?? problemaServico, observacoes: observacoes ?? null,
        custoEstimadoCentavos: null,
        custoRealizadoCentavos: custoRealizado === null ? null : Math.round(custoRealizado),
        dataRealizacao, dataPrevista: null, situacao: SITUACOES_EVENTO.REALIZADO,
        problemaServico, estadoRetorno, numeroCertificado: null,
        erroMedido: null, incerteza: null, caEfetivo: null, resultado: null, recorrente: false
      };
    }

    if (tipo === TIPOS_EVENTO.DIVERGENCIA_INVENTARIO) {
      const descricaoDivergencia = v.texto('descricao', dados.descricao, { min: 5, max: LIMITES.DESCRICAO, rotulo: 'Descrição da divergência' });
      const data = dataRealizacao ?? this.hoje;
      v.lancar();
      return {
        tipo, fornecedorId: null, descricao: descricaoDivergencia, observacoes: observacoes ?? null,
        custoEstimadoCentavos: null, custoRealizadoCentavos: null,
        dataRealizacao: data, dataPrevista: null, situacao: SITUACOES_EVENTO.REALIZADO,
        numeroCertificado: null, erroMedido: null, incerteza: null, caEfetivo: null, resultado: null, recorrente: false
      };
    }

    throw new ErroApp(CODIGOS_ERRO.VALIDACAO, 'Tipo de evento inválido.');
  }

  _criarEventoInterno(dados) {
    const id = proximoId(this.estado, 'eventos');
    const evento = {
      id,
      tipo: dados.tipo,
      equipamentoId: dados.equipamentoId,
      fornecedorId: dados.fornecedorId ?? null,
      solicitacaoId: dados.solicitacaoId ?? null,
      usuarioId: dados.usuarioId ?? null,
      dataPrevista: dados.dataPrevista ?? null,
      dataRealizacao: dados.dataRealizacao ?? null,
      situacao: dados.situacao ?? SITUACOES_EVENTO.AGENDADO,
      descricao: dados.descricao ?? null,
      observacoes: dados.observacoes ?? null,
      numeroCertificado: dados.numeroCertificado ?? null,
      erroMedido: dados.erroMedido ?? null,
      incerteza: dados.incerteza ?? null,
      caEfetivo: dados.caEfetivo ?? null,
      resultado: dados.resultado ?? null,
      custoEstimadoCentavos: dados.custoEstimadoCentavos ?? null,
      custoRealizadoCentavos: dados.custoRealizadoCentavos ?? null,
      problemaServico: dados.problemaServico ?? null,
      estadoRetorno: dados.estadoRetorno ?? null,
      recorrente: dados.recorrente ?? false,
      proximaDataPrevista: dados.proximaDataPrevista ?? null,
      origem: dados.origem ?? 'MANUAL',
      registroHistorico: false,
      criadoEm: this.agora,
      atualizadoEm: this.agora
    };
    this.estado.eventos.push(evento);
    return evento;
  }

  _aplicarEfeitosEvento(ctx, evento, equipamento, item) {
    if (evento.tipo === TIPOS_EVENTO.MANUTENCAO_CORRETIVA && evento.situacao === SITUACOES_EVENTO.REALIZADO) {
      const antes = clonar(equipamento);
      const nova = SITUACAO_POR_ESTADO_RETORNO[evento.estadoRetorno];
      if (nova && equipamento.situacao !== nova) {
        equipamento.situacao = nova;
        equipamento.atualizadoEm = this.agora;
        this._registrarLog(ctx, {
          acao: ACOES_LOG.ATUALIZAR, tabela: 'equipamentos', registroId: equipamento.id, antes,
          depois: { situacao: nova, motivo: `Manutenção corretiva nº ${evento.id}` },
          motivo: `Situação alterada pela manutenção corretiva nº ${evento.id}`
        });
      }
    }

    if (evento.tipo === TIPOS_EVENTO.MANUTENCAO_PREVENTIVA && evento.situacao === SITUACOES_EVENTO.REALIZADO && evento.recorrente) {
      const per = periodicidadeEfetiva(equipamento, item, TIPOS_EVENTO.MANUTENCAO_PREVENTIVA).valor;
      if (per && per > 0) {
        const proxima = somarMeses(evento.dataRealizacao, per);
        evento.proximaDataPrevista = proxima;
        const existente = this.estado.eventos.some((e) => e.tipo === TIPOS_EVENTO.MANUTENCAO_PREVENTIVA && e.equipamentoId === equipamento.id && e.situacao === SITUACOES_EVENTO.AGENDADO && e.dataPrevista === proxima);
        if (!existente) {
          const proximo = this._criarEventoInterno({
            tipo: TIPOS_EVENTO.MANUTENCAO_PREVENTIVA,
            equipamentoId: equipamento.id,
            fornecedorId: evento.fornecedorId,
            usuarioId: ctx?.usuario?.id ?? null,
            dataPrevista: proxima,
            situacao: SITUACOES_EVENTO.AGENDADO,
            descricao: evento.descricao,
            observacoes: `Gerada automaticamente pela recorrência do evento nº ${evento.id}.`,
            custoEstimadoCentavos: evento.custoEstimadoCentavos,
            recorrente: true,
            origem: 'SISTEMA'
          });
          this._registrarLog(ctx, {
            acao: ACOES_LOG.CRIAR, tabela: 'eventos', registroId: proximo.id, depois: proximo,
            motivo: `Recorrência da manutenção preventiva nº ${evento.id}`
          });
        }
      }
    }
  }

  criarEvento(dados) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_REGISTRAR);
    const equipamento = localizar(this.estado, 'equipamentos', dados.equipamentoId, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    if (equipamento.situacao === SITUACOES_EQUIPAMENTO.INATIVO) throw ErroApp.regra('Equipamento inativo não pode receber eventos.');
    const tipo = String(dados.tipo ?? '');
    if (!Object.values(TIPOS_EVENTO).includes(tipo)) throw ErroApp.validacao({ tipo: 'Tipo de evento inválido.' });
    if (equipamento.situacao === SITUACOES_EQUIPAMENTO.EM_MANUTENCAO && TIPOS_EVENTO_METROLOGICOS.includes(tipo)) {
      throw ErroApp.regra('Equipamento em manutenção não pode ser calibrado ou verificado até retornar ao uso.');
    }
    const item = this.estado.itens.find((i) => i.id === equipamento.itemId);
    if (!item?.ativo) throw ErroApp.regra('O item do equipamento está inativo.');
    const valores = this._validarDadosEvento(tipo, dados, equipamento, item);
    return this._mutar(() => {
      const evento = this._criarEventoInterno({ ...valores, equipamentoId: equipamento.id, usuarioId: ctx.usuario.id, origem: 'MANUAL' });
      this._aplicarEfeitosEvento(ctx, evento, equipamento, item);
      this._registrarLog(ctx, {
        acao: ACOES_LOG.CRIAR, tabela: 'eventos', registroId: evento.id, depois: evento,
        motivo: dados.motivo ?? `Registro de ${TIPO_EVENTO_ROTULO[tipo]}`
      });
      return this._dtoEvento(evento, this._indices());
    });
  }

  atualizarEvento(id, dados) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_REGISTRAR);
    const evento = localizar(this.estado, 'eventos', id, 'Evento');
    const equipamento = localizar(this.estado, 'equipamentos', evento.equipamentoId, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    if (evento.situacao !== SITUACOES_EVENTO.AGENDADO) throw ErroApp.regra('Somente eventos agendados podem ser alterados.');
    const motivo = exigirMotivo(dados.motivo);
    const v = new Validador();
    const dataPrevista = v.data('dataPrevista', dados.dataPrevista ?? evento.dataPrevista, { rotulo: 'Data prevista', min: this.hoje });
    const descricao = v.texto('descricao', dados.descricao ?? evento.descricao, { obrigatorio: false, max: LIMITES.DESCRICAO, rotulo: 'Descrição' });
    const observacoes = v.texto('observacoes', dados.observacoes ?? evento.observacoes, { obrigatorio: false, max: LIMITES.OBSERVACOES, rotulo: 'Observações' });
    const custoEstimado = v.decimal('custoEstimadoCentavos', dados.custoEstimadoCentavos ?? evento.custoEstimadoCentavos, { obrigatorio: false, min: 0, rotulo: 'Custo estimado' });
    const fornecedorId = this._validarFornecedorAtivo(dados.fornecedorId ?? evento.fornecedorId);
    v.lancar();
    return this._mutar(() => {
      const antes = clonar(evento);
      Object.assign(evento, {
        dataPrevista,
        descricao: descricao ?? null,
        observacoes: observacoes ?? null,
        custoEstimadoCentavos: custoEstimado === null ? null : Math.round(custoEstimado),
        fornecedorId,
        atualizadoEm: this.agora
      });
      this._registrarLog(ctx, { acao: ACOES_LOG.ATUALIZAR, tabela: 'eventos', registroId: evento.id, antes, depois: evento, motivo });
      return this._dtoEvento(evento, this._indices());
    });
  }

  realizarEvento(id, dados = {}) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_REGISTRAR);
    const evento = localizar(this.estado, 'eventos', id, 'Evento');
    const equipamento = localizar(this.estado, 'equipamentos', evento.equipamentoId, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    if (evento.situacao !== SITUACOES_EVENTO.AGENDADO) throw ErroApp.regra('Somente eventos agendados podem ser realizados.');
    if (equipamento.situacao === SITUACOES_EQUIPAMENTO.INATIVO) throw ErroApp.regra('Equipamento inativo não pode receber realização de evento.');
    const item = this.estado.itens.find((i) => i.id === equipamento.itemId);
    const motivo = exigirMotivo(dados.motivo ?? 'Realização de evento agendado', 5);
    const valores = this._validarDadosEvento(evento.tipo, {
      ...dados,
      fornecedorId: dados.fornecedorId ?? evento.fornecedorId,
      dataRealizacao: dados.dataRealizacao ?? this.hoje,
      dataPrevista: null
    }, equipamento, item);

    return this._mutar(() => {
      const antes = clonar(evento);
      Object.assign(evento, valores, {
        dataRealizacao: valores.dataRealizacao ?? this.hoje,
        situacao: SITUACOES_EVENTO.REALIZADO,
        atualizadoEm: this.agora
      });
      this._aplicarEfeitosEvento(ctx, evento, equipamento, item);
      this._registrarLog(ctx, { acao: ACOES_LOG.REALIZAR, tabela: 'eventos', registroId: evento.id, antes, depois: evento, motivo });
      return this._dtoEvento(evento, this._indices());
    });
  }

  cancelarEvento(id, motivo) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_REGISTRAR);
    const evento = localizar(this.estado, 'eventos', id, 'Evento');
    const equipamento = localizar(this.estado, 'equipamentos', evento.equipamentoId, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    if (evento.situacao !== SITUACOES_EVENTO.AGENDADO) throw ErroApp.regra('Somente eventos agendados podem ser cancelados.');
    const m = exigirMotivo(motivo);
    return this._mutar(() => {
      const antes = clonar(evento);
      evento.situacao = SITUACOES_EVENTO.CANCELADO;
      evento.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.CANCELAR, tabela: 'eventos', registroId: evento.id, antes, depois: evento, motivo: m });
      return this._dtoEvento(evento, this._indices());
    });
  }

  calcularPrevia(dados) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_CONSULTAR);
    const equipamento = localizar(this.estado, 'equipamentos', dados.equipamentoId, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId);
    const item = this.estado.itens.find((i) => i.id === equipamento.itemId);
    const tipo = dados.tipo === TIPOS_EVENTO.VERIFICACAO ? TIPOS_EVENTO.VERIFICACAO : TIPOS_EVENTO.CALIBRACAO;
    const ca = dados.ca !== undefined && dados.ca !== null && dados.ca !== ''
      ? { valor: Number(dados.ca), origem: 'INFORMADO' }
      : caEfetivo(equipamento, item, tipo);
    if (!ca.valor || ca.valor <= 0) {
      throw ErroApp.regra('CA não definido para este equipamento. Informe o CA do item ou do equipamento.');
    }
    const v = new Validador();
    const erro = v.decimal('erroMedido', dados.erroMedido, { rotulo: 'Erro medido' });
    const incerteza = v.decimal('incerteza', dados.incerteza, { min: 0, rotulo: 'Incerteza (U)' });
    v.lancar();
    return {
      ...calcularResultado(erro, incerteza, ca.valor),
      caOrigem: ca.origem,
      aprovado: calcularResultado(erro, incerteza, ca.valor).resultado === 'APROVADO'
    };
  }

}
