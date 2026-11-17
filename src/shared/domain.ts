/**
 * Tipos de domínio.
 */

import { z } from 'zod';
import type { Perfil, TipoEvento, SituacaoEvento, SituacaoSolicitacao, SituacaoEquipamento, Resultado, EstadoRetorno, TipoIndicacao, StatusPrazo } from './constants';
import { SITUACOES_EQUIPAMENTO, TIPOS_EVENTO, SITUACOES_EVENTO } from './constants';

export type { Perfil, TipoEvento, SituacaoEvento, SituacaoSolicitacao, SituacaoEquipamento, Resultado, EstadoRetorno, TipoIndicacao, StatusPrazo };
export { SITUACOES_EQUIPAMENTO, TIPOS_EVENTO, SITUACOES_EVENTO };

export type Categoria = {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm?: string;
};

export type Subcategoria = {
  id: string;
  nome: string;
  categoriaId: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm?: string;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato ISO YYYY-MM-DD');
const isoDateTime = z.string().datetime({ offset: true });
const ulidSchema = z.string().length(26).regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'ULID inválido');
const emailSchema = z.string().email('E-mail inválido');
const cnpjSchema = z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido');
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const centavosSchema = z.number().int().nonnegative();

export const UsuarioSchema = z.object({
  id: ulidSchema, nome: z.string().min(2).max(120), email: z.string().email(),
  perfil: z.enum(['ADMIN', 'GESTOR_LAB', 'GESTOR_GERAL', 'TECNICO']),
  laboratorioId: z.string().optional(), ativo: z.boolean().default(true),
  criadoEm: z.string().datetime(), atualizadoEm: z.string().datetime().optional(),
});
export type Usuario = z.infer<typeof UsuarioSchema>;

export const LaboratorioSchema = z.object({
  id: z.string(), sigla: z.string(), nome: z.string(), codigo: z.string(),
  responsavelTecnico: z.string().optional(), ramal: z.string().optional(),
  bloco: z.string().optional(), sala: z.string().optional(), localizacao: z.string().optional(),
  receitaMensalCentavos: z.number().int().nonnegative().default(0),
  ativo: z.boolean().default(true), criadoEm: z.string().datetime(), atualizadoEm: z.string().datetime().optional(),
});
export type Laboratorio = z.infer<typeof LaboratorioSchema>;

export const ItemSchema = z.object({
  id: z.string(), chave: z.number().int().positive(), nome: z.string(),
  descricao: z.string().optional(), fabricante: z.string().optional(), modelo: z.string().optional(),
  categoriaId: z.string(), subcategoriaId: z.string(), capacidadeMedicao: z.string().optional(),
  resolucao: z.string().optional(), tipoIndicacao: z.enum(['ANALOGICO', 'DIGITAL']).nullable(),
  caCalibracao: z.number().nonnegative().nullable(), caVerificacao: z.number().nonnegative().nullable(),
  periodicidadeCalibracaoMeses: z.number().int().nonnegative(),
  periodicidadeVerificacaoMeses: z.number().int().nonnegative(),
  periodicidadeManutencaoPreventivaMeses: z.number().int().nonnegative(),
  ativo: z.boolean().default(true), parametrosEstimados: z.array(z.string()).default([]),
  criadoEm: z.string().datetime(), atualizadoEm: z.string().datetime().optional(),
});
export type Item = z.infer<typeof ItemSchema>;

export const EquipamentoSchema = z.object({
  id: z.string(), patrimonio: z.string(), tag: z.string(), numeroSerie: z.string(),
  laboratorioId: z.string(), itemId: z.string(), localizacao: z.string(),
  dataAquisicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dataColocacaoUso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valorAquisicaoCentavos: z.number().int().nonnegative(),
  caCalibracao: z.number().nonnegative().nullable(), caVerificacao: z.number().nonnegative().nullable(),
  periodicidadeCalibracaoMeses: z.number().int().nonnegative(),
  periodicidadeVerificacaoMeses: z.number().int().nonnegative(),
  periodicidadeManutencaoPreventivaMeses: z.number().int().nonnegative(),
  situacao: z.enum(['ATIVO', 'INATIVO', 'EM_MANUTENCAO']).default('ATIVO'),
  ativo: z.boolean().default(true), criadoEm: z.string().datetime(), atualizadoEm: z.string().datetime().optional(),
});
export type Equipamento = z.infer<typeof EquipamentoSchema>;

