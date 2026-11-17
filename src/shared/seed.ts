/**
 * Seed do banco IndexedDB a partir de base-real.json.
 */

import { gerarULID, hojeISO, agoraISO, gerarTAG, gerarNumeroSerie, reaisParaCentavos, somarMeses } from './utils';
import { getDB, putAll, markSeeded, isSeeded, clearDB } from './db';
import { PERFIS } from './constants';

const BASE_REAL_URL = `${(import.meta as any).env?.BASE_URL ?? '/'}data/base-real.json`;

function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min: number, max: number, decimals = 2): number { const factor = 10 ** decimals; return Math.floor((Math.random() * (max - min) + min) * factor) / factor; }
function randomDate(start: Date, end: Date): Date { return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); }
function formatISO(date: Date): string { return date.toISOString().split('T')[0]!; }
function shuffle<T>(array: T[]): T[] { const arr = [...array]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

export async function seedDatabase(force = false): Promise<void> {
  if (await isSeeded() && !force) { console.log('[Seed] Banco já populado.'); return; }
  console.log('[Seed] Iniciando seed...');
  if (force) await clearDB();

  const response = await fetch(BASE_REAL_URL);
  if (!response.ok) throw new Error(`Falha ao carregar ${BASE_REAL_URL}`);
  const baseReal: any = await response.json();

  const db = await getDB();
  const agora = agoraISO();

  // Labs
  const labs = baseReal.laboratorios.map((lab: any) => ({ id: gerarULID(), sigla: lab.sigla, nome: lab.nome, codigo: lab.codigo, responsavelTecnico: lab.responsavelTecnico, ramal: lab.ramal, bloco: lab.bloco, sala: lab.sala, localizacao: lab.localizacao, receitaMensalCentavos: reaisParaCentavos(randomFloat(50000, 500000)), ativo: true, criadoEm: agora }));
  await putAll('labs', labs);
  const labMap = new Map(labs.map((l: any) => [l.sigla, l.id]));
  const labSiglas = labs.map((l: any) => l.sigla);

  // Categorias
  const categorias = baseReal.categorias.map((cat: any, idx: number) => ({ id: gerarULID(), nome: cat.nome, ordem: cat.ordem, ativo: true, criadoEm: agora }));
  await putAll('categorias', categorias);
  const catMap = new Map(categorias.map((c: any) => [c.nome, c.id]));

  // Subcategorias
  const subcategorias: any[] = [];
  for (const cat of baseReal.categorias) { const catId = catMap.get(cat.nome)!; for (const subNome of cat.subcategorias) { subcategorias.push({ id: gerarULID(), nome: subNome, categoriaId: catId, ativo: true, criadoEm: agora }); } }
  await putAll('subcategorias', subcategorias);
  const subMap = new Map(subcategorias.map((s: any) => [s.nome, s.id]));

  // Itens
  const itens = baseReal.itens.map((item: any) => ({ id: gerarULID(), chave: item.chave, nome: item.nome, descricao: item.descricao, fabricante: item.fabricante, modelo: item.modelo, categoriaId: catMap.get(item.categoria)!, subcategoriaId: subMap.get(item.subcategoria)!, capacidadeMedicao: item.capacidadeMedicao, resolucao: item.resolucao, tipoIndicacao: item.tipoIndicacao, caCalibracao: item.caCalibracao, caVerificacao: item.caVerificacao, periodicidadeCalibracaoMeses: item.periodicidadeCalibracaoMeses, periodicidadeVerificacaoMeses: item.periodicidadeVerificacaoMeses ?? 0, periodicidadeManutencaoPreventivaMeses: item.periodicidadeManutencaoPreventivaMeses ?? 0, ativo: item.ativo, parametrosEstimados: item.parametrosEstimados, criadoEm: agora }));
  await putAll('itens', itens);

  // Equipamentos
  const equipamentos: any[] = [];
  let patrimonioCounter = 1;
  const hoje = new Date();
  const cincoAnosAtras = new Date(hoje.getFullYear() - 5, hoje.getMonth(), hoje.getDate());
  const doisAnosAtras = new Date(hoje.getFullYear() - 2, hoje.getMonth(), hoje.getDate());

  const labEquipCounts = baseReal.meta.porLaboratorio;
  const totalEquipamentos = baseReal.meta.totalEquipamentos;

  const itemPool: string[] = [];
  for (const item of itens) { const maxInstancias = Math.max(1, Math.ceil(totalEquipamentos / itens.length)); for (let i = 0; i < maxInstancias; i++) itemPool.push(item.id); }
  shuffle(itemPool);

  for (const labSigla of labSiglas) {
    const labId = labMap.get(labSigla)!;
    const qtd = labEquipCounts[labSigla] ?? 0;
    const labObj = labs.find((l: any) => l.sigla === labSigla)!;
    for (let i = 0; i < qtd; i++) {
      const itemId = itemPool.pop() ?? itemPool[0]!;
      const item = itens.find((it: any) => it.id === itemId)!;
      const dataAquisicao = formatISO(randomDate(cincoAnosAtras, doisAnosAtras));
      const dataColocacaoUso = formatISO(randomDate(new Date(dataAquisicao), hoje));
      equipamentos.push({ id: gerarULID(), patrimonio: `PAT-${String(patrimonioCounter++).padStart(6, '0')}`, tag: gerarTAG(labSigla, i + 1), numeroSerie: gerarNumeroSerie(), laboratorioId: labId, itemId, localizacao: `${labObj.bloco ?? 'Bloco'} — Sala ${labObj.sala ?? '000'}`, dataAquisicao, dataColocacaoUso, valorAquisicaoCentavos: reaisParaCentavos(randomFloat(1000, 500000)), caCalibracao: item.caCalibracao, caVerificacao: item.caVerificacao, periodicidadeCalibracaoMeses: item.periodicidadeCalibracaoMeses, periodicidadeVerificacaoMeses: item.periodicidadeVerificacaoMeses, periodicidadeManutencaoPreventivaMeses: item.periodicidadeManutencaoPreventivaMeses, situacao: 'ATIVO', ativo: true, criadoEm: agora });
    }
  }
  await putAll('equipamentos', equipamentos);
  console.log(`[Seed] ${equipamentos.length} equipamentos criados.`);

  // Users
  const users = [ { id: gerarULID(), nome: 'Administrador do Sistema', email: 'admin@demo', perfil: 'ADMIN', ativo: true, criadoEm: agora }, { id: gerarULID(), nome: 'Gestor Geral Demo', email: 'gestor.geral@demo', perfil: 'GESTOR_GERAL', ativo: true, criadoEm: agora }, { id: gerarULID(), nome: 'Gestor LASFI Demo', email: 'gestor.lasfi@demo', perfil: 'GESTOR_LAB', laboratorioId: labMap.get('LASFI'), ativo: true, criadoEm: agora }, { id: gerarULID(), nome: 'Técnico LAMEC Demo', email: 'tecnico.lamec@demo', perfil: 'TECNICO', laboratorioId: labMap.get('LAMEC'), ativo: true, criadoEm: agora } ];
  await putAll('users', users);

  // Config
  await db.put('config', { id: 'global', nomeSistema: 'LabUcs — Gestão de Equipamentos Laboratoriais', diasAlertaVencimento: 30, timeoutSessaoMinutos: 30, retencaoBackupDias: 7, maxTentativasLogin: 5, bloqueioLoginSegundos: 120, permitirAutoAprovacao: false, moeda: 'BRL', atualizadoEm: agora });

  // Fornecedores demo
  const fornecedoresDemo = criarFornecedoresDemo(agora);
  await putAll('fornecedores', fornecedoresDemo);

  // Eventos demo
  const eventosDemo = criarEventosDemo(equipamentos, users, labs, fornecedoresDemo, agora);
  await putAll('eventos', eventosDemo);

  // Solicitacoes demo
  const solicitacoesDemo = criarSolicitacoesDemo(equipamentos, users, agora);
  await putAll('solicitacoes', solicitacoesDemo);

  await markSeeded({ versao: 1, geradoEm: new Date().toISOString(), totalEquipamentos: equipamentos.length, totalItens: itens.length });
  console.log('[Seed] Concluído!');
}

function criarEventosDemo(equipamentos: any[], users: any[], labs: any[], fornecedores: any[], agora: string) {
  const eventos: any[] = [];
  const tecnicos = users.filter((u: any) => u.perfil === 'TECNICO' || u.perfil === 'GESTOR_LAB' || u.perfil === 'GESTOR_GERAL');
  const fornecedorIds = fornecedores.map((f: any) => f.id);
  const equipComEventos = shuffle(equipamentos).slice(0, 200);

  for (const eq of equipComEventos) {
    const resp = tecnicos[randomInt(0, tecnicos.length - 1)];
    const fornId = fornecedorIds[randomInt(0, fornecedorIds.length - 1)];
    const tipo = randomInt(0, 1) === 0 ? 'CALIBRACAO' : 'VERIFICACAO';
    const diasAtras = randomInt(1, 365);
    const dataReal = new Date(); dataReal.setDate(dataReal.getDate() - diasAtras); const dataRealISO = formatISO(dataReal);
    const ca = tipo === 'CALIBRACAO' ? randomFloat(0.5, 2) : randomFloat(0.1, 1);
    const erro = randomFloat(-ca * 1.2, ca * 1.2);
    const incerteza = randomFloat(0.1, ca * 0.8);
    const erroAbs = Math.abs(erro); const erroMaisU = erroAbs + incerteza; const resultado = erroMaisU <= ca ? 'APROVADO' : 'REPROVADO';

    eventos.push({ id: gerarULID(), tipo, equipamentoId: eq.id, fornecedorId: fornId, responsavelId: resp.id, situacao: 'REALIZADO', dataPrevista: null, dataRealizacao: dataRealISO, descricao: `${tipo === 'CALIBRACAO' ? 'Calibração' : 'Verificação'} realizada.`, observacoes: 'Certificado anexado.', custoEstimadoCentavos: reaisParaCentavos(randomFloat(200, 2000)), custoRealizadoCentavos: reaisParaCentavos(randomFloat(200, 2000)), numeroCertificado: `CERT-${String(randomInt(10000, 99999)).padStart(5, '0')}`, erro: Math.round(erro * 10000) / 10000, incerteza: Math.round(incerteza * 10000) / 10000, caUtilizado: ca, resultado, estadoRetorno: null, solicitacaoOrigemId: null, criadoEm: agora });

    if (randomInt(0, 3) === 0) { const dataPrev = new Date(); dataPrev.setDate(dataPrev.getDate() + randomInt(1, 60)); eventos.push({ id: gerarULID(), tipo: 'MANUTENCAO_PREVENTIVA', equipamentoId: eq.id, fornecedorId: fornId, responsavelId: resp.id, situacao: randomInt(0, 1) === 0 ? 'AGENDADO' : 'REALIZADO', dataPrevista: formatISO(dataPrev), dataRealizacao: randomInt(0, 1) === 0 ? null : formatISO(new Date(dataPrev.getTime() - randomInt(0, 5) * 86400000)), descricao: 'Manutenção preventiva.', observacoes: '', custoEstimadoCentavos: reaisParaCentavos(randomFloat(500, 5000)), custoRealizadoCentavos: reaisParaCentavos(randomFloat(500, 5000)), numeroCertificado: null, erro: null, incerteza: null, caUtilizado: null, resultado: null, estadoRetorno: null, solicitacaoOrigemId: null, criadoEm: agora }); }
  }
  return eventos;
}

function criarFornecedoresDemo(agora: string) { return [ { id: gerarULID(), razaoSocial: 'Inmetro Calibrações Ltda', cnpj: '12.345.678/0001-95', telefone: '(11) 3333-4444', email: 'contato@inmetrocalibracoes.com.br', situacao: 'ATIVO', observacoes: 'Acreditado RMMG/CGCRE.', criadoEm: agora }, { id: gerarULID(), razaoSocial: 'TecnoMed Manutenção Industrial', cnpj: '98.765.432/0001-98', telefone: '(11) 2222-3333', email: 'suporte@tecnomed.com.br', situacao: 'ATIVO', observacoes: 'Especialista em manutenção.', criadoEm: agora }, { id: gerarULID(), razaoSocial: 'LabService Fornecedores Científicos', cnpj: '11.222.333/0001-81', telefone: '(11) 4444-5555', email: 'vendas@labservice.com.br', situacao: 'ATIVO', observacoes: 'Fornecimento de vidraria.', criadoEm: agora } ]; }

function criarSolicitacoesDemo(equipamentos: any[], users: any[], agora: string) {
  const tecnicos = users.filter((u: any) => u.perfil === 'TECNICO');
  const solicitacoes: any[] = [];
  const tipos = ['CALIBRACAO', 'VERIFICACAO', 'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA'];
  const justificativas = [
    'Equipamento próximo do vencimento da calibração.',
    'Solicitação de verificação intermediária conforme procedimento interno.',
    'Manutenção preventiva anual programada pelo fabricante.',
    'Falha intermitente observada durante o uso; necessidade de manutenção.',
  ];
  const porLaboratorio = new Map<string, any[]>();
  for (const eq of equipamentos) {
    const lista = porLaboratorio.get(eq.laboratorioId) ?? [];
    lista.push(eq);
    porLaboratorio.set(eq.laboratorioId, lista);
  }
  let idx = 0;
  for (const eqsLab of porLaboratorio.values()) {
    const amostra = shuffle(eqsLab).slice(0, 3);
    for (const eq of amostra) {
      const solicitante = tecnicos[idx % tecnicos.length];
      const dataDesejada = new Date(); dataDesejada.setDate(dataDesejada.getDate() + randomInt(1, 45));
      solicitacoes.push({
        id: gerarULID(), equipamentoId: eq.id, tipoEvento: tipos[idx % tipos.length],
        solicitanteId: solicitante.id, justificativa: justificativas[idx % justificativas.length],
        dataDesejada: formatISO(dataDesejada), situacao: 'PENDENTE',
        avaliadorId: null, dataAvaliacao: null, justificativaAvaliacao: undefined, eventoGeradoId: null,
        criadoEm: agora,
      });
      idx++;
    }
  }
  return solicitacoes;
}

export async function resetDatabase(): Promise<void> { await clearDB(); await seedDatabase(true); }