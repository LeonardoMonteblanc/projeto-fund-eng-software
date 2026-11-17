/**
 * Utilidades de exportação CSV/XLSX (RNF14).
 */

export function baixarCSV(nomeArquivo: string, linhas: Array<Record<string, string | number | null | undefined>>): void {
  if (linhas.length === 0) return;
  const cabecalhos = Object.keys(linhas[0]);
  const escapar = (valor: string | number | null | undefined): string => {
    const texto = String(valor ?? '');
    if (/[";\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
    return texto;
  };
  const conteudo = [
    cabecalhos.map(escapar).join(';'),
    ...linhas.map((linha) => cabecalhos.map((c) => escapar(linha[c])).join(';')),
  ].join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + conteudo], { type: 'text/csv;charset=utf-8;' });
  dispararDownload(blob, nomeArquivo);
}

export async function baixarXLSX(nomeArquivo: string, linhas: Array<Record<string, string | number | null | undefined>>, nomeAba = 'Dados'): Promise<void> {
  if (linhas.length === 0) return;
  const { utils, writeFile } = await import('xlsx');
  const planilha = utils.json_to_sheet(linhas.map((linha) => {
    const resultado: Record<string, string | number> = {};
    for (const [chave, valor] of Object.entries(linha)) resultado[chave] = valor === null || valor === undefined ? '' : String(valor);
    return resultado;
  }));
  const pasta = utils.book_new();
  utils.book_append_sheet(pasta, planilha, nomeAba);
  writeFile(pasta, nomeArquivo);
}

export async function baixarPDF(nomeArquivo: string, titulo: string, subtitulo: string, linhas: Array<Record<string, string | number | null | undefined>>): Promise<void> {
  if (linhas.length === 0) return;
  const cabecalhos = Object.keys(linhas[0]);
  const janela = window.open('', '_blank', 'width=1100,height=800');
  if (!janela) return;
  const linhasHTML = linhas.map((linha) => `<tr>${cabecalhos.map((c) => `<td>${String(linha[c] ?? '')}</td>`).join('')}</tr>`).join('');
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title>
<style>
body { font-family: 'Segoe UI', Roboto, sans-serif; margin: 24px; color: #222; }
h1 { font-size: 16px; margin: 0 0 4px; }
p.sub { font-size: 10px; color: #666; margin: 0 0 16px; }
table { border-collapse: collapse; width: 100%; font-size: 9px; }
th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; }
th { background: #eee; }
</style></head><body>
<h1>${titulo}</h1><p class="sub">${subtitulo}</p>
<table><thead><tr>${cabecalhos.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${linhasHTML}</tbody></table>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`);
  janela.document.close();
}

function dispararDownload(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
