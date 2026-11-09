import test from 'node:test';
import assert from 'node:assert/strict';
import { criarAppTeste, entrar, labPorSigla, itemPorNome, dadosEquipamentoValidos } from './helpers.js';

async function esperaErro(fn, codigo) {
  let capturado = null;
  try {
    await fn();
  } catch (erro) {
    capturado = erro;
  }
  assert.ok(capturado, `esperava o erro ${codigo}, mas a operação foi concluída`);
  assert.equal(capturado.codigo, codigo, `esperava ${codigo}, recebeu ${capturado.codigo}: ${capturado.message}`);
  return capturado;
}

function lancarErro(fn, codigo) {
  assert.throws(fn, (erro) => {
    assert.equal(erro.codigo, codigo, `esperava ${codigo}, recebeu ${erro.codigo}: ${erro.message}`);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* RNF01 / RNF04 — autenticação e sessão                              */
/* ------------------------------------------------------------------ */

test('Login válido, inválido, logout e bloqueio por tentativas', async () => {
  const { app } = await criarAppTeste();
  const sessao = await entrar(app);
  assert.equal(sessao.usuario.perfil, 'ADMIN');
  assert.ok(sessao.token.length > 20);
  assert.equal(app.auth.sessao().usuario.email, 'admin@labucs.local');

  await app.auth.logout();
  assert.equal(app.temSessao(), false);

  await esperaErro(() => app.auth.login('admin@labucs.local', 'errada'), 'NAO_AUTENTICADO');
  for (let i = 0; i < 4; i += 1) {
    await assert.rejects(() => app.auth.login('admin@labucs.local', 'errada'));
  }
  await esperaErro(() => app.auth.login('admin@labucs.local', 'Senha@123'), 'LIMITE');
});

test('Sessão expira por inatividade e não aceita operação depois do timeout', async () => {
  const { app, relogio } = await criarAppTeste();
  await entrar(app, 'tecnico.lasfi@labucs.local');
  relogio.agora = new Date('2026-11-08T12:31:00.000Z');
  await esperaErro(() => app.equipamentos.listar({}), 'SESSAO_EXPIRADA');
});

/* ------------------------------------------------------------------ */
/* RNF02 / RF01 — perfis, permissões e escopo                         */
/* ------------------------------------------------------------------ */

test('Matriz de perfis: técnico não cadastra equipamento, gestor só vê seu laboratório', async () => {
  const { app } = await criarAppTeste();
  const lasfi = app.estado.laboratorios.find((l) => l.sigla === 'LASFI');
  const lamec = app.estado.laboratorios.find((l) => l.sigla === 'LAMEC');

  await entrar(app, 'tecnico.lasfi@labucs.local');
  const lista = app.equipamentos.listar({});
  assert.ok(lista.total > 0);
  assert.ok(lista.itens.every((e) => e.laboratorioId === lasfi.id));
  const outro = app.estado.equipamentos.find((e) => e.laboratorioId === lamec.id);
  await esperaErro(() => app.equipamentos.obter(outro.id), 'NAO_ENCONTRADO');
  lancarErro(() => app.equipamentos.criar(dadosEquipamentoValidos(app)), 'SEM_PERMISSAO');

  await app.auth.logout();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const criado = app.equipamentos.criar(dadosEquipamentoValidos(app));
  assert.equal(criado.laboratorioId, lasfi.id);
  const eqOutroLab = dadosEquipamentoValidos(app, { laboratorioId: lamec.id });
  await esperaErro(() => app.equipamentos.criar(eqOutroLab), 'SEM_PERMISSAO');

  await app.auth.logout();
  await entrar(app, 'admin@labucs.local');
  assert.ok(app.equipamentos.listar({}).total > lista.total);
  lancarErro(() => app.equipamentos.criar(dadosEquipamentoValidos(app)), 'SEM_PERMISSAO');
  await esperaErro(() => app.auditoria.listar({}), 'SEM_PERMISSAO');

  await app.auth.logout();
  await entrar(app, 'gestor.geral@labucs.local');
  assert.ok(app.auditoria.listar({}).total >= 1);
  lancarErro(() => app.equipamentos.criar(dadosEquipamentoValidos(app)), 'SEM_PERMISSAO');
});

test('RF01: funcionalidades acessíveis variam por perfil', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'tecnico.lasfi@labucs.local');
  const tec = app.meta.funcionalidades();
  assert.ok(tec.some((f) => f.codigo === 'F02' && f.acessivel));
  assert.ok(tec.some((f) => f.codigo === 'F08' && !f.acessivel));
  assert.ok(tec.some((f) => f.codigo === 'F11' && !f.acessivel));

  await app.auth.logout();
  await entrar(app, 'gestor.geral@labucs.local');
  const gg = app.meta.funcionalidades();
  assert.ok(gg.some((f) => f.codigo === 'F11' && f.acessivel));
  assert.ok(gg.some((f) => f.codigo === 'F13' && !f.acessivel));
});

/* ------------------------------------------------------------------ */
/* RF03 / RF04 — equipamentos                                        */
/* ------------------------------------------------------------------ */

test('Cadastro de equipamento valida unicidade, datas e inativação lógica', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const dados = dadosEquipamentoValidos(app);
  const equipamento = app.equipamentos.criar(dados);
  assert.equal(equipamento.completude, 'COMPLETA');

  lancarErro(() => app.equipamentos.criar(dadosEquipamentoValidos(app, { tag: dados.tag })), 'VALIDACAO');
  lancarErro(() => app.equipamentos.criar(dadosEquipamentoValidos(app, { patrimonio: dados.patrimonio })), 'VALIDACAO');
  lancarErro(() => app.equipamentos.criar(dadosEquipamentoValidos(app, { numeroSerie: dados.numeroSerie })), 'VALIDACAO');
  lancarErro(() => app.equipamentos.criar(dadosEquipamentoValidos(app, { dataAquisicao: '2025-01-01', dataColocacaoUso: '2024-01-01' })), 'VALIDACAO');
  lancarErro(() => app.equipamentos.criar(dadosEquipamentoValidos(app, { caCalibracao: 0 })), 'VALIDACAO');

  const atualizado = app.equipamentos.atualizar(equipamento.id, { localizacao: 'Nova sala', motivo: 'Correção de localização' });
  assert.equal(atualizado.localizacao, 'Nova sala');
  lancarErro(() => app.equipamentos.atualizar(equipamento.id, { localizacao: 'Sem motivo' }), 'VALIDACAO');

  app.eventos.criar({
    tipo: 'CALIBRACAO',
    equipamentoId: equipamento.id,
    dataPrevista: '2026-12-01',
    motivo: 'Agendamento de teste'
  });
  lancarErro(() => app.equipamentos.inativar(equipamento.id, 'Tentativa com evento agendado'), 'REGRA_NEGOCIO');

  const evento = app.eventos.listar({ equipamentoId: equipamento.id }).itens[0];
  app.eventos.cancelar(evento.id, 'Cancelamento para permitir inativação');
  app.equipamentos.inativar(equipamento.id, 'Equipamento fora de uso');
  assert.equal(app.equipamentos.obter(equipamento.id).situacao, 'INATIVO');
  app.equipamentos.reativar(equipamento.id, 'Retorno ao uso');
  assert.equal(app.equipamentos.obter(equipamento.id).situacao, 'ATIVO');
});

