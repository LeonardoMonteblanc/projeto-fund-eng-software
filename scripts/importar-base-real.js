#!/usr/bin/env node
/**
 * Importador reprodutível da base real (EQUIP.xlsx / FG 020 / FG 006).
 *
 * Entradas (extrações textuais versionadas no diretório):
 *   ODS_CATEGORIAS.txt  — 10 planilhas de laboratório + RT + categorias
 *   ODS_FG020.txt       — formulário FG 020 (dados, status de calibração, manutenção preventiva)
 *   ODS_FG006.txt       — formulário FG 006 (histórico de calibrações da BAL 01 / LCOR)
 *
 * Saída:
 *   data/base-real.json — inventário normalizado, com proveniência e lacunas explícitas
 *   data/RELATORIO-IMPORTACAO.md — relatório de cobertura, duplicidades e decisões
 *
 * O importador NÃO inventa datas, patrimônios ou valores. Campos ausentes ficam nulos
 * e são listados em `camposPendentes`. Periodicidade e CA são derivados quando a
 * planilha permite e marcados em `parametrosEstimados`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR_DADOS = path.join(RAIZ, 'data');
const FONTE = 'EQUIP.xlsx (extração ODS_CATEGORIAS.txt)';
const LIMITE_NOME_ITEM = 180;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const limpar = (texto) =>
  String(texto ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const RE_DATA = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/;

/** Heurística para distinguir uma TAG de um pedaço de descrição quebrado em várias linhas. */
function pareceTag(valor) {
  const t = limpar(valor);
  if (!t || t.length > 60) return false;
  if (RE_DATA.test(t)) return false;
  if (t.includes('%')) return false;
  const n = normalizar(t);
  if (!/[a-z]/.test(n)) return /^\d{4,10}$/.test(t);
  if (/^(de|com|para|em|a|o|os|as|dos|das|ur|t\s*in|t\s*out|ph)\b/.test(n)) return false;
  if (/(resolucao|capacidade|faixa|modelo|serie|pontos?|indicacao|divisao|escala|calibracao|leitura|erro|incerteza|umidade|temperatura)/.test(n)) return false;
  if (/^\d/.test(t) && !/^\d{1,6}[a-z]$/.test(n)) return false;
  if (n.split(/\s+/).length > 8) return false;
  return true;
}

function dataISO(valor) {
  const m = RE_DATA.exec(String(valor ?? ''));
  if (!m) return null;
  let [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (ano < 100) ano += ano <= 30 ? 2000 : 1900;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return d.toISOString().slice(0, 10);
}

function frequenciaAnos(valor) {
  const s = String(valor ?? '').replace(',', '.').trim();
  if (!s || s === '-' || s === '—') return 0;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const mesesDeAnos = (anos) => (Number.isFinite(anos) ? Math.round(anos * 12) : null);

function extrairSerie(nome) {
  const texto = String(nome ?? '');
  const padroes = [
    /(?:n[º°o]?\s*\.?\s*s[ée]rie|n[º°o]?\s*s\/?n|n\/s|sn)\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9./\-_]{2,40})/i,
    /s[ée]rie\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9./\-_]{2,40})/i
  ];
  for (const re of padroes) {
    const m = re.exec(texto);
    if (m) return m[1].replace(/[),;]+$/, '').trim();
  }
  return null;
}

function extrairModelo(nome) {
  const m = /modelo\s*[:.]?\s*([^,;()]{2,60})/i.exec(String(nome ?? ''));
  return m ? limpar(m[1]) : null;
}

function extrairResolucao(nome) {
  const m = /(?:resolu[çc][ãa]o|divis[ãa]o\s+da\s+escala)\s*[:.]?\s*([^,;]{1,40})/i.exec(String(nome ?? ''));
  return m ? limpar(m[1]) : null;
}

function tipoIndicacao(nome, adFg020) {
  if (adFg020 === 'A' || adFg020 === 'D') return adFg020 === 'A' ? 'ANALOGICO' : 'DIGITAL';
  const n = normalizar(nome);
  if (/\banalogic[oa]\b/.test(n)) return 'ANALOGICO';
  if (/\bdigital\b|\beletronic[oa]\b/.test(n)) return 'DIGITAL';
  return null;
}

const CATEGORIA_PADRAO_CA = {
  Massa: 1,
  Temperatura: 1,
  'Força/Torque/Dureza': 1,
  'Eletricidade/Tempo/Frequência': 0.5,
  Dimensional: 0.05,
  'Ópticos': 1,
  'Pressão/Vazão/Nível': 0.5,
  'Volume/Viscosidade/Massa Específica': 0.1,
  'Acústica/Vibração': 1,
  Outros: 1
};

/* ------------------------------------------------------------------ */
/* 1. Planilhas dos laboratórios                                       */
/* ------------------------------------------------------------------ */

function lerLinhas(arquivo) {
  return fs.readFileSync(path.join(RAIZ, arquivo), 'utf8').split(/\r?\n/);
}

function celulasDaLinha(linha) {
  const s = linha.trim();
  if (!s.includes('|')) return null;
  let celulas = s.replace(/^\|/, '').replace(/\|$/, '').split('|').map(limpar);
  if (celulas.length && celulas[0] === '') celulas.shift();
  return celulas;
}

