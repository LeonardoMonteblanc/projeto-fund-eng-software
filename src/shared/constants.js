/**
 * Constantes de domínio, rótulos PT-BR, matriz de permissões e catálogo RF01.
 * Fonte única de verdade para enums usados por serviços, relatórios e interface.
 */

export const VERSAO_APP = '1.0.0';
export const VERSAO_ESQUEMA = 1;
export const CHAVE_DB = 'labucs.db.v1';
export const CHAVE_SESSAO = 'labucs.sessao.v1';
export const CHAVE_BACKUPS = 'labucs.backups.v1';

export const NOME_APP = 'LabUcs — Gestão de Equipamentos Laboratoriais';
export const SIGLA_APP = 'LabUcs';

/* ------------------------------------------------------------------ */
/* Perfis (RNF02)                                                      */
/* ------------------------------------------------------------------ */

export const PERFIS = Object.freeze({
  ADMIN: 'ADMIN',
  GESTOR_LAB: 'GESTOR_LAB',
  GESTOR_GERAL: 'GESTOR_GERAL',
  TECNICO: 'TECNICO'
});

export const PERFIL_ROTULO = Object.freeze({
  ADMIN: 'Administrador',
  GESTOR_LAB: 'Gestor de Laboratório',
  GESTOR_GERAL: 'Gestor Geral',
  TECNICO: 'Técnico'
});

export const PERFIL_DESCRICAO = Object.freeze({
  ADMIN: 'Gerencia usuários, laboratórios, fornecedores, catálogo e parâmetros; consulta dados operacionais em modo leitura.',
  GESTOR_LAB: 'Gerencia equipamentos, eventos e solicitações do seu laboratório; emite relatórios do laboratório.',
  GESTOR_GERAL: 'Visão consolidada de todos os laboratórios, eventos, relatórios gerenciais, custos e log de auditoria.',
  TECNICO: 'Registra calibrações, verificações e manutenções; consulta equipamentos e históricos do seu laboratório.'
});

/* ------------------------------------------------------------------ */
/* Permissões                                                          */
/* ------------------------------------------------------------------ */

export const PERMISSOES = Object.freeze({
  FUNCIONALIDADES_CONSULTAR: 'funcionalidades.consultar',
  USUARIOS_GERENCIAR: 'usuarios.gerenciar',
  LABORATORIOS_GERENCIAR: 'laboratorios.gerenciar',
  FORNECEDORES_GERENCIAR: 'fornecedores.gerenciar',
  CATALOGO_GERENCIAR: 'catalogo.gerenciar',
  ITENS_CONSULTAR: 'itens.consultar',
  ITENS_GERENCIAR: 'itens.gerenciar',
  EQUIPAMENTOS_CONSULTAR: 'equipamentos.consultar',
  EQUIPAMENTOS_GERENCIAR: 'equipamentos.gerenciar',
  EVENTOS_CONSULTAR: 'eventos.consultar',
  EVENTOS_REGISTRAR: 'eventos.registrar',
  SOLICITACOES_CRIAR: 'solicitacoes.criar',
  SOLICITACOES_APROVAR: 'solicitacoes.aprovar',
  INVENTARIO_GERAR: 'inventario.gerar',
  RELATORIOS_OPERACIONAIS: 'relatorios.operacionais',
  RELATORIOS_GERENCIAIS: 'relatorios.gerenciais',
  INDICADORES_CUSTOS: 'indicadores.custos',
  PAINEL_CONSULTAR: 'painel.consultar',
  AUDITORIA_CONSULTAR: 'auditoria.consultar',
  CONFIG_GERENCIAR: 'config.gerenciar',
  BACKUP_GERENCIAR: 'backup.gerenciar',
  LGPD_GERENCIAR: 'lgpd.gerenciar',
  CONSOLIDADO_CONSULTAR: 'consolidado.consultar'
});

const P = PERMISSOES;

/**
 * Matriz de permissões. Os quatro perfis são exclusivos (Q15: não há acúmulo).
 * ADMIN é somente leitura no operacional; AUDITORIA é exclusiva do GESTOR_GERAL (RNF03).
 */
