/** API pública do backend LabUcs (sem DOM, compatível com navegador e Node). */

export { criarAplicacao, validarEstado } from './api/facade.js';
export { ErroApp, CODIGOS_ERRO } from '../shared/errors.js';
export * as constantes from '../shared/constants.js';
export * as dominio from './domain/metrology.js';
export * as permissoes from './domain/permissions.js';
export * as util from '../shared/utils.js';
export { Banco, ArmazenamentoMemoria, criarArmazenamento } from './infrastructure/storage.js';
export { GerenciadorSessoes, PersistenciaSessaoMemoria, criarPersistenciaSessao, criarCredenciais, verificarSenha } from './infrastructure/session.js';
export { construirEstadoInicial } from './infrastructure/seed.js';
