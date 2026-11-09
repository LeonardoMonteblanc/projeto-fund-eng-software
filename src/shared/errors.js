/** Erros de aplicação com código estável, mensagem PT-BR e detalhes por campo. */

export const CODIGOS_ERRO = Object.freeze({
  VALIDACAO: 'VALIDACAO',
  NAO_AUTENTICADO: 'NAO_AUTENTICADO',
  SESSAO_EXPIRADA: 'SESSAO_EXPIRADA',
  SEM_PERMISSAO: 'SEM_PERMISSAO',
  NAO_ENCONTRADO: 'NAO_ENCONTRADO',
  CONFLITO: 'CONFLITO',
  REGRA_NEGOCIO: 'REGRA_NEGOCIO',
  LIMITE: 'LIMITE',
  ARMAZENAMENTO: 'ARMAZENAMENTO',
  IMPORTACAO: 'IMPORTACAO',
  INTERNO: 'INTERNO'
});

const STATUS = {
  VALIDACAO: 422,
  NAO_AUTENTICADO: 401,
  SESSAO_EXPIRADA: 401,
  SEM_PERMISSAO: 403,
  NAO_ENCONTRADO: 404,
  CONFLITO: 409,
  REGRA_NEGOCIO: 422,
  LIMITE: 429,
  ARMAZENAMENTO: 507,
  IMPORTACAO: 422,
  INTERNO: 500
};

export class ErroApp extends Error {
  /**
   * @param {string} codigo
   * @param {string} mensagem
   * @param {{campos?: Record<string,string>, detalhes?: unknown, status?: number}} [opcoes]
   */
  constructor(codigo, mensagem, opcoes = {}) {
    super(mensagem);
    this.name = 'ErroApp';
    this.codigo = codigo;
    this.status = opcoes.status ?? STATUS[codigo] ?? 400;
    this.campos = opcoes.campos ?? {};
    this.detalhes = opcoes.detalhes;
  }

  toJSON() {
    return { codigo: this.codigo, mensagem: this.message, campos: this.campos, detalhes: this.detalhes };
  }

  static validacao(campos, mensagem = 'Verifique os campos destacados.') {
    return new ErroApp(CODIGOS_ERRO.VALIDACAO, mensagem, { campos });
  }

  static naoEncontrado(entidade, id) {
    return new ErroApp(CODIGOS_ERRO.NAO_ENCONTRADO, `${entidade} não encontrado(a) (id ${id}).`);
  }

  static conflito(mensagem, campos = {}) {
    return new ErroApp(CODIGOS_ERRO.CONFLITO, mensagem, { campos });
  }

  static regra(mensagem) {
    return new ErroApp(CODIGOS_ERRO.REGRA_NEGOCIO, mensagem);
  }

  static permissao(mensagem = 'Seu perfil não possui permissão para esta operação.') {
    return new ErroApp(CODIGOS_ERRO.SEM_PERMISSAO, mensagem);
  }

  static naoAutenticado(mensagem = 'Sessão não iniciada. Faça login para continuar.') {
    return new ErroApp(CODIGOS_ERRO.NAO_AUTENTICADO, mensagem);
  }

  static sessaoExpirada() {
    return new ErroApp(CODIGOS_ERRO.SESSAO_EXPIRADA, 'Sessão encerrada por inatividade. Faça login novamente.');
  }
}

/** Executa fn convertendo erros inesperados em ErroApp, preservando os já tipados. */
export function proteger(fn) {
  try {
    return fn();
  } catch (erro) {
    if (erro instanceof ErroApp) throw erro;
    console.error(erro);
    throw new ErroApp(CODIGOS_ERRO.INTERNO, 'Erro interno inesperado. Nenhuma alteração foi gravada.', { detalhes: String(erro?.message ?? erro) });
  }
}
