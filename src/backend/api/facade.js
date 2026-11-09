/**
 * Fachada única do POC: cria banco, sessão e serviços.
 * É o ponto de integração com a camada visual (Svelte/Open Design/OpenCode).
 */

import { Banco, criarArmazenamento } from '../infrastructure/storage.js';
import { GerenciadorSessoes, criarPersistenciaSessao } from '../infrastructure/session.js';
import { Application } from '../application/application.js';
import { construirEstadoInicial } from '../infrastructure/seed.js';
import { ErroApp, CODIGOS_ERRO } from '../../shared/errors.js';
import { PARAMETROS_PADRAO, PERFIS, VERSAO_APP, VERSAO_ESQUEMA } from '../../shared/constants.js';

const COLECOES = [
  'laboratorios', 'usuarios', 'fornecedores', 'categorias', 'subcategorias',
  'itens', 'equipamentos', 'solicitacoes', 'eventos', 'logs'
];

/** Valida estrutura, preenche parâmetros ausentes e verifica integridade referencial (RNF12). */
export function validarEstado(estado) {
  if (!estado || typeof estado !== 'object' || Array.isArray(estado)) {
    throw new ErroApp(CODIGOS_ERRO.IMPORTACAO, 'Estado inválido: esperado um objeto de dados.');
  }
  estado.esquema = Number(estado.esquema) || VERSAO_ESQUEMA;
  if (estado.esquema > VERSAO_ESQUEMA) {
    throw new ErroApp(CODIGOS_ERRO.IMPORTACAO, `Versão de esquema ${estado.esquema} não suportada por este POC (${VERSAO_ESQUEMA}).`);
  }
  estado.parametros = { ...PARAMETROS_PADRAO, ...(estado.parametros ?? {}) };
  estado.meta = estado.meta ?? {};
  estado.meta.sequencias = estado.meta.sequencias ?? {};
  estado.meta.versaoApp = estado.meta.versaoApp ?? VERSAO_APP;
  for (const colecao of COLECOES) {
    if (!Array.isArray(estado[colecao])) {
      throw new ErroApp(CODIGOS_ERRO.IMPORTACAO, `Estado inválido: a coleção "${colecao}" está ausente ou não é uma lista.`);
    }
    const maximo = estado[colecao].reduce((max, item) => Math.max(max, Number(item?.id) || 0), 0);
    estado.meta.sequencias[colecao] = Math.max(Number(estado.meta.sequencias[colecao]) || 0, maximo);
  }

  const problemas = [];
  const labIds = new Set(estado.laboratorios.map((l) => l.id));
  const itemIds = new Set(estado.itens.map((i) => i.id));
  const usuarioIds = new Set(estado.usuarios.map((u) => u.id));
  const equipamentoIds = new Set(estado.equipamentos.map((e) => e.id));
  const fornecedorIds = new Set(estado.fornecedores.map((f) => f.id));
  const solicitacaoIds = new Set(estado.solicitacoes.map((s) => s.id));
  const categoriaIds = new Set(estado.categorias.map((c) => c.id));
  const subcategoriaIds = new Set(estado.subcategorias.map((s) => s.id));

  for (const usuario of estado.usuarios) {
    if (!Object.values(PERFIS).includes(usuario.perfil)) problemas.push(`Usuário ${usuario.id}: perfil inválido.`);
    if (usuario.laboratorioId !== null && usuario.laboratorioId !== undefined && !labIds.has(usuario.laboratorioId)) {
      problemas.push(`Usuário ${usuario.id}: laboratório inexistente.`);
    }
    if (!usuario.email) problemas.push(`Usuário ${usuario.id}: e-mail ausente.`);
  }
  for (const item of estado.itens) {
    if (item.subcategoriaId !== null && item.subcategoriaId !== undefined && !subcategoriaIds.has(item.subcategoriaId)) {
      problemas.push(`Item ${item.id}: subcategoria inexistente.`);
    }
    if (item.categoriaId !== null && item.categoriaId !== undefined && !categoriaIds.has(item.categoriaId)) {
      problemas.push(`Item ${item.id}: categoria inexistente.`);
    }
  }
  for (const equipamento of estado.equipamentos) {
    if (!itemIds.has(equipamento.itemId)) problemas.push(`Equipamento ${equipamento.id}: item inexistente.`);
    if (!labIds.has(equipamento.laboratorioId)) problemas.push(`Equipamento ${equipamento.id}: laboratório inexistente.`);
  }
  for (const solicitacao of estado.solicitacoes) {
    if (!equipamentoIds.has(solicitacao.equipamentoId)) problemas.push(`Solicitação ${solicitacao.id}: equipamento inexistente.`);
    if (!usuarioIds.has(solicitacao.solicitanteId)) problemas.push(`Solicitação ${solicitacao.id}: solicitante inexistente.`);
    if (solicitacao.eventoId && !estado.eventos.some((e) => e.id === solicitacao.eventoId)) {
      problemas.push(`Solicitação ${solicitacao.id}: evento vinculado inexistente.`);
    }
  }
  for (const evento of estado.eventos) {
    if (!equipamentoIds.has(evento.equipamentoId)) problemas.push(`Evento ${evento.id}: equipamento inexistente.`);
    if (evento.fornecedorId && !fornecedorIds.has(evento.fornecedorId)) problemas.push(`Evento ${evento.id}: fornecedor inexistente.`);
    if (evento.solicitacaoId && !solicitacaoIds.has(evento.solicitacaoId)) problemas.push(`Evento ${evento.id}: solicitação inexistente.`);
  }
  if (problemas.length) {
    throw new ErroApp(CODIGOS_ERRO.IMPORTACAO, `Integridade referencial violada (${problemas.length} problema(s)).`, {
      detalhes: problemas.slice(0, 20)
    });
  }
  return estado;
}

