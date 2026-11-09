/** Utilidades puras: datas (UTC), dinheiro (centavos), texto, paginação e ZIP/CRC32. */

const MS_DIA = 86400000;

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

/** Converte 'YYYY-MM-DD' em Date UTC à meia-noite. Retorna null se inválida. */
export function parseISO(iso) {
  if (typeof iso !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return d;
}

export function isoValida(iso) {
  return parseISO(iso) !== null;
}

export function toISO(d) {
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function hojeISO(clock = () => new Date()) {
  const agora = clock();
  return toISO(new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())));
}

export function agoraISO(clock = () => new Date()) {
  return clock().toISOString();
}

/** Soma meses com ajuste de fim de mês (31/01 + 1 mês = 28/02). */
export function somarMeses(iso, meses) {
  const base = parseISO(iso);
  if (!base || !Number.isInteger(meses)) return null;
  const alvo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(base.getUTCDate(), ultimoDia));
  return toISO(alvo);
}

/** Diferença em dias corridos (b - a). */
export function diferencaDias(a, b) {
  const da = parseISO(a);
  const db = parseISO(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / MS_DIA);
}

export function adicionarDias(iso, dias) {
  const d = parseISO(iso);
  if (!d) return null;
  return toISO(new Date(d.getTime() + dias * MS_DIA));
}

export function inicioDoMes(iso) {
  const d = parseISO(iso);
  return d ? toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))) : null;
}

export function fimDoMes(iso) {
  const d = parseISO(iso);
  return d ? toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))) : null;
}

export function chaveMes(iso) {
  return iso ? iso.slice(0, 7) : null;
}

export function formatarDataBR(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function formatarDataHoraBR(isoCompleto) {
  if (!isoCompleto) return '—';
  const d = new Date(isoCompleto);
  if (Number.isNaN(d.getTime())) return '—';
  const fmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Sao_Paulo' });
  return fmt.format(d).replace(',', '');
}

export function nomeMes(numeroMes) {
  return ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][numeroMes - 1] ?? '';
}

/** Período padrão de relatórios: últimos 12 meses até hoje. */
export function periodoPadrao(hoje) {
  const inicio = new Date(Date.parse(`${hoje}T00:00:00Z`));
  inicio.setUTCMonth(inicio.getUTCMonth() - 11);
  inicio.setUTCDate(1);
  return { de: toISO(inicio), ate: hoje };
}

/* ------------------------------------------------------------------ */
/* Números e dinheiro                                                  */
/* ------------------------------------------------------------------ */

export function arredondar(valor, casas = 6) {
  const fator = 10 ** casas;
  return Math.round((Number(valor) + Number.EPSILON) * fator) / fator;
}

export function numeroValido(v) {
  return typeof v === 'number' ? Number.isFinite(v) : v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));
}

/** Aceita número (reais) ou texto pt-BR ('1.234,56' / 'R$ 1.234,56'). */
export function paraCentavos(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    return Math.round(valor * 100);
  }
  let s = String(valor).trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '') return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function centavosParaNumero(centavos) {
  return arredondar((Number(centavos) || 0) / 100, 2);
}

export function formatarBRL(centavos) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(centavos) || 0) / 100);
}

export function formatarNumero(valor, casas = 3) {
  if (valor === null || valor === undefined || valor === '') return '—';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas }).format(Number(valor));
}

export function formatarPercentual(valor, casas = 1) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return '—';
  return `${formatarNumero(Number(valor) * 100, casas)}%`;
}

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function contem(texto, busca) {
  return normalizar(texto).includes(normalizar(busca));
}

export function ordenarPor(lista, chave, direcao = 'asc') {
  const sinal = direcao === 'desc' ? -1 : 1;
  return [...lista].sort((a, b) => {
    const va = a?.[chave];
    const vb = b?.[chave];
    if (va === vb) return 0;
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sinal;
    return String(va).localeCompare(String(vb), 'pt-BR') * sinal;
  });
}

export function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncar(texto, limite) {
  const s = String(texto ?? '');
  return s.length > limite ? `${s.slice(0, Math.max(0, limite - 1))}…` : s;
}

export function iniciais(nome) {
  return String(nome ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/* ------------------------------------------------------------------ */
/* Coleções                                                            */
/* ------------------------------------------------------------------ */

export function clonar(valor) {
  if (typeof structuredClone === 'function') return structuredClone(valor);
  return JSON.parse(JSON.stringify(valor));
}

export function paginar(itens, pagina = 1, tamanho = 25) {
  const total = itens.length;
  const tam = Math.max(1, Math.min(200, Number(tamanho) || 25));
  const pag = Math.max(1, Math.min(Number(pagina) || 1, Math.max(1, Math.ceil(total / tam))));
  return {
    itens: itens.slice((pag - 1) * tam, pag * tam),
    total,
    pagina: pag,
    tamanho: tam,
    totalPaginas: Math.max(1, Math.ceil(total / tam))
  };
}

export function somar(itens, seletor = (x) => x) {
  return itens.reduce((acc, item) => acc + (Number(seletor(item)) || 0), 0);
}

export function agruparPor(itens, seletor) {
  const mapa = new Map();
  for (const item of itens) {
    const chave = seletor(item);
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(item);
  }
  return mapa;
}

export function unicos(itens) {
  return [...new Set(itens)];
}

/* ------------------------------------------------------------------ */
/* ZIP (sem compressão) e CRC32 — usado na geração de XLSX sem dependências */
/* ------------------------------------------------------------------ */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Cria um ZIP (método store) com os arquivos informados.
 * @param {{nome: string, conteudo: string|Uint8Array}[]} arquivos
 * @returns {Uint8Array}
 */
export function criarZip(arquivos) {
  const locais = [];
  const centrais = [];
  let offset = 0;
  const dataHora = 0x00210000; // 01/01/1980 00:00:00 (DOS)

  for (const arquivo of arquivos) {
    const nome = encoder.encode(arquivo.nome);
    const dados = typeof arquivo.conteudo === 'string' ? encoder.encode(arquivo.conteudo) : new Uint8Array(arquivo.conteudo);
    const crc = crc32(dados);

    const local = new Uint8Array(30 + nome.length + dados.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dataHora & 0xffff, true);
    lv.setUint16(12, (dataHora >>> 16) & 0xffff, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dados.length, true);
    lv.setUint32(22, dados.length, true);
    lv.setUint16(26, nome.length, true);
    lv.setUint16(28, 0, true);
    local.set(nome, 30);
    local.set(dados, 30 + nome.length);
    locais.push(local);

    const central = new Uint8Array(46 + nome.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dataHora & 0xffff, true);
    cv.setUint16(14, (dataHora >>> 16) & 0xffff, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dados.length, true);
    cv.setUint32(24, dados.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nome, 46);
    centrais.push(central);

    offset += local.length;
  }

  const tamanhoCentral = centrais.reduce((acc, c) => acc + c.length, 0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(4, 0, true);
  fv.setUint16(6, 0, true);
  fv.setUint16(8, arquivos.length, true);
  fv.setUint16(10, arquivos.length, true);
  fv.setUint32(12, tamanhoCentral, true);
  fv.setUint32(16, offset, true);
  fv.setUint16(20, 0, true);

  const saida = new Uint8Array(offset + tamanhoCentral + fim.length);
  let p = 0;
  for (const l of locais) { saida.set(l, p); p += l.length; }
  for (const c of centrais) { saida.set(c, p); p += c.length; }
  saida.set(fim, p);
  return saida;
}

export function decodificar(bytes) {
  return decoder.decode(bytes);
}

export { MS_DIA };
