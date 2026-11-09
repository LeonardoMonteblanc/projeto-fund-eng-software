/**
 * Contrato TypeScript da fachada LabUcs para a camada visual.
 * A implementação é JavaScript em `src/backend/`; este arquivo é apenas tipagem.
 *
 * Importe no front-end:
 *   import { criarAplicacao, ErroApp } from '../src/backend/index.js';
 *   const app = await criarAplicacao({ baseReal });
 */

export type Perfil = 'ADMIN' | 'GESTOR_LAB' | 'GESTOR_GERAL' | 'TECNICO';
export type TipoEvento = 'CALIBRACAO' | 'VERIFICACAO' | 'MANUTENCAO_PREVENTIVA' | 'MANUTENCAO_CORRETIVA' | 'DIVERGENCIA_INVENTARIO';
export type SituacaoEvento = 'AGENDADO' | 'REALIZADO' | 'CANCELADO';
export type SituacaoSolicitacao = 'PENDENTE' | 'APROVADA' | 'REJEITADA';
export type SituacaoEquipamento = 'ATIVO' | 'INATIVO' | 'EM_MANUTENCAO';
export type Resultado = 'APROVADO' | 'REPROVADO';
export type EstadoRetorno = 'APTO' | 'EM_MANUTENCAO' | 'INATIVO';
export type Origem = 'IMPORTADO' | 'MANUAL' | 'DEMONSTRACAO' | 'SISTEMA';

export interface OrigemValor {
  valor: number | null;
  origem: 'ITEM' | 'EQUIPAMENTO' | 'INFORMADO' | null;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
  totalPaginas: number;
  resumo?: Record<string, number>;
}

export interface Sinalizacao {
  codigo: 'CALIBRACAO_VENCIDA' | 'CALIBRACAO_REPROVADA' | 'VERIFICACAO_VENCIDA' | 'PERIODICIDADE_ZERO';
  rotulo: string;
  severidade: 'CRITICO' | 'ALTO' | 'MEDIO';
  icone: string;
  detalhe: string;
}

export interface UsuarioDTO {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  perfilRotulo: string;
  laboratorioId: number | null;
  laboratorioSigla: string | null;
  laboratorioNome: string | null;
  ativo: boolean;
  anonimizado: boolean;
  criadoEm: string;
  ultimoAcessoEm: string | null;
}

export interface LaboratorioDTO {
  id: number;
  nome: string;
  sigla: string;
  codigo: string;
  localizacao: string | null;
  responsavelTecnico: string | null;
  ramal: string | null;
  bloco: string | null;
  sala: string | null;
  receitaMensalCentavos: number | null;
  receitaMensal: number | null;
  ativo: boolean;
  equipamentosAtivos: number;
  equipamentosInativos: number;
  equipamentosEmManutencao: number;
  totalEquipamentos: number;
}

export interface FornecedorDTO {
  id: number;
  razaoSocial: string;
  cnpj: string;
  cnpjFormatado: string;
  telefone: string;
  email: string;
  ativo: boolean;
  observacoes: string | null;
  totalEventos: number;
}

export interface ItemDTO {
  id: number;
  nome: string;
  descricao: string;
  fabricante: string;
  modelo: string | null;
  categoriaId: number | null;
  subcategoriaId: number | null;
  categoriaNome: string | null;
  subcategoriaNome: string | null;
  capacidadeMedicao: string | null;
  resolucao: string | null;
  tipoIndicacao: 'ANALOGICO' | 'DIGITAL' | null;
  tipoIndicacaoRotulo: string | null;
  caCalibracao: number | null;
  caVerificacao: number | null;
  periodicidadeCalibracaoMeses: number | null;
  periodicidadeVerificacaoMeses: number | null;
  periodicidadeManutencaoPreventivaMeses: number | null;
  parametrosEstimados: string[];
  ativo: boolean;
  origem: Origem;
  equipamentosAtivos?: number;
  equipamentosTotal?: number;
}

export interface EquipamentoResumo {
  dataRealizacao: string;
  resultado: Resultado | null;
  numeroCertificado?: string | null;
}

