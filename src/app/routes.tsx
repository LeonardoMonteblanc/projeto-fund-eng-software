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
import { ItensPage } from '@/features/itens/ItensPage';
import { EventosPage } from '@/features/eventos/EventosPage';
import { SolicitacoesPage } from '@/features/solicitacoes/SolicitacoesPage';
import { FornecedoresPage } from '@/features/fornecedores/FornecedoresPage';
import { LaboratoriosPage } from '@/features/laboratorios/LaboratoriosPage';
import { UsuariosPage } from '@/features/usuarios/UsuariosPage';
import { RelatoriosPage } from '@/features/relatorios/RelatoriosPage';
import { CustosPage } from '@/features/custos/CustosPage';
import { AuditoriaPage } from '@/features/auditoria/AuditoriaPage';
import { ConfigPage } from '@/features/config/ConfigPage';
import { BackupPage } from '@/features/backup/BackupPage';
import { InventarioPage } from '@/features/relatorios/InventarioPage';
import { AgendaPage } from '@/features/agenda/AgendaPage';
import { PrivacidadePage } from '@/features/privacidade/PrivacidadePage';

const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';

const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginDemo /> },
    {
      path: '/',
      element: <Layout />,
      children: [
        { path: '/', element: <ProtectedRoute recurso="painel" acao="read"><Dashboard /></ProtectedRoute> },
        { path: 'equipamentos', element: <ProtectedRoute recurso="equipments" acao="read"><EquipamentosPage /></ProtectedRoute> },
        { path: 'itens', element: <ProtectedRoute recurso="items" acao="read"><ItensPage /></ProtectedRoute> },
        { path: 'eventos', element: <ProtectedRoute recurso="calibrations" acao="read"><EventosPage /></ProtectedRoute> },
        { path: 'solicitacoes', element: <ProtectedRoute recurso="requests" acao="read"><SolicitacoesPage /></ProtectedRoute> },
        { path: 'fornecedores', element: <ProtectedRoute recurso="suppliers" acao="read"><FornecedoresPage /></ProtectedRoute> },
        { path: 'laboratorios', element: <ProtectedRoute recurso="labs" acao="read"><LaboratoriosPage /></ProtectedRoute> },
        { path: 'usuarios', element: <ProtectedRoute recurso="users" acao="read"><UsuariosPage /></ProtectedRoute> },
        { path: 'relatorios', element: <ProtectedRoute recurso="reports" acao="read"><RelatoriosPage /></ProtectedRoute> },
        { path: 'custos', element: <ProtectedRoute recurso="reports" acao="read"><CustosPage /></ProtectedRoute> },
        { path: 'auditoria', element: <ProtectedRoute recurso="audit" acao="read"><AuditoriaPage /></ProtectedRoute> },
        { path: 'config', element: <ProtectedRoute recurso="config" acao="read"><ConfigPage /></ProtectedRoute> },
        { path: 'backup', element: <ProtectedRoute recurso="config" acao="read"><BackupPage /></ProtectedRoute> },
        { path: 'inventario', element: <ProtectedRoute recurso="reports" acao="read"><InventarioPage /></ProtectedRoute> },
        { path: 'agenda', element: <ProtectedRoute recurso="calibrations" acao="read"><AgendaPage /></ProtectedRoute> },
        { path: 'privacidade', element: <ProtectedRoute recurso="painel" acao="read"><PrivacidadePage /></ProtectedRoute> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  { basename },
);

export { router };

export async function inicializarApp(): Promise<void> {
  const { seedDatabase } = await import('@/shared/seed');
  await seedDatabase();
}