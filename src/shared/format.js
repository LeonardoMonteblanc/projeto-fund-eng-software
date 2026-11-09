/**
 * Formatação compartilhada entre apresentação e relatórios.
 * Mantém uma única regra de exibição para datas, dinheiro, números e percentuais.
 */

import { formatarBRL, formatarDataBR, formatarNumero } from './utils.js';

export function formatarCelula(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return '—';
  switch (tipo) {
    case 'data': return formatarDataBR(valor);
    case 'moeda': return formatarBRL(valor).replace(/\u00a0/g, ' ');
    case 'numero': return formatarNumero(valor, 6);
    case 'inteiro': return String(valor);
    case 'percentual': return `${formatarNumero(Number(valor) * 100, 1)}%`;
    default: return String(valor);
  }
}

export function valorNumerico(valor, tipo) {
  if (tipo === 'moeda') return (Number(valor) || 0) / 100;
  if (tipo === 'percentual' || tipo === 'numero' || tipo === 'inteiro') return Number(valor);
  return null;
}
