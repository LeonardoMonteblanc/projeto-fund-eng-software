/** Tabela de rotas e resolução do hash. */

import { paginaLogin, paginaPainel } from './pages/session.js';
import {
  paginaEquipamentos, paginaEquipamentoDetalhe, paginaItens
} from './pages/equipment.js';
import {
  paginaEventos, paginaEventoNovo, paginaSolicitacoes, paginaAgenda
} from './pages/operations.js';
import {
  paginaFornecedores, paginaLaboratorios, paginaUsuarios
} from './pages/registry.js';
import { paginaRelatorios, paginaAuditoria } from './pages/reports.js';
import { paginaConfig } from './pages/settings.js';
import { paginaPrivacidade } from './pages/privacy.js';
import { paginaAjuda } from './pages/help.js';

export const ROTAS = {
  '/painel': { titulo: 'Painel de Controle', feature: 'F01', view: (app) => paginaPainel(app) },
  '/equipamentos': { titulo: 'Equipamentos', feature: 'F02', view: (app) => paginaEquipamentos(app) },
  '/itens': { titulo: 'Itens e Catálogo', feature: 'F03', view: (app) => paginaItens(app) },
  '/eventos': { titulo: 'Eventos', feature: 'F04', view: (app) => paginaEventos(app) },
  '/eventos/novo': { titulo: 'Registrar Evento', feature: 'F04', view: (app, query) => paginaEventoNovo(app, query) },
  '/solicitacoes': { titulo: 'Solicitações', feature: 'F05', view: (app) => paginaSolicitacoes(app) },
  '/fornecedores': { titulo: 'Fornecedores', feature: 'F06', view: (app) => paginaFornecedores(app) },
  '/laboratorios': { titulo: 'Laboratórios', feature: 'F07', view: (app) => paginaLaboratorios(app) },
  '/usuarios': { titulo: 'Usuários', feature: 'F08', view: (app) => paginaUsuarios(app) },
  '/relatorios': { titulo: 'Relatórios', feature: 'F09', view: (app) => paginaRelatorios(app) },
  '/inventario': { titulo: 'Inventário', feature: 'F14', view: (app) => paginaRelatorios(app, 'inventario') },
  '/custos': { titulo: 'Indicadores de Custos', feature: 'F10', view: (app) => paginaRelatorios(app, 'custos') },
  '/auditoria': { titulo: 'Auditoria', feature: 'F11', view: (app) => paginaAuditoria(app) },
  '/config': { titulo: 'Configuração', feature: 'F12', view: (app) => paginaConfig(app) },
  '/backup': { titulo: 'Backups e Dados', feature: 'F13', view: (app) => paginaConfig(app, 'backup') },
  '/agenda': { titulo: 'Agenda', feature: 'F15', view: (app) => paginaAgenda(app) },
  '/privacidade': { titulo: 'Privacidade', feature: 'F16', view: (app) => paginaPrivacidade(app) },
  '/ajuda': { titulo: 'Ajuda e Arquitetura', feature: null, view: (app) => paginaAjuda(app) }
};

export function parseHash() {
  const bruto = window.location.hash.replace(/^#/, '') || '/painel';
  const [caminho, consulta] = bruto.split('?');
  return { caminho: caminho || '/painel', query: new URLSearchParams(consulta ?? '') };
}

export function rotaEquipamento(caminho) {
  const match = /^\/equipamentos\/(\d+)$/.exec(caminho);
  return match ? Number(match[1]) : null;
}

export function tituloDaRota(caminho) {
  return ROTAS[caminho]?.titulo ?? (rotaEquipamento(caminho) ? 'Equipamento' : 'LabUcs');
}