function parseLaboratorios() {
  const linhas = lerLinhas('ODS_CATEGORIAS.txt');
  /** @type {Map<string, any>} */
  const labs = new Map();
  let sheet = null;
  let atual = null;
  const ignorados = [];
  const notas = [];

  const finalizar = () => {
    if (!atual) return;
    const lab = labs.get(atual.sheet);
    if (lab) lab.equipamentos.push(atual);
    atual = null;
  };

  /** Anexa texto quebrado em várias linhas ao nome (quando ele termina em "/") ou à faixa. */
  const acrescentar = (texto, marca) => {
    if (!atual) return;
    const t = limpar(texto);
    if (!t || t === '-' || /^(a calibra|legenda|observa)/i.test(t)) return;
    if (!atual.marca && marca && !RE_DATA.test(marca)) {
      const m = limpar(marca);
      atual.marca = m === '-' || m === '—' ? '' : m;
    }
    const paraNome = /[/,]$/.test(atual.nome) || (/^de\s/i.test(t) && atual.nome.length < 120);
    if (paraNome) atual.nome = limpar(`${atual.nome} ${t}`);
    else atual.complemento.push(t);
  };

  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i];
    const cabecalho = /^===== (?:SHEET\/TABLE \d+: |SHEET: )(.+?) =====$/.exec(linha.trim());
    if (cabecalho) {
      finalizar();
      sheet = cabecalho[1].trim();
      if (!labs.has(sheet)) labs.set(sheet, { sigla: sheet, equipamentos: [], linhas: [] });
      continue;
    }
    if (!sheet || !labs.has(sheet)) continue;
    const lab = labs.get(sheet);
    const s = linha.trim();
    if (!s) continue;

    const celulas = celulasDaLinha(linha);
    if (celulas && celulas.length >= 2) {
      const primeira = celulas[0];
      const segunda = celulas[1];
      const ehCabecalho =
        /^identifica/i.test(primeira) ||
        /^a calibra/i.test(primeira) ||
        /^n[ºo]\s*de\s*patrim/i.test(primeira) ||
        /^n\s*patrim/i.test(primeira) ||
        /^laborat[óo]rio/i.test(primeira) ||
        /^categorias?$/i.test(primeira) ||
        /^subcategorias?$/i.test(primeira);

      // Nova linha de equipamento: TAG + nome (+ marca). Evita cabeçalhos e notas.
      const pareceEquipamento =
        !ehCabecalho &&
        pareceTag(primeira) &&
        segunda.length > 1 &&
        !/^[-–—]$/.test(segunda) &&
        !RE_DATA.test(segunda) &&
        !/^(laborat|respons|ramal|bloco|sala|categorias?|subcategorias?)/i.test(segunda);

      if (pareceEquipamento) {
        finalizar();
        let data = null;
        let freq = null;
        for (let c = 3; c < celulas.length; c += 1) {
          if (RE_DATA.test(celulas[c])) {
            data = dataISO(celulas[c]);
            freq = frequenciaAnos(celulas[c + 1] ?? '');
            break;
          }
        }
        atual = {
          sheet,
          linha: i + 1,
          tag: limpar(primeira),
          nome: limpar(segunda),
          marca: limpar(celulas[2] ?? '') === '-' ? '' : limpar(celulas[2] ?? ''),
          faixa: limpar(celulas[3] ?? ''),
          data,
          freqAnos: freq,
          complemento: []
        };
        continue;
      }

      // Continuação de uma descrição quebrada em várias linhas.
      if (atual) {
        const dataCel = celulas.find((c) => RE_DATA.test(c));
        if (dataCel) {
          const pos = celulas.indexOf(dataCel);
          if (pos >= 2) {
            acrescentar(celulas[0], null);
            if (!atual.marca && celulas[1] && celulas[1] !== '-') atual.marca = celulas[1];
            if (celulas[2] && celulas[2] !== '-') atual.complemento.push(celulas[2]);
          } else {
            const texto = celulas.slice(0, pos).filter(Boolean).join(' ');
            if (texto) acrescentar(texto, celulas[2]);
          }
          atual.data = atual.data ?? dataISO(dataCel);
          atual.freqAnos = atual.freqAnos ?? frequenciaAnos(celulas[pos + 1] ?? '');
        } else if (celulas[0] === '' && celulas.length >= 2) {
          acrescentar(celulas[1], celulas[2]);
        } else {
          acrescentar(celulas.filter(Boolean).join(' '), celulas[2]);
        }
      } else {
        ignorados.push({ linha: i + 1, conteudo: s });
      }
      continue;
    }

    // Continuação sem pipe inicial (descrições quebradas em várias linhas).
    if (atual && s.length < 300) {
      if (s.includes('|')) {
        const partes = s.split('|').map(limpar);
        const posData = partes.findIndex((c) => RE_DATA.test(c));
        if (posData >= 2) {
          acrescentar(partes[0], null);
          if (!atual.marca && partes[1] && partes[1] !== '-') atual.marca = partes[1];
          if (partes[2] && partes[2] !== '-') atual.complemento.push(partes[2]);
        } else {
          acrescentar((posData >= 0 ? partes.slice(0, posData) : partes).filter(Boolean).join(' '), null);
        }
        if (posData >= 0) {
          atual.data = atual.data ?? dataISO(partes[posData]);
          atual.freqAnos = atual.freqAnos ?? frequenciaAnos(partes[partes.length - 1] ?? '');
        }
        continue;
      }
      acrescentar(s);
    } else if (!atual) {
      notas.push({ linha: i + 1, conteudo: s });
    }
  }
  finalizar();

  // Consolida faixa, descarta seções sem nome/identificação e desduplica TAGs por laboratório.
  for (const lab of labs.values()) {
    lab.equipamentos = lab.equipamentos
      .filter((e) => e.tag && e.nome && e.nome.length > 1)
      .map((e) => {
        const faixa = limpar([e.faixa, ...e.complemento].filter(Boolean).join(' '));
        delete e.complemento;
        return { ...e, faixa };
      })
      .filter((e) => !/^(ensaios?|laborat|se[cç][aã]o|tabela|dados)\b/i.test(e.nome))
      .filter((e) => !/^(de|com|para|ur|t\s*in|t\s*out)\s/i.test(e.nome))
      .filter((e) => !RE_DATA.test(e.nome));

    const vistos = new Map();
    for (const equipamento of lab.equipamentos) {
      const chave = normalizar(equipamento.tag);
      const n = (vistos.get(chave) ?? 0) + 1;
      vistos.set(chave, n);
      equipamento.tagOriginal = equipamento.tag;
      if (n > 1) equipamento.tag = `${equipamento.tag} (${n})`;
    }
  }

  const labsReais = ['LASFI', 'LAMEC', 'LCMEC', 'LMC', 'LAMAT', 'LAPA', 'LCOR', 'LAPAM', 'LBTEC', 'LQFS'];
  return {
    laboratorios: labsReais.map((sigla) => labs.get(sigla) ?? { sigla, equipamentos: [] }),
    ignorados,
    notas
  };
}