export interface EquipamentoDTO {
  id: number;
  tag: string;
  tagOriginal: string;
  patrimonio: string | null;
  numeroSerie: string | null;
  localizacao: string | null;
  situacao: SituacaoEquipamento;
  situacaoRotulo: string;
  itemId: number;
  item: ItemDTO | null;
  laboratorioId: number;
  laboratorio: { id: number; sigla: string; nome: string } | null;
  dataAquisicao: string | null;
  dataColocacaoUso: string | null;
  valorAquisicaoCentavos: number | null;
  valorAquisicao: number | null;
  caCalibracaoEfetivo: OrigemValor;
  caVerificacaoEfetivo: OrigemValor;
  periodicidadeCalibracaoMeses: OrigemValor;
  periodicidadeVerificacaoMeses: OrigemValor;
  periodicidadeManutencaoPreventivaMeses: OrigemValor;
  tipoIndicacao: 'ANALOGICO' | 'DIGITAL' | null;
  ultimaCalibracao: EquipamentoResumo | null;
  ultimaVerificacao: EquipamentoResumo | null;
  ultimaPreventiva: { dataRealizacao: string } | null;
  proximaCalibracao: string | null;
  proximaVerificacao: string | null;
  proximaManutencaoPreventiva: string | null;
  proximaManutencaoCalculada: string | null;
  proximaManutencaoAgendada: { dataPrevista: string } | null;
  diasParaVencimentoCalibracao: number | null;
  diasParaVencimentoVerificacao: number | null;
  diasParaVencimentoManutencao: number | null;
  diasParaVencimento: number | null;
  statusCalibracao: 'VENCIDO' | 'A_VENCER' | 'EM_DIA' | 'SEM_DATA';
  statusVerificacao: 'VENCIDO' | 'A_VENCER' | 'EM_DIA' | 'SEM_DATA';
  statusManutencao: 'VENCIDO' | 'A_VENCER' | 'EM_DIA' | 'SEM_DATA';
  statusPrazoRotulo: string;
  efetivos: {
    caCalibracao: OrigemValor;
    caVerificacao: OrigemValor;
    periodicidadeCalibracao: OrigemValor;
    periodicidadeVerificacao: OrigemValor;
    periodicidadeManutencao: OrigemValor;
  };
  sinalizacoes: Sinalizacao[];
  situacaoMetrologica: 'CONFORME' | 'ATENCAO' | 'NAO_CONFORME' | 'SEM_DADOS';
  completude: 'COMPLETA' | 'PARCIAL';
  camposPendentes: string[];
  camposPendentesRotulo: string[];
  origem: Origem;
  observacoes: string | null;
  fonte: string | null;
  parametrosDemonstracao: string[];
  totalEventos: number;
  eventos?: EventoDTO[];
  solicitacoes?: SolicitacaoDTO[];
}

export interface EventoDTO {
  id: number;
  tipo: TipoEvento;
  tipoRotulo: string;
  equipamentoId: number;
  equipamentoTag: string | null;
  equipamentoNome: string | null;
  equipamentoPatrimonio: string | null;
  laboratorioId: number | null;
  laboratorioSigla: string | null;
  fornecedorId: number | null;
  fornecedorNome: string | null;
  usuarioId: number | null;
  usuarioNome: string | null;
  solicitacaoId: number | null;
  dataPrevista: string | null;
  dataRealizacao: string | null;
  dataReferencia: string | null;
  situacao: SituacaoEvento;
  situacaoRotulo: string;
  descricao: string | null;
  observacoes: string | null;
  numeroCertificado: string | null;
  erroMedido: number | null;
  incerteza: number | null;
  caEfetivo: number | null;
  resultado: Resultado | null;
  resultadoRotulo: string | null;
  custoEstimadoCentavos: number | null;
  custoRealizadoCentavos: number | null;
  custoEstimado: number | null;
  custoRealizado: number | null;
  problemaServico: string | null;
  estadoRetorno: EstadoRetorno | null;
  recorrente: boolean;
  proximaDataPrevista: string | null;
  origem: Origem;
  editavel: boolean;
  podeRealizar: boolean;
  podeCancelar: boolean;
}

