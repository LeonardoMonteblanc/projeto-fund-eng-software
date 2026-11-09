import fs from 'node:fs';
import { ArmazenamentoMemoria } from '../src/backend/infrastructure/storage.js';
import { PersistenciaSessaoMemoria } from '../src/backend/infrastructure/session.js';
import { criarAplicacao } from '../src/backend/api/facade.js';

export const BASE_REAL = JSON.parse(fs.readFileSync(new URL('../data/base-real.json', import.meta.url), 'utf8'));

export function criarRelogio(iso = '2026-11-08T12:00:00.000Z') {
  return { agora: new Date(iso) };
}

export async function criarAppTeste({ real = false, relogio = criarRelogio(), parametros = {} } = {}) {
  const app = await criarAplicacao({
    armazenamento: new ArmazenamentoMemoria(),
    persistenciaSessao: new PersistenciaSessaoMemoria(),
    clock: () => relogio.agora,
    baseReal: real ? BASE_REAL : null,
    usarDadosReais: real,
    iteracoesSenha: 1000,
    parametros
  });
  return { app, relogio };
}

export async function entrar(app, email = 'admin@labucs.local', senha = 'Senha@123') {
  return app.auth.login(email, senha);
}

export function labPorSigla(app, sigla) {
  return app.laboratorios.listar({ tamanho: 100 }).itens.find((l) => l.sigla === sigla);
}

export function itemPorNome(app, trecho) {
  return app.itens.listar({ busca: trecho, tamanho: 50 }).itens[0];
}

export function equipamentoPorTag(app, tag) {
  return app.equipamentos.listar({ busca: tag, tamanho: 100 }).itens.find((e) => e.tag === tag);
}

export function dadosEquipamentoValidos(app, overrides = {}) {
  const lab = labPorSigla(app, 'LASFI');
  const item = itemPorNome(app, 'Balança');
  return {
    laboratorioId: lab.id,
    itemId: item.id,
    tag: `TESTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    patrimonio: `PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    numeroSerie: `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    localizacao: 'Sala de testes',
    dataAquisicao: '2024-01-10',
    dataColocacaoUso: '2024-02-01',
    valorAquisicaoCentavos: 123456,
    ...overrides
  };
}
