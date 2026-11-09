/**
 * Exportação PDF A4 paisagem, com tabela paginada e acentuação WinAnsi.
 */
import { formatarCelula } from '../../shared/format.js';

const WIN_ANSI = {
  'á': 0xe1, 'à': 0xe0, 'â': 0xe2, 'ã': 0xe3, 'ä': 0xe4, 'é': 0xe9, 'è': 0xe8, 'ê': 0xea,
  'í': 0xed, 'ì': 0xec, 'î': 0xee, 'ó': 0xf3, 'ò': 0xf2, 'ô': 0xf4, 'õ': 0xf5, 'ö': 0xf6,
  'ú': 0xfa, 'ù': 0xf9, 'û': 0xfb, 'ü': 0xfc, 'ç': 0xe7, 'ñ': 0xf1,
  'Á': 0xc1, 'À': 0xc0, 'Â': 0xc2, 'Ã': 0xc3, 'Ä': 0xc4, 'É': 0xc9, 'È': 0xc8, 'Ê': 0xca,
  'Í': 0xcd, 'Ì': 0xcc, 'Î': 0xce, 'Ó': 0xd3, 'Ò': 0xd2, 'Ô': 0xd4, 'Õ': 0xd5, 'Ö': 0xd6,
  'Ú': 0xda, 'Ù': 0xd9, 'Û': 0xdb, 'Ü': 0xdc, 'Ç': 0xc7, 'Ñ': 0xd1,
  'º': 0xba, 'ª': 0xaa, '–': 0x96, '—': 0x97, '“': 0x93, '”': 0x94, '’': 0x92, '…': 0x85
};