export interface SolicitacaoDTO {
  id: number;
  equipamentoId: number;
  equipamentoTag: string | null;
  equipamentoNome: string | null;
  laboratorioId: number | null;
  laboratorioSigla: string | null;
  solicitanteId: number;
  solicitanteNome: string | null;
  tipoEvento: TipoEvento;
  tipoEventoRotulo: string;
  justificativa: string;
  dataSolicitacao: string;
  dataDesejada: string | null;
  situacao: SituacaoSolicitacao;
  situacaoRotulo: string;
  avaliadorId: number | null;
  avaliadorNome: string | null;
  dataAvaliacao: string | null;
  justificativaRejeicao: string | null;
  eventoId: number | null;
}

export interface AuditoriaDTO {
  id: number;
  usuarioId: number | null;
  usuarioNome: string;
  usuarioEmail: string | null;
  tabelaAfetada: string;
  tabelaRotulo: string;
  registroId: number | null;
  dataHora: string;
  acao: string;
  acaoRotulo: string;
  dadosAnteriores: unknown;
  dadosNovos: unknown;
  motivo: string | null;
  ip: string;
}

export interface FuncionalidadeDTO {
  codigo: string;
  nome: string;
  descricao: string;
  rota: string;
  permissoes: string[];
  acessivel: boolean;
  motivo: string | null;
}

export interface SessaoDTO {
  usuario: UsuarioDTO;
  segundosRestantes: number;
  timeoutMinutos: number;
  permissoes: string[];
  funcionalidades: FuncionalidadeDTO[];
}

export interface ColunaRelatorio {
  chave: string;
  rotulo: string;
  tipo: 'texto' | 'data' | 'inteiro' | 'numero' | 'moeda' | 'percentual';
  largura: number;
}

export interface RelatorioTabela {
  id: string;
  titulo: string;
  subtitulo: string;
  geradoEm: string;
  filtros: Record<string, unknown>;
  colunas: ColunaRelatorio[];
  linhas: Record<string, unknown>[];
  resumo: { rotulo: string; valor: string }[];
}

export interface ArquivoExportado {
  nomeArquivo: string;
  mime: string;
  bytes: Uint8Array;
  relatorio?: string;
  titulo?: string;
  linhas?: number;
}

export interface OpcoesAplicacao {
  armazenamento?: unknown;
  persistenciaSessao?: unknown;
  clock?: () => Date;
  baseReal?: unknown;
  usarDadosReais?: boolean;
  iteracoesSenha?: number;
  parametros?: Record<string, unknown>;
  semente?: () => Promise<unknown>;
}