export const PERMISSOES_POR_PERFIL = Object.freeze({
  ADMIN: Object.freeze([
    P.FUNCIONALIDADES_CONSULTAR, P.USUARIOS_GERENCIAR, P.LABORATORIOS_GERENCIAR,
    P.FORNECEDORES_GERENCIAR, P.CATALOGO_GERENCIAR, P.ITENS_CONSULTAR,
    P.EQUIPAMENTOS_CONSULTAR, P.EVENTOS_CONSULTAR, P.PAINEL_CONSULTAR,
    P.RELATORIOS_OPERACIONAIS, P.CONSOLIDADO_CONSULTAR,
    P.CONFIG_GERENCIAR, P.BACKUP_GERENCIAR, P.LGPD_GERENCIAR
  ]),
  GESTOR_LAB: Object.freeze([
    P.FUNCIONALIDADES_CONSULTAR, P.FORNECEDORES_GERENCIAR, P.CATALOGO_GERENCIAR,
    P.ITENS_CONSULTAR, P.ITENS_GERENCIAR, P.EQUIPAMENTOS_CONSULTAR,
    P.EQUIPAMENTOS_GERENCIAR, P.EVENTOS_CONSULTAR, P.EVENTOS_REGISTRAR,
    P.SOLICITACOES_CRIAR, P.SOLICITACOES_APROVAR, P.INVENTARIO_GERAR,
    P.RELATORIOS_OPERACIONAIS, P.PAINEL_CONSULTAR
  ]),
  GESTOR_GERAL: Object.freeze([
    P.FUNCIONALIDADES_CONSULTAR, P.ITENS_CONSULTAR, P.EQUIPAMENTOS_CONSULTAR,
    P.EVENTOS_CONSULTAR, P.EVENTOS_REGISTRAR, P.SOLICITACOES_CRIAR,
    P.INVENTARIO_GERAR, P.RELATORIOS_OPERACIONAIS, P.RELATORIOS_GERENCIAIS,
    P.INDICADORES_CUSTOS, P.PAINEL_CONSULTAR, P.AUDITORIA_CONSULTAR,
    P.CONSOLIDADO_CONSULTAR
  ]),
  TECNICO: Object.freeze([
    P.FUNCIONALIDADES_CONSULTAR, P.ITENS_CONSULTAR, P.EQUIPAMENTOS_CONSULTAR,
    P.EVENTOS_CONSULTAR, P.EVENTOS_REGISTRAR, P.SOLICITACOES_CRIAR,
    P.PAINEL_CONSULTAR
  ])
});

/* ------------------------------------------------------------------ */
/* Enums de domínio                                                    */
/* ------------------------------------------------------------------ */

export const TIPOS_EVENTO = Object.freeze({
  CALIBRACAO: 'CALIBRACAO',
  VERIFICACAO: 'VERIFICACAO',
  MANUTENCAO_PREVENTIVA: 'MANUTENCAO_PREVENTIVA',
  MANUTENCAO_CORRETIVA: 'MANUTENCAO_CORRETIVA',
  DIVERGENCIA_INVENTARIO: 'DIVERGENCIA_INVENTARIO'
});

export const TIPO_EVENTO_ROTULO = Object.freeze({
  CALIBRACAO: 'Calibração',
  VERIFICACAO: 'Verificação',
  MANUTENCAO_PREVENTIVA: 'Manutenção Preventiva',
  MANUTENCAO_CORRETIVA: 'Manutenção Corretiva',
  DIVERGENCIA_INVENTARIO: 'Divergência de Inventário'
});

export const TIPOS_EVENTO_METROLOGICOS = Object.freeze([TIPOS_EVENTO.CALIBRACAO, TIPOS_EVENTO.VERIFICACAO]);
export const TIPOS_EVENTO_MANUTENCAO = Object.freeze([TIPOS_EVENTO.MANUTENCAO_PREVENTIVA, TIPOS_EVENTO.MANUTENCAO_CORRETIVA]);

