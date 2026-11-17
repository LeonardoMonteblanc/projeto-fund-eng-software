/**
 * Header institucional em dois níveis (identidade visual 10/nov):
 * - Topo cinza institucional com logotipo UCS e assinatura LabUcs
 * - Barra de navegação azul com filete rosa e módulos em caixa alta
 */

import { NavLink, Link } from 'react-router-dom';
import { useFuncionalidades, useIsAuthenticated, usePerfil, useLabId } from '@/features/auth/store';
import { ProfileSwitcher } from '@/features/auth/components/ProfileSwitcher';
import { PERFIL_ROTULO } from '@/shared/constants';
import { spaceRem } from '@/shared/ui/theme';
import { useEffect, useState } from 'react';
import { getDB } from '@/shared/db';

export function Header() {
  const funcionalidades = useFuncionalidades();
  const autenticado = useIsAuthenticated();
  const perfil = usePerfil();
  const labId = useLabId();
  const [labSigla, setLabSigla] = useState<string>('');

  useEffect(() => {
    if (!labId) { setLabSigla(''); return; }
    getDB().then((db) => db.get('labs', labId)).then((lab: any) => setLabSigla(lab?.sigla ?? '')).catch(() => setLabSigla(''));
  }, [labId]);

  const modulos = funcionalidades.filter((f) => f.acessivel && f.rota && f.rota !== '/');

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ background: 'var(--color-cinza-topo)', color: 'var(--color-fg-on-dark)', borderBottom: '4px solid var(--color-accent)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '18px', minHeight: '64px', padding: '8px 24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', flex: '0 0 auto' }}>
            <img src={(import.meta as any).env?.BASE_URL + 'assets/logo-ucs-branco.png'} alt="UCS" style={{ width: '220px', maxWidth: '40vw', height: 'auto', display: 'block' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '18px', borderLeft: '2px solid rgba(255,255,255,0.35)' }}>
            <strong style={{ fontSize: '18px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#FFFFFF', fontWeight: 600 }}>LabUcs</strong>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CFD6DE' }}>Gestão de Equipamentos Laboratoriais</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {autenticado && perfil && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', paddingRight: '16px', borderRight: '2px solid rgba(255,255,255,0.25)', color: '#FFFFFF' }}>
                <div style={{ width: '34px', height: '34px', display: 'grid', placeItems: 'center', background: 'var(--color-accent)', color: '#FFFFFF', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                  {(PERFIL_ROTULO[perfil as keyof typeof PERFIL_ROTULO] ?? '?').charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                  <strong style={{ fontSize: '12px', color: '#FFFFFF' }}>{PERFIL_ROTULO[perfil as keyof typeof PERFIL_ROTULO] ?? perfil}</strong>
                  {labSigla && <small style={{ fontSize: '10px', color: '#CFD6DE' }}>{labSigla}</small>}
                </div>
              </div>
            )}
            <ProfileSwitcher />
          </div>
        </div>
      </div>

      {autenticado && (
        <nav style={{ background: 'var(--color-accent)', borderBottom: '4px solid var(--color-rosa)' }} aria-label="Navegação principal">
          <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', alignItems: 'stretch', overflowX: 'auto' }}>
            <NavLink to="/" end style={({ isActive }) => navItemStyle(isActive)}>Painel</NavLink>
            {modulos.map((m) => (
              <NavLink key={m.codigo} to={m.rota} title={m.descricao} style={({ isActive }) => navItemStyle(isActive)}>{m.nome}</NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function navItemStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px 10px',
    color: '#FFFFFF',
    fontSize: '10.5px',
    fontWeight: isActive ? 600 : 400,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    textDecoration: 'none',
    borderBottom: isActive ? '3px solid #FFFFFF' : '3px solid transparent',
    borderRight: '1px solid rgba(255, 255, 255, 0.16)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textAlign: 'center',
    minHeight: '44px',
    background: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
    transition: 'background var(--transition-base), color var(--transition-base)',
  };
}
