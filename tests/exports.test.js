import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarCSV, gerarPDF, gerarXLSX, exportarTabela, formatarCelula } from '../src/backend/reports/index.js';
import { criarZip, crc32 } from '../src/shared/utils.js';

const tabela = {
  id: 'teste',
  titulo: 'Relatório de Teste',
  subtitulo: 'Período: 01/01/2026 a 08/11/2026',
  geradoEm: '2026-11-08T12:00:00.000Z',
  colunas: [
    { chave: 'tag', rotulo: 'TAG', tipo: 'texto', largura: 1 },
    { chave: 'data', rotulo: 'Data', tipo: 'data', largura: 1 },
    { chave: 'erro', rotulo: 'Erro', tipo: 'numero', largura: 1 },
    { chave: 'custo', rotulo: 'Custo', tipo: 'moeda', largura: 1 }
  ],
  linhas: [
    { tag: 'FIT 01', data: '2026-11-01', erro: 0.123456, custo: 45000 },
    { tag: 'SEM 02; "especial"', data: '2026-11-02', erro: -0.5, custo: 120000 }
  ],
  resumo: [{ rotulo: 'Total', valor: '2' }]
};

test('CSV: BOM, separador ponto e vírgula, CRLF e escape de aspas', () => {
  const bytes = gerarCSV(tabela);
  const texto = Buffer.from(bytes).toString('utf8');
  assert.equal(bytes[0], 0xef);
  assert.equal(bytes[1], 0xbb);
  assert.equal(bytes[2], 0xbf);
  assert.ok(texto.includes('TAG;Data;Erro;Custo'));
  assert.ok(texto.includes('\r\n'));
  assert.ok(texto.includes('FIT 01;01/11/2026;0,123456;R$ 450,00'));
  assert.ok(texto.includes('"SEM 02; ""especial"""'));
});

test('XLSX: arquivo ZIP com partes OOXML obrigatórias', () => {
  const bytes = gerarXLSX(tabela);
  const buf = Buffer.from(bytes);
  assert.equal(buf.subarray(0, 2).toString(), 'PK');
  const texto = buf.toString('latin1');
  for (const parte of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']) {
    assert.ok(texto.includes(parte), `faltou ${parte}`);
  }
  assert.ok(texto.includes('FIT 01'));
  assert.ok(texto.includes('45'));
});

test('PDF: estrutura, páginas e streams de conteúdo', () => {
  const bytes = gerarPDF({ ...tabela, linhas: Array.from({ length: 120 }, (_, i) => ({ tag: `EQ ${i}`, data: '2026-11-01', erro: i / 100, custo: i * 1000 })) });
  const buf = Buffer.from(bytes);
  const texto = buf.toString('latin1');
  assert.equal(texto.slice(0, 8), '%PDF-1.4');
  assert.ok(texto.trimEnd().endsWith('%%EOF'));
  assert.ok(texto.includes('/Type /Catalog'));
  assert.ok(texto.includes('/Helvetica'));
  const paginas = Number(/\/Count (\d+)/.exec(texto)?.[1]);
  assert.ok(paginas >= 2);
  assert.ok((texto.match(/stream\n/g) ?? []).length >= paginas);
  assert.ok(texto.includes('Página 1 de'));
});

test('exportarTabela escolhe formato e rejeita formato inválido', () => {
  const pdf = exportarTabela(tabela, 'pdf');
  assert.ok(pdf.nomeArquivo.endsWith('.pdf'));
  assert.equal(pdf.mime, 'application/pdf');
  const xlsx = exportarTabela(tabela, 'xlsx');
  assert.equal(xlsx.mime, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const csv = exportarTabela(tabela, 'csv');
  assert.ok(csv.mime.startsWith('text/csv'));
  assert.throws(() => exportarTabela(tabela, 'docx'), (e) => e.codigo === 'VALIDACAO');
});

test('Formatadores de célula: data, moeda, número, percentual e nulo', () => {
  assert.equal(formatarCelula('2026-11-08', 'data'), '08/11/2026');
  assert.equal(formatarCelula(123456, 'moeda').replace(/\u00a0/g, ' '), 'R$ 1.234,56');
  assert.equal(formatarCelula(0.5, 'percentual'), '50%');
  assert.equal(formatarCelula(null, 'texto'), '—');
  assert.equal(formatarCelula('', 'numero'), '—');
});

test('CRC32 e ZIP são determinísticos para os mesmos bytes', () => {
  const dados = new TextEncoder().encode('LabUcs');
  assert.equal(crc32(dados), crc32(dados));
  const zip1 = criarZip([{ nome: 'a.txt', conteudo: 'x' }]);
  const zip2 = criarZip([{ nome: 'a.txt', conteudo: 'x' }]);
  assert.deepEqual(Array.from(zip1), Array.from(zip2));
});