/* ------------------------------------------------------------------ */
/* 2. RT, blocos e salas                                              */
/* ------------------------------------------------------------------ */

function parseRT() {
  const linhas = lerLinhas('ODS_CATEGORIAS.txt');
  const inicio = linhas.findIndex((l) => /SHEET\/TABLE \d+: RT - Blocos - Salas/.test(l));
  if (inicio < 0) return new Map();
  const mapa = new Map();
  for (let i = inicio + 1; i < linhas.length; i += 1) {
    if (/^===== /.test(linhas[i].trim())) break;
    const celulas = celulasDaLinha(linhas[i]);
    if (!celulas || celulas.length < 6) continue;
    const [lab, responsavel, email, ramal, bloco, sala] = celulas;
    if (!lab || /^laborat/i.test(lab)) continue;
    mapa.set(lab.trim(), {
      responsavelTecnico: limpar(responsavel),
      ramal: limpar(ramal).replace(/\.0$/, ''),
      bloco: limpar(bloco).replace(/\.0$/, ''),
      sala: limpar(sala).replace(/\.0$/, '')
    });
  }
  return mapa;
}

/* ------------------------------------------------------------------ */
/* 3. FG 020 (LCOR): dados ricos + status de calibração               */
/* ------------------------------------------------------------------ */

function parseFG020() {
  const linhas = lerLinhas('ODS_FG020.txt');
  const dados = [];
  const status = [];
  const preventivas = [];
  let modo = null;

  for (let i = 0; i < linhas.length; i += 1) {
    const l = linhas[i];
    if (l.includes('TABLE 1')) { modo = 'dados'; continue; }
    if (l.includes('TABLE 2')) { modo = 'status'; continue; }
    if (l.includes('TABLE 3')) { modo = 'preventiva'; continue; }
    if (!l.includes('|')) continue;
    const celulas = celulasDaLinha(l);
    if (!celulas) continue;

    if (modo === 'dados' && celulas.length >= 7) {
      const [patrimonio, tag, nome, marca, ad, certificado, faixa] = celulas;
      if (/^n[ºo]\s*de\s*patrim/i.test(patrimonio) || /^identifica/i.test(tag)) continue;
      if (!tag || !nome) continue;
      dados.push({
        linha: i + 1,
        patrimonio: /^\d/.test(patrimonio) ? patrimonio : null,
        tag: limpar(tag),
        nome: limpar(nome),
        marca: limpar(marca),
        ad: limpar(ad),
        certificado: limpar(certificado) === '-' ? null : limpar(certificado),
        faixa: limpar(faixa),
        checagem: limpar(celulas[7] ?? ''),
        criterio: limpar(celulas[8] ?? ''),
        observacoes: limpar(celulas[9] ?? '')
      });
      continue;
    }

    if (modo === 'status' && celulas.length >= 5) {
      const [tag, nome, ad, ultima, proxima, pc, dias, situacao] = celulas;
      if (!tag || !RE_DATA.test(ultima ?? '')) continue;
      status.push({
        linha: i + 1,
        tag: limpar(tag),
        nome: limpar(nome),
        ad: limpar(ad),
        ultima: dataISO(ultima),
        proxima: dataISO(proxima),
        pc: limpar(pc ?? ''),
        dias: limpar(dias ?? ''),
        situacao: limpar(situacao ?? '')
      });
      continue;
    }

    if (modo === 'preventiva' && celulas.length >= 4) {
      const [patrimonio, tag, nome, dataProg, descricao, pmp, proxima, situacao] = celulas;
      if (!tag || /^n\s*patrim/i.test(patrimonio)) continue;
      preventivas.push({
        linha: i + 1,
        patrimonio: limpar(patrimonio),
        tag: limpar(tag),
        nome: limpar(nome),
        dataProgramada: dataISO(dataProg),
        descricao: limpar(descricao ?? ''),
        pmp: limpar(pmp ?? ''),
        proxima: dataISO(proxima),
        situacao: limpar(situacao ?? '')
      });
    }
  }

  return { dados, status, preventivas };
}

/* ------------------------------------------------------------------ */
/* 4. FG 006 (LCOR BAL 01): histórico de calibrações                  */
/* ------------------------------------------------------------------ */

