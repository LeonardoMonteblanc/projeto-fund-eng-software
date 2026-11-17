/**
 * Layout principal da aplicação.
 */

import { Outlet } from 'react-router-dom';
import { useFuncionalidades } from '@/features/auth/store';
import { Header } from './Header';
import { spaceRem } from '@/shared/ui/theme';

export function Layout() {
  const funcionalidades = useFuncionalidades();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-sans)' }}>
      <Header />
      <main className="conteudo-principal" style={{ flex: 1, padding: '24px 24px 48px', width: '100%', maxWidth: '1600px', margin: '0 auto', boxSizing: 'border-box', minHeight: '55vh', minWidth: 0 }}>
        <Outlet />
      </main>
      <footer style={{ background: 'var(--color-cinza-topo)', color: '#CFD6DE', borderTop: '4px solid var(--color-accent)', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          LabUcs Demo — POC estática · Universidade de Caxias do Sul · FBI4010X
        </p>
      </footer>
    </div>
  );
}