export const SITUACOES_EVENTO = Object.freeze({
  AGENDADO: 'AGENDADO',
  REALIZADO: 'REALIZADO',
  CANCELADO: 'CANCELADO'
});

export const SITUACAO_EVENTO_ROTULO = Object.freeze({
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado'
});

export const SITUACOES_SOLICITACAO = Object.freeze({
  PENDENTE: 'PENDENTE',
  APROVADA: 'APROVADA',
  REJEITADA: 'REJEITADA'
});

export const SITUACAO_SOLICITACAO_ROTULO = Object.freeze({
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada'
});

export const SITUACOES_EQUIPAMENTO = Object.freeze({
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
  EM_MANUTENCAO: 'EM_MANUTENCAO'
});

export const SITUACAO_EQUIPAMENTO_ROTULO = Object.freeze({
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  EM_MANUTENCAO: 'Em manutenção'
});

export const RESULTADOS = Object.freeze({
  APROVADO: 'APROVADO',
  REPROVADO: 'REPROVADO'
});

export const RESULTADO_ROTULO = Object.freeze({
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado'
});

export const ESTADOS_RETORNO = Object.freeze({
  APTO: 'APTO',
  EM_MANUTENCAO: 'EM_MANUTENCAO',
  INATIVO: 'INATIVO'
});

export const ESTADO_RETORNO_ROTULO = Object.freeze({
  APTO: 'Apto para uso',
  EM_MANUTENCAO: 'Em manutenção',
  INATIVO: 'Inativo / não retorna ao uso'
});

/** Efeito do estado de retorno sobre a situação do equipamento (UC Registrar Manutenção Corretiva, 11a). */
export const SITUACAO_POR_ESTADO_RETORNO = Object.freeze({
  APTO: SITUACOES_EQUIPAMENTO.ATIVO,
  EM_MANUTENCAO: SITUACOES_EQUIPAMENTO.EM_MANUTENCAO,
  INATIVO: SITUACOES_EQUIPAMENTO.INATIVO
});

export const TIPOS_INDICACAO = Object.freeze({
  ANALOGICO: 'ANALOGICO',
  DIGITAL: 'DIGITAL'
});

export const TIPO_INDICACAO_ROTULO = Object.freeze({
  ANALOGICO: 'Analógico (A)',
  DIGITAL: 'Digital (D)'
});

export const TIPO_INDICACAO_ABREVIADO = Object.freeze({ ANALOGICO: 'A', DIGITAL: 'D' });

export const ACOES_LOG = Object.freeze({
  CRIAR: 'CRIAR',
  ATUALIZAR: 'ATUALIZAR',
  INATIVAR: 'INATIVAR',
  REATIVAR: 'REATIVAR',
  APROVAR: 'APROVAR',
  REJEITAR: 'REJEITAR',
  REALIZAR: 'REALIZAR',
  CANCELAR: 'CANCELAR',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FALHA: 'LOGIN_FALHA',
  EXPORTAR: 'EXPORTAR',
  BACKUP: 'BACKUP',
  RESTAURAR: 'RESTAURAR',
  IMPORTAR: 'IMPORTAR',
  ANONIMIZAR: 'ANONIMIZAR',
  REDEFINIR_SENHA: 'REDEFINIR_SENHA',
  REINICIAR: 'REINICIAR'
});

export const ACAO_LOG_ROTULO = Object.freeze({
  CRIAR: 'Criação', ATUALIZAR: 'Alteração', INATIVAR: 'Inativação', REATIVAR: 'Reativação',
  APROVAR: 'Aprovação', REJEITAR: 'Rejeição', REALIZAR: 'Realização', CANCELAR: 'Cancelamento',
  LOGIN: 'Login', LOGOUT: 'Logout', LOGIN_FALHA: 'Falha de login', EXPORTAR: 'Exportação',
  BACKUP: 'Backup', RESTAURAR: 'Restauração', IMPORTAR: 'Importação', ANONIMIZAR: 'Anonimização',
  REDEFINIR_SENHA: 'Redefinição de senha', REINICIAR: 'Reinício da demonstração'
});