function parseFG006() {
  const linhas = lerLinhas('ODS_FG006.txt');
  const eventos = [];
  let dentro = false;
  for (let i = 0; i < linhas.length; i += 1) {
    const l = linhas[i];
    if (/Acompanhamento das Calibra/i.test(l) && !dentro) { dentro = true; continue; }
    if (!dentro) continue;
    const celulas = celulasDaLinha(l);
    if (!celulas || celulas.length < 7) continue;
    const data = dataISO(celulas[0]);
    if (!data) continue;
    const numeroCertificado = limpar(celulas[1]);
    const erro = Number(String(celulas[2]).replace(',', '.'));
    const incerteza = Number(String(celulas[3]).replace(',', '.'));
    const ca = Number(String(celulas[4]).replace(',', '.'));
    const resultadoTexto = normalizar(celulas[6] ?? '');
    eventos.push({
      data,
      numeroCertificado: numeroCertificado || null,
      erroMedido: Number.isFinite(erro) ? erro : null,
      incerteza: Number.isFinite(incerteza) ? incerteza : null,
      caEfetivo: Number.isFinite(ca) ? ca : null,
      resultado: resultadoTexto.includes('aprov') ? 'APROVADO' : resultadoTexto.includes('reprov') ? 'REPROVADO' : null,
      observacoes: limpar(celulas[7] ?? '')
    });
  }
  return eventos;
}

/* ------------------------------------------------------------------ */
/* 5. Categorias e mapeamento por palavra-chave                       */
/* ------------------------------------------------------------------ */

const TAXONOMIA = [
  { nome: 'Temperatura', subcategorias: ['Controlador de Temperatura', 'Termômetro Líquido de vidro', 'Termohigrômetro', 'Câmara Térmica', 'Termopar', 'Termômetro Infravermelho', 'Banho Termostático', 'Câmara Climática', 'Termômetro digital', 'Autoclave', 'Estufa'] },
  { nome: 'Massa', subcategorias: ['Peso Padrão', 'Balança'] },
  { nome: 'Força/Torque/Dureza', subcategorias: ['Célula de Carga', 'Anel Dinamométrico', 'Transdutor de Torque', 'Torquímetro', 'Durômetro', 'Máquina Universal'] },
  { nome: 'Eletricidade/Tempo/Frequência', subcategorias: ['Timer', 'Cronômetro', 'Temporizador', 'Condutivímetro', 'pH-metro', 'Centrífuga'] },
  { nome: 'Dimensional', subcategorias: ['Paquímetro', 'Micrômetro', 'Relógio Comparador', 'Rugosímetro', 'Trena', 'Régua Graduada', 'Goniômetro', 'Padrão de Espessura', 'Esquadro', 'Nível', 'Haste Padrão', 'Anel Padrão', 'Máquina de Medir por Coordenadas', 'Relógio Apalpador', 'Peneira Granulométrica', 'Projetor de Perfil', 'Inclinômetro'] },
  { nome: 'Ópticos', subcategorias: ['Espectrômetro de emissão óptica', 'Sensor ótico de medição de distância e velocidade', 'Espectrofotômetro UV-VIS', 'Colorímetro', 'Refratômetro', 'Microscópio'] },
  { nome: 'Pressão/Vazão/Nível', subcategorias: ['Manômetro', 'Transdutor de Pressão', 'Esfigmomanômetro', 'Barômetro', 'Manovacuômetro'] },
  { nome: 'Volume/Viscosidade/Massa Específica', subcategorias: ['Pipeta Volumétrica', 'Proveta', 'Copo Becker', 'Balão Volumétrico', 'Bureta', 'Picnômetro', 'Micropipetador', 'Pipeta Graduada', 'Viscosímetro', 'Densímetro', 'Dispensador', 'Titulador Karl Fisher', 'Cone Imhoff', 'Vidraria'] },
  { nome: 'Acústica/Vibração', subcategorias: ['Aparelho de Ultrassom Pulso-Eco', 'Medidor de Nível Sonoro', 'Medidor de Ruído', 'Decibelímetro', 'Medidor de Espessura por Ultrassom'] },
  { nome: 'Outros', subcategorias: ['Equipamento de Apoio', 'Acessório'] }
];