test('Item em uso não pode ser inativado; categoria com item ativo também não', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const equipamento = app.equipamentos.listar({}).itens[0];
  const item = app.itens.obter(equipamento.itemId);
  lancarErro(() => app.itens.inativar(item.id, 'Tentativa'), 'REGRA_NEGOCIO');
  const categoria = app.categorias.listar({}).itens.find((c) => c.id === item.categoriaId);
  lancarErro(() => app.categorias.inativar(categoria.id, 'Tentativa'), 'REGRA_NEGOCIO');
});

/* ------------------------------------------------------------------ */
/* RF08 / RF09 / RF10 — calibração e verificação                     */
/* ------------------------------------------------------------------ */

test('Calibração calcula |erro| + U, grava CA efetivo e atualiza a próxima data', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const equipamento = app.equipamentos.criar(dadosEquipamentoValidos(app));
  const evento = app.eventos.criar({
    tipo: 'CALIBRACAO',
    equipamentoId: equipamento.id,
    dataRealizacao: '2026-11-01',
    numeroCertificado: 'CERT-001',
    erroMedido: -0.4,
    incerteza: 0.05,
    custoRealizadoCentavos: 50000,
    fornecedorId: app.fornecedores.listar({}).itens[0].id,
    motivo: 'Calibração periódica'
  });
  assert.equal(evento.resultado, 'APROVADO');
  assert.equal(evento.erroMedido, -0.4);
  const dto = app.equipamentos.obter(equipamento.id);
  assert.equal(dto.ultimaCalibracao.dataRealizacao, '2026-11-01');
  assert.equal(dto.proximaCalibracao, '2027-11-01');
  assert.equal(dto.caCalibracaoEfetivo.origem, 'ITEM');
});

