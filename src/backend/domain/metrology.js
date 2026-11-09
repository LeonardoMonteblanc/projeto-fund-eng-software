/**
 * Regras de domínio metrológico.
 *
 * - Resultado: |erro| + U <= CA  →  Aprovado; caso contrário, Reprovado (aceitação simples).
 * - Próxima calibração/verificação: data da última realização + periodicidade (meses).
 * - Dias para vencimento: dias corridos entre hoje e a próxima data.
 * - RF17: sinaliza sem bloquear e sem alterar a situação operacional do equipamento.
 */

import {
  RESULTADOS,
  SINALIZACOES,
  SINALIZACAO_META,
  STATUS_PRAZO,
  TIPOS_EVENTO,
  SITUACOES_EVENTO,
  SITUACOES_EQUIPAMENTO
} from '../../shared/constants.js';
import { arredondar, diferencaDias, somarMeses } from '../../shared/utils.js';

/* ------------------------------------------------------------------ */
/* Herança Item → Equipamento                                          */
/* ------------------------------------------------------------------ */

/**
 * O Equipamento pode especializar CA e periodicidade; quando nulo, herda do Item.
 * @returns {{valor: number|null, origem: 'EQUIPAMENTO'|'ITEM'|null}}
 */
export function valorEfetivo(equipamento, item, campo) {
  const doEquipamento = equipamento?.[campo];
  if (doEquipamento !== null && doEquipamento !== undefined) {
    return { valor: doEquipamento, origem: 'EQUIPAMENTO' };
  }
  const doItem = item?.[campo];
  if (doItem !== null && doItem !== undefined) return { valor: doItem, origem: 'ITEM' };
  return { valor: null, origem: null };
}

export function caEfetivo(equipamento, item, tipo) {
  const campo = tipo === TIPOS_EVENTO.CALIBRACAO ? 'caCalibracao' : 'caVerificacao';
  return valorEfetivo(equipamento, item, campo);
}

export function periodicidadeEfetiva(equipamento, item, tipo) {
  const campo = tipo === TIPOS_EVENTO.CALIBRACAO
    ? 'periodicidadeCalibracaoMeses'
    : tipo === TIPOS_EVENTO.VERIFICACAO
      ? 'periodicidadeVerificacaoMeses'
      : 'periodicidadeManutencaoPreventivaMeses';
  return valorEfetivo(equipamento, item, campo);
}

/* ------------------------------------------------------------------ */
/* Cálculo metrológico                                                 */
/* ------------------------------------------------------------------ */

/**
 * Aceitação simples: |erro| + U <= CA.
 * @returns {{erroAbsoluto:number, erroMaisU:number, ca:number, margem:number, resultado:string}}
 */
export function calcularResultado(erro, incerteza, ca) {
  const erroNum = Number(erro);
  const uNum = Number(incerteza);
  const caNum = Number(ca);
  const erroAbsoluto = arredondar(Math.abs(erroNum), 6);
  const erroMaisU = arredondar(erroAbsoluto + uNum, 6);
  const margem = arredondar(caNum - erroMaisU, 6);
  return {
    erroAbsoluto,
    erroMaisU,
    ca: caNum,
    margem,
    resultado: erroMaisU <= caNum ? RESULTADOS.APROVADO : RESULTADOS.REPROVADO
  };
}

/* ------------------------------------------------------------------ */
/* Prazos                                                              */
/* ------------------------------------------------------------------ */

export function proximaData(baseISO, meses) {
  if (!baseISO) return null;
  const m = Number(meses);
  if (!Number.isInteger(m) || m <= 0) return null;
  return somarMeses(baseISO, m);
}

export function statusPrazo(dias, limite = 30) {
  if (dias === null || dias === undefined) return STATUS_PRAZO.SEM_DATA;
  if (dias < 0) return STATUS_PRAZO.VENCIDO;
  if (dias <= limite) return STATUS_PRAZO.A_VENCER;
  return STATUS_PRAZO.EM_DIA;
}

