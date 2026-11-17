/**
 * Classes de erro padronizadas para a aplicação.
 */

export class ErroApp extends Error {
  public readonly codigo: string;
  public readonly status: number;
  public readonly detalhes?: Record<string, unknown>;

  constructor(codigo: string, mensagem: string, status = 400, detalhes?: Record<string, unknown>) {
    super(mensagem);
    this.name = 'ErroApp';
    this.codigo = codigo;
    this.status = status;
    this.detalhes = detalhes;
    Object.setPrototypeOf(this, ErroApp.prototype);
  }

  static validacao(mensagem: string, detalhes?: Record<string, unknown>): ErroApp {
    return new ErroApp('VALIDACAO', mensagem, 400, detalhes);
  }

  static permissao(mensagem: string, detalhes?: Record<string, unknown>): ErroApp {
    return new ErroApp('PERMISSAO', mensagem, 403, detalhes);
  }

  static naoEncontrado(recurso: string, id?: string): ErroApp {
    return new ErroApp('NAO_ENCONTRADO', `${recurso}${id ? ` (${id})` : ''} não encontrado.`, 404, { recurso, id });
  }

  static conflito(mensagem: string, detalhes?: Record<string, unknown>): ErroApp {
    return new ErroApp('CONFLITO', mensagem, 409, detalhes);
  }

  static interno(mensagem: string, detalhes?: Record<string, unknown>): ErroApp {
    return new ErroApp('ERRO_INTERNO', mensagem, 500, detalhes);
  }

  static naoAutorizado(mensagem = 'Não autenticado.'): ErroApp {
    return new ErroApp('NAO_AUTORIZADO', mensagem, 401);
  }

  toJSON(): Record<string, unknown> {
    return { codigo: this.codigo, mensagem: this.message, status: this.status, detalhes: this.detalhes };
  }
}

export function isErroApp(error: unknown): error is ErroApp {
  return error instanceof ErroApp;
}

export function handleError(error: unknown): ErroApp {
  if (isErroApp(error)) return error;
  if (error instanceof Error) return ErroApp.interno(error.message);
  return ErroApp.interno('Erro desconhecido.');
}

export class ErroDominio extends ErroApp {
  constructor(codigo: string, mensagem: string, detalhes?: Record<string, unknown>) {
    super(codigo, mensagem, 422, detalhes);
    this.name = 'ErroDominio';
    Object.setPrototypeOf(this, ErroDominio.prototype);
  }

  static caInvalido(campo: string): ErroDominio { return new ErroDominio('CA_INVALIDO', `Critério de aceitação (${campo}) deve ser um número positivo.`, { campo }); }
  static periodicidadeInvalida(campo: string): ErroDominio { return new ErroDominio('PERIODICIDADE_INVALIDA', `Periodicidade (${campo}) deve ser um número inteiro >= 0.`, { campo }); }
  static dataInvalida(campo: string): ErroDominio { return new ErroDominio('DATA_INVALIDA', `Data (${campo}) inválida ou fora do intervalo permitido.`, { campo }); }
  static equipamentoDuplicado(campo: 'patrimonio' | 'tag' | 'numeroSerie', valor: string): ErroDominio { return new ErroDominio('EQUIPAMENTO_DUPLICADO', `${campo.toUpperCase()} "${valor}" já cadastrado.`, { campo, valor }); }
  static itemNaoEncontrado(id: string): ErroDominio { return new ErroDominio('ITEM_NAO_ENCONTRADO', `Item (${id}) não encontrado.`, { id }); }
  static laboratorioNaoEncontrado(id: string): ErroDominio { return new ErroDominio('LABORATORIO_NAO_ENCONTRADO', `Laboratório (${id}) não encontrado.`, { id }); }
  static fornecedorNaoEncontrado(id: string): ErroDominio { return new ErroDominio('FORNECEDOR_NAO_ENCONTRADO', `Fornecedor (${id}) não encontrado.`, { id }); }
  static eventoNaoEncontrado(id: string): ErroDominio { return new ErroDominio('EVENTO_NAO_ENCONTRADO', `Evento (${id}) não encontrado.`, { id }); }
  static solicitacaoNaoEncontrada(id: string): ErroDominio { return new ErroDominio('SOLICITACAO_NAO_ENCONTRADA', `Solicitação (${id}) não encontrada.`, { id }); }
  static usuarioNaoEncontrado(id: string): ErroDominio { return new ErroDominio('USUARIO_NAO_ENCONTRADO', `Usuário (${id}) não encontrado.`, { id }); }
  static solicitacaoJaAvaliada(id: string): ErroDominio { return new ErroDominio('SOLICITACAO_JA_AVALIADA', `Solicitação (${id}) já foi avaliada.`, { id }); }
  static solicitacaoNaoPendente(id: string): ErroDominio { return new ErroDominio('SOLICITACAO_NAO_PENDENTE', `Solicitação (${id}) não está pendente.`, { id }); }
  static equipamentoInativo(id: string): ErroDominio { return new ErroDominio('EQUIPAMENTO_INATIVO', `Equipamento (${id}) está inativo.`, { id }); }
  static equipamentoEmManutencao(id: string): ErroDominio { return new ErroDominio('EQUIPAMENTO_EM_MANUTENCAO', `Equipamento (${id}) está em manutenção.`, { id }); }
  static periodicidadeZero(tipo: 'calibração' | 'verificação'): ErroDominio { return new ErroDominio('PERIODICIDADE_ZERO', `Periodicidade de ${tipo} é zero; não é possível calcular próxima data.`, { tipo }); }
  static caNaoDefinido(tipo: 'calibração' | 'verificação'): ErroDominio { return new ErroDominio('CA_NAO_DEFINIDO', `Critério de aceitação para ${tipo} não definido no item ou equipamento.`, { tipo }); }
}

export function erroParaResposta(erro: unknown): { status: number; body: Record<string, unknown> } {
  const e = handleError(erro);
  return { status: e.status, body: e.toJSON() };
}

export function sucesso<T>(data: T): { status: 200; body: { ok: true; data: T } } { return { status: 200, body: { ok: true, data } }; }
export function criado<T>(data: T): { status: 201; body: { ok: true; data: T } } { return { status: 201, body: { ok: true, data } }; }
export function semConteudo(): { status: 204; body: null } { return { status: 204, body: null }; }