/**
 * Funções internas compartilhadas pelos casos de uso.
 * Não contêm regra de negócio de domínio; apenas sanitização, busca e IDs.
 */

import { ErroApp } from '../../shared/errors.js';
import { LIMITES } from '../../shared/constants.js';
import { normalizar } from '../../shared/utils.js';
import { Validador } from '../../shared/validation.js';

const CAMPOS_SENSIVEIS = /senha/i;

export function sanitizar(valor) {
  if (valor === null || valor === undefined) return valor;
  return JSON.parse(JSON.stringify(valor, (chave, v) => (CAMPOS_SENSIVEIS.test(chave) ? undefined : v)));
}

export function proximoId(estado, colecao) {
  const seq = estado.meta.sequencias;
  seq[colecao] = (seq[colecao] ?? 0) + 1;
  return seq[colecao];
}

export function localizar(estado, colecao, id, rotulo) {
  const item = estado[colecao].find((x) => x.id === Number(id));
  if (!item) throw ErroApp.naoEncontrado(rotulo, id);
  return item;
}

export function mesmo(a, b) {
  return normalizar(a) === normalizar(b);
}

export function exigirMotivo(motivo, minimo = LIMITES.MOTIVO_MIN) {
  const v = new Validador();
  v.motivo('motivo', motivo, { min: minimo });
  v.lancar();
  return String(motivo).trim();
}