function maisRecente(eventos, tipo) {
  return eventos
    .filter((e) => e.tipo === tipo && e.situacao === SITUACOES_EVENTO.REALIZADO && e.dataRealizacao)
    .sort((a, b) => (a.dataRealizacao === b.dataRealizacao ? b.id - a.id : a.dataRealizacao < b.dataRealizacao ? 1 : -1))[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Métricas do equipamento                                             */
/* ------------------------------------------------------------------ */

/**
 * @param {object} args
 * @param {object} args.equipamento
 * @param {object} args.item
 * @param {object[]} args.eventos eventos do equipamento
 * @param {string} args.hoje ISO
 * @param {number} args.diasAlerta
 */
export function calcularMetricas({ equipamento, item, eventos = [], hoje, diasAlerta = 30 }) {
  const ultimaCalibracao = maisRecente(eventos, TIPOS_EVENTO.CALIBRACAO);
  const ultimaVerificacao = maisRecente(eventos, TIPOS_EVENTO.VERIFICACAO);
  const ultimaPreventiva = maisRecente(eventos, TIPOS_EVENTO.MANUTENCAO_PREVENTIVA);

  const perCal = periodicidadeEfetiva(equipamento, item, TIPOS_EVENTO.CALIBRACAO);
  const perVer = periodicidadeEfetiva(equipamento, item, TIPOS_EVENTO.VERIFICACAO);
  const perPmp = periodicidadeEfetiva(equipamento, item, TIPOS_EVENTO.MANUTENCAO_PREVENTIVA);

  const baseCal = ultimaCalibracao?.dataRealizacao ?? equipamento.dataColocacaoUso ?? null;
  const baseVer = ultimaVerificacao?.dataRealizacao ?? equipamento.dataColocacaoUso ?? null;
  const basePmp = ultimaPreventiva?.dataRealizacao ?? null;

  const proximaCalibracao = perCal.valor > 0 ? proximaData(baseCal, perCal.valor) : null;
  const proximaVerificacao = perVer.valor > 0 ? proximaData(baseVer, perVer.valor) : null;

  const preventivasAgendadas = eventos
    .filter((e) => e.tipo === TIPOS_EVENTO.MANUTENCAO_PREVENTIVA && e.situacao === SITUACOES_EVENTO.AGENDADO && e.dataPrevista)
    .sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : 1));
  const proximaManutencaoAgendada = preventivasAgendadas[0] ?? null;
  const proximaManutencaoCalculada = perPmp.valor > 0 ? proximaData(basePmp, perPmp.valor) : null;
  const proximaManutencaoPreventiva = proximaManutencaoAgendada?.dataPrevista ?? proximaManutencaoCalculada ?? null;

  const diasCal = proximaCalibracao ? diferencaDias(hoje, proximaCalibracao) : null;
  const diasVer = proximaVerificacao ? diferencaDias(hoje, proximaVerificacao) : null;
  const diasPmp = proximaManutencaoPreventiva ? diferencaDias(hoje, proximaManutencaoPreventiva) : null;

  const sinalizacoes = [];
  if (diasCal !== null && diasCal < 0) {
    sinalizacoes.push({
      codigo: SINALIZACOES.CALIBRACAO_VENCIDA,
      ...SINALIZACAO_META[SINALIZACOES.CALIBRACAO_VENCIDA],
      detalhe: `Calibração vencida em ${proximaCalibracao} (${Math.abs(diasCal)} dia(s)).`
    });
  }
  if (ultimaCalibracao?.resultado === RESULTADOS.REPROVADO) {
    sinalizacoes.push({
      codigo: SINALIZACOES.CALIBRACAO_REPROVADA,
      ...SINALIZACAO_META[SINALIZACOES.CALIBRACAO_REPROVADA],
      detalhe: `Última calibração reprovada em ${ultimaCalibracao.dataRealizacao} (Erro+U acima do CA).`
    });
  }
  if (diasVer !== null && diasVer < 0) {
    sinalizacoes.push({
      codigo: SINALIZACOES.VERIFICACAO_VENCIDA,
      ...SINALIZACAO_META[SINALIZACOES.VERIFICACAO_VENCIDA],
      detalhe: `Verificação vencida em ${proximaVerificacao} (${Math.abs(diasVer)} dia(s)).`
    });
  }
  if (perCal.valor === 0 || perVer.valor === 0) {
    const quais = [];
    if (perCal.valor === 0) quais.push('calibração');
    if (perVer.valor === 0) quais.push('verificação');
    sinalizacoes.push({
      codigo: SINALIZACOES.PERIODICIDADE_ZERO,
      ...SINALIZACAO_META[SINALIZACOES.PERIODICIDADE_ZERO],
      detalhe: `Periodicidade de ${quais.join(' e ')} igual a zero; não é possível calcular o vencimento.`
    });
  }

  const diasCandidatos = [diasCal, diasVer].filter((d) => d !== null);
  const diasParaVencimento = diasCandidatos.length ? Math.min(...diasCandidatos) : diasPmp;

  const criticos = sinalizacoes.filter((s) => s.severidade === 'CRITICO').length;
  let situacaoMetrologica;
  if (criticos > 0) situacaoMetrologica = 'NAO_CONFORME';
  else if (sinalizacoes.length > 0 || (diasParaVencimento !== null && diasParaVencimento <= diasAlerta)) situacaoMetrologica = 'ATENCAO';
  else if (proximaCalibracao || ultimaCalibracao) situacaoMetrologica = 'CONFORME';
  else situacaoMetrologica = 'SEM_DADOS';

  return {
    ultimaCalibracao,
    ultimaVerificacao,
    ultimaPreventiva,
    proximaCalibracao,
    proximaVerificacao,
    proximaManutencaoPreventiva,
    proximaManutencaoCalculada,
    proximaManutencaoAgendada,
    diasParaVencimentoCalibracao: diasCal,
    diasParaVencimentoVerificacao: diasVer,
    diasParaVencimentoManutencao: diasPmp,
    diasParaVencimento,
    statusCalibracao: statusPrazo(diasCal, diasAlerta),
    statusVerificacao: statusPrazo(diasVer, diasAlerta),
    statusManutencao: statusPrazo(diasPmp, diasAlerta),
    efetivos: {
      caCalibracao: caEfetivo(equipamento, item, TIPOS_EVENTO.CALIBRACAO),
      caVerificacao: caEfetivo(equipamento, item, TIPOS_EVENTO.VERIFICACAO),
      periodicidadeCalibracao: perCal,
      periodicidadeVerificacao: perVer,
      periodicidadeManutencao: perPmp
    },
    sinalizacoes,
    situacaoMetrologica
  };
}

