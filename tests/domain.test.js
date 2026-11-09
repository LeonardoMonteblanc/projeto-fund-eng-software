import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularMetricas,
  calcularResultado,
  camposPendentesEquipamento,
  caEfetivo,
  periodicidadeEfetiva,
  proximaData,
  statusPrazo,
  valorEfetivo
} from '../src/backend/domain/metrology.js';
import { diferencaDias, somarMeses, arredondar, paraCentavos, formatarBRL } from '../src/shared/utils.js';

const HOJE = '2026-11-08';

test('Erro + U: aprova no limite exato e reprova acima do CA', () => {
  const limite = calcularResultado(0.9, 0.1, 1);
  assert.equal(limite.erroMaisU, 1);
  assert.equal(limite.resultado, 'APROVADO');
  assert.equal(limite.margem, 0);

  const acima = calcularResultado(0.900001, 0.1, 1);
  assert.equal(acima.resultado, 'REPROVADO');
  assert.ok(acima.margem < 0);

  const negativo = calcularResultado(-0.4, 0.05, 1);
  assert.equal(negativo.erroAbsoluto, 0.4);
  assert.equal(negativo.erroMaisU, 0.45);
  assert.equal(negativo.resultado, 'APROVADO');
});

test('Erro + U arredonda a 6 casas sem erro de ponto flutuante', () => {
  const r = calcularResultado(0.1 + 0.2, 0.3, 1);
  assert.equal(r.erroAbsoluto, 0.3);
  assert.equal(r.erroMaisU, 0.6);
});

