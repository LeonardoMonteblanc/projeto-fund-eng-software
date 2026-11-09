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

import { OperationsApplication } from './operations-application.js';

export class ReportingApplication extends OperationsApplication {

  relatorioInventario(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.INVENTARIO_GERAR);
    return construirInventario(this, filtros, ctx.usuario);
  }

  relatorioSituacao(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.RELATORIOS_OPERACIONAIS);
    return construirSituacao(this, filtros, ctx.usuario);
  }

  relatorioHistorico(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.RELATORIOS_OPERACIONAIS);
    return construirHistorico(this, filtros, ctx.usuario);
  }

  relatorioCalibracoes(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.RELATORIOS_OPERACIONAIS);
    return construirCalibracoes(this, filtros, ctx.usuario);
  }

  relatorioManutencoesPreventivas(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.RELATORIOS_OPERACIONAIS);
    return construirManutencoesPreventivas(this, filtros, ctx.usuario);
  }

  relatorioManutencoesCorretivas(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.RELATORIOS_OPERACIONAIS);
    return construirManutencoesCorretivas(this, filtros, ctx.usuario);
  }

  relatorioFichaEquipamento(id) {
    const ctx = this.ctx(PERMISSOES.EQUIPAMENTOS_CONSULTAR);
    return construirFichaEquipamento(this, id, ctx.usuario);
  }

  relatorioCustos(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.INDICADORES_CUSTOS);
    exigirGestorGeral(ctx.usuario);
    return construirCustos(this, filtros, ctx.usuario);
  }

  exportarRelatorio(id, formato = 'pdf', filtros = {}) {
    const builders = {
      inventario: { permissao: PERMISSOES.INVENTARIO_GERAR, fn: (usuario) => construirInventario(this, filtros, usuario) },
      situacao: { permissao: PERMISSOES.RELATORIOS_OPERACIONAIS, fn: (usuario) => construirSituacao(this, filtros, usuario) },
      historico: { permissao: PERMISSOES.RELATORIOS_OPERACIONAIS, fn: (usuario) => construirHistorico(this, filtros, usuario) },
      calibracoes: { permissao: PERMISSOES.RELATORIOS_OPERACIONAIS, fn: (usuario) => construirCalibracoes(this, filtros, usuario) },
      'manutencoes-preventivas': { permissao: PERMISSOES.RELATORIOS_OPERACIONAIS, fn: (usuario) => construirManutencoesPreventivas(this, filtros, usuario) },
      'manutencoes-corretivas': { permissao: PERMISSOES.RELATORIOS_OPERACIONAIS, fn: (usuario) => construirManutencoesCorretivas(this, filtros, usuario) },
      ficha: { permissao: PERMISSOES.EQUIPAMENTOS_CONSULTAR, fn: (usuario) => construirFichaEquipamento(this, filtros.equipamentoId, usuario) },
      custos: { permissao: PERMISSOES.INDICADORES_CUSTOS, fn: (usuario) => construirCustos(this, filtros, usuario) }
    };
    const definicao = builders[id];
    if (!definicao) throw new ErroApp(CODIGOS_ERRO.NAO_ENCONTRADO, 'Relatório não encontrado.');
    const ctx = this.ctx(definicao.permissao);
    if (id === 'custos') exigirGestorGeral(ctx.usuario);
    const tabela = definicao.fn(ctx.usuario);
    const arquivo = exportarTabela(tabela, formato, this.hoje);
    this._mutar(() => {
      this._registrarLog(ctx, {
        acao: ACOES_LOG.EXPORTAR,
        tabela: 'relatorios',
        registroId: null,
        depois: { relatorio: id, formato, linhas: tabela.linhas.length },
        motivo: `Exportação do relatório ${tabela.titulo} em ${String(formato).toUpperCase()}`
      });
    });
    return { ...arquivo, relatorio: id, titulo: tabela.titulo, linhas: tabela.linhas.length };
  }

  _dtoLog(log) {
    const usuario = log.usuarioId ? this.estado.usuarios.find((u) => u.id === log.usuarioId) : null;
    return {
      ...log,
      usuarioNome: usuario?.nome ?? 'Sistema',
      usuarioEmail: usuario?.email ?? null,
      acaoRotulo: ACAO_LOG_ROTULO[log.acao] ?? log.acao,
      tabelaRotulo: TABELAS_AUDITADAS[log.tabelaAfetada] ?? log.tabelaAfetada
    };
  }

  listarAuditoria(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.AUDITORIA_CONSULTAR);
    exigirGestorGeral(ctx.usuario);
    let lista = this.estado.logs.slice().sort((a, b) => String(b.dataHora).localeCompare(String(a.dataHora)) || b.id - a.id);
    if (filtros.usuarioId) lista = lista.filter((l) => l.usuarioId === Number(filtros.usuarioId));
    if (filtros.tabela) lista = lista.filter((l) => l.tabelaAfetada === filtros.tabela);
    if (filtros.acao) lista = lista.filter((l) => l.acao === filtros.acao);
    if (filtros.de) lista = lista.filter((l) => l.dataHora.slice(0, 10) >= filtros.de);
    if (filtros.ate) lista = lista.filter((l) => l.dataHora.slice(0, 10) <= filtros.ate);
    if (filtros.busca) {
      lista = lista.filter((l) => contem(JSON.stringify(l.dadosNovos), filtros.busca)
        || contem(JSON.stringify(l.dadosAnteriores), filtros.busca)
        || contem(l.motivo, filtros.busca));
    }
    const pagina = paginar(lista, filtros.pagina ?? 1, filtros.tamanho ?? 50);
    return { ...pagina, itens: pagina.itens.map((l) => this._dtoLog(l)) };
  }

  obterAuditoria(id) {
    const ctx = this.ctx(PERMISSOES.AUDITORIA_CONSULTAR);
    exigirGestorGeral(ctx.usuario);
    return this._dtoLog(localizar(this.estado, 'logs', id, 'Registro de auditoria'));
  }

}
