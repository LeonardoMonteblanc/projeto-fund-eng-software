/**
 * Configuração de rotas com React Router v6.
 */

import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/widgets/Layout';
import { LoginDemo } from '@/features/auth/components/LoginDemo';
import { Dashboard } from '@/pages/Dashboard';
import { NotFound } from '@/pages/NotFound';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { EquipamentosPage } from '@/features/equipamentos/EquipamentosPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginDemo /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <ProtectedRoute recurso="painel" acao="read"><Dashboard /></ProtectedRoute> },
      { path: 'equipamentos', element: <ProtectedRoute recurso="equipments" acao="read"><EquipamentosPage /></ProtectedRoute> },
      { path: 'itens', element: <ProtectedRoute recurso="items" acao="read"><EmConstrucao titulo="Itens e Catálogo" /></ProtectedRoute> },
      { path: 'eventos', element: <ProtectedRoute recurso="calibrations" acao="read"><EmConstrucao titulo="Eventos" /></ProtectedRoute> },
      { path: 'solicitacoes', element: <ProtectedRoute recurso="requests" acao="read"><EmConstrucao titulo="Solicitações" /></ProtectedRoute> },
      { path: 'fornecedores', element: <ProtectedRoute recurso="suppliers" acao="read"><EmConstrucao titulo="Fornecedores" /></ProtectedRoute> },
      { path: 'laboratorios', element: <ProtectedRoute recurso="labs" acao="read"><EmConstrucao titulo="Laboratórios" /></ProtectedRoute> },
      { path: 'usuarios', element: <ProtectedRoute recurso="users" acao="read"><EmConstrucao titulo="Usuários" /></ProtectedRoute> },
      { path: 'relatorios', element: <ProtectedRoute recurso="reports" acao="read"><EmConstrucao titulo="Relatórios" /></ProtectedRoute> },
      { path: 'custos', element: <ProtectedRoute recurso="reports" acao="read"><EmConstrucao titulo="Indicadores de Custos" /></ProtectedRoute> },
      { path: 'auditoria', element: <ProtectedRoute recurso="audit" acao="read"><EmConstrucao titulo="Auditoria" /></ProtectedRoute> },
      { path: 'config', element: <ProtectedRoute recurso="config" acao="read"><EmConstrucao titulo="Configurações" /></ProtectedRoute> },
      { path: 'backup', element: <ProtectedRoute recurso="config" acao="read"><EmConstrucao titulo="Backup e Dados" /></ProtectedRoute> },
      { path: 'inventario', element: <ProtectedRoute recurso="reports" acao="read"><EmConstrucao titulo="Inventário" /></ProtectedRoute> },
      { path: 'agenda', element: <ProtectedRoute recurso="calibrations" acao="read"><EmConstrucao titulo="Agenda" /></ProtectedRoute> },
      { path: 'privacidade', element: <ProtectedRoute recurso="painel" acao="read"><EmConstrucao titulo="Privacidade (LGPD)" /></ProtectedRoute> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function EmConstrucao({ titulo }: { titulo: string }) {
  return <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', color: 'var(--color-fgMuted)' }}>
    <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', backgroundColor: 'var(--color-accentBg)', border: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 14v4"/><path d="M12 10h.01"/></svg></div>
    <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-fg)', margin: '0 0 8px 0' }}>{titulo}</h2>
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', margin: 0 }}>Módulo em desenvolvimento</p>
  </div>;
}

export { router };

export async function inicializarApp(): Promise<void> {
  const { seedDatabase } = await import('@/shared/seed');
  await seedDatabase();
}