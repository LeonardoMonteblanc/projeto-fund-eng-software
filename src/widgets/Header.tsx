/**
 * Header fixo superior com navegação por módulos acessíveis (RF01).
 */

import { NavLink, Link } from 'react-router-dom';
import { useFuncionalidades, useIsAuthenticated } from '@/features/auth/store';
import { ProfileSwitcher } from '@/features/auth/components/ProfileSwitcher';
import { spaceRem } from '@/shared/ui/theme';

export function Header() {
  const funcionalidades = useFuncionalidades();
  const autenticado = useIsAuthenticated();

  const modulos = funcionalidades.filter((f) => f.acessivel && f.rota && f.rota !== '/');

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', padding: `8px ${spaceRem(4)}`, backgroundColor: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)', gap: spaceRem(3), flexWrap: 'wrap' }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: spaceRem(2), textDecoration: 'none', color: 'var(--color-fg)' }} aria-label="LabUcs - Página inicial">
        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-accent-bg)', border: '1px solid var(--color-accent)', borderRadius: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="4" fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth="2"/><path d="M8 16L14 22L24 10" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, letterSpacing: '0.02em' }}>LabUcs</span>
      </Link>

      {autenticado && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap' }} aria-label="Navegação principal">
          <NavLink to="/" end style={({ isActive }) => navStyle(isActive)}>Painel</NavLink>
          {modulos.map((m) => (
            <NavLink key={m.codigo} to={m.rota} title={m.descricao} style={({ isActive }) => navStyle(isActive)}>{m.nome}</NavLink>
          ))}
        </nav>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: spaceRem(2), marginLeft: 'auto' }}>
        <ProfileSwitcher />
      </div>
    </header>
  );
}

function navStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    color: isActive ? 'var(--color-accent)' : 'var(--color-fg-muted)',
    textDecoration: 'none',
    backgroundColor: isActive ? 'var(--color-accent-bg)' : 'transparent',
    border: '1px solid transparent',
    borderColor: isActive ? 'var(--color-accent)' : 'transparent',
    borderRadius: '6px',
    transition: 'all 120ms ease',
  };
}
