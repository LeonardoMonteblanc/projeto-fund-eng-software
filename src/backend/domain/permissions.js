/** RBAC: quatro perfis exclusivos, escopo por laboratório e catálogo RF01. */

import { ErroApp } from '../../shared/errors.js';
import {
  PERFIS,
  PERFIL_ROTULO,
  PERMISSOES,
  PERMISSOES_POR_PERFIL,
  FUNCIONALIDADES
} from '../../shared/constants.js';

export function permissoesDoPerfil(perfil) {
  return PERMISSOES_POR_PERFIL[perfil] ?? [];
}

export function pode(usuario, permissao) {
  if (!usuario?.perfil) return false;
  return permissoesDoPerfil(usuario.perfil).includes(permissao);
}

export function ehGlobal(usuario) {
  return usuario?.perfil === PERFIS.ADMIN || usuario?.perfil === PERFIS.GESTOR_GERAL;
}

/** Laboratório do usuário; null para perfis globais. */
export function escopoLaboratorio(usuario) {
  return ehGlobal(usuario) ? null : usuario?.laboratorioId ?? null;
}

export function exigirPermissao(usuario, permissao, mensagem) {
  if (!pode(usuario, permissao)) {
    throw ErroApp.permissao(mensagem ?? `O perfil ${PERFIL_ROTULO[usuario?.perfil] ?? '—'} não possui a permissão "${permissao}".`);
  }
  return true;
}

/** Garante que o usuário pode operar sobre o laboratório informado. */
export function exigirEscopo(usuario, laboratorioId, { escrita = true } = {}) {
  if (ehGlobal(usuario)) {
    if (usuario.perfil === PERFIS.ADMIN && escrita) {
      throw ErroApp.permissao('O Administrador possui acesso somente leitura aos dados operacionais.');
    }
    return true;
  }
  if (!laboratorioId || usuario.laboratorioId !== laboratorioId) {
    throw ErroApp.permissao('Você só pode acessar dados do seu laboratório.');
  }
  return true;
}

export function podeVerLaboratorio(usuario, laboratorioId) {
  return ehGlobal(usuario) || usuario?.laboratorioId === laboratorioId;
}

/** Funcionalidades do RF01 com indicador de acesso para o perfil. */
export function funcionalidadesPara(usuario) {
  return FUNCIONALIDADES.map((f) => {
    const acessivel = f.permissoes.length === 0 || f.permissoes.some((p) => pode(usuario, p));
    return {
      ...f,
      acessivel,
      // "ocultos ou bloqueados": a interface oculta; a API bloqueia com 403.
      motivo: acessivel ? null : `Disponível apenas para perfis com permissão: ${f.permissoes.join(', ')}.`
    };
  });
}

export function perfisComPermissao(permissao) {
  return Object.values(PERFIS).filter((perfil) => permissoesDoPerfil(perfil).includes(permissao));
}

export function exigirAdministrador(usuario) {
  if (usuario?.perfil !== PERFIS.ADMIN) throw ErroApp.permissao('Operação exclusiva do Administrador.');
  return true;
}

export function exigirGestorGeral(usuario) {
  if (usuario?.perfil !== PERFIS.GESTOR_GERAL) throw ErroApp.permissao('Operação exclusiva do Gestor Geral.');
  return true;
}

export function exigirGestorLaboratorio(usuario) {
  if (usuario?.perfil !== PERFIS.GESTOR_LAB) throw ErroApp.permissao('Operação exclusiva do Gestor de Laboratório.');
  return true;
}

export {
  PERFIS,
  PERFIL_ROTULO,
  PERMISSOES,
  FUNCIONALIDADES
};