export const EventoSchema = z.object({
  id: z.string(), tipo: z.enum(['CALIBRACAO', 'VERIFICACAO', 'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA', 'DIVERGENCIA_INVENTARIO']),
  equipamentoId: z.string(), fornecedorId: z.string().nullable(), responsavelId: z.string(),
  situacao: z.enum(['AGENDADO', 'REALIZADO', 'CANCELADO']).default('AGENDADO'),
  dataPrevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), dataRealizacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  descricao: z.string().optional(), observacoes: z.string().optional(),
  custoEstimadoCentavos: z.number().int().nonnegative().nullable(), custoRealizadoCentavos: z.number().int().nonnegative().nullable(),
  numeroCertificado: z.string().nullable(), erro: z.number().nullable(), incerteza: z.number().nonnegative().nullable(),
  caUtilizado: z.number().nonnegative().nullable(), resultado: z.enum(['APROVADO', 'REPROVADO']).nullable(),
  problema: z.string().optional(), servico: z.string().optional(), estadoRetorno: z.enum(['APTO', 'EM_MANUTENCAO', 'INATIVO']).nullable(),
  solicitacaoOrigemId: z.string().nullable(), criadoEm: z.string().datetime(), atualizadoEm: z.string().datetime().optional(),
});
export type Evento = z.infer<typeof EventoSchema>;

export const FornecedorSchema = z.object({
  id: z.string(), razaoSocial: z.string(), cnpj: z.string(), telefone: z.string().optional(), email: z.string().email().optional(),
  situacao: z.enum(['ATIVO', 'INATIVO']).default('ATIVO'), observacoes: z.string().optional(),
  criadoEm: z.string().datetime(), atualizadoEm: z.string().datetime().optional(),
});
export type Fornecedor = z.infer<typeof FornecedorSchema>;

export const SolicitacaoSchema = z.object({
  id: z.string(), equipamentoId: z.string(), tipoEvento: z.enum(['CALIBRACAO', 'VERIFICACAO', 'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA']),
  solicitanteId: z.string(), justificativa: z.string(), dataDesejada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  situacao: z.enum(['PENDENTE', 'APROVADA', 'REJEITADA']).default('PENDENTE'),
  avaliadorId: z.string().nullable(), dataAvaliacao: z.string().datetime().nullable(), justificativaAvaliacao: z.string().optional(),
  eventoGeradoId: z.string().nullable(), criadoEm: z.string().datetime(), atualizadoEm: z.string().datetime().optional(),
});
export type Solicitacao = z.infer<typeof SolicitacaoSchema>;

export const LogAuditoriaSchema = z.object({
  id: z.string(), tabela: z.string(), registroId: z.string(), acao: z.string(),
  usuarioId: z.string(), usuarioNome: z.string(), usuarioPerfil: z.string(),
  dadosAnteriores: z.record(z.unknown()).nullable(), dadosNovos: z.record(z.unknown()).nullable(),
  motivo: z.string().optional(), ip: z.string().optional(), timestamp: z.string().datetime(),
});
export type LogAuditoria = z.infer<typeof LogAuditoriaSchema>;

export const ConfigSchema = z.object({
  id: z.literal('global'), nomeSistema: z.string().default('LabUcs — Gestão de Equipamentos Laboratoriais'),
  diasAlertaVencimento: z.number().int().positive().default(30), timeoutSessaoMinutos: z.number().int().positive().default(30),
  retencaoBackupDias: z.number().int().positive().default(7), maxTentativasLogin: z.number().int().positive().default(5),
  bloqueioLoginSegundos: z.number().int().positive().default(120), permitirAutoAprovacao: z.boolean().default(false), moeda: z.string().length(3).default('BRL'),
  atualizadoEm: z.string().datetime().optional(),
});
export type Config = z.infer<typeof ConfigSchema>;

export interface EquipamentoComMetricas extends Equipamento {
  item?: Item; laboratorio?: Laboratorio; ultimaCalibracao?: Evento; ultimaVerificacao?: Evento;
  ultimaPreventiva?: Evento; proximaCalibracao?: string | null; proximaVerificacao?: string | null;
  proximaManutencaoPreventiva?: string | null; diasParaVencimentoCalibracao?: number | null;
  diasParaVencimentoVerificacao?: number | null; diasParaVencimentoManutencao?: number | null;
  diasParaVencimento?: number | null; statusCalibracao?: string; statusVerificacao?: string;
  statusManutencao?: string; efetivos?: any; sinalizacoes?: any[]; situacaoMetrologica?: string; completude?: number;
}

export interface KPIPainel {
  totalEquipamentos: number; ativos: number; inativos: number; emManutencao: number;
  alertasCriticos: number; alertasAltos: number; proximosVencimentos: number;
  custosMes: number; receitaMes: number;
}