/**
 * @param {object} [opcoes]
 * @param {object} [opcoes.armazenamento] adaptador; padrão IndexedDB com fallback
 * @param {() => Date} [opcoes.clock]
 * @param {object} [opcoes.baseReal] conteúdo de data/base-real.json
 * @param {boolean} [opcoes.usarDadosReais]
 * @param {number} [opcoes.iteracoesSenha]
 * @param {object} [opcoes.persistenciaSessao]
 * @param {object} [opcoes.parametros]
 * @param {() => Promise<object>} [opcoes.semente]
 */
export async function criarAplicacao(opcoes = {}) {
  const clock = opcoes.clock ?? (() => new Date());
  const armazenamento = opcoes.armazenamento ?? criarArmazenamento();
  const persistenciaSessao = opcoes.persistenciaSessao ?? criarPersistenciaSessao();
  const iteracoesSenha = opcoes.iteracoesSenha ?? 120000;
  const usarDadosReais = opcoes.usarDadosReais !== false;

  const semente = opcoes.semente ?? (() => construirEstadoInicial({
    baseReal: usarDadosReais ? opcoes.baseReal : null,
    clock,
    parametros: opcoes.parametros ?? {},
    iteracoesSenha
  }));

  let aoFalharPersistencia = null;
  const banco = new Banco({
    armazenamento,
    clock,
    semente,
    validarEstado,
    aoFalharPersistencia: (erro) => aoFalharPersistencia?.(erro)
  });
  await banco.iniciar();

  const sessoes = new GerenciadorSessoes({
    clock,
    timeoutMinutos: () => Number(banco.estado.parametros.timeoutSessaoMinutos ?? 30),
    obterEstado: () => banco.estado,
    persistencia: persistenciaSessao
  });
  await sessoes.iniciar();

  const aplicacao = new Application({ banco, sessoes, clock, semente });

  aplicacao.flush = () => banco.flush();
  aplicacao.garantirBackupDiario = () => banco.garantirBackupDiario();
  aplicacao.versao = VERSAO_APP;
  aplicacao.esquema = VERSAO_ESQUEMA;
  aplicacao.armazenamento = armazenamento;
  aplicacao.sessoes = sessoes;
  aplicacao.banco = banco;
  aplicacao.definirTratadorErroPersistencia = (fn) => { aoFalharPersistencia = fn; };
  aplicacao.aoAlterar = null;
  aplicacao.inscrever = (fn) => { aplicacao.aoAlterar = fn; };
  aplicacao.exportarJSON = () => banco.exportarJSON();
  aplicacao.encerrar = async () => { await banco.flush(); await sessoes.sair(); };
  aplicacao.sessaoPersistida = () => Boolean(sessoes.ativa);
  aplicacao.temSessao = () => sessoes.ativa;
  aplicacao.segundosSessao = () => sessoes.segundosRestantes();
  aplicacao.creditarBase = () => ({
    origem: banco.estado.meta.origemBase,
    equipamentos: banco.estado.equipamentos.length,
    eventos: banco.estado.eventos.length
  });

  return aplicacao;
}

export { validarEstado as validarEstadoExportado };
