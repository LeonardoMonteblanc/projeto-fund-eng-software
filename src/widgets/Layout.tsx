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
      <main style={{ flex: 1, padding: spaceRem(4), width: '100%', maxWidth: '1600px', margin: '0 auto', boxSizing: 'border-box' }}>
        <Outlet />
      </main>
      <footer style={{ padding: spaceRem(3), borderTop: '2px solid var(--color-border)', backgroundColor: 'var(--color-bgElevated)', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fgDim)', margin: 0 }}>
          LabUcs Demo — POC estática · Universidade de Caxias do Sul · FBI4010X
        </p>
      </footer>
    </div>
  );
}