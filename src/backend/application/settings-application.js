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

import { ReportingApplication } from './reporting-application.js';

export class SettingsApplication extends ReportingApplication {

  obterConfiguracoes() {
    const ctx = this.ctx(PERMISSOES.CONFIG_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const parametros = Object.fromEntries(Object.entries(this.parametros).filter(([chave]) => !/senha/i.test(chave)));
    return {
      parametros: clonar(parametros),
      contagens: this.infoMeta().contagens,
      armazenamento: this.banco.armazenamento?.constructor?.name ?? 'desconhecido',
      sequencias: clonar(this.estado.meta.sequencias)
    };
  }

  atualizarConfiguracoes(dados) {
    const ctx = this.ctx(PERMISSOES.CONFIG_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const motivo = exigirMotivo(dados?.motivo, 5);
    const v = new Validador();
    const diasAlerta = v.inteiro('diasAlertaVencimento', dados?.diasAlertaVencimento ?? this.parametros.diasAlertaVencimento, { min: 1, max: 365, rotulo: 'Dias de alerta' });
    const timeout = v.inteiro('timeoutSessaoMinutos', dados?.timeoutSessaoMinutos ?? this.parametros.timeoutSessaoMinutos, { min: 1, max: 480, rotulo: 'Timeout de sessão' });
    const retencao = v.inteiro('retencaoBackupDias', dados?.retencaoBackupDias ?? this.parametros.retencaoBackupDias, { min: 1, max: 90, rotulo: 'Retenção de backup' });
    const nome = v.texto('nomeSistema', dados?.nomeSistema ?? this.parametros.nomeSistema, { min: 3, max: 120, rotulo: 'Nome do sistema' });
    v.lancar();

    this._mutar(() => {
      const antes = { ...this.parametros };
      Object.assign(this.parametros, {
        nomeSistema: nome,
        diasAlertaVencimento: diasAlerta,
        timeoutSessaoMinutos: timeout,
        retencaoBackupDias: retencao
      });
      this._registrarLog(ctx, {
        acao: ACOES_LOG.ATUALIZAR,
        tabela: 'configuracoes',
        registroId: null,
        antes,
        depois: { ...this.parametros },
        motivo
      });
    });
    return this.obterConfiguracoes();
  }

  async listarBackups() {
    const ctx = this.ctx(PERMISSOES.BACKUP_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const backups = await this.banco.listarBackups();
    return backups.map((b) => ({
      ...b,
      tamanho: b.tamanhoBytes ? `${(b.tamanhoBytes / 1024 / 1024).toFixed(2)} MB` : '—'
    }));
  }

  async criarBackup(motivo) {
    const ctx = this.ctx(PERMISSOES.BACKUP_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const m = exigirMotivo(motivo ?? 'Backup manual solicitado pelo Administrador');
    await this.banco.flush();
    const backup = await this.banco.criarBackup(m);
    this._mutar(() => {
      this._registrarLog(ctx, {
        acao: ACOES_LOG.BACKUP, tabela: 'sistema', registroId: null, depois: backup, motivo: m
      });
    });
    return backup;
  }

  async exportarDados() {
    const ctx = this.ctx(PERMISSOES.BACKUP_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    await this.banco.flush();
    const texto = this.banco.exportarJSON();
    this._mutar(() => {
      this._registrarLog(ctx, {
        acao: ACOES_LOG.EXPORTAR, tabela: 'sistema', registroId: null,
        depois: { formato: 'json', equipamentos: this.estado.equipamentos.length }, motivo: 'Exportação completa dos dados'
      });
    });
    return { nomeArquivo: `labucs-dados-${this.hoje.replace(/-/g, '')}.json`, mime: 'application/json', texto };
  }

  async importarDados(texto, motivo) {
    const ctx = this.ctx(PERMISSOES.BACKUP_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const m = exigirMotivo(motivo ?? 'Importação de arquivo de dados', 5);
    await this.banco.restaurarDoTexto(texto, { motivo: m });
    this._mutar(() => {
      this._registrarLog(ctx, {
        acao: ACOES_LOG.IMPORTAR, tabela: 'sistema', registroId: null,
        depois: { equipamentos: this.estado.equipamentos.length, eventos: this.estado.eventos.length }, motivo: m
      });
    });
    return { ok: true, equipamentos: this.estado.equipamentos.length, eventos: this.estado.eventos.length };
  }

  async restaurarBackup(id, motivo) {
    const ctx = this.ctx(PERMISSOES.BACKUP_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const m = exigirMotivo(motivo ?? `Restauração do backup ${id}`, 5);
    const backup = await this.banco.obterBackup(id);
    await this.banco.restaurarDoTexto(backup.conteudo, { motivo: m });
    this._mutar(() => {
      this._registrarLog(ctx, {
        acao: ACOES_LOG.RESTAURAR, tabela: 'sistema', registroId: null, depois: { backupId: id }, motivo: m
      });
    });
    return { ok: true, backupId: id };
  }

  async reiniciarDemonstracao(motivo) {
    const ctx = this.ctx(PERMISSOES.BACKUP_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const m = exigirMotivo(motivo ?? 'Reinício da demonstração', 5);
    if (!this.semente) throw new ErroApp(CODIGOS_ERRO.INTERNO, 'Semente de dados não configurada.');
    const novo = await this.semente();
    await this.banco.substituirEstado(novo, { motivo: m });
    this._mutar(() => {
      this._registrarLog(ctx, {
        acao: ACOES_LOG.REINICIAR, tabela: 'sistema', registroId: null,
        depois: { equipamentos: novo.equipamentos.length, eventos: novo.eventos.length }, motivo: m
      });
    });
    return { ok: true, equipamentos: novo.equipamentos.length };
  }

}