test('Soma de meses respeita fim de mês e ano bissexto', () => {
  assert.equal(somarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(somarMeses('2024-01-31', 1), '2024-02-29');
  assert.equal(somarMeses('2026-08-31', 6), '2027-02-28');
  assert.equal(somarMeses('2026-11-08', 12), '2027-11-08');
  assert.equal(somarMeses('2026-11-08', -12), '2025-11-08');
});

test('Próxima data só existe com periodicidade positiva', () => {
  assert.equal(proximaData('2026-01-01', 0), null);
  assert.equal(proximaData('2026-01-01', null), null);
  assert.equal(proximaData('2026-01-01', 12), '2027-01-01');
  assert.equal(proximaData(null, 12), null);
});

test('Status de prazo: vencido, a vencer e em dia', () => {
  assert.equal(statusPrazo(-1), 'VENCIDO');
  assert.equal(statusPrazo(0), 'A_VENCER');
  assert.equal(statusPrazo(30), 'A_VENCER');
  assert.equal(statusPrazo(31), 'EM_DIA');
  assert.equal(statusPrazo(null), 'SEM_DATA');
});

test('Herança Item → Equipamento: equipamento vence, nulo herda', () => {
  const item = { caCalibracao: 2, periodicidadeCalibracaoMeses: 12 };
  const equipamento = { caCalibracao: null, periodicidadeCalibracaoMeses: null };
  assert.deepEqual(caEfetivo(equipamento, item, 'CALIBRACAO'), { valor: 2, origem: 'ITEM' });
  assert.deepEqual(periodicidadeEfetiva(equipamento, item, 'CALIBRACAO'), { valor: 12, origem: 'ITEM' });
  equipamento.caCalibracao = 0.5;
  equipamento.periodicidadeCalibracaoMeses = 6;
  assert.deepEqual(caEfetivo(equipamento, item, 'CALIBRACAO'), { valor: 0.5, origem: 'EQUIPAMENTO' });
  assert.deepEqual(periodicidadeEfetiva(equipamento, item, 'CALIBRACAO'), { valor: 6, origem: 'EQUIPAMENTO' });
  assert.deepEqual(valorEfetivo({}, {}, 'caCalibracao'), { valor: null, origem: null });
});

test('Métricas: última calibração, próxima data e sinalização de vencida', () => {
  const equipamento = { id: 1, dataColocacaoUso: '2024-01-01', caCalibracao: null, caVerificacao: null };
  const item = { caCalibracao: 1, periodicidadeCalibracaoMeses: 12, periodicidadeVerificacaoMeses: 6 };
  const eventos = [
    { id: 10, tipo: 'CALIBRACAO', situacao: 'REALIZADO', dataRealizacao: '2024-11-01', resultado: 'APROVADO' },
    { id: 11, tipo: 'VERIFICACAO', situacao: 'REALIZADO', dataRealizacao: '2026-01-01', resultado: 'APROVADO' }
  ];
  const m = calcularMetricas({ equipamento, item, eventos, hoje: HOJE, diasAlerta: 30 });
  assert.equal(m.proximaCalibracao, '2025-11-01');
  assert.equal(m.diasParaVencimentoCalibracao, -372);
  assert.equal(m.statusCalibracao, 'VENCIDO');
  assert.ok(m.sinalizacoes.some((s) => s.codigo === 'CALIBRACAO_VENCIDA'));
  assert.equal(m.proximaVerificacao, '2026-07-01');
  assert.equal(m.statusVerificacao, 'VENCIDO');
});

test('Métricas: calibração reprovada gera sinal próprio', () => {
  const equipamento = { id: 1 };
  const item = { caCalibracao: 1, periodicidadeCalibracaoMeses: 12 };
  const eventos = [{ id: 1, tipo: 'CALIBRACAO', situacao: 'REALIZADO', dataRealizacao: '2026-10-01', resultado: 'REPROVADO' }];
  const m = calcularMetricas({ equipamento, item, eventos, hoje: HOJE });
  assert.ok(m.sinalizacoes.some((s) => s.codigo === 'CALIBRACAO_REPROVADA'));
  assert.equal(m.situacaoMetrologica, 'NAO_CONFORME');
});

test('Métricas: periodicidade zero é sinalizada e não calcula data', () => {
  const equipamento = { id: 1 };
  const item = { caCalibracao: 1, periodicidadeCalibracaoMeses: 0, periodicidadeVerificacaoMeses: 0 };
  const m = calcularMetricas({ equipamento, item, eventos: [], hoje: HOJE });
  assert.equal(m.proximaCalibracao, null);
  assert.ok(m.sinalizacoes.some((s) => s.codigo === 'PERIODICIDADE_ZERO'));
});

test('Métricas: preventiva agendada tem precedência sobre a calculada', () => {
  const equipamento = { id: 1 };
  const item = { periodicidadeManutencaoPreventivaMeses: 12 };
  const eventos = [
    { id: 1, tipo: 'MANUTENCAO_PREVENTIVA', situacao: 'REALIZADO', dataRealizacao: '2025-01-01' },
    { id: 2, tipo: 'MANUTENCAO_PREVENTIVA', situacao: 'AGENDADO', dataPrevista: '2026-12-01' }
  ];
  const m = calcularMetricas({ equipamento, item, eventos, hoje: HOJE });
  assert.equal(m.proximaManutencaoPreventiva, '2026-12-01');
  assert.equal(m.proximaManutencaoCalculada, '2026-01-01');
});

test('Completude: aponta todos os campos obrigatórios ausentes', () => {
  const pendentes = camposPendentesEquipamento({ patrimonio: null, numeroSerie: '', localizacao: undefined, dataAquisicao: null, dataColocacaoUso: null, valorAquisicaoCentavos: null });
  assert.deepEqual(pendentes, ['patrimonio', 'numeroSerie', 'localizacao', 'dataAquisicao', 'dataColocacaoUso', 'valorAquisicaoCentavos']);
  assert.deepEqual(camposPendentesEquipamento({ patrimonio: '1', numeroSerie: '2', localizacao: '3', dataAquisicao: '2024-01-01', dataColocacaoUso: '2024-01-02', valorAquisicaoCentavos: 0 }), []);
});

test('Dinheiro e diferença de dias', () => {
  assert.equal(paraCentavos('1.234,56'), 123456);
  assert.equal(paraCentavos('R$ 10,00'), 1000);
  assert.equal(paraCentavos(12.5), 1250);
  assert.equal(formatarBRL(123456).replace(/\u00a0/g, ' '), 'R$ 1.234,56');
  assert.equal(diferencaDias('2026-11-01', '2026-11-08'), 7);
  assert.equal(arredondar(1.23456789, 4), 1.2346);
});