/** Sinalizações visuais do RF17 — sem bloqueio automático e sem alterar a situação operacional. */
export const SINALIZACOES = Object.freeze({
  CALIBRACAO_VENCIDA: 'CALIBRACAO_VENCIDA',
  CALIBRACAO_REPROVADA: 'CALIBRACAO_REPROVADA',
  VERIFICACAO_VENCIDA: 'VERIFICACAO_VENCIDA',
  PERIODICIDADE_ZERO: 'PERIODICIDADE_ZERO'
});

export const SINALIZACAO_META = Object.freeze({
  CALIBRACAO_VENCIDA: { rotulo: 'Calibração vencida', severidade: 'CRITICO', icone: 'alert' },
  CALIBRACAO_REPROVADA: { rotulo: 'Calibração reprovada', severidade: 'CRITICO', icone: 'x' },
  VERIFICACAO_VENCIDA: { rotulo: 'Verificação vencida', severidade: 'ALTO', icone: 'alert' },
  PERIODICIDADE_ZERO: { rotulo: 'Periodicidade não definida', severidade: 'MEDIO', icone: 'info' }
});

export const NIVEIS_ALERTA = Object.freeze({ CRITICO: 'CRITICO', ALTO: 'ALTO', MEDIO: 'MEDIO', INFO: 'INFO' });

export const TIPOS_ALERTA = Object.freeze({
  CALIBRACAO_VENCIDA: 'CALIBRACAO_VENCIDA',
  CALIBRACAO_A_VENCER: 'CALIBRACAO_A_VENCER',
  CALIBRACAO_REPROVADA: 'CALIBRACAO_REPROVADA',
  VERIFICACAO_VENCIDA: 'VERIFICACAO_VENCIDA',
  VERIFICACAO_A_VENCER: 'VERIFICACAO_A_VENCER',
  MANUTENCAO_VENCIDA: 'MANUTENCAO_VENCIDA',
  MANUTENCAO_A_VENCER: 'MANUTENCAO_A_VENCER',
  SOLICITACAO_PENDENTE: 'SOLICITACAO_PENDENTE'
});

export const STATUS_PRAZO = Object.freeze({ VENCIDO: 'VENCIDO', A_VENCER: 'A_VENCER', EM_DIA: 'EM_DIA', SEM_DATA: 'SEM_DATA' });

export const STATUS_PRAZO_ROTULO = Object.freeze({
  VENCIDO: 'Vencido', A_VENCER: 'A vencer', EM_DIA: 'Em dia', SEM_DATA: 'Sem data'
});

/* ------------------------------------------------------------------ */
/* Parâmetros padrão                                                   */
/* ------------------------------------------------------------------ */

export const PARAMETROS_PADRAO = Object.freeze({
  nomeSistema: 'LabUcs — Gestão de Equipamentos Laboratoriais',
  diasAlertaVencimento: 30,
  timeoutSessaoMinutos: 30,
  retencaoBackupDias: 7,
  maxTentativasLogin: 5,
  bloqueioLoginSegundos: 120,
  permitirAutoAprovacao: false,
  moeda: 'BRL'
});

/* ------------------------------------------------------------------ */
/* Catálogo de funcionalidades (RF01)                                  */
/* ------------------------------------------------------------------ */

/**
 * Cada funcionalidade declara as permissões que a tornam acessível.
 * A interface oculta itens sem permissão; a API bloqueia a operação.
 */
