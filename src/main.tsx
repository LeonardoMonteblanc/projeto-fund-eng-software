/**
 * Ponto de entrada da aplicação LabUcs Demo.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './app/providers';
import { useAuthStore } from './features/auth/store';
import { router, inicializarApp } from './app/routes';
import './styles/global.css';
import './styles/index.css';

async function bootstrap() {
  try {
    await inicializarApp();
    useAuthStore.getState().hydrate();

    const container = document.getElementById('root');
    if (!container) throw new Error('Elemento #root não encontrado');

    const root = createRoot(container);
    root.render(
      <StrictMode>
        <Providers>
          <RouterProvider router={router} fallbackElement={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-fg)', fontFamily: 'var(--font-sans)' }}>Carregando...</div>} />
        </Providers>
      </StrictMode>
    );
    console.log('[LabUcs] Aplicação iniciada');
  } catch (error) {
    console.error('[LabUcs] Erro na inicialização:', error);
    const container = document.getElementById('root');
    if (container) container.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;background:#0a0a0a;color:#f5f5f5;font-family:monospace;text-align:center"><h1 style="color:#ff3344">Erro na Inicialização</h1><pre style="text-align:left;background:#111;padding:1rem;border:2px solid #2a2a2a;overflow:auto">${error instanceof Error ? error.message : String(error)}</pre><button onclick="location.reload()" style="margin-top:2rem;padding:0.75rem 1.5rem;background:#00ff88;border:2px solid #00ff88;color:#0a0a0a;font-weight:700;cursor:pointer">Recarregar</button></div>`;
  }
}

bootstrap();