/* ------------------------------------------------------------------ */
/* Completude de cadastro                                              */
/* ------------------------------------------------------------------ */

export const CAMPOS_OBRIGATORIOS_EQUIPAMENTO = Object.freeze([
  'patrimonio',
  'numeroSerie',
  'localizacao',
  'dataAquisicao',
  'dataColocacaoUso',
  'valorAquisicaoCentavos'
]);

export const ROTULO_CAMPO = Object.freeze({
  patrimonio: 'Nº de patrimônio',
  numeroSerie: 'Nº de série',
  localizacao: 'Localização',
  dataAquisicao: 'Data de aquisição',
  dataColocacaoUso: 'Data de colocação em uso',
  valorAquisicaoCentavos: 'Valor de aquisição',
  ultimaCalibracao: 'Última calibração',
  caCalibracao: 'CA de calibração'
});

export function camposPendentesEquipamento(equipamento) {
  const pendentes = [];
  for (const campo of CAMPOS_OBRIGATORIOS_EQUIPAMENTO) {
    const valor = equipamento?.[campo];
    if (valor === null || valor === undefined || valor === '') pendentes.push(campo);
  }
  return pendentes;
}

export function equipamentoCompleto(equipamento) {
  return camposPendentesEquipamento(equipamento).length === 0;
}

/* ------------------------------------------------------------------ */
/* Situação e agregações                                               */
/* ------------------------------------------------------------------ */

export function equipamentoAtivo(equipamento) {
  return equipamento?.situacao === SITUACOES_EQUIPAMENTO.ATIVO;
}

export function resumirPorSituacao(equipamentos) {
  return equipamentos.reduce((acc, e) => {
    acc[e.situacao] = (acc[e.situacao] ?? 0) + 1;
    return acc;
  }, {});
}

export function maiorSeveridade(sinalizacoes = []) {
  const ordem = { CRITICO: 4, ALTO: 3, MEDIO: 2, INFO: 1 };
  return sinalizacoes.reduce((max, s) => Math.max(max, ordem[s.severidade] ?? 0), 0);
}