test('Calibração reprovada gera sinal RF17 e verificação é registrada', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const equipamento = app.equipamentos.listar({}).itens[0];
  app.equipamentos.atualizar(equipamento.id, { caVerificacao: 1, motivo: 'Definir CA de verificação para o teste' });
  const evento = app.eventos.criar({
    tipo: 'CALIBRACAO',
    equipamentoId: equipamento.id,
    dataRealizacao: '2026-11-07',
    numeroCertificado: 'CERT-REP',
    erroMedido: 2,
    incerteza: 0.1
  });
  assert.equal(evento.resultado, 'REPROVADO');
  const dto = app.equipamentos.obter(equipamento.id);
  assert.ok(dto.sinalizacoes.some((s) => s.codigo === 'CALIBRACAO_REPROVADA'));

  const verificacao = app.eventos.criar({
    tipo: 'VERIFICACAO',
    equipamentoId: equipamento.id,
    dataRealizacao: '2026-11-07',
    erroMedido: 0.1,
    incerteza: 0.02
  });
  assert.equal(verificacao.resultado, 'APROVADO');
  assert.ok(app.eventos.listar({ tipo: 'VERIFICACAO' }).total >= 1);
});

test('Calibração exige certificado e CA definido; equipamento em manutenção é bloqueado', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const equipamento = app.equipamentos.criar(dadosEquipamentoValidos(app));
  lancarErro(() => app.eventos.criar({
    tipo: 'CALIBRACAO', equipamentoId: equipamento.id, dataRealizacao: '2026-11-01', erroMedido: 0.1, incerteza: 0.1
  }), 'VALIDACAO');

  const fornecedor = app.fornecedores.listar({}).itens[0];
  app.eventos.criar({
    tipo: 'MANUTENCAO_CORRETIVA', equipamentoId: equipamento.id, dataRealizacao: '2026-11-01',
    problemaServico: 'Falha no display', estadoRetorno: 'EM_MANUTENCAO', fornecedorId: fornecedor.id, custoRealizadoCentavos: 10000
  });
  assert.equal(app.equipamentos.obter(equipamento.id).situacao, 'EM_MANUTENCAO');
  lancarErro(() => app.eventos.criar({
    tipo: 'CALIBRACAO', equipamentoId: equipamento.id, dataRealizacao: '2026-11-02', numeroCertificado: 'X', erroMedido: 0.1, incerteza: 0.1
  }), 'REGRA_NEGOCIO');
});

test('RF09: prévia de cálculo e ausência de CA', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'tecnico.lasfi@labucs.local');
  const equipamento = app.equipamentos.listar({}).itens[0];
  const previa = app.eventos.calcularPrevia({ equipamentoId: equipamento.id, erroMedido: 0.5, incerteza: 0.5 });
  assert.equal(previa.resultado, 'APROVADO');
  assert.equal(previa.erroMaisU, 1);

  // Cenário de CA ausente (equipamento e item sem CA) — alteração controlada no estado.
  const item = app.estado.itens.find((i) => i.id === equipamento.itemId);
  item.caCalibracao = null;
  const eq = app.estado.equipamentos.find((e) => e.id === equipamento.id);
  eq.caCalibracao = null;
  lancarErro(() => app.eventos.calcularPrevia({ equipamentoId: equipamento.id, erroMedido: 0.5, incerteza: 0.5 }), 'REGRA_NEGOCIO');
});

/* ------------------------------------------------------------------ */
/* RF11 — manutenções                                                */
/* ------------------------------------------------------------------ */