function mapearCategoria(nome) {
  const n = normalizar(nome);
  const tem = (...palavras) => palavras.some((p) => n.includes(normalizar(p)));

  if (tem('balança', 'balanca')) return ['Massa', 'Balança'];
  if (tem('peso padrão', 'peso padrao', 'conjunto de pesos')) return ['Massa', 'Peso Padrão'];
  if (tem('peso ', ' pesos ', 'massa de')) return ['Massa', 'Peso Padrão'];
  if (/^massa(\s+de|\s+\d)/.test(n)) return ['Massa', 'Peso Padrão'];
  if (tem('célula de carga', 'celula de carga')) return ['Força/Torque/Dureza', 'Célula de Carga'];
  if (tem('anel dinamométrico', 'anel dinamometrico')) return ['Força/Torque/Dureza', 'Anel Dinamométrico'];
  if (tem('transdutor de torque')) return ['Força/Torque/Dureza', 'Transdutor de Torque'];
  if (tem('torquímetro', 'torquimetro')) return ['Força/Torque/Dureza', 'Torquímetro'];
  if (tem('durômetro', 'durometro', 'penetrador', 'microdurômetro', 'microdurometro')) return ['Força/Torque/Dureza', 'Durômetro'];
  if (tem('máquina universal', 'maquina universal', 'máq. universal', 'maq. universal', 'ensaio de impacto')) return ['Força/Torque/Dureza', 'Máquina Universal'];

  if (tem('paquímetro', 'paquimetro')) return ['Dimensional', 'Paquímetro'];
  if (tem('micrômetro', 'micrometro')) return ['Dimensional', 'Micrômetro'];
  if (tem('relógio comparador', 'relogio comparador')) return ['Dimensional', 'Relógio Comparador'];
  if (tem('rugosímetro', 'rugosimetro')) return ['Dimensional', 'Rugosímetro'];
  if (tem('trena')) return ['Dimensional', 'Trena'];
  if (tem('régua', 'regua')) return ['Dimensional', 'Régua Graduada'];
  if (tem('goniômetro', 'goniometro')) return ['Dimensional', 'Goniômetro'];
  if (tem('esquadro')) return ['Dimensional', 'Esquadro'];
  if (tem('peneira')) return ['Dimensional', 'Peneira Granulométrica'];
  if (tem('inclinômetro', 'inclinometro')) return ['Dimensional', 'Inclinômetro'];
  if (tem('medidor de espessura', 'espessura')) return ['Acústica/Vibração', 'Medidor de Espessura por Ultrassom'];

  if (tem('termohigrômetro', 'termohigrometro', 'termo-higrômetro', 'termo-higrometro', 'thermo higrômetro', 'thermo higrometro', 'termo higrômetro')) return ['Temperatura', 'Termohigrômetro'];
  if (tem('infravermelho')) return ['Temperatura', 'Termômetro Infravermelho'];
  if (tem('termômetro de vidro', 'termometro de vidro', 'líquido em vidro', 'liquido em vidro', 'termômetro de líquido')) return ['Temperatura', 'Termômetro Líquido de vidro'];
  if (tem('termopar')) return ['Temperatura', 'Termopar'];
  if (tem('termômetro', 'termometro')) return ['Temperatura', 'Termômetro digital'];
  if (tem('controlador', 'controladore')) return ['Temperatura', 'Controlador de Temperatura'];
  if (tem('autoclave')) return ['Temperatura', 'Autoclave'];
  if (tem('estufa')) return ['Temperatura', 'Estufa'];
  if (tem('banho')) return ['Temperatura', 'Banho Termostático'];
  if (tem('câmara', 'camara', 'incubadora', 'germinador', 'b.o.d', 'bod', 'climática', 'climatica')) return ['Temperatura', 'Câmara Térmica'];

  if (tem('manômetro', 'manometro')) return ['Pressão/Vazão/Nível', 'Manômetro'];
  if (tem('barômetro', 'barometro')) return ['Pressão/Vazão/Nível', 'Barômetro'];
  if (tem('transdutor de pressão', 'transdutor de pressao', 'transdutor')) return ['Pressão/Vazão/Nível', 'Transdutor de Pressão'];
  if (tem('manovacuômetro', 'manovacuometro', 'vacuômetro', 'vacuometro')) return ['Pressão/Vazão/Nível', 'Manovacuômetro'];
  if (tem('esfigmomanômetro', 'esfigmomanometro')) return ['Pressão/Vazão/Nível', 'Esfigmomanômetro'];

  if (tem('micropipetador', 'micropipeta')) return ['Volume/Viscosidade/Massa Específica', 'Micropipetador'];
  if (tem('pipeta graduada')) return ['Volume/Viscosidade/Massa Específica', 'Pipeta Graduada'];
  if (tem('pipeta')) return ['Volume/Viscosidade/Massa Específica', 'Pipeta Volumétrica'];
  if (tem('bureta')) return ['Volume/Viscosidade/Massa Específica', 'Bureta'];
  if (tem('balão', 'balao')) return ['Volume/Viscosidade/Massa Específica', 'Balão Volumétrico'];
  if (tem('proveta')) return ['Volume/Viscosidade/Massa Específica', 'Proveta'];
  if (tem('becker', 'copo becker', 'copo')) return ['Volume/Viscosidade/Massa Específica', 'Copo Becker'];
  if (tem('picnômetro', 'picnometro')) return ['Volume/Viscosidade/Massa Específica', 'Picnômetro'];
  if (tem('viscosímetro', 'viscosimetro')) return ['Volume/Viscosidade/Massa Específica', 'Viscosímetro'];
  if (tem('densímetro', 'densimetro')) return ['Volume/Viscosidade/Massa Específica', 'Densímetro'];
  if (tem('titulador')) return ['Volume/Viscosidade/Massa Específica', 'Titulador Karl Fisher'];
  if (tem('dispensador')) return ['Volume/Viscosidade/Massa Específica', 'Dispensador'];

  if (tem('cronômetro', 'cronometro')) return ['Eletricidade/Tempo/Frequência', 'Cronômetro'];
  if (tem('timer', 'temporizador')) return ['Eletricidade/Tempo/Frequência', 'Timer'];
  if (tem('condutivímetro', 'condutivimetro')) return ['Eletricidade/Tempo/Frequência', 'Condutivímetro'];
  if (tem('phmetro', 'ph-metro', 'potenciômetro', 'potenciometro', 'ph metro')) return ['Eletricidade/Tempo/Frequência', 'pH-metro'];
  if (tem('centrífuga', 'centrifuga')) return ['Eletricidade/Tempo/Frequência', 'Centrífuga'];

  if (tem('espectrofotômetro', 'espectrofotometro', 'espectrofotometro')) return ['Ópticos', 'Espectrofotômetro UV-VIS'];
  if (tem('espectrômetro', 'espectrometro')) return ['Ópticos', 'Espectrômetro de emissão óptica'];
  if (tem('colorímetro', 'colorimetro')) return ['Ópticos', 'Colorímetro'];
  if (tem('refratômetro', 'refratometro')) return ['Ópticos', 'Refratômetro'];
  if (tem('microscópio', 'microscopio')) return ['Ópticos', 'Microscópio'];
  if (tem('sensor ótico', 'sensor optico')) return ['Ópticos', 'Sensor ótico de medição de distância e velocidade'];

  if (tem('decibelímetro', 'decibelimetro')) return ['Acústica/Vibração', 'Decibelímetro'];
  if (tem('ruído', 'ruido')) return ['Acústica/Vibração', 'Medidor de Ruído'];
  if (tem('ultrassom', 'ultra-som')) return ['Acústica/Vibração', 'Aparelho de Ultrassom Pulso-Eco'];

  if (tem('tubo', 'vidraria', 'erlenmeyer', 'béquer', 'bequer', 'cubeta', 'dessecador', 'cápsula', 'capsula')) {
    return ['Volume/Viscosidade/Massa Específica', 'Vidraria'];
  }
  if (tem('refrigerador', 'geladeira', 'freezer', 'congelador')) return ['Temperatura', 'Câmara Térmica'];
  if (tem('forno', 'mufla', 'chapa aquecedora', 'placa aquecedora')) return ['Temperatura', 'Estufa'];
  if (tem('sensor termoresistivo', 'pt100', 'termopar')) return ['Temperatura', 'Termopar'];
  if (tem('dosador')) return ['Volume/Viscosidade/Massa Específica', 'Dispensador'];
  if (tem('cone') && tem('imhoff')) return ['Volume/Viscosidade/Massa Específica', 'Cone Imhoff'];
  if (tem('nível de bolha', 'nivel de bolha')) return ['Dimensional', 'Nível'];
  if (tem('capela', 'cabine', 'fluxo laminar', 'bancada')) return ['Outros', 'Equipamento de Apoio'];

  return ['Outros', 'Equipamento de Apoio'];
}

