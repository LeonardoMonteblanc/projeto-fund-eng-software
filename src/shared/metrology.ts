/**
 * Regras de domínio metrológico.
 */

import { RESULTADOS, SINALIZACOES, SINALIZACAO_META, STATUS_PRAZO, TIPOS_EVENTO, SITUACOES_EVENTO, SITUACOES_EQUIPAMENTO, type Resultado, type Sinalizacao, type NivelAlerta, type StatusPrazo, type TipoEvento, type SituacaoEvento } from './constants';
import { arredondar, diferencaDias, somarMeses } from './utils';

export function valorEfetivo(equipamento: Record<string, unknown> | null | undefined, item: Record<string, unknown> | null | undefined, campo: string): { valor: number | null; origem: 'EQUIPAMENTO' | 'ITEM' | null } {
  const doEquipamento = equipamento?.[campo] as number | null | undefined;
  if (doEquipamento !== null && doEquipamento !== undefined) return { valor: doEquipamento, origem: 'EQUIPAMENTO' };
  const doItem = item?.[campo] as number | null | undefined;
  if (doItem !== null && doItem !== undefined) return { valor: doItem, origem: 'ITEM' };
  return { valor: null, origem: null };
}

export function caEfetivo(equipamento: Record<string, unknown> | null | undefined, item: Record<string, unknown> | null | undefined, tipo: TipoEvento) {
  const campo = tipo === 'CALIBRACAO' ? 'caCalibracao' : 'caVerificacao';
  return valorEfetivo(equipamento, item, campo);
}

export function periodicidadeEfetiva(equipamento: Record<string, unknown> | null | undefined, item: Record<string, unknown> | null | undefined, tipo: TipoEvento) {
  const campo = tipo === 'CALIBRACAO' ? 'periodicidadeCalibracaoMeses' : tipo === 'VERIFICACAO' ? 'periodicidadeVerificacaoMeses' : 'periodicidadeManutencaoPreventivaMeses';
  return valorEfetivo(equipamento, item, campo);
}

export function calcularResultado(erro: number | null | undefined, incerteza: number | null | undefined, ca: number | null | undefined): { erroAbsoluto: number; erroMaisU: number; ca: number; margem: number; resultado: string } {
  const erroNum = Number(erro ?? 0), uNum = Number(incerteza ?? 0), caNum = Number(ca ?? 0);
  const erroAbsoluto = arredondar(Math.abs(erroNum), 6);
  const erroMaisU = arredondar(erroAbsoluto + uNum, 6);
  const margem = arredondar(caNum - erroMaisU, 6);
  return { erroAbsoluto, erroMaisU, ca: caNum, margem, resultado: erroMaisU <= caNum ? 'APROVADO' : 'REPROVADO' };
}

export function proximaData(baseISO: string | null | undefined, meses: number | null | undefined): string | null {
  if (!baseISO) return null;
  const m = Number(meses);
  if (!Number.isInteger(m) || m <= 0) return null;
  return somarMeses(baseISO, m);
}

export function statusPrazo(dias: number | null | undefined, limite = 30): string {
  if (dias === null || dias === undefined) return 'SEM_DATA';
  if (dias < 0) return 'VENCIDO';
  if (dias <= limite) return 'A_VENCER';
  return 'EM_DIA';
}

function maisRecente(eventos: any[], tipo: string) {
  return eventos.filter((e) => e.tipo === tipo && e.situacao === 'REALIZADO' && e.dataRealizacao)
    .sort((a, b) => a.dataRealizacao === b.dataRealizacao ? b.id.localeCompare(a.id) : a.dataRealizacao < b.dataRealizacao ? 1 : -1)[0] ?? null;
}

