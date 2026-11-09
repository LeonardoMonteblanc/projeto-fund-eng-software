/**
 * API pública de relatórios: construtores e exportadores.
 */
import { ErroApp, CODIGOS_ERRO } from '../../shared/errors.js';
import { hojeISO, normalizar } from '../../shared/utils.js';
import { gerarCSV } from './csv.js';
import { gerarXLSX } from './xlsx.js';
import { gerarPDF } from './pdf.js';

export * from './model.js';
export * from './builders.js';
export { gerarCSV } from './csv.js';
export { gerarXLSX } from './xlsx.js';
export { gerarPDF } from './pdf.js';
export { formatarCelula } from '../../shared/format.js';

const SLUG = (texto) => normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'relatorio';

export function exportarTabela(tabela, formato = 'pdf', hoje = hojeISO()) {
  const f = String(formato).toLowerCase();
  const base = `${tabela.id ?? 'relatorio'}-${SLUG(tabela.titulo ?? 'relatorio')}-${String(hoje).replace(/-/g, '')}`;
  if (f === 'csv') {
    return { nomeArquivo: `${base}.csv`, mime: 'text/csv;charset=utf-8', bytes: gerarCSV(tabela) };
  }
  if (f === 'xlsx' || f === 'excel') {
    return { nomeArquivo: `${base}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: gerarXLSX(tabela) };
  }
  if (f === 'pdf') {
    return { nomeArquivo: `${base}.pdf`, mime: 'application/pdf', bytes: gerarPDF(tabela) };
  }
  throw new ErroApp(CODIGOS_ERRO.VALIDACAO, 'Formato de exportação inválido. Use PDF, XLSX ou CSV.');
}
