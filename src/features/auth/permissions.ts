/**
 * Matriz de permissões RBAC expandida para demo.
 */

import type { Usuario } from '../../shared/domain';
import { PERFIS, PERMISSOES, PERMISSOES_POR_PERFIL, FUNCIONALIDADES } from '../../shared/constants';

export type Acao = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'execute';
export type Recurso = 'painel' | 'users' | 'labs' | 'items' | 'equipments' | 'suppliers' | 'calibrations' | 'verifications' | 'maintenance' | 'requests' | 'reports' | 'audit' | 'settings' | 'config';

const RECURSO_PERMISSAO: Record<Recurso, string | string[]> = {
  painel: 'painel.consultar',
  users: 'usuarios.gerenciar', labs: 'laboratorios.gerenciar', items: 'itens.gerenciar',
  equipments: 'equipamentos.gerenciar', suppliers: 'fornecedores.gerenciar',
  calibrations: 'eventos.registrar', verifications: 'eventos.registrar', maintenance: 'eventos.registrar',
  requests: ['solicitacoes.criar', 'solicitacoes.aprovar'], reports: ['relatorios.operacionais', 'relatorios.gerenciais'],
  audit: 'auditoria.consultar', settings: 'config.gerenciar', config: 'config.gerenciar',
};

export function can(user: Usuario | null | undefined, acao: Acao, recurso: Recurso, targetLabId?: string): boolean {
  if (!user?.perfil) return false;
  const perfil = user.perfil;

  if (perfil === 'ADMIN') { if (['users', 'labs', 'settings', 'config'].includes(recurso)) return true; return acao === 'read'; }
  if (perfil === 'GESTOR_GERAL') { if (['users', 'labs', 'settings', 'config'].includes(recurso)) return false; return true; }
  if (perfil === 'GESTOR_LAB') { if (['users', 'labs', 'settings', 'config', 'audit'].includes(recurso)) return false; if (targetLabId && targetLabId !== user.laboratorioId) return false; return true; }
  if (perfil === 'TECNICO') { const permitidos: Recurso[] = ['equipments', 'calibrations', 'verifications', 'maintenance', 'requests', 'items']; if (!permitidos.includes(recurso)) return false; if (acao === 'delete') return false; if (acao === 'approve') return false; if (targetLabId && targetLabId !== user.laboratorioId) return false; if (recurso === 'equipments' && acao === 'read') return true; return true; }
  return false;
}

export function pode(user: Usuario | null | undefined, permissao: string): boolean { if (!user?.perfil) return false; return (PERMISSOES_POR_PERFIL as any)[user.perfil]?.includes(permissao) ?? false; }
export function ehGlobal(user: Usuario | null | undefined): boolean { return user?.perfil === 'ADMIN' || user?.perfil === 'GESTOR_GERAL'; }
export function escopoLaboratorio(user: Usuario | null | undefined): string | null { return ehGlobal(user) ? null : user?.laboratorioId ?? null; }

export function funcionalidadesPara(user: Usuario | null | undefined) {
  if (!user?.perfil) return FUNCIONALIDADES.map(f => ({ ...f, acessivel: false, motivo: 'Usuário não autenticado.' }));
  return FUNCIONALIDADES.map(f => { const acessivel = f.permissoes.length === 0 || f.permissoes.some(p => pode(user, p)); return { ...f, acessivel, motivo: acessivel ? null : `Disponível apenas para: ${f.permissoes.join(', ')}.` }; });
}

export function podeVerLaboratorio(user: Usuario | null | undefined, laboratorioId: string): boolean { return ehGlobal(user) || user?.laboratorioId === laboratorioId; }
export function exigirPermissao(user: Usuario | null | undefined, acao: Acao, recurso: Recurso, targetLabId?: string): void { if (!can(user, acao, recurso, targetLabId)) throw new Error(`Perfil ${user?.perfil ?? 'não autenticado'} não possui permissão para ${acao} em ${recurso}.`); }