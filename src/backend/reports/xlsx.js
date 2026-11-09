/**
 * Exportação XLSX (OOXML) sem dependências externas.
 */
import { criarZip } from '../../shared/utils.js';
import { formatarCelula, valorNumerico } from '../../shared/format.js';

const XML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escXml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => XML_ESC[ch]);

function colunaLetra(indice) {
  let n = indice + 1;
  let s = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    s = String.fromCharCode(65 + resto) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function planilhaXml(tabela) {
  const totalColunas = tabela.colunas.length;
  const larguras = tabela.colunas.map((c) => `<col min="${tabela.colunas.indexOf(c) + 1}" max="${tabela.colunas.indexOf(c) + 1}" width="${Math.round((c.largura ?? 2) * 14)}" customWidth="1"/>`).join('');
  const linhas = [];

  linhas.push(`<row r="1" ht="22" customHeight="1">${`<c r="A1" t="inlineStr" s="1"><is><t>${escXml(tabela.titulo)}</t></is></c>`}</row>`);
  linhas.push(`<row r="2">${`<c r="A2" t="inlineStr" s="2"><is><t>${escXml(`${tabela.subtitulo} • Gerado em ${tabela.geradoEm}`)}</t></is></c>`}</row>`);
  const celulasCabecalho = tabela.colunas.map((c, i) => `<c r="${colunaLetra(i)}3" t="inlineStr" s="3"><is><t>${escXml(c.rotulo)}</t></is></c>`).join('');
  linhas.push(`<row r="3" ht="20" customHeight="1">${celulasCabecalho}</row>`);

  tabela.linhas.forEach((linha, indice) => {
    const r = indice + 4;
    const celulas = tabela.colunas.map((c, i) => {
      const ref = `${colunaLetra(i)}${r}`;
      const numerico = valorNumerico(linha[c.chave], c.tipo);
      if (numerico !== null && Number.isFinite(numerico)) {
        const estilo = c.tipo === 'moeda' ? 4 : 5;
        return `<c r="${ref}" s="${estilo}"><v>${numerico}</v></c>`;
      }
      return `<c r="${ref}" t="inlineStr" s="2"><is><t>${escXml(formatarCelula(linha[c.chave], c.tipo))}</t></is></c>`;
    }).join('');
    linhas.push(`<row r="${r}">${celulas}</row>`);
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${colunaLetra(totalColunas - 1)}${tabela.linhas.length + 3}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${larguras}</cols>
<sheetData>${linhas.join('')}</sheetData>
<autoFilter ref="A3:${colunaLetra(totalColunas - 1)}${tabela.linhas.length + 3}"/>
<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

export function gerarXLSX(tabela) {
  const nomeAba = String(tabela.titulo).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Relatório';
  const arquivos = [
    {
      nome: '[Content_Types].xml',
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
    },
    {
      nome: '_rels/.rels',
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      nome: 'xl/workbook.xml',
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escXml(nomeAba)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
    },
    {
      nome: 'xl/_rels/workbook.xml.rels',
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      nome: 'xl/styles.xml',
      conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="4">
<font><sz val="9"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><name val="Calibri"/><color rgb="FF604C88"/></font>
<font><sz val="9"/><name val="Calibri"/></font>
<font><b/><sz val="9"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF604C88"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9D4E3"/></left><right style="thin"><color rgb="FFD9D4E3"/></right><top style="thin"><color rgb="FFD9D4E3"/></top><bottom style="thin"><color rgb="FFD9D4E3"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
</cellXfs>
</styleSheet>`
    },
    { nome: 'xl/worksheets/sheet1.xml', conteudo: planilhaXml(tabela) }
  ];
  return criarZip(arquivos);
}

/* ------------------------------------------------------------------ */
/* PDF                                                                */
/* ------------------------------------------------------------------ */
