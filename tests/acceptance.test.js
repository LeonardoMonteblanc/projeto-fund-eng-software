import test from 'node:test';
import assert from 'node:assert/strict';
import { criarAppTeste, entrar, BASE_REAL } from './helpers.js';

test('Base real importada: 10 laboratórios, 1.911 equipamentos e 823 itens', async () => {
  const { app } = await criarAppTeste({ real: true });
  await entrar(app);
  const info = app.meta.info();
  assert.equal(info.contagens.laboratorios, 10);
  assert.equal(info.contagens.equipamentos, 1911);
  assert.equal(info.contagens.itens, 823);
  assert.equal(info.contagens.fornecedores, 8);
  assert.equal(info.contagens.usuarios, 22);
  assert.equal(BASE_REAL.meta.totalEquipamentos, 1911);
  assert.equal(BASE_REAL.pendencias.equipamentosSemPatrimonio, 1860);
  assert.ok(BASE_REAL.pendencias.equipamentosSemCalibracao > 0);
});

test('Escopo real: gestor LASFI enxerga 86 equipamentos; GG enxerga todos', async () => {
  const { app } = await criarAppTeste({ real: true });
  await entrar(app, 'gestor.lasfi@labucs.local');
  const lasfi = app.equipamentos.listar({ tamanho: 200 });
  assert.equal(lasfi.total, 86);
  assert.ok(lasfi.itens.every((e) => e.laboratorio?.sigla === 'LASFI'));

  await app.auth.logout();
  await entrar(app, 'gestor.geral@labucs.local');
  assert.equal(app.equipamentos.listar({ tamanho: 10 }).total, 1911);
});

test('RF17 real: equipamentos vencidos e reprovados são sinalizados sem bloquear', async () => {
  const { app } = await criarAppTeste({ real: true });
  await entrar(app, 'gestor.geral@labucs.local');
  const vencidos = app.equipamentos.listar({ sinal: 'CALIBRACAO_VENCIDA', tamanho: 5 });
  assert.ok(vencidos.total > 500);
  const um = vencidos.itens[0];
  assert.ok(um.sinalizacoes.some((s) => s.codigo === 'CALIBRACAO_VENCIDA'));
  assert.equal(um.situacao, 'ATIVO');
});

test('Relatórios reais: inventário, Anexo 4 e PDF com múltiplas páginas', async () => {
  const { app } = await criarAppTeste({ real: true });
  await entrar(app, 'gestor.geral@labucs.local');
  const inventario = app.relatorios.inventario({});
  assert.ok(inventario.linhas.length >= 1900);
  assert.ok(inventario.colunas.some((c) => c.chave === 'proximaCalibracao'));

  const anexo4 = app.relatorios.calibracoes({});
  assert.equal(anexo4.linhas.length, 1911);
  assert.ok(anexo4.linhas.some((l) => l.pcAnos !== null));

  const pdf = app.relatorios.exportar('inventario', 'pdf', {});
  assert.equal(Buffer.from(pdf.bytes.slice(0, 4)).toString(), '%PDF');
  const texto = Buffer.from(pdf.bytes).toString('latin1');
  assert.ok(texto.includes('/Count '));
  assert.ok(texto.trimEnd().endsWith('%%EOF'));
  assert.ok(pdf.bytes.length > 500000);

  const xlsx = app.relatorios.exportar('calibracoes', 'xlsx', {});
  assert.equal(Buffer.from(xlsx.bytes.slice(0, 2)).toString(), 'PK');
});

test('Histórico importado preserva certificado e resultado quando existentes', async () => {
  const { app } = await criarAppTeste({ real: true });
  await entrar(app, 'gestor.geral@labucs.local');
  const historico = app.relatorios.historico({ tipo: 'CALIBRACAO', de: '2000-01-01', ate: '2026-11-08' });
  assert.ok(historico.linhas.some((l) => l.certificado && l.certificado !== '—'));
  const importados = historico.linhas.filter((l) => l.responsavel === 'Importado/sistema');
  assert.ok(importados.length > 1000);
});

test('Custos reais: relatório gerencial disponível apenas para GG', async () => {
  const { app } = await criarAppTeste({ real: true });
  await entrar(app, 'gestor.geral@labucs.local');
  const custos = app.relatorios.custos({});
  assert.equal(custos.linhas.length, 10);
  assert.ok(custos.linhas.every((l) => l.receitaMensal === null));
  assert.ok(custos.linhas.some((l) => l.situacao === 'RECEITA_NAO_INFORMADA'));

  await app.auth.logout();
  await entrar(app, 'gestor.lasfi@labucs.local');
  assert.throws(() => app.relatorios.custos({}), (e) => e.codigo === 'SEM_PERMISSAO');
});

test('RNF14: exportação em PDF, Excel e CSV disponível nos relatórios operacionais', async () => {
  const { app } = await criarAppTeste({ real: true });
  await entrar(app, 'gestor.lasfi@labucs.local');
  for (const formato of ['pdf', 'xlsx', 'csv']) {
    const arquivo = app.relatorios.exportar('situacao', formato, {});
    assert.ok(arquivo.bytes.length > 1000, `exportação ${formato}`);
    assert.ok(arquivo.nomeArquivo.endsWith(`.${formato}`));
  }
});
