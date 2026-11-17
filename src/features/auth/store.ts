/**
 * Zustand store para autenticação demo.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Usuario, Perfil } from '../../shared/domain';
import { PERFIS } from '../../shared/constants';
import { can, funcionalidadesPara } from './permissions';
import { definirContextoAuditoria } from '../../shared/audit';

interface AuthState {
  user: Usuario | null; perfil: Perfil | null; laboratorioId: string | null;
  isAuthenticated: boolean; funcionalidadesAcessiveis: any[];
  login: (perfil: Perfil, laboratorioId?: string) => Promise<void>;
  logout: () => void;
  trocarPerfil: (perfil: Perfil, laboratorioId?: string) => Promise<void>;
  hydrate: () => Promise<void>;
  can: (acao: string, recurso: string, targetLabId?: string) => boolean;
}

const USUARIOS_DEMO: Record<Perfil, any> = {
  ADMIN: { id: 'demo-admin-001', nome: 'Administrador do Sistema', email: 'admin@demo', perfil: 'ADMIN', ativo: true, criadoEm: new Date().toISOString() },
  GESTOR_GERAL: { id: 'demo-gestor-geral-001', nome: 'Gestor Geral Demo', email: 'gestor.geral@demo', perfil: 'GESTOR_GERAL', ativo: true, criadoEm: new Date().toISOString() },
  GESTOR_LAB: { id: 'demo-gestor-lab-001', nome: 'Gestor LASFI Demo', email: 'gestor.lasfi@demo', perfil: 'GESTOR_LAB', ativo: true, criadoEm: new Date().toISOString() },
  TECNICO: { id: 'demo-tecnico-001', nome: 'Técnico LAMEC Demo', email: 'tecnico.lamec@demo', perfil: 'TECNICO', ativo: true, criadoEm: new Date().toISOString() },
};

function buildUser(perfil: Perfil, laboratorioId?: string): any {
  const base = USUARIOS_DEMO[perfil];
  return { ...base, laboratorioId: (perfil === 'GESTOR_LAB' || perfil === 'TECNICO') ? laboratorioId : undefined };
}

export const useAuthStore = create<any>()(
  persist((set, get) => ({
    user: null, perfil: null, laboratorioId: null, isAuthenticated: false, funcionalidadesAcessiveis: [],
    async login(perfil: string, laboratorioId?: string) { const user = buildUser(perfil as any, laboratorioId); const funcs = funcionalidadesPara(user); definirContextoAuditoria({ usuarioId: user.id, usuarioNome: user.nome, usuarioPerfil: user.perfil }); set({ user, perfil, laboratorioId: user.laboratorioId ?? null, isAuthenticated: true, funcionalidadesAcessiveis: funcs }); },
    logout() { definirContextoAuditoria({}); set({ user: null, perfil: null, laboratorioId: null, isAuthenticated: false, funcionalidadesAcessiveis: [] }); },
    async trocarPerfil(perfil: string, laboratorioId?: string) { const user = buildUser(perfil as any, laboratorioId); const funcs = funcionalidadesPara(user); definirContextoAuditoria({ usuarioId: user.id, usuarioNome: user.nome, usuarioPerfil: user.perfil }); set({ user, perfil, laboratorioId: user.laboratorioId ?? null, isAuthenticated: true, funcionalidadesAcessiveis: funcs }); },
    async hydrate() { const state = get(); if (state.isAuthenticated && state.user) { definirContextoAuditoria({ usuarioId: state.user.id, usuarioNome: state.user.nome, usuarioPerfil: state.user.perfil }); set({ funcionalidadesAcessiveis: funcionalidadesPara(state.user) }); } },
    can(acao: string, recurso: string, targetLabId?: string) { const { user } = get(); if (!user) return false; return can(user, acao as any, recurso as any, targetLabId); }
  }), { name: 'labucs.auth.demo', storage: createJSONStorage(() => localStorage), partialize: (state) => ({ user: state.user, perfil: state.perfil, laboratorioId: state.laboratorioId, isAuthenticated: state.isAuthenticated }), onRehydrateStorage: () => (state) => { if (state) state.hydrate(); } }
));

export const useUser = () => useAuthStore((s: any) => s.user);
export const usePerfil = () => useAuthStore((s: any) => s.perfil);
export const useLabId = () => useAuthStore((s: any) => s.laboratorioId);
export const useIsAuthenticated = () => useAuthStore((s: any) => s.isAuthenticated);
export const useFuncionalidades = () => useAuthStore((s: any) => s.funcionalidadesAcessiveis);
export const useCan = () => useAuthStore((s: any) => s.can);
export const useLogin = () => useAuthStore((s: any) => s.login);
export const useLogout = () => useAuthStore((s: any) => s.logout);
export const useTrocarPerfil = () => useAuthStore((s: any) => s.trocarPerfil);