function pdfEscapar(texto) {
  return String(texto ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ');
}

/** Converte para bytes WinAnsi (string latin1). */
function pdfBytesWinAnsi(texto) {
  let saida = '';
  for (const ch of String(texto ?? '')) {
    if (WIN_ANSI[ch] !== undefined) saida += String.fromCharCode(WIN_ANSI[ch]);
    else if (ch.charCodeAt(0) < 256) saida += ch;
    else saida += '?';
  }
  return saida;
}

function larguraTexto(texto, tamanho) {
  return String(texto ?? '').length * tamanho * 0.5;
}

function truncarTexto(texto, largura, tamanho) {
  const max = Math.max(1, Math.floor(largura / (tamanho * 0.5)) - 1);
  const s = String(texto ?? '');
  return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
}

function textoPdf(x, y, texto, { tamanho = 7, negrito = false, cinza = 0 } = {}) {
  const fonte = negrito ? 'F2' : 'F1';
  const cor = cinza ? `${cinza} ${cinza} ${cinza} rg` : '0 0 0 rg';
  return `BT ${cor} /${fonte} ${tamanho} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscapar(pdfBytesWinAnsi(texto))}) Tj ET`;
}

export function gerarPDF(tabela) {
  const L = 842;
  const A = 595;
  const margem = 28;
  const larguraUtil = L - margem * 2;
  const pesos = tabela.colunas.map((c) => Number(c.largura) || 1);
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const larguras = pesos.map((p) => (p / somaPesos) * larguraUtil);
  const alturaCabecalho = 15;
  const alturaLinha = 12;
  const inicioY = A - 118;
  const fimY = 48;

  const paginas = [];
  let atual = [];
  let y = inicioY;

  const cabecalhoTabela = () => {
    let x = margem;
    let conteudo = `0.376 0.298 0.533 rg ${margem} ${(y - 3).toFixed(2)} ${larguraUtil.toFixed(2)} ${alturaCabecalho} re f`;
    for (let i = 0; i < tabela.colunas.length; i += 1) {
      const col = tabela.colunas[i];
      conteudo += `\n${textoPdf(x + 2, y + 1, truncarTexto(col.rotulo, larguras[i], 7), { tamanho: 7, negrito: true, cinza: 0 })}`;
      x += larguras[i];
    }
    atual.push(conteudo);
    y -= alturaCabecalho;
  };

  const novaPagina = () => {
    if (atual.length) paginas.push(atual);
    atual = [];
    y = A - 56;
    cabecalhoTabela();
  };

  // Primeira página: cabeçalho do relatório
  atual.push(textoPdf(margem, A - 40, 'LabUcs — Sistema de Gestão de Equipamentos Laboratoriais', { tamanho: 8, negrito: true, cinza: 0.35 }));
  atual.push(textoPdf(margem, A - 62, truncarTexto(tabela.titulo, larguraUtil, 16), { tamanho: 16, negrito: true }));
  atual.push(textoPdf(margem, A - 80, truncarTexto(tabela.subtitulo, larguraUtil, 8), { tamanho: 8, cinza: 0.35 }));
  atual.push(`0.376 0.298 0.533 RG 1 w ${margem} ${A - 90} m ${L - margem} ${A - 90} l S`);
  atual.push(textoPdf(margem, A - 104, `Gerado em ${tabela.geradoEm} • POC sem valor legal • Documento de demonstração`, { tamanho: 7, cinza: 0.45 }));
  y = inicioY;
  cabecalhoTabela();

  tabela.linhas.forEach((linha, indice) => {
    if (y < fimY) novaPagina();
    if (indice % 2 === 0) {
      atual.push(`0.965 0.957 0.984 rg ${margem} ${(y - 3).toFixed(2)} ${larguraUtil.toFixed(2)} ${alturaLinha} re f`);
    }
    let x = margem;
    for (let i = 0; i < tabela.colunas.length; i += 1) {
      const col = tabela.colunas[i];
      const valor = formatarCelula(linha[col.chave], col.tipo);
      atual.push(textoPdf(x + 2, y + 1, truncarTexto(valor, larguras[i] - 2, 7), { tamanho: 7 }));
      x += larguras[i];
    }
    atual.push(`0.90 0.88 0.93 RG 0.3 w ${margem} ${(y - 3).toFixed(2)} m ${L - margem} ${(y - 3).toFixed(2)} l S`);
    y -= alturaLinha;
  });

  if (!tabela.linhas.length) {
    atual.push(textoPdf(margem + 2, y, 'Nenhum registro encontrado para os filtros informados.', { tamanho: 9, cinza: 0.4 }));
  }

  if (y > fimY - 30 && tabela.resumo?.length) {
    y -= 16;
    atual.push(textoPdf(margem, y, 'Resumo', { tamanho: 9, negrito: true }));
    y -= 12;
    for (const item of tabela.resumo) {
      if (y < fimY) break;
      atual.push(textoPdf(margem + 2, y, `${item.rotulo}: ${item.valor}`, { tamanho: 7.5, cinza: 0.2 }));
      y -= 11;
    }
  }

  paginas.push(atual);

  // Rodapé com numeração em todas as páginas
  const totalPaginas = paginas.length;
  paginas.forEach((conteudo, indice) => {
    conteudo.push(`0.75 0.72 0.80 RG 0.4 w ${margem} 38 m ${L - margem} 38 l S`);
    conteudo.push(textoPdf(margem, 28, `LabUcs — POC • ${tabela.titulo}`, { tamanho: 7, cinza: 0.45 }));
    const rodape = `Página ${indice + 1} de ${totalPaginas}`;
    conteudo.push(textoPdf(L - margem - larguraTexto(rodape, 7), 28, rodape, { tamanho: 7, cinza: 0.45 }));
  });

  // Monta objetos PDF
  const objetos = [];
  const idCatalogo = 1;
  const idPaginas = 2;
  const idFonte = 3;
  const idFonteNegrito = 4;
  objetos[idCatalogo] = `<< /Type /Catalog /Pages ${idPaginas} 0 R >>`;
  objetos[idFonte] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objetos[idFonteNegrito] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  const idsPaginas = [];
  let proximo = 5;
  for (const conteudo of paginas) {
    const idPagina = proximo;
    const idConteudo = proximo + 1;
    proximo += 2;
    const stream = conteudo.join('\n');
    objetos[idPagina] = `<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${L} ${A}] /Resources << /Font << /F1 ${idFonte} 0 R /F2 ${idFonteNegrito} 0 R >> >> /Contents ${idConteudo} 0 R >>`;
    objetos[idConteudo] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    idsPaginas.push(idPagina);
  }
  objetos[idPaginas] = `<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(' ')}] /Count ${idsPaginas.length} >>`;

  let pdf = '%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n';
  const offsets = [0];
  for (let i = 1; i < objetos.length; i += 1) {
    if (!objetos[i]) continue;
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objetos[i]}\nendobj\n`;
  }
  const inicioXref = pdf.length;
  pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objetos.length; i += 1) {
    if (!objetos[i]) { pdf += '0000000000 65535 f \n'; continue; }
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length} /Root ${idCatalogo} 0 R /Info << /Title (${pdfEscapar(pdfBytesWinAnsi(tabela.titulo))}) /Producer (LabUcs POC) >> >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

/* ------------------------------------------------------------------ */
/* Exportação                                                         */
/* ------------------------------------------------------------------ */
