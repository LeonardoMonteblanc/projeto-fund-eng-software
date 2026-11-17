/**
 * ProtectedRoute - Wrapper RBAC para rotas.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { can, type Recurso, type Acao } from '@/features/auth/permissions';
import { Button, Card, CardContent, spaceRem } from '@/shared/ui/components';
import { Lock, ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProtectedRouteProps { recurso: Recurso; acao?: Acao; targetLabId?: string; fallback?: React.ReactNode; children: React.ReactNode; }

export function ProtectedRoute({ recurso, acao = 'read', targetLabId, fallback, children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) { return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />; }

  const temPermissao = can(user, acao, recurso, targetLabId);

  if (!temPermissao) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', backgroundColor: 'var(--color-bg)' }}>
        <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--color-bgElevated)', border: '2px solid var(--color-border)', padding: '32px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', backgroundColor: 'var(--color-dangerBg)', border: '2px solid var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={40} style={{ color: 'var(--color-danger)' }} /></div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-fg)', margin: '0 0 8px 0' }}>Acesso Negado</h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-fgMuted)', margin: '0 0 24px 0' }}>Seu perfil <strong style={{ color: 'var(--color-fg)' }}>{user.perfil ? user.perfil.replace('_', ' ') : '—'}</strong> não possui permissão para <strong style={{ color: 'var(--color-fg)' }}>{acao}</strong> em <strong style={{ color: 'var(--color-fg)' }}>{recurso}</strong>.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => window.history.back()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-fg)', backgroundColor: 'var(--color-bgElevated)', border: '2px solid var(--color-border)', cursor: 'pointer', transition: 'all 120ms ease' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Voltar</button>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-bg)', backgroundColor: 'var(--color-accent)', border: '2px solid var(--color-accent)', textDecoration: 'none', transition: 'all 120ms ease' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12"/></svg>Ir ao Painel</Link>
          </div>
          {fallback && <div style={{ marginTop: '24px' }}>{fallback}</div>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

import { useAuthStore as useAuthStoreHook } from '@/features/auth/store';
import { can as canFn } from '@/features/auth/permissions';

export function usePermissao(recurso: string, acao: string = 'read', targetLabId?: string) { const { user, isAuthenticated } = useAuthStoreHook(); if (!isAuthenticated || !user) return false; return canFn(user, acao as any, recurso as any, targetLabId); }

export function Permissao({ recurso, acao = 'read', targetLabId, children, fallback = null }: { recurso: string; acao?: string; targetLabId?: string; children: React.ReactNode; fallback?: React.ReactNode; }) { const temPermissao = usePermissao(recurso, acao, targetLabId); if (!temPermissao) return <>{fallback}</>; return <>{children}</>; }