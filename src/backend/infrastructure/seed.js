/**
 * Carga inicial da demonstração.
 *
 * Combina a base real importada (1.9 mil equipamentos) com um pequeno conjunto de
 * dados de demonstração (eventos com resultados, custos e solicitações) para
 * exercitar todos os RFs. Nada aqui é usado em produção.
 */

import {
  PARAMETROS_PADRAO,
  PERFIS,
  SITUACOES_EQUIPAMENTO,
  SITUACOES_EVENTO,
  SITUACOES_SOLICITACAO,
  TIPOS_EVENTO,
  VERSAO_APP,
  VERSAO_ESQUEMA
} from '../../shared/constants.js';
import { criarCredenciais } from './session.js';
import { cnpjValido } from '../../shared/validation.js';
import { calcularResultado, camposPendentesEquipamento } from '../domain/metrology.js';
import {
  adicionarDias,
  agoraISO,
  clonar,
  hojeISO,
  somarMeses,
  toISO
} from '../../shared/utils.js';

const SENHA_DEMO = 'Senha@123';

/* ------------------------------------------------------------------ */
/* CNPJ sintético válido                                               */
/* ------------------------------------------------------------------ */

function completarCnpj(base12) {
  const base = String(base12).replace(/\D/g, '').slice(0, 12);
  if (base.length !== 12) return null;
  const calc = (numeros, pesos) => {
    const soma = numeros.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const dv1 = calc(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = calc(`${base}${dv1}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const cnpj = `${base}${dv1}${dv2}`;
  return cnpjValido(cnpj) ? cnpj : null;
}

/* ------------------------------------------------------------------ */
/* Fallback mínimo (caso a base real não seja carregada)               */
/* ------------------------------------------------------------------ */

function baseFallback() {
  const laboratorios = ['LASFI', 'LAMEC', 'LCMEC', 'LMC', 'LAMAT', 'LAPA', 'LCOR', 'LAPAM', 'LBTEC', 'LQFS'].map((sigla) => ({
    sigla,
    nome: `Laboratório ${sigla}`,
    codigo: sigla,
    localizacao: null,
    equipamentos: 2
  }));
  const categorias = [
    { nome: 'Massa', subcategorias: ['Balança', 'Peso Padrão'] },
    { nome: 'Temperatura', subcategorias: ['Termômetro digital', 'Termohigrômetro', 'Autoclave'] }
  ];
  const itens = [];
  const equipamentos = [];
  let item = 0;
  let eq = 0;
  for (const lab of laboratorios) {
    for (let i = 0; i < 2; i += 1) {
      item += 1;
      const temperatura = i === 1;
      const nome = temperatura ? 'Termômetro digital' : 'Balança eletrônica digital';
      const categoria = temperatura ? 'Temperatura' : 'Massa';
      const subcategoria = temperatura ? 'Termômetro digital' : 'Balança';
      const fabricante = temperatura ? 'Minipa' : 'Marte';
      itens.push({
        nome,
        descricao: nome,
        fabricante,
        modelo: null,
        categoria,
        subcategoria,
        capacidadeMedicao: null,
        resolucao: null,
        tipoIndicacao: 'DIGITAL',
        caCalibracao: temperatura ? 0.5 : 1,
        caVerificacao: null,
        periodicidadeCalibracaoMeses: 12,
        periodicidadeVerificacaoMeses: null,
        periodicidadeManutencaoPreventivaMeses: null,
        ativo: true,
        parametrosEstimados: ['caCalibracao']
      });
      eq += 1;
      equipamentos.push({
        laboratorio: lab.sigla,
        tag: `DEMO ${eq}`,
        tagOriginal: `DEMO ${eq}`,
        patrimonio: `PAT-DEMO-${eq}`,
        numeroSerie: `SN-DEMO-${eq}`,
        nome,
        marca: fabricante,
        faixa: null,
        localizacao: lab.localizacao,
        dataAquisicao: null,
        dataColocacaoUso: null,
        valorAquisicaoCentavos: null,
        tipoIndicacao: 'DIGITAL',
        ultimaCalibracao: adicionarDias(hojeISO(), -200),
        frequenciaAnos: 1,
        periodicidadeCalibracaoMeses: 12,
        caCalibracao: null,
        certificado: null,
        observacoes: 'Equipamento sintético de demonstração (a base real não foi carregada).',
        fonte: 'fallback',
        completude: 'PARCIAL',
        camposPendentes: ['dataAquisicao', 'dataColocacaoUso', 'valorAquisicaoCentavos'],
        itemChave: `${nome}|${fabricante}`,
        demo: true
      });
    }
  }
  return { laboratorios, categorias, itens, equipamentos };
}

/* ------------------------------------------------------------------ */
/* Estado inicial                                                       */
/* ------------------------------------------------------------------ */

/**
 * @param {object} opcoes
 * @param {object} [opcoes.baseReal]
 * @param {() => Date} opcoes.clock
 * @param {object} [opcoes.parametros]
 * @param {number} [opcoes.iteracoesSenha]
 */
export async function construirEstadoInicial({ baseReal, clock, parametros = {}, iteracoesSenha = 120000 } = {}) {
  const hoje = hojeISO(clock);
  const agora = agoraISO(clock);
  const base = baseReal?.equipamentos?.length ? baseReal : baseFallback();

  const estado = {
    esquema: VERSAO_ESQUEMA,
    meta: {
      versaoApp: VERSAO_APP,
      criadoEm: agora,
      atualizadoEm: agora,
      ultimoBackupAuto: null,
      ultimoBackupEm: null,
      sequencias: {
        laboratorios: 0,
        usuarios: 0,
        fornecedores: 0,
        categorias: 0,
        subcategorias: 0,
        itens: 0,
        equipamentos: 0,
        solicitacoes: 0,
        eventos: 0,
        logs: 0
      },
      origemBase: {
        fonte: baseReal?.meta?.fonte ?? 'fallback sintético',
        totalEquipamentos: base.equipamentos.length,
        totalItens: base.itens.length,
        importadaEm: baseReal?.meta?.geradoEm ?? agora,
        pendencias: baseReal?.pendencias ?? null
      }
    },
    parametros: { ...PARAMETROS_PADRAO, ...parametros },
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

  const proximo = (colecao) => {
    estado.meta.sequencias[colecao] += 1;
    return estado.meta.sequencias[colecao];
  };
  const agoraIso = agoraISO(clock);

  /* -------------------------- laboratórios -------------------------- */
  const labIdPorSigla = new Map();
  for (const lab of base.laboratorios) {
    const id = proximo('laboratorios');
    labIdPorSigla.set(lab.sigla, id);
    estado.laboratorios.push({
      id,
      nome: lab.nome ?? `Laboratório ${lab.sigla}`,
      sigla: lab.sigla,
      codigo: lab.codigo ?? lab.sigla,
      localizacao: lab.localizacao ?? null,
      responsavelTecnico: lab.responsavelTecnico ?? null,
      ramal: lab.ramal ?? null,
      bloco: lab.bloco ?? null,
      sala: lab.sala ?? null,
      receitaMensalCentavos: null,
      ativo: true,
      criadoEm: agoraIso,
      atualizadoEm: agoraIso
    });
  }

  /* ---------------------------- categorias --------------------------- */
  const categoriaIdPorNome = new Map();
  const subcategoriaIdPorChave = new Map();
  for (const [indice, categoria] of (base.categorias ?? []).entries()) {
    const id = proximo('categorias');
    categoriaIdPorNome.set(categoria.nome, id);
    estado.categorias.push({
      id,
      nome: categoria.nome,
      descricao: categoria.nome,
      ordem: categoria.ordem ?? indice + 1,
      ativo: true,
      criadoEm: agoraIso,
      atualizadoEm: agoraIso
    });
    for (const nomeSub of categoria.subcategorias ?? []) {
      const sid = proximo('subcategorias');
      estado.subcategorias.push({
        id: sid,
        nome: nomeSub,
        descricao: nomeSub,
        categoriaId: id,
        ativo: true,
        criadoEm: agoraIso,
        atualizadoEm: agoraIso
      });
      subcategoriaIdPorChave.set(`${categoria.nome}|${nomeSub}`, sid);
    }
  }

  /* ------------------------------- itens ---------------------------- */
  const itemIdPorChave = new Map();
  base.itens.forEach((item, indice) => {
    const id = proximo('itens');
    const categoriaId = categoriaIdPorNome.get(item.categoria) ?? null;
    const subcategoriaId = subcategoriaIdPorChave.get(`${item.categoria}|${item.subcategoria}`) ?? null;
    itemIdPorChave.set(item.chave ?? `${item.nome}|${item.fabricante}`, id);
    estado.itens.push({
      id,
      nome: item.nome,
      descricao: item.descricao ?? item.nome,
      fabricante: item.fabricante ?? 'Não informado',
      modelo: item.modelo ?? null,
      categoriaId,
      subcategoriaId,
      capacidadeMedicao: item.capacidadeMedicao ?? null,
      resolucao: item.resolucao ?? null,
      tipoIndicacao: item.tipoIndicacao ?? null,
      caCalibracao: item.caCalibracao,
      caVerificacao: item.caVerificacao ?? null,
      periodicidadeCalibracaoMeses: item.periodicidadeCalibracaoMeses ?? 0,
      periodicidadeVerificacaoMeses: item.periodicidadeVerificacaoMeses ?? null,
      periodicidadeManutencaoPreventivaMeses: item.periodicidadeManutencaoPreventivaMeses ?? null,
      parametrosEstimados: item.parametrosEstimados ?? [],
      ativo: true,
      origem: base.equipamentos?.[0]?.demo ? 'MANUAL' : 'IMPORTADO',
      criadoEm: agoraIso,
      atualizadoEm: agoraIso,
      _indice: indice + 1
    });
  });

  /* --------------------------- equipamentos ------------------------- */
  const equipamentoIdPorChave = new Map();
  base.equipamentos.forEach((equipamento) => {
    const id = proximo('equipamentos');
    const laboratorioId = labIdPorSigla.get(equipamento.laboratorio);
    const itemId = itemIdPorChave.get(equipamento.item ?? `${equipamento.nome}|${equipamento.marca}`) ?? null;
    const registro = {
      id,
      itemId,
      laboratorioId,
      patrimonio: equipamento.patrimonio ?? null,
      tag: equipamento.tag,
      tagOriginal: equipamento.tagOriginal ?? equipamento.tag,
      numeroSerie: equipamento.numeroSerie ?? null,
      localizacao: equipamento.localizacao ?? null,
      dataAquisicao: equipamento.dataAquisicao ?? null,
      dataColocacaoUso: equipamento.dataColocacaoUso ?? null,
      valorAquisicaoCentavos: equipamento.valorAquisicaoCentavos ?? null,
      situacao: SITUACOES_EQUIPAMENTO.ATIVO,
      caCalibracao: equipamento.caCalibracao ?? null,
      caVerificacao: equipamento.caVerificacao ?? null,
      periodicidadeCalibracaoMeses: equipamento.periodicidadeCalibracaoMeses ?? 0,
      periodicidadeVerificacaoMeses: equipamento.periodicidadeVerificacaoMeses ?? null,
      periodicidadeManutencaoPreventivaMeses: equipamento.periodicidadeManutencaoPreventivaMeses ?? null,
      origem: equipamento.demo ? 'DEMONSTRACAO' : 'IMPORTADO',
      completude: equipamento.completude ?? 'PARCIAL',
      camposPendentes: equipamento.camposPendentes ?? [],
      observacoes: equipamento.observacoes ?? null,
      fonte: equipamento.fonte ?? null,
      ultimaCalibracao: equipamento.ultimaCalibracao ?? null,
      historicoImportado: equipamento.historicoCalibracoes ?? null,
      certificadoImportado: equipamento.certificado ?? null,
      parametrosDemonstracao: [],
      criadoEm: agoraIso,
      atualizadoEm: agoraIso
    };
    registro.camposPendentes = camposPendentesEquipamento(registro);
    registro.completude = registro.camposPendentes.length ? 'PARCIAL' : 'COMPLETA';
    estado.equipamentos.push(registro);
    equipamentoIdPorChave.set(`${equipamento.laboratorio}|${equipamento.tagOriginal ?? equipamento.tag}`, id);
  });

  /* ------------------- eventos históricos importados ---------------- */
  for (const equipamento of estado.equipamentos) {
    if (!equipamento.historicoImportado?.length && !equipamento.ultimaCalibracao) {
      delete equipamento.historicoImportado;
      continue;
    }
    const historico = equipamento.historicoImportado?.length
      ? equipamento.historicoImportado
      : [{
        data: equipamento.ultimaCalibracao,
        numeroCertificado: equipamento.certificadoImportado ?? null,
        erroMedido: null,
        incerteza: null,
        caEfetivo: null,
        resultado: null,
        observacoes: null
      }];
    delete equipamento.historicoImportado;
    delete equipamento.ultimaCalibracao;
    delete equipamento.certificadoImportado;

    for (const registro of historico) {
      const id = proximo('eventos');
      estado.eventos.push({
        id,
        tipo: TIPOS_EVENTO.CALIBRACAO,
        equipamentoId: equipamento.id,
        fornecedorId: null,
        solicitacaoId: null,
        usuarioId: null,
        dataPrevista: null,
        dataRealizacao: registro.data,
        situacao: SITUACOES_EVENTO.REALIZADO,
        descricao: 'Calibração importada da planilha',
        observacoes: registro.observacoes ?? 'Resultado metrológico não disponível na planilha de origem.',
        numeroCertificado: registro.numeroCertificado ?? null,
        erroMedido: registro.erroMedido ?? null,
        incerteza: registro.incerteza ?? null,
        caEfetivo: registro.caEfetivo ?? null,
        resultado: registro.resultado ?? null,
        custoEstimadoCentavos: null,
        custoRealizadoCentavos: null,
        problemaServico: null,
        estadoRetorno: null,
        recorrente: false,
        proximaDataPrevista: null,
        origem: 'IMPORTADO',
        registroHistorico: true,
        criadoEm: agoraIso,
        atualizadoEm: agoraIso
      });
    }
  }

  /* ---------------------------- fornecedores ------------------------ */
  const fornecedoresBase = [
    ['22.111.333/0001', 'Metrologia Caxias Ltda', '(54) 3211-1000', 'contato@metrologiacaxias.com.br'],
    ['33.444.555/0001', 'Instituto de Metrologia RS', '(51) 3222-2000', 'comercial@imetro-rs.com.br'],
    ['44.555.666/0001', 'Sul Balanças e Serviços', '(54) 3333-3000', 'vendas@sulbalancas.com.br'],
    ['55.666.777/0001', 'Metrotécnica Calibrações', '(51) 3444-4000', 'laboratorio@metrotecnica.com.br'],
    ['66.777.888/0001', 'Precision Metrologia', '(11) 3555-5000', 'contato@precision.com.br'],
    ['77.888.999/0001', 'TermoMed Instrumentos', '(54) 3666-6000', 'suporte@termomed.com.br'],
    ['88.999.111/0001', 'Mecânica Industrial Bento', '(54) 3777-7000', 'manutencao@mibento.com.br'],
    ['99.111.222/0001', 'LabService Manutenção', '(51) 3888-8000', 'atendimento@labservice.com.br']
  ];
  const fornecedorIds = [];
  for (const [base12, razao, telefone, email] of fornecedoresBase) {
    const cnpj = completarCnpj(base12);
    if (!cnpj) continue;
    const id = proximo('fornecedores');
    fornecedorIds.push(id);
    estado.fornecedores.push({
      id,
      razaoSocial: razao,
      cnpj,
      telefone,
      email,
      ativo: true,
      observacoes: null,
      criadoEm: agoraIso,
      atualizadoEm: agoraIso
    });
  }

  /* ------------------------------- usuários ------------------------ */
  const usuariosBase = [
    { nome: 'Administrador do Sistema', email: 'admin@labucs.local', perfil: PERFIS.ADMIN, laboratorioId: null },
    { nome: 'Gestor Geral', email: 'gestor.geral@labucs.local', perfil: PERFIS.GESTOR_GERAL, laboratorioId: null }
  ];
  for (const lab of estado.laboratorios) {
    usuariosBase.push({
      nome: `Gestor ${lab.sigla}`,
      email: `gestor.${lab.sigla.toLowerCase()}@labucs.local`,
      perfil: PERFIS.GESTOR_LAB,
      laboratorioId: lab.id
    });
    usuariosBase.push({
      nome: `Técnico ${lab.sigla}`,
      email: `tecnico.${lab.sigla.toLowerCase()}@labucs.local`,
      perfil: PERFIS.TECNICO,
      laboratorioId: lab.id
    });
  }
  const credenciais = await Promise.all(
    usuariosBase.map(() => criarCredenciais(SENHA_DEMO, iteracoesSenha))
  );
  usuariosBase.forEach((usuario, indice) => {
    const id = proximo('usuarios');
    estado.usuarios.push({
      id,
      nome: usuario.nome,
      email: usuario.email,
      senhaHash: credenciais[indice].senhaHash,
      senhaSal: credenciais[indice].senhaSal,
      senhaIteracoes: credenciais[indice].senhaIteracoes,
      perfil: usuario.perfil,
      laboratorioId: usuario.laboratorioId,
      ativo: true,
      anonimizado: false,
      criadoEm: agoraIso,
      atualizadoEm: agoraIso,
      ultimoAcessoEm: null
    });
  });

  const admin = estado.usuarios[0];
  const gestorGeral = estado.usuarios[1];

  /* ------------------------ dados de demonstração ------------------ */
  const usuariosPorLab = new Map();
  for (const usuario of estado.usuarios) {
    if (usuario.laboratorioId) {
      const lista = usuariosPorLab.get(usuario.laboratorioId) ?? [];
      lista.push(usuario);
      usuariosPorLab.set(usuario.laboratorioId, lista);
    }
  }
  const itensPorId = new Map(estado.itens.map((i) => [i.id, i]));
  const labsComEquipamentos = estado.laboratorios
    .map((lab) => ({ lab, equipamentos: estado.equipamentos.filter((e) => e.laboratorioId === lab.id) }))
    .filter((x) => x.equipamentos.length > 0);

  if (labsComEquipamentos.length) {
    const escolher = (indice) => {
      const grupo = labsComEquipamentos[indice % labsComEquipamentos.length];
      return grupo.equipamentos[Math.floor(indice / labsComEquipamentos.length) % grupo.equipamentos.length];
    };
    const usuarioDoLab = (labId) => (usuariosPorLab.get(labId) ?? []).find((u) => u.perfil === PERFIS.TECNICO)
      ?? (usuariosPorLab.get(labId) ?? [])[0];

    const criarEventoDemo = (dados) => {
      const id = proximo('eventos');
      estado.eventos.push({
        id,
        fornecedorId: dados.fornecedorId ?? null,
        solicitacaoId: dados.solicitacaoId ?? null,
        dataPrevista: dados.dataPrevista ?? null,
        dataRealizacao: dados.dataRealizacao ?? null,
        descricao: dados.descricao ?? null,
        observacoes: dados.observacoes ?? null,
        numeroCertificado: dados.numeroCertificado ?? null,
        erroMedido: dados.erroMedido ?? null,
        incerteza: dados.incerteza ?? null,
        caEfetivo: dados.caEfetivo ?? null,
        resultado: dados.resultado ?? null,
        custoEstimadoCentavos: dados.custoEstimadoCentavos ?? null,
        custoRealizadoCentavos: dados.custoRealizadoCentavos ?? null,
        problemaServico: dados.problemaServico ?? null,
        estadoRetorno: dados.estadoRetorno ?? null,
        recorrente: dados.recorrente ?? false,
        proximaDataPrevista: dados.proximaDataPrevista ?? null,
        origem: 'DEMONSTRACAO',
        registroHistorico: false,
        criadoEm: agoraIso,
        atualizadoEm: agoraIso,
        ...dados,
        id
      });
      return estado.eventos[estado.eventos.length - 1];
    };

    // Calibrações recentes com resultado (aprovadas e reprovadas) e custos.
    for (let i = 0; i < 12; i += 1) {
      const equipamento = escolher(i);
      const item = itensPorId.get(equipamento.itemId);
      const lab = estado.laboratorios.find((l) => l.id === equipamento.laboratorioId);
      const usuario = usuarioDoLab(equipamento.laboratorioId);
      const per = equipamento.periodicidadeCalibracaoMeses ?? item?.periodicidadeCalibracaoMeses ?? 12;
      if (!item || !per) continue;
      const ca = equipamento.caCalibracao ?? item.caCalibracao ?? 1;
      const reprovado = i % 4 === 1;
      const vencido = i >= 8;
      const diasAtras = i < 4
        ? 10 + i * 4
        : vencido
          ? Math.round(per * 30 + 45)
          : Math.round(Math.max(20, per * 30 - (i % 3) * 15 - 10));
      const data = adicionarDias(hoje, -diasAtras);
      const erro = reprovado ? ca * 1.4 : ca * (0.2 + (i % 3) * 0.1);
      const incerteza = ca * 0.1;
      const calculo = calcularResultado(erro, incerteza, ca);
      criarEventoDemo({
        tipo: TIPOS_EVENTO.CALIBRACAO,
        equipamentoId: equipamento.id,
        laboratorioId: equipamento.laboratorioId,
        usuarioId: usuario?.id ?? null,
        fornecedorId: fornecedorIds[i % fornecedorIds.length] ?? null,
        dataRealizacao: data,
        situacao: SITUACOES_EVENTO.REALIZADO,
        numeroCertificado: `CAL-${String(1000 + i)}/${data.slice(2, 4)}`,
        erroMedido: Number(erro.toFixed(4)),
        incerteza: Number(incerteza.toFixed(4)),
        caEfetivo: ca,
        resultado: calculo.resultado,
        custoRealizadoCentavos: 45000 + i * 7500,
        descricao: `Calibração de ${equipamento.tag} (${lab?.sigla ?? '—'})`,
        observacoes: reprovado ? 'Equipamento reprovado na aceitação simples; avaliação técnica necessária.' : 'Calibração aprovada.'
      });
    }

    // Verificações: 3 vencidas e 3 em dia, com periodicidade definida para demonstração.
    for (let i = 0; i < 6; i += 1) {
      const equipamento = escolher(i * 3 + 2);
      const item = itensPorId.get(equipamento.itemId);
      const usuario = usuarioDoLab(equipamento.laboratorioId);
      const ca = equipamento.caVerificacao ?? item?.caVerificacao ?? (item?.caCalibracao ?? 1) * 2;
      equipamento.periodicidadeVerificacaoMeses = 6;
      equipamento.caVerificacao = ca;
      equipamento.parametrosDemonstracao.push('periodicidadeVerificacaoMeses', 'caVerificacao');
      const diasAtras = i < 3 ? 240 : 40;
      const data = adicionarDias(hoje, -diasAtras);
      const erro = ca * 0.25;
      const incerteza = ca * 0.05;
      criarEventoDemo({
        tipo: TIPOS_EVENTO.VERIFICACAO,
        equipamentoId: equipamento.id,
        laboratorioId: equipamento.laboratorioId,
        usuarioId: usuario?.id ?? null,
        dataRealizacao: data,
        situacao: SITUACOES_EVENTO.REALIZADO,
        erroMedido: Number(erro.toFixed(4)),
        incerteza: Number(incerteza.toFixed(4)),
        caEfetivo: ca,
        resultado: calcularResultado(erro, incerteza, ca).resultado,
        custoRealizadoCentavos: i < 3 ? 18000 : null,
        descricao: `Verificação intermediária de ${equipamento.tag}`
      });
    }

    // Manutenções preventivas: agendadas e realizadas.
    for (let i = 0; i < 8; i += 1) {
      const equipamento = escolher(i * 5 + 1);
      const usuario = usuarioDoLab(equipamento.laboratorioId);
      equipamento.periodicidadeManutencaoPreventivaMeses = 12;
      const fornecedorId = fornecedorIds[(i + 3) % fornecedorIds.length] ?? null;
      if (i < 5) {
        criarEventoDemo({
          tipo: TIPOS_EVENTO.MANUTENCAO_PREVENTIVA,
          equipamentoId: equipamento.id,
          laboratorioId: equipamento.laboratorioId,
          usuarioId: usuario?.id ?? null,
          fornecedorId,
          dataPrevista: adicionarDias(hoje, 4 + i * 9),
          situacao: SITUACOES_EVENTO.AGENDADO,
          descricao: 'Manutenção preventiva programada',
          custoEstimadoCentavos: 25000 + i * 5000,
          recorrente: true
        });
      } else {
        criarEventoDemo({
          tipo: TIPOS_EVENTO.MANUTENCAO_PREVENTIVA,
          equipamentoId: equipamento.id,
          laboratorioId: equipamento.laboratorioId,
          usuarioId: usuario?.id ?? null,
          fornecedorId,
          dataPrevista: adicionarDias(hoje, -220),
          dataRealizacao: adicionarDias(hoje, -210),
          situacao: SITUACOES_EVENTO.REALIZADO,
          descricao: 'Manutenção preventiva realizada',
          custoRealizadoCentavos: 30000 + i * 4000,
          recorrente: true
        });
      }
    }

    // Manutenções corretivas: uma deixa o equipamento em manutenção.
    for (let i = 0; i < 2; i += 1) {
      const equipamento = escolher(i * 11 + 4);
      if (!equipamento) continue;
      const usuario = usuarioDoLab(equipamento.laboratorioId);
      criarEventoDemo({
        tipo: TIPOS_EVENTO.MANUTENCAO_CORRETIVA,
        equipamentoId: equipamento.id,
        laboratorioId: equipamento.laboratorioId,
        usuarioId: usuario?.id ?? null,
        fornecedorId: fornecedorIds[(i + 5) % fornecedorIds.length] ?? null,
        dataRealizacao: adicionarDias(hoje, i === 0 ? -3 : -35),
        situacao: SITUACOES_EVENTO.REALIZADO,
        problemaServico: i === 0 ? 'Falha no display; substituição do módulo de indicação.' : 'Desgaste do fusível de proteção.',
        estadoRetorno: i === 0 ? 'EM_MANUTENCAO' : 'APTO',
        custoRealizadoCentavos: i === 0 ? 89000 : 24000,
        descricao: 'Manutenção corretiva'
      });
      if (i === 0) {
        equipamento.situacao = SITUACOES_EQUIPAMENTO.EM_MANUTENCAO;
        equipamento.observacoes = `${equipamento.observacoes ?? ''} Equipamento aguardando retorno de manutenção corretiva.`.trim();
      }
    }

    // Solicitações: pendentes, aprovadas e rejeitadas.
    const solicitacoesDemo = [
      { tipo: TIPOS_EVENTO.CALIBRACAO, dias: 2, desejada: 15, situacao: SITUACOES_SOLICITACAO.PENDENTE, justificativa: 'Calibração periódica próxima do vencimento.' },
      { tipo: TIPOS_EVENTO.VERIFICACAO, dias: 3, desejada: 10, situacao: SITUACOES_SOLICITACAO.PENDENTE, justificativa: 'Verificação intermediária após manutenção.' },
      { tipo: TIPOS_EVENTO.MANUTENCAO_PREVENTIVA, dias: 4, desejada: 30, situacao: SITUACOES_SOLICITACAO.PENDENTE, justificativa: 'Programação anual de manutenção preventiva.' },
      { tipo: TIPOS_EVENTO.CALIBRACAO, dias: 5, desejada: 20, situacao: SITUACOES_SOLICITACAO.PENDENTE, justificativa: 'Equipamento com resultado de verificação próximo do limite.' },
      { tipo: TIPOS_EVENTO.MANUTENCAO_CORRETIVA, dias: 1, desejada: 7, situacao: SITUACOES_SOLICITACAO.PENDENTE, justificativa: 'Ruído anormal durante o uso.' },
      { tipo: TIPOS_EVENTO.CALIBRACAO, dias: 20, desejada: 25, situacao: SITUACOES_SOLICITACAO.APROVADA, justificativa: 'Calibração externa aprovada no planejamento.' },
      { tipo: TIPOS_EVENTO.VERIFICACAO, dias: 15, desejada: 18, situacao: SITUACOES_SOLICITACAO.REJEITADA, justificativa: 'Verificação solicitada fora do intervalo previsto.', rejeicao: 'Realizar a verificação apenas no próximo ciclo.' }
    ];

    solicitacoesDemo.forEach((modelo, indice) => {
      const equipamento = escolher(indice * 13 + 3);
      if (!equipamento) return;
      const id = proximo('solicitacoes');
      const usuarios = usuariosPorLab.get(equipamento.laboratorioId) ?? [];
      const solicitante = usuarios.find((u) => u.perfil === PERFIS.TECNICO) ?? usuarios[0] ?? admin;
      const aprovador = usuarios.find((u) => u.perfil === PERFIS.GESTOR_LAB) ?? null;
      const solicitacao = {
        id,
        equipamentoId: equipamento.id,
        solicitanteId: solicitante.id,
        tipoEvento: modelo.tipo,
        justificativa: modelo.justificativa,
        dataSolicitacao: adicionarDias(hoje, -modelo.dias),
        dataDesejada: adicionarDias(hoje, modelo.desejada),
        situacao: modelo.situacao,
        avaliadorId: modelo.situacao === SITUACOES_SOLICITACAO.PENDENTE ? null : aprovador?.id ?? null,
        dataAvaliacao: modelo.situacao === SITUACOES_SOLICITACAO.PENDENTE ? null : adicionarDias(hoje, -Math.max(1, modelo.dias - 1)),
        justificativaRejeicao: modelo.rejeicao ?? null,
        eventoId: null,
        criadoEm: agoraIso,
        atualizadoEm: agoraIso
      };
      estado.solicitacoes.push(solicitacao);

      if (modelo.situacao === SITUACOES_SOLICITACAO.APROVADA) {
        const evento = criarEventoDemo({
          tipo: modelo.tipo,
          equipamentoId: equipamento.id,
          laboratorioId: equipamento.laboratorioId,
          usuarioId: solicitante.id,
          solicitacaoId: id,
          dataPrevista: solicitacao.dataDesejada,
          situacao: SITUACOES_EVENTO.AGENDADO,
          descricao: `Evento gerado pela solicitação nº ${id}`,
          observacoes: 'Evento agendado automaticamente na aprovação da solicitação.'
        });
        solicitacao.eventoId = evento.id;
      }
    });

    // Demonstração de LGPD: um usuário inativo (não anonimizado) para o administrador.
    const tecnicoLbtc = estado.usuarios.find((u) => u.email === 'tecnico.lbtc@labucs.local');
    if (tecnicoLbtc) tecnicoLbtc.ativo = false;
  }

  /* ------------------------------ auditoria ------------------------ */
  estado.logs.push({
    id: proximo('logs'),
    usuarioId: admin.id,
    tabelaAfetada: 'sistema',
    registroId: 0,
    dataHora: agoraIso,
    acao: 'CRIAR',
    dadosAnteriores: null,
    dadosNovos: {
      origem: estado.meta.origemBase.fonte,
      equipamentos: estado.equipamentos.length,
      itens: estado.itens.length,
      laboratorios: estado.laboratorios.length,
      usuarios: estado.usuarios.length,
      eventos: estado.eventos.length
    },
    motivo: 'Carga inicial da demonstração',
    ip: 'seed (POC estático)'
  });

  // Remove metadados internos de montagem.
  for (const item of estado.itens) delete item._indice;

  return estado;
}

export { SENHA_DEMO };