test('Manutenção preventiva realizada e recorrente gera a próxima ocorrência', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const equipamento = app.equipamentos.criar(dadosEquipamentoValidos(app));
  app.equipamentos.atualizar(equipamento.id, { periodicidadeManutencaoPreventivaMeses: 12, motivo: 'Definir PMP' });
  const evento = app.eventos.criar({
    tipo: 'MANUTENCAO_PREVENTIVA',
    equipamentoId: equipamento.id,
    dataRealizacao: '2026-10-01',
    descricao: 'Limpeza e calibração interna',
    recorrente: true,
    custoRealizadoCentavos: 30000
  });
  assert.equal(evento.situacao, 'REALIZADO');
  assert.equal(evento.proximaDataPrevista, '2027-10-01');
  const preventivas = app.eventos.listar({ equipamentoId: equipamento.id, tipo: 'MANUTENCAO_PREVENTIVA' });
  assert.equal(preventivas.total, 2);
  assert.ok(preventivas.itens.some((e) => e.situacao === 'AGENDADO' && e.dataPrevista === '2027-10-01'));
});

test('Manutenção corretiva exige fornecedor, problema e estado de retorno', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'tecnico.lasfi@labucs.local');
  const equipamento = app.equipamentos.listar({}).itens[0];
  lancarErro(() => app.eventos.criar({
    tipo: 'MANUTENCAO_CORRETIVA', equipamentoId: equipamento.id, dataRealizacao: '2026-11-01',
    problemaServico: 'Curto-circuito', estadoRetorno: 'APTO'
  }), 'VALIDACAO');
  const fornecedor = app.fornecedores.listar({}).itens[0];
  const evento = app.eventos.criar({
    tipo: 'MANUTENCAO_CORRETIVA', equipamentoId: equipamento.id, dataRealizacao: '2026-11-01',
    problemaServico: 'Curto-circuito', estadoRetorno: 'APTO', fornecedorId: fornecedor.id, custoRealizadoCentavos: 45000
  });
  assert.equal(evento.estadoRetorno, 'APTO');
  assert.equal(app.equipamentos.obter(equipamento.id).situacao, 'ATIVO');
});

/* ------------------------------------------------------------------ */
/* RF12 — solicitações e aprovação                                   */
/* ------------------------------------------------------------------ */

test('Solicitação: técnico solicita, gestor aprova e evento agendado é criado', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'tecnico.lasfi@labucs.local');
  const equipamento = app.equipamentos.listar({}).itens[0];
  const solicitacao = app.solicitacoes.criar({
    equipamentoId: equipamento.id,
    tipoEvento: 'CALIBRACAO',
    justificativa: 'Calibração anual prevista em contrato.',
    dataDesejada: '2026-12-15'
  });
  assert.equal(solicitacao.situacao, 'PENDENTE');
  lancarErro(() => app.solicitacoes.criar({
    equipamentoId: equipamento.id, tipoEvento: 'CALIBRACAO', justificativa: 'Duplicada de teste'
  }), 'VALIDACAO');

  await app.auth.logout();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const resultado = app.solicitacoes.aprovar(solicitacao.id, { motivo: 'Aprovado conforme planejamento' });
  assert.equal(resultado.solicitacao.situacao, 'APROVADA');
  assert.equal(resultado.evento.situacao, 'AGENDADO');
  assert.equal(resultado.evento.dataPrevista, '2026-12-15');
});

test('Segregação de funções: solicitante não aprova a própria solicitação', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const equipamento = app.equipamentos.listar({}).itens[0];
  const solicitacao = app.solicitacoes.criar({
    equipamentoId: equipamento.id, tipoEvento: 'VERIFICACAO', justificativa: 'Verificação solicitada pelo gestor.'
  });
  lancarErro(() => app.solicitacoes.aprovar(solicitacao.id, { motivo: 'Autoaprovação' }), 'REGRA_NEGOCIO');
});

test('Solicitação rejeitada exige justificativa e não gera evento', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'tecnico.lasfi@labucs.local');
  const equipamento = app.equipamentos.listar({}).itens[0];
  const solicitacao = app.solicitacoes.criar({
    equipamentoId: equipamento.id, tipoEvento: 'MANUTENCAO_PREVENTIVA', justificativa: 'Solicitação para teste de rejeição.'
  });
  await app.auth.logout();
  await entrar(app, 'gestor.lasfi@labucs.local');
  lancarErro(() => app.solicitacoes.rejeitar(solicitacao.id, { justificativaRejeicao: 'não' }), 'VALIDACAO');
  const rejeitada = app.solicitacoes.rejeitar(solicitacao.id, { justificativaRejeicao: 'Fora do período previsto.' });
  assert.equal(rejeitada.situacao, 'REJEITADA');
  assert.equal(rejeitada.eventoId, null);
});

