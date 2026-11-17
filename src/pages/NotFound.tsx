/**
 * NotFound - Página 404.
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, Button, spaceRem } from '@/shared/ui/components';

export function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', backgroundColor: 'var(--color-bg)' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--color-bg-elevated)', border: '2px solid var(--color-border)', padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-border)', lineHeight: 1, marginBottom: '16px' }}>404</div>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-fg)', margin: '0 0 16px 0' }}>Página não encontrada</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)', margin: '0 0 32px 0' }}>O caminho <code style={{ backgroundColor: 'var(--color-bg)', padding: '0 8px', border: '2px solid var(--color-border)' }}>{window.location.pathname}</code> não existe.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link to="/"><Button variant="primary" leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12"/></svg>} size="lg">Ir para o Painel</Button></Link>
          <Button variant="secondary" leftIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>} onClick={() => window.history.back()}>Voltar à página anterior</Button>
        </div>
      </div>
    </div>
  );
}