/**
 * Exportação CSV compatível com Excel pt-BR (BOM, ponto e vírgula, CRLF).
 */
import { formatarCelula } from '../../shared/format.js';

function csvCampo(valor) {
  const s = String(valor ?? '');
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function gerarCSV(tabela) {
  const cabecalho = tabela.colunas.map((c) => csvCampo(c.rotulo)).join(';');
  const linhas = tabela.linhas.map((linha) => tabela.colunas
    .map((c) => csvCampo(formatarCelula(linha[c.chave], c.tipo)))
    .join(';'));
  const conteudo = `\uFEFF${[cabecalho, ...linhas].join('\r\n')}\r\n`;
  return new TextEncoder().encode(conteudo);
}

/* ------------------------------------------------------------------ */
/* XLSX minimalista (OOXML, sem dependências)                          */
/* ------------------------------------------------------------------ */