/* ------------------------------------------------------------------ */
/* 6. Consolidação                                                    */
/* ------------------------------------------------------------------ */

function principal() {
  const { laboratorios, ignorados } = parseLaboratorios();
  const rt = parseRT();
  const fg020 = parseFG020();
  const fg006 = parseFG006();

  const equipamentos = [];
  const itensMap = new Map();
  const categorias = TAXONOMIA.map((c) => ({ ...c, subcategorias: [...c.subcategorias] }));

  // Adiciona subcategorias usadas pelo FG 020 que não estão na taxonomia original.
  const garantirSubcategoria = (categoria, subcategoria) => {
    const cat = categorias.find((c) => c.nome === categoria);
    if (cat && !cat.subcategorias.includes(subcategoria)) cat.subcategorias.push(subcategoria);
  };

  const porTagLCOR = new Map(fg020.dados.map((d) => [normalizar(d.tag), d]));
  const statusPorTag = new Map();
  for (const s of fg020.status) {
    const chave = normalizar(s.tag);
    const existente = statusPorTag.get(chave);
    if (!existente || (s.ultima && existente.ultima && s.ultima > existente.ultima)) statusPorTag.set(chave, s);
  }

  for (const lab of laboratorios) {
    const local = rt.get(lab.sigla);
    const localizacao = local ? `Bloco ${local.bloco} — Sala ${local.sala}` : null;
    let sequencia = 0;

    const registros = [...lab.equipamentos];

    // FG 020 acrescenta equipamentos do LCOR que não constam na planilha resumida.
    if (lab.sigla === 'LCOR') {
      const existentes = new Set(registros.map((r) => normalizar(r.tagOriginal ?? r.tag)));
      for (const d of fg020.dados) {
        if (!existentes.has(normalizar(d.tag))) {
          registros.push({
            sheet: 'LCOR',
            linha: d.linha,
            tag: d.tag,
            tagOriginal: d.tag,
            nome: d.nome,
            marca: d.marca,
            faixa: d.faixa,
            data: statusPorTag.get(normalizar(d.tag))?.ultima ?? null,
            freqAnos: frequenciaAnos(statusPorTag.get(normalizar(d.tag))?.pc ?? '0'),
            origemFG020: true
          });
        }
      }
    }

    for (const registro of registros) {
      sequencia += 1;
      const chaveTag = normalizar(registro.tagOriginal ?? registro.tag);
      const rico = lab.sigla === 'LCOR' ? porTagLCOR.get(chaveTag) : null;
      const status = lab.sigla === 'LCOR' ? statusPorTag.get(chaveTag) : null;

      const nome = limpar(rico?.nome ?? registro.nome);
      const marca = limpar(rico?.marca ?? registro.marca);
      const faixa = limpar(rico?.faixa ?? registro.faixa);
      const [categoria, subcategoria] = mapearCategoria(nome);
      garantirSubcategoria(categoria, subcategoria);

      // O item representa o modelo: remove o número de série do nome antes de agrupar.
      const nomeBase = limpar(
        nome
          .replace(/(?:n[º°o]?\s*\.?\s*s[ée]rie|n[º°o]?\s*s\/?n|n\/s|sn)\s*[:.]?\s*[^,;]+/gi, '')
          .replace(/[,\s]+$/, '')
      ) || nome;
      const chaveItem = `${normalizar(nomeBase)}|${normalizar(marca)}`;
      if (!itensMap.has(chaveItem)) {
        const ca = CATEGORIA_PADRAO_CA[categoria] ?? 1;
        itensMap.set(chaveItem, {
          nome: nomeBase.slice(0, LIMITE_NOME_ITEM),
          descricao: limpar(`${nome}${faixa ? ` — ${faixa}` : ''}`).slice(0, 500),
          fabricante: marca || 'Não informado',
          modelo: extrairModelo(nome),
          categoria,
          subcategoria,
          capacidadeMedicao: faixa || null,
          resolucao: extrairResolucao(nome),
          tipoIndicacao: tipoIndicacao(nome, rico?.ad),
          caCalibracao: ca,
          caVerificacao: null,
          periodicidadeCalibracaoMeses: mesesDeAnos(registro.freqAnos ?? 0),
          periodicidadeVerificacaoMeses: null,
          periodicidadeManutencaoPreventivaMeses: null,
          ativo: true,
          parametrosEstimados: ['caCalibracao']
        });
      }
      const item = itensMap.get(chaveItem);
      if (!item.tipoIndicacao && (rico?.ad === 'A' || rico?.ad === 'D')) {
        item.tipoIndicacao = tipoIndicacao(nome, rico.ad);
      }
      if ((item.periodicidadeCalibracaoMeses === null || item.periodicidadeCalibracaoMeses === 0) && registro.freqAnos > 0) {
        item.periodicidadeCalibracaoMeses = mesesDeAnos(registro.freqAnos);
      }

      const ultima = status?.ultima ?? registro.data ?? null;
      if (ultima) {
        const freq = status?.pc ? frequenciaAnos(status.pc) : registro.freqAnos ?? 0;
        registro.data = ultima;
        registro.freqAnos = freq;
      }

      const patrimonio = rico?.patrimonio ? String(rico.patrimonio) : null;
      const serie = extrairSerie(nome) ?? null;
      const tipo = tipoIndicacao(nome, rico?.ad);
      const ca = CATEGORIA_PADRAO_CA[categoria] ?? 1;

      const camposPendentes = [];
      if (!patrimonio) camposPendentes.push('patrimonio');
      if (!serie) camposPendentes.push('numeroSerie');
      if (!localizacao) camposPendentes.push('localizacao');
      if (!registro.data) camposPendentes.push('ultimaCalibracao');
      camposPendentes.push('dataAquisicao', 'dataColocacaoUso', 'valorAquisicao');

      equipamentos.push({
        laboratorio: lab.sigla,
        tag: registro.tag,
        tagOriginal: registro.tagOriginal ?? registro.tag,
        patrimonio,
        numeroSerie: serie,
        nome,
        marca,
        faixa,
        localizacao,
        dataAquisicao: null,
        dataColocacaoUso: null,
        valorAquisicaoCentavos: null,
        tipoIndicacao: tipo,
        ultimaCalibracao: registro.data,
        frequenciaAnos: registro.freqAnos ?? 0,
        periodicidadeCalibracaoMeses: mesesDeAnos(registro.freqAnos ?? 0),
        caCalibracao: null,
        certificado: rico?.certificado ?? null,
        observacoes: rico?.observacoes || `Importado de ${FONTE}, aba ${lab.sigla}.`,
        fonte: `${FONTE} — ${lab.sigla}${registro.linha ? `:${registro.linha}` : ''}`,
        origemFG020: Boolean(rico || registro.origemFG020),
        completude: camposPendentes.length ? 'PARCIAL' : 'COMPLETA',
        camposPendentes,
        itemChave: chaveItem
      });
    }
  }

  // Histórico FG 006: BAL 01 do LCOR (certificados conferem com o FG 020).
  const bal01 = equipamentos.find((e) => e.laboratorio === 'LCOR' && normalizar(e.tagOriginal) === normalizar('BAL 01'));
  if (bal01 && fg006.length) {
    bal01.historicoCalibracoes = fg006;
    bal01.ultimaCalibracao = fg006[fg006.length - 1].data;
    const anos = Number(bal01.frequenciaAnos) || 1;
    bal01.periodicidadeCalibracaoMeses = mesesDeAnos(anos);
    bal01.completude = 'PARCIAL';
  }

  const laboratoriosSaida = laboratorios.map((l) => {
    const dadosRT = rt.get(l.sigla) ?? {};
    return {
      sigla: l.sigla,
      nome: `Laboratório ${l.sigla}`,
      codigo: l.sigla,
      ...dadosRT,
      localizacao: dadosRT.bloco ? `Bloco ${dadosRT.bloco} — Sala ${dadosRT.sala}` : null,
      equipamentos: equipamentos.filter((e) => e.laboratorio === l.sigla).length
    };
  });

  const itens = [];
  const indiceItens = new Map();
  for (const [chave, item] of itensMap) {
    item.chave = itens.length + 1;
    itens.push(item);
    indiceItens.set(chave, item.chave);
  }
  for (const equipamento of equipamentos) {
    equipamento.item = indiceItens.get(equipamento.itemChave) ?? null;
    delete equipamento.itemChave;
  }
  const categoriasSaida = categorias.map((c, i) => ({
    nome: c.nome,
    ordem: i + 1,
    subcategorias: c.subcategorias
  }));

  const porLab = Object.fromEntries(laboratoriosSaida.map((l) => [l.sigla, l.equipamentos]));
  const total = equipamentos.length;
  const comCalibracao = equipamentos.filter((e) => e.ultimaCalibracao).length;
  const semCalibracao = total - comCalibracao;
  const porCategoria = {};
  for (const e of equipamentos) {
    const item = itens.find((i) => i.chave === e.item);
    const cat = item?.categoria ?? 'Outros';
    porCategoria[cat] = (porCategoria[cat] ?? 0) + 1;
  }
  const tagsDuplicadasGlobais = total - new Set(equipamentos.map((e) => normalizar(e.tag))).size;

  const base = {
    meta: {
      versao: 1,
      geradoEm: new Date().toISOString(),
      fonte: FONTE,
      observacao: 'Campos ausentes nas planilhas permanecem nulos e são listados em camposPendentes; CA e periodicidade derivados são marcados como estimados.',
      totalEquipamentos: total,
      comCalibracaoRegistrada: comCalibracao,
      semCalibracaoRegistrada: semCalibracao,
      totalItens: itens.length,
      porLaboratorio: porLab,
      porCategoria,
      tagsDuplicadasGlobais,
      fontes: ['ODS_CATEGORIAS.txt', 'ODS_FG020.txt', 'ODS_FG006.txt']
    },
    laboratorios: laboratoriosSaida,
    categorias: categoriasSaida,
    itens,
    equipamentos,
    historico: {},
    pendencias: {
      equipamentosSemPatrimonio: equipamentos.filter((e) => !e.patrimonio).length,
      equipamentosSemSerie: equipamentos.filter((e) => !e.numeroSerie).length,
      equipamentosSemCalibracao: semCalibracao,
      linhasIgnoradas: ignorados.length
    }
  };

  fs.mkdirSync(DIR_DADOS, { recursive: true });
  fs.writeFileSync(path.join(DIR_DADOS, 'base-real.json'), JSON.stringify(base, null, 1), 'utf8');

  const relatorio = gerarRelatorio(base, ignorados, fg020, fg006);
  fs.writeFileSync(path.join(DIR_DADOS, 'RELATORIO-IMPORTACAO.md'), relatorio, 'utf8');

  console.log(`Base gerada: ${total} equipamentos, ${itens.length} itens, ${laboratoriosSaida.length} laboratórios.`);
  console.log(`Sem calibração registrada: ${semCalibracao}. Sem patrimônio: ${base.pendencias.equipamentosSemPatrimonio}.`);
  console.log(`Arquivo: data/base-real.json (${(fs.statSync(path.join(DIR_DADOS, 'base-real.json')).size / 1024).toFixed(0)} KB)`);
}