export const FUNCIONALIDADES = Object.freeze([
  { codigo: 'F01', nome: 'Painel de Controle', descricao: 'Indicadores, alertas de vencimento e pendências.', rota: '#/painel', permissoes: [P.PAINEL_CONSULTAR] },
  { codigo: 'F02', nome: 'Equipamentos', descricao: 'Consultar, cadastrar, editar, inativar equipamentos e ver histórico.', rota: '#/equipamentos', permissoes: [P.EQUIPAMENTOS_CONSULTAR] },
  { codigo: 'F03', nome: 'Itens e Catálogo', descricao: 'Itens (modelos), categorias e subcategorias.', rota: '#/itens', permissoes: [P.ITENS_CONSULTAR] },
  { codigo: 'F04', nome: 'Eventos', descricao: 'Calibrações, verificações e manutenções.', rota: '#/eventos', permissoes: [P.EVENTOS_CONSULTAR] },
  { codigo: 'F05', nome: 'Solicitações', descricao: 'Solicitar, aprovar e rejeitar eventos.', rota: '#/solicitacoes', permissoes: [P.SOLICITACOES_CRIAR, P.SOLICITACOES_APROVAR] },
  { codigo: 'F06', nome: 'Fornecedores', descricao: 'Cadastro e manutenção de fornecedores.', rota: '#/fornecedores', permissoes: [P.FORNECEDORES_GERENCIAR] },
  { codigo: 'F07', nome: 'Laboratórios', descricao: 'Cadastro e manutenção dos laboratórios.', rota: '#/laboratorios', permissoes: [P.LABORATORIOS_GERENCIAR] },
  { codigo: 'F08', nome: 'Usuários', descricao: 'Usuários, perfis e permissões.', rota: '#/usuarios', permissoes: [P.USUARIOS_GERENCIAR] },
  { codigo: 'F09', nome: 'Relatórios', descricao: 'Inventário, situação, histórico e anexos operacionais.', rota: '#/relatorios', permissoes: [P.RELATORIOS_OPERACIONAIS, P.RELATORIOS_GERENCIAIS] },
  { codigo: 'F10', nome: 'Indicadores de Custos', descricao: 'Custos por laboratório/tipo e relação com receita.', rota: '#/custos', permissoes: [P.INDICADORES_CUSTOS] },
  { codigo: 'F11', nome: 'Auditoria', descricao: 'Log interno completo de alterações.', rota: '#/auditoria', permissoes: [P.AUDITORIA_CONSULTAR] },
  { codigo: 'F12', nome: 'Configurações', descricao: 'Parâmetros do sistema.', rota: '#/config', permissoes: [P.CONFIG_GERENCIAR] },
  { codigo: 'F13', nome: 'Backup e Dados', descricao: 'Cópias de segurança, exportação e importação.', rota: '#/backup', permissoes: [P.BACKUP_GERENCIAR] },
  { codigo: 'F14', nome: 'Inventário', descricao: 'Inventário anual de equipamentos ativos por laboratório.', rota: '#/inventario', permissoes: [P.INVENTARIO_GERAR] },
  { codigo: 'F15', nome: 'Agenda', descricao: 'Eventos programados por período, laboratório e tipo.', rota: '#/agenda', permissoes: [P.EVENTOS_CONSULTAR] },
  { codigo: 'F16', nome: 'Privacidade (LGPD)', descricao: 'Aviso de privacidade e acesso aos próprios dados.', rota: '#/privacidade', permissoes: [] }
]);

/* ------------------------------------------------------------------ */
/* Diversos                                                            */
/* ------------------------------------------------------------------ */

export const TABELAS_AUDITADAS = Object.freeze({
  laboratorios: 'Laboratório',
  usuarios: 'Usuário',
  fornecedores: 'Fornecedor',
  categorias: 'Categoria',
  subcategorias: 'Subcategoria',
  itens: 'Item',
  equipamentos: 'Equipamento',
  solicitacoes: 'Solicitação',
  eventos: 'Evento',
  relatorios: 'Relatório',
  configuracoes: 'Configuração',
  sistema: 'Sistema'
});

export const LIMITES = Object.freeze({
  NOME_CURTO: 120,
  NOME_LONGO: 180,
  DESCRICAO: 2000,
  OBSERVACOES: 4000,
  JUSTIFICATIVA: 2000,
  MOTIVO_MIN: 5,
  MOTIVO_MAX: 1000,
  SENHA_MIN: 8,
  SENHA_MAX: 128
});

export const ANEXO_2_COLUNAS = Object.freeze(['Data', 'Problema Apresentado', 'Data de Retorno', 'Estado de Retorno', 'Status']);