/* ------------------------------------------------------------------ */
/* RF06 / RF07 / RF16 — cadastros                                    */
/* ------------------------------------------------------------------ */

test('Laboratório: sigla única, inativação bloqueada com equipamentos', async () => {
  const { app } = await criarAppTeste();
  await entrar(app);
  const novo = app.laboratorios.criar({ nome: 'Laboratório Novo', sigla: 'LNEW', codigo: 'LNEW', localizacao: 'Bloco X' });
  assert.equal(novo.sigla, 'LNEW');
  lancarErro(() => app.laboratorios.criar({ nome: 'Outro', sigla: 'LNEW', codigo: 'LNEW2' }), 'VALIDACAO');
  const lasfi = app.estado.laboratorios.find((l) => l.sigla === 'LASFI');
  lancarErro(() => app.laboratorios.inativar(lasfi.id, 'Tentativa'), 'REGRA_NEGOCIO');
});

test('Usuário: e-mail único, senha forte, perfil e laboratório obrigatórios', async () => {
  const { app } = await criarAppTeste();
  await entrar(app);
  const lab = labPorSigla(app, 'LASFI');
  const usuario = await app.usuarios.criar({
    nome: 'Novo Técnico', email: 'novo.tecnico@labucs.local', perfil: 'TECNICO', laboratorioId: lab.id, senha: 'Senha@123'
  });
  assert.equal(usuario.perfil, 'TECNICO');
  await esperaErro(() => app.usuarios.criar({
    nome: 'Duplicado', email: 'novo.tecnico@labucs.local', perfil: 'TECNICO', laboratorioId: lab.id, senha: 'Senha@123'
  }), 'VALIDACAO');
  await esperaErro(() => app.usuarios.criar({
    nome: 'Sem Lab', email: 'sem.lab@labucs.local', perfil: 'TECNICO', senha: 'Senha@123'
  }), 'VALIDACAO');
  await esperaErro(() => app.usuarios.criar({
    nome: 'Senha Fraca', email: 'fraca@labucs.local', perfil: 'TECNICO', laboratorioId: lab.id, senha: '123'
  }), 'VALIDACAO');
});

test('Fornecedor: CNPJ válido e único; inativação bloqueada por evento agendado', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const fornecedor = app.fornecedores.criar({
    razaoSocial: 'Fornecedor Teste Ltda', cnpj: '11.222.333/0001-81', telefone: '(54) 3333-0000', email: 'teste@fornecedor.com.br'
  });
  assert.equal(fornecedor.cnpj, '11222333000181');
  lancarErro(() => app.fornecedores.criar({
    razaoSocial: 'Outro', cnpj: '11222333000181', telefone: '(54) 3333-0000', email: 'outro@fornecedor.com.br'
  }), 'VALIDACAO');
  lancarErro(() => app.fornecedores.criar({
    razaoSocial: 'Inválido', cnpj: '11.111.111/1111-11', telefone: '(54) 3333-0000', email: 'invalido@fornecedor.com.br'
  }), 'VALIDACAO');
  const equipamento = app.equipamentos.criar(dadosEquipamentoValidos(app));
  const evento = app.eventos.criar({
    tipo: 'CALIBRACAO', equipamentoId: equipamento.id, dataPrevista: '2026-12-01',
    fornecedorId: fornecedor.id, descricao: 'Agendada'
  });
  lancarErro(() => app.fornecedores.inativar(fornecedor.id, 'Tentativa'), 'REGRA_NEGOCIO');
  app.eventos.cancelar(evento.id, 'Cancelamento para teste');
  app.fornecedores.inativar(fornecedor.id, 'Fornecedor suspenso');
  assert.equal(app.fornecedores.obter(fornecedor.id).ativo, false);
});

/* ------------------------------------------------------------------ */
/* RNF03 / RF13 — auditoria e painel                                 */
/* ------------------------------------------------------------------ */