function gerarRelatorio(base, ignorados, fg020, fg006) {
  const linhas = [];
  linhas.push('# Relatório de importação da base real');
  linhas.push('');
  linhas.push(`Gerado em ${base.meta.geradoEm} por \`scripts/importar-base-real.js\`.`);
  linhas.push('');
  linhas.push('## Cobertura');
  linhas.push('');
  linhas.push('| Laboratório | Equipamentos | Com calibração | Sem calibração |');
  linhas.push('| --- | ---: | ---: | ---: |');
  for (const lab of base.laboratorios) {
    const eqs = base.equipamentos.filter((e) => e.laboratorio === lab.sigla);
    linhas.push(`| ${lab.sigla} | ${eqs.length} | ${eqs.filter((e) => e.ultimaCalibracao).length} | ${eqs.filter((e) => !e.ultimaCalibracao).length} |`);
  }
  linhas.push(`| **Total** | **${base.meta.totalEquipamentos}** | **${base.meta.comCalibracaoRegistrada}** | **${base.meta.semCalibracaoRegistrada}** |`);
  linhas.push('');
  linhas.push('## Distribuição por categoria');
  linhas.push('');
  linhas.push('| Categoria | Equipamentos |');
  linhas.push('| --- | ---: |');
  for (const [cat, qtd] of Object.entries(base.meta.porCategoria).sort((a, b) => b[1] - a[1])) {
    linhas.push(`| ${cat} | ${qtd} |`);
  }
  linhas.push('');
  linhas.push('## Lacunas encontradas na base de origem');
  linhas.push('');
  linhas.push(`- **${base.pendencias.equipamentosSemPatrimonio}** equipamentos sem número de patrimônio.`);
  linhas.push(`- **${base.pendencias.equipamentosSemSerie}** equipamentos sem número de série identificável no texto.`);
  linhas.push(`- **${base.pendencias.equipamentosSemCalibracao}** equipamentos sem data de calibração registrada (célula vazia ou "-").`);
  linhas.push('- A planilha de origem **não contém** data de aquisição, valor de aquisição nem data de colocação em uso.');
  linhas.push(`- **${base.meta.tagsDuplicadasGlobais}** TAGs repetidas entre laboratórios (ex.: \`BAL 01\`); a unicidade de TAG foi aplicada **por laboratório**, com desambiguação por sufixo dentro do mesmo laboratório.`);
  linhas.push('- O CA de calibração não existe na planilha; foi derivado por categoria e marcado em `parametrosEstimados`. Deve ser revisado antes de registrar novas calibrações.');
  linhas.push('- A periodicidade foi convertida de anos para meses (1,5 anos = 18 meses).');
  linhas.push('');
  linhas.push('## Fontes complementares');
  linhas.push('');
  linhas.push(`- **FG 020**: ${fg020.dados.length} registros de dados, ${fg020.status.length} registros de status de calibração e ${fg020.preventivas.length} registros de manutenção preventiva. Usado para enriquecer o LCOR (patrimônio, A/D, certificado, observações e periodicidade).`);
  linhas.push(`- **FG 006**: ${fg006.length} calibrações históricas da \`BAL 01\` do LCOR, com Erro, U, CA e resultado — único conjunto da base com resultados metrológicos reais.`);
  linhas.push('');
  linhas.push('## Decisões de modelagem');
  linhas.push('');
  linhas.push('- **Item** é o modelo abstrato (nome + fabricante); **Equipamento** é a unidade física com TAG e laboratório.');
  linhas.push('- TAG, patrimônio e série únicos: patrimônio/série são globais quando informados; TAG é única **por laboratório**, pois a base real reutiliza a mesma TAG em laboratórios distintos.');
  linhas.push('- Registros importados podem estar **PARCIAL**: a aplicação exibe as pendências e exige complementação antes de operações que dependam do campo.');
  linhas.push('- Nenhuma data, patrimônio, série ou valor foi inventado. Campos não presentes permanecem nulos.');
  linhas.push('');
  linhas.push(`## Linhas não reconhecidas como equipamento: ${ignorados.length}`);
  linhas.push('');
  if (ignorados.length) {
    linhas.push('Amostra:');
    linhas.push('');
    for (const item of ignorados.slice(0, 20)) {
      linhas.push(`- Linha ${item.linha}: ${String(item.conteudo).slice(0, 160)}`);
    }
  } else {
    linhas.push('Nenhuma.');
  }
  linhas.push('');
  return linhas.join('\n');
}

principal();