export interface Aplicacao {
  auth: {
    login(email: string, senha: string): Promise<{ token: string; usuario: UsuarioDTO }>;
    logout(motivo?: string): Promise<{ ok: true }>;
    sessao(): SessaoDTO;
    renovar(): Promise<boolean>;
    segundosRestantes(): number;
    alterarSenha(atual: string, nova: string): Promise<{ ok: true }>;
  };
  meta: {
    info(): {
      sistema: string; sigla: string; versao: string; esquema: number;
      geradoEm: string; atualizadoEm: string; origemBase: Record<string, unknown>;
      contagens: Record<string, number>;
    };
    funcionalidades(): FuncionalidadeDTO[];
    enums(): Record<string, unknown>;
    saude(): Record<string, unknown>;
  };
  painel: {
    resumo(filtros?: { laboratorioId?: number }): {
      cards: Record<string, number | string>;
      porLaboratorio: { sigla: string; total: number; vencidas: number; ativos: number }[];
      alertas: AlertaDTO[];
      atualizadoEm: string;
      escopoLaboratorioId: number | null;
    };
    alertas(filtros?: { laboratorioId?: number; limite?: number }): { itens: AlertaDTO[]; total: number; porNivel: Record<string, number> };
    agenda(filtros?: { de?: string; ate?: string; laboratorioId?: number; tipo?: TipoEvento; situacao?: SituacaoEvento }): { de: string; ate: string; itens: EventoDTO[] };
  };
  laboratorios: {
    listar(filtros?: Record<string, unknown>): Pagina<LaboratorioDTO>;
    obter(id: number): LaboratorioDTO;
    criar(dados: Record<string, unknown>): LaboratorioDTO;
    atualizar(id: number, dados: Record<string, unknown>): LaboratorioDTO;
    inativar(id: number, motivo: string): LaboratorioDTO;
    reativar(id: number, motivo: string): LaboratorioDTO;
  };
  usuarios: {
    listar(filtros?: Record<string, unknown>): Pagina<UsuarioDTO>;
    obter(id: number): UsuarioDTO;
    criar(dados: Record<string, unknown>): Promise<UsuarioDTO>;
    atualizar(id: number, dados: Record<string, unknown>): Promise<UsuarioDTO>;
    inativar(id: number, motivo: string): UsuarioDTO;
    reativar(id: number, motivo: string): UsuarioDTO;
    redefinirSenha(id: number, novaSenha: string): Promise<{ ok: true }>;
    anonimizar(id: number, motivo: string): UsuarioDTO;
    meusDados(): Record<string, unknown>;
  };
  fornecedores: {
    listar(filtros?: Record<string, unknown>): Pagina<FornecedorDTO>;
    obter(id: number): FornecedorDTO;
    criar(dados: Record<string, unknown>): FornecedorDTO;
    atualizar(id: number, dados: Record<string, unknown>): FornecedorDTO;
    inativar(id: number, motivo: string): FornecedorDTO;
    reativar(id: number, motivo: string): FornecedorDTO;
  };
  categorias: {
    listar(filtros?: Record<string, unknown>): { itens: Record<string, unknown>[]; total: number };
    criar(dados: Record<string, unknown>): Record<string, unknown>;
    atualizar(id: number, dados: Record<string, unknown>): Record<string, unknown>;
    inativar(id: number, motivo: string): Record<string, unknown>;
    reativar(id: number, motivo: string): Record<string, unknown>;
    listarSubcategorias(filtros?: Record<string, unknown>): { itens: Record<string, unknown>[]; total: number };
    criarSubcategoria(dados: Record<string, unknown>): Record<string, unknown>;
    atualizarSubcategoria(id: number, dados: Record<string, unknown>): Record<string, unknown>;
    inativarSubcategoria(id: number, motivo: string): Record<string, unknown>;
    reativarSubcategoria(id: number, motivo: string): Record<string, unknown>;
  };
  itens: {
    listar(filtros?: Record<string, unknown>): Pagina<ItemDTO>;
    obter(id: number): ItemDTO & { equipamentos: { id: number; tag: string; laboratorioId: number; situacao: SituacaoEquipamento }[] };
    criar(dados: Record<string, unknown>): ItemDTO;
    atualizar(id: number, dados: Record<string, unknown>): ItemDTO;
    inativar(id: number, motivo: string): ItemDTO;
    reativar(id: number, motivo: string): ItemDTO;
  };
  equipamentos: {
    listar(filtros?: Record<string, unknown>): Pagina<EquipamentoDTO> & { resumo: Record<string, number> };
    obter(id: number): EquipamentoDTO;
    criar(dados: Record<string, unknown>): EquipamentoDTO;
    atualizar(id: number, dados: Record<string, unknown>): EquipamentoDTO;
    inativar(id: number, motivo: string): EquipamentoDTO;
    reativar(id: number, motivo: string): EquipamentoDTO;
    historico(id: number, filtros?: Record<string, unknown>): { equipamento: EquipamentoDTO; itens: EventoDTO[]; total: number };
    sinalizados(filtros?: Record<string, unknown>): Pagina<EquipamentoDTO> & { resumo: Record<string, number> };
  };
  solicitacoes: {
    listar(filtros?: Record<string, unknown>): Pagina<SolicitacaoDTO>;
    obter(id: number): SolicitacaoDTO;
    criar(dados: Record<string, unknown>): SolicitacaoDTO;
    aprovar(id: number, dados?: { motivo?: string }): { solicitacao: SolicitacaoDTO; evento: EventoDTO };
    rejeitar(id: number, dados: { justificativaRejeicao: string; motivo?: string }): SolicitacaoDTO;
  };
  eventos: {
    listar(filtros?: Record<string, unknown>): Pagina<EventoDTO>;
    obter(id: number): EventoDTO;
    criar(dados: Record<string, unknown>): EventoDTO;
    atualizar(id: number, dados: Record<string, unknown>): EventoDTO;
    realizar(id: number, dados?: Record<string, unknown>): EventoDTO;
    cancelar(id: number, motivo: string): EventoDTO;
    calcularPrevia(dados: { equipamentoId: number; tipo?: TipoEvento; erroMedido: number | string; incerteza: number | string; ca?: number }): {
      erroAbsoluto: number; erroMaisU: number; ca: number; margem: number;
      resultado: Resultado; caOrigem: string; aprovado: boolean;
    };
  };
  relatorios: {
    inventario(filtros?: Record<string, unknown>): RelatorioTabela;
    situacao(filtros?: Record<string, unknown>): RelatorioTabela;
    historico(filtros?: Record<string, unknown>): RelatorioTabela;
    calibracoes(filtros?: Record<string, unknown>): RelatorioTabela;
    manutencoesPreventivas(filtros?: Record<string, unknown>): RelatorioTabela;
    manutencoesCorretivas(filtros?: Record<string, unknown>): RelatorioTabela;
    fichaEquipamento(id: number): RelatorioTabela;
    custos(filtros?: Record<string, unknown>): RelatorioTabela;
    exportar(id: string, formato: 'pdf' | 'xlsx' | 'csv', filtros?: Record<string, unknown>): ArquivoExportado;
  };
  auditoria: {
    listar(filtros?: Record<string, unknown>): Pagina<AuditoriaDTO>;
    obter(id: number): AuditoriaDTO;
  };
  config: {
    obter(): Record<string, unknown>;
    publicas(): Record<string, unknown>;
    atualizar(dados: Record<string, unknown>): Record<string, unknown>;
    backups(): Promise<Record<string, unknown>[]>;
    criarBackup(motivo: string): Promise<Record<string, unknown>>;
    exportarDados(): Promise<{ nomeArquivo: string; mime: string; texto: string }>;
    importarDados(texto: string, motivo: string): Promise<{ ok: true; equipamentos: number; eventos: number }>;
    restaurarBackup(id: string, motivo: string): Promise<{ ok: true; backupId: string }>;
    reiniciar(motivo: string): Promise<{ ok: true; equipamentos: number }>;
  };
  lgpd: {
    aviso(): Record<string, unknown>;
    meusDados(): Record<string, unknown>;
    anonimizar(id: number, motivo: string): UsuarioDTO;
  };
  flush(): Promise<void>;
  garantirBackupDiario(): Promise<void>;
  creditarBase(): { origem: Record<string, unknown>; equipamentos: number; eventos: number };
  inscrever(fn: () => void): void;
  encerrar(): Promise<void>;
  exportarJSON(): string;
  temSessao(): boolean;
  segundosSessao(): number;
  versao: string;
  esquema: number;
  sessoes: {
    renovar(): Promise<boolean>;
    sair(): Promise<void>;
    segundosRestantes(): number;
  };
}

export interface AlertaDTO {
  id: string;
  tipo: string;
  nivel: 'CRITICO' | 'ALTO' | 'MEDIO' | 'INFO';
  titulo: string;
  descricao: string;
  equipamentoId?: number;
  equipamentoTag?: string;
  laboratorioSigla?: string;
  dias: number | null;
  data: string | null;
  rota: string;
}

export declare class ErroApp extends Error {
  codigo: string;
  status: number;
  campos: Record<string, string>;
  detalhes?: unknown;
}

export declare function criarAplicacao(opcoes?: OpcoesAplicacao): Promise<Aplicacao>;