test('Auditoria registra alterações com antes/depois, sem expor senha, e é restrita ao GG', async () => {
  const { app } = await criarAppTeste();
  await entrar(app);
  const lab = app.laboratorios.criar({ nome: 'Laboratório Auditoria', sigla: 'LAUD', codigo: 'LAUD' });
  app.laboratorios.atualizar(lab.id, { nome: 'Laboratório Auditoria 2', motivo: 'Ajuste de nomenclatura' });

  await app.auth.logout();
  await entrar(app, 'gestor.geral@labucs.local');
  const logs = app.auditoria.listar({ tabela: 'laboratorios' });
  assert.ok(logs.total >= 2);
  const atualizacao = logs.itens.find((l) => l.acao === 'ATUALIZAR');
  assert.ok(atualizacao);
  assert.ok(JSON.stringify(atualizacao.dadosAnteriores).includes('Laboratório Auditoria'));
  assert.ok(JSON.stringify(atualizacao.dadosNovos).includes('Laboratório Auditoria 2'));
  assert.ok(atualizacao.motivo.includes('nomenclatura'));

  const usuarios = app.auditoria.listar({ tabela: 'usuarios' });
  assert.ok(!JSON.stringify(usuarios.itens).includes('senhaHash'));

  await app.auth.logout();
  await entrar(app, 'admin@labucs.local');
  lancarErro(() => app.auditoria.listar({}), 'SEM_PERMISSAO');
});

test('Painel: alertas de calibração vencida, a vencer e solicitações pendentes', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const equipamento = app.equipamentos.criar(dadosEquipamentoValidos(app, { periodicidadeCalibracaoMeses: 1 }));
  app.eventos.criar({
    tipo: 'CALIBRACAO', equipamentoId: equipamento.id, dataRealizacao: '2026-01-01',
    numeroCertificado: 'ALERTA-1', erroMedido: 0.1, incerteza: 0.1
  });
  const resumo = app.painel.resumo({});
  assert.ok(resumo.cards.calibracoesVencidas >= 1);
  const alertas = app.painel.alertas({});
  assert.ok(alertas.itens.some((a) => a.tipo === 'CALIBRACAO_VENCIDA'));
});

/* ------------------------------------------------------------------ */
/* RF05 / RF14 / RF15 — relatórios e exportação                      */
/* ------------------------------------------------------------------ */

test('Relatórios: inventário, situação, histórico, Anexo 4 e exportações', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'gestor.lasfi@labucs.local');
  const inventario = app.relatorios.inventario({});
  assert.ok(inventario.linhas.length > 0);
  assert.ok(inventario.colunas.some((c) => c.chave === 'tag'));

  const situacao = app.relatorios.situacao({});
  assert.ok(situacao.linhas.length > 0);
  const historico = app.relatorios.historico({});
  assert.ok(historico.linhas.length > 0);
  const anexo4 = app.relatorios.calibracoes({});
  assert.ok(anexo4.linhas.some((l) => l.pcAnos !== null));

  const pdf = app.relatorios.exportar('situacao', 'pdf', {});
  assert.equal(Buffer.from(pdf.bytes.slice(0, 4)).toString(), '%PDF');
  const xlsx = app.relatorios.exportar('situacao', 'xlsx', {});
  assert.equal(Buffer.from(xlsx.bytes.slice(0, 2)).toString(), 'PK');
  const csv = app.relatorios.exportar('situacao', 'csv', {});
  assert.equal(csv.bytes[0], 0xef);

  await app.auth.logout();
  await entrar(app, 'gestor.geral@labucs.local');
  const custos = app.relatorios.custos({});
  assert.equal(custos.linhas.length, 10);
  assert.ok(custos.resumo.some((r) => r.rotulo === 'Custo total'));
});

test('RF15: custos x receita distingue receita não informada de zero', async () => {
  const { app } = await criarAppTeste();
  await entrar(app);
  const lab = app.laboratorios.listar({}).itens[0];
  app.laboratorios.atualizar(lab.id, {
    nome: lab.nome, sigla: lab.sigla, codigo: lab.codigo, receitaMensalCentavos: 1000000, motivo: 'Informar receita mensal'
  });
  await app.auth.logout();
  await entrar(app, 'gestor.geral@labucs.local');
  const relatorio = app.relatorios.custos({ laboratorioId: lab.id });
  const linha = relatorio.linhas[0];
  assert.equal(linha.receitaMensal, 1000000);
  assert.ok(linha.receitaPeriodo > 0);
  assert.equal(linha.situacao === 'CALCULADO' || linha.situacao === 'SEM_DADOS', true);
});