export function calcularMetricas(args: { equipamento: Record<string, unknown>; item: Record<string, unknown> | null | undefined; eventos: any[]; hoje: string; diasAlerta?: number }) {
  const { equipamento, item, eventos = [], hoje, diasAlerta = 30 } = args;
  const ultimaCalibracao = maisRecente(eventos, 'CALIBRACAO');
  const ultimaVerificacao = maisRecente(eventos, 'VERIFICACAO');
  const ultimaPreventiva = maisRecente(eventos, 'MANUTENCAO_PREVENTIVA');

  const perCal = periodicidadeEfetiva(equipamento, item, 'CALIBRACAO');
  const perVer = periodicidadeEfetiva(equipamento, item, 'VERIFICACAO');
  const perPmp = periodicidadeEfetiva(equipamento, item, 'MANUTENCAO_PREVENTIVA');

  const baseCal = ultimaCalibracao?.dataRealizacao ?? equipamento.dataColocacaoUso ?? null;
  const baseVer = ultimaVerificacao?.dataRealizacao ?? equipamento.dataColocacaoUso ?? null;
  const basePmp = ultimaPreventiva?.dataRealizacao ?? null;

  const proximaCalibracao = perCal.valor > 0 ? proximaData(baseCal, perCal.valor) : null;
  const proximaVerificacao = perVer.valor > 0 ? proximaData(baseVer, perVer.valor) : null;

  const preventivasAgendadas = eventos.filter((e) => e.tipo === 'MANUTENCAO_PREVENTIVA' && e.situacao === 'AGENDADO' && e.dataPrevista)
    .sort((a, b) => (a.dataPrevista ?? '').localeCompare(b.dataPrevista ?? ''));
  const proximaManutencaoAgendada = preventivasAgendadas[0] ?? null;
  const proximaManutencaoCalculada = perPmp.valor > 0 ? proximaData(basePmp, perPmp.valor) : null;
  const proximaManutencaoPreventiva = proximaManutencaoAgendada?.dataPrevista ?? proximaManutencaoCalculada ?? null;

  const diasCal = proximaCalibracao ? diferencaDias(hoje, proximaCalibracao) : null;
  const diasVer = proximaVerificacao ? diferencaDias(hoje, proximaVerificacao) : null;
  const diasPmp = proximaManutencaoPreventiva ? diferencaDias(hoje, proximaManutencaoPreventiva) : null;

  const sinalizacoes: any[] = [];
  if (diasCal !== null && diasCal < 0) { sinalizacoes.push({ codigo: 'CALIBRACAO_VENCIDA', rotulo: 'Calibração vencida', severidade: 'CRITICO', icone: 'alert', detalhe: `Calibração vencida em ${proximaCalibracao} (${Math.abs(diasCal)} dia(s)).` }); }
  if (ultimaCalibracao?.resultado === 'REPROVADO') { sinalizacoes.push({ codigo: 'CALIBRACAO_REPROVADA', rotulo: 'Calibração reprovada', severidade: 'CRITICO', icone: 'x', detalhe: `Última calibração reprovada em ${ultimaCalibracao.dataRealizacao} (Erro+U acima do CA).` }); }
  if (diasVer !== null && diasVer < 0) { sinalizacoes.push({ codigo: 'VERIFICACAO_VENCIDA', rotulo: 'Verificação vencida', severidade: 'ALTO', icone: 'alert', detalhe: `Verificação vencida em ${proximaVerificacao} (${Math.abs(diasVer)} dia(s)).` }); }
  if (perCal.valor === 0 || perVer.valor === 0) { const quais = []; if (perCal.valor === 0) quais.push('calibração'); if (perVer.valor === 0) quais.push('verificação'); sinalizacoes.push({ codigo: 'PERIODICIDADE_ZERO', rotulo: 'Periodicidade não definida', severidade: 'MEDIO', icone: 'info', detalhe: `Periodicidade de ${quais.join(' e ')} igual a zero; não é possível calcular o vencimento.` }); }

  const diasCandidatos = [diasCal, diasVer].filter((d) => d !== null) as number[];
  const diasParaVencimento = diasCandidatos.length ? Math.min(...diasCandidatos) : diasPmp;

  const criticos = sinalizacoes.filter((s) => s.severidade === 'CRITICO').length;
  let situacaoMetrologica: string;
  if (criticos > 0) situacaoMetrologica = 'NAO_CONFORME';
  else if (sinalizacoes.length > 0 || (diasParaVencimento !== null && diasParaVencimento <= 30)) situacaoMetrologica = 'ATENCAO';
  else if (proximaCalibracao || ultimaCalibracao) situacaoMetrologica = 'CONFORME';
  else situacaoMetrologica = 'SEM_DADOS';

  return { ultimaCalibracao, ultimaVerificacao, ultimaPreventiva, proximaCalibracao, proximaVerificacao, proximaManutencaoPreventiva, proximaManutencaoCalculada, proximaManutencaoAgendada, diasParaVencimentoCalibracao: diasCal, diasParaVencimentoVerificacao: diasVer, diasParaVencimentoManutencao: diasPmp, diasParaVencimento, statusCalibracao: statusPrazo(diasCal, diasAlerta), statusVerificacao: statusPrazo(diasVer, diasAlerta), statusManutencao: statusPrazo(diasPmp, diasAlerta), efetivos: { caCalibracao: caEfetivo(equipamento, null, 'CALIBRACAO'), caVerificacao: caEfetivo(equipamento, null, 'VERIFICACAO'), periodicidadeCalibracao: perCal, periodicidadeVerificacao: perVer, periodicidadeManutencao: perPmp }, sinalizacoes, situacaoMetrologica };
}

export const CAMPOS_OBRIGATORIOS_EQUIPAMENTO = ['patrimonio', 'tag', 'numeroSerie', 'localizacao', 'dataAquisicao', 'dataColocacaoUso', 'valorAquisicaoCentavos'] as const;

export function camposPendentesEquipamento(equipamento: Record<string, unknown>): string[] { const pendentes: string[] = []; for (const campo of CAMPOS_OBRIGATORIOS_EQUIPAMENTO) { const valor = equipamento[campo]; if (valor === null || valor === undefined || valor === '') pendentes.push(campo); } return pendentes; }

export function equipamentoCompleto(equipamento: Record<string, unknown>): boolean { return camposPendentesEquipamento(equipamento).length === 0; }

export function equipamentoAtivo(equipamento: { situacao?: string }): boolean { return equipamento?.situacao === 'ATIVO'; }

export function resumirPorSituacao(equipamentos: Array<{ situacao: string }>): Record<string, number> { return equipamentos.reduce((acc, e) => { acc[e.situacao] = (acc[e.situacao] ?? 0) + 1; return acc; }, { ATIVO: 0, INATIVO: 0, EM_MANUTENCAO: 0 }); }

export function maiorSeveridade(sinalizacoes: Array<{ severidade: string }> = []): number { const ordem: Record<string, number> = { CRITICO: 4, ALTO: 3, MEDIO: 2, INFO: 1 }; return sinalizacoes.reduce((max, s) => Math.max(max, ordem[s.severidade] ?? 0), 0); }