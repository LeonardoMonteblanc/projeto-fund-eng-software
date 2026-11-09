import test from 'node:test';
import assert from 'node:assert/strict';
import { Banco, ArmazenamentoMemoria } from '../src/backend/infrastructure/storage.js';
import { validarEstado } from '../src/backend/api/facade.js';

function estadoMinimo() {
  return {
    esquema: 1,
    meta: {
      criadoEm: '2026-11-08T12:00:00.000Z',
      atualizadoEm: '2026-11-08T12:00:00.000Z',
      sequencias: {},
      versaoApp: '1.0.0'
    },
    parametros: { retencaoBackupDias: 7, timeoutSessaoMinutos: 30 },
    laboratorios: [],
    usuarios: [],
    fornecedores: [],
    categorias: [],
    subcategorias: [],
    itens: [],
    equipamentos: [],
    solicitacoes: [],
    eventos: [],
    logs: []
  };
}

function criarBanco(relogio = { agora: new Date('2026-11-08T12:00:00.000Z') }) {
  return new Banco({
    armazenamento: new ArmazenamentoMemoria(),
    clock: () => relogio.agora,
    semente: async () => estadoMinimo(),
    validarEstado
  });
}

test('Banco inicia com semente, grava e restaura estado', async () => {
  const banco = criarBanco();
  await banco.iniciar();
  assert.equal(banco.estado.esquema, 1);

  banco.commit((estado) => {
    estado.laboratorios.push({ id: 1, nome: 'L', sigla: 'L1', codigo: 'L1' });
  });
  await banco.flush();
  assert.equal(banco.estado.laboratorios.length, 1);

  const texto = banco.exportarJSON();
  assert.ok(texto.includes('"aplicacao": "LabUcs"'));
  await banco.restaurarDoTexto(texto, { motivo: 'Teste de restauração' });
  assert.equal(banco.estado.laboratorios.length, 1);
});

test('Falha dentro do commit restaura o estado anterior (atomicidade)', async () => {
  const banco = criarBanco();
  await banco.iniciar();
  assert.equal(banco.estado.laboratorios.length, 0);
  assert.throws(() => banco.commit((estado) => {
    estado.laboratorios.push({ id: 1, nome: 'Parcial', sigla: 'P', codigo: 'P' });
    throw new Error('falha simulada');
  }), /falha simulada/);
  assert.equal(banco.estado.laboratorios.length, 0);
});

test('Backup, listagem e restauração', async () => {
  const banco = criarBanco();
  await banco.iniciar();
  banco.commit((estado) => { estado.fornecedores.push({ id: 1, razaoSocial: 'A', cnpj: '11222333000181' }); });
  const backup = await banco.criarBackup('Teste manual');
  assert.ok(backup.id);
  const lista = await banco.listarBackups();
  assert.ok(lista.some((b) => b.id === backup.id));

  banco.commit((estado) => { estado.fornecedores[0].razaoSocial = 'B'; });
  const conteudo = await banco.obterBackup(backup.id);
  await banco.restaurarDoTexto(conteudo.conteudo, { motivo: 'Restaurar backup' });
  assert.equal(banco.estado.fornecedores[0].razaoSocial, 'A');
});

test('Validação rejeita estado sem coleção e com referência quebrada', () => {
  const semColecao = estadoMinimo();
  delete semColecao.eventos;
  assert.throws(() => validarEstado(semColecao), (e) => e.codigo === 'IMPORTACAO');

  const quebrado = estadoMinimo();
  quebrado.equipamentos.push({ id: 1, itemId: 999, laboratorioId: 999 });
  assert.throws(() => validarEstado(quebrado), (e) => e.codigo === 'IMPORTACAO');
});