/* ------------------------------------------------------------------ */
/* RNF05 — LGPD                                                       */
/* ------------------------------------------------------------------ */

test('LGPD: anonimização remove dados pessoais e impede login', async () => {
  const { app } = await criarAppTeste();
  await entrar(app);
  const lab = labPorSigla(app, 'LASFI');
  const usuario = await app.usuarios.criar({
    nome: 'Titular LGPD', email: 'titular@labucs.local', perfil: 'TECNICO', laboratorioId: lab.id, senha: 'Senha@123'
  });
  const anonimizado = app.usuarios.anonimizar(usuario.id, 'Solicitação do titular (LGPD)');
  assert.equal(anonimizado.anonimizado, true);
  assert.ok(anonimizado.email.endsWith('@invalid.local'));
  await esperaErro(() => app.auth.login('titular@labucs.local', 'Senha@123'), 'NAO_AUTENTICADO');
});

/* ------------------------------------------------------------------ */
/* RNF07 / RNF11 — backup, exportação e restauração                  */
/* ------------------------------------------------------------------ */

test('Backup, exportação, importação e reinício preservam a integridade', async () => {
  const { app } = await criarAppTeste();
  await entrar(app);
  const antes = app.meta.info().contagens.equipamentos;
  const backup = await app.config.criarBackup('Backup de teste');
  assert.ok(backup.id);

  const exportado = await app.config.exportarDados();
  assert.ok(exportado.texto.includes('"aplicacao": "LabUcs"'));

  app.laboratorios.criar({ nome: 'Temporário', sigla: 'LTMP', codigo: 'LTMP' });
  assert.equal(app.meta.info().contagens.laboratorios, 11);

  await app.config.importarDados(exportado.texto, 'Restauração do teste');
  assert.equal(app.meta.info().contagens.laboratorios, 10);
  assert.equal(app.meta.info().contagens.equipamentos, antes);

  await app.config.reiniciar('Reinício de teste');
  assert.equal(app.meta.info().contagens.equipamentos, antes);
});

test('Importação inválida é rejeitada sem destruir o estado atual', async () => {
  const { app } = await criarAppTeste();
  await entrar(app);
  const antes = app.meta.info().contagens.equipamentos;
  await esperaErro(() => app.config.importarDados('{"dados": {"esquema": 1}}', 'Importação inválida'), 'IMPORTACAO');
  assert.equal(app.meta.info().contagens.equipamentos, antes);
});

/* ------------------------------------------------------------------ */
/* RNF04 / RNF05 — parâmetros, senha e dados do titular              */
/* ------------------------------------------------------------------ */

test('Configuração: parâmetros validados, auditados e sensíveis não expostos', async () => {
  const { app } = await criarAppTeste();
  await entrar(app);
  const config = app.config.atualizar({
    nomeSistema: 'LabUcs — Teste',
    diasAlertaVencimento: 15,
    timeoutSessaoMinutos: 45,
    retencaoBackupDias: 5,
    motivo: 'Ajuste de parâmetros do teste'
  });
  assert.equal(config.parametros.diasAlertaVencimento, 15);
  assert.equal(config.parametros.timeoutSessaoMinutos, 45);
  assert.equal(JSON.stringify(config.parametros).includes('Senha@123'), false);
  lancarErro(() => app.config.atualizar({ diasAlertaVencimento: 0, timeoutSessaoMinutos: 45, retencaoBackupDias: 5, motivo: 'Inválido' }), 'VALIDACAO');
});

test('Titular altera a própria senha e acessa seus dados; senha antiga deixa de funcionar', async () => {
  const { app } = await criarAppTeste();
  await entrar(app, 'tecnico.lasfi@labucs.local');
  const dados = app.usuarios.meusDados();
  assert.equal(dados.usuario.email, 'tecnico.lasfi@labucs.local');
  assert.ok(Array.isArray(dados.solicitacoes));

  await app.auth.alterarSenha('Senha@123', 'NovaSenha@456');
  await app.auth.logout();
  await esperaErro(() => app.auth.login('tecnico.lasfi@labucs.local', 'Senha@123'), 'NAO_AUTENTICADO');
  const sessao = await app.auth.login('tecnico.lasfi@labucs.local', 'NovaSenha@456');
  assert.equal(sessao.usuario.email, 'tecnico.lasfi@labucs.local');
});

