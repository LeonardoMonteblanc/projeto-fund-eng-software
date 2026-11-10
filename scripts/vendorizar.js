/**
 * Gera os bundles ESM de terceiros usados pela interface.
 *
 * O site e publicado sem etapa de build: o navegador carrega modulos nativos
 * diretamente. Para que uma biblioteca de terceiros funcione nesse modelo, o
 * codigo e empacotado aqui em um unico arquivo ESM, versionado no repositorio.
 *
 * As fontes sao apenas copiadas: os arquivos woff2 do pacote @fontsource ficam
 * em `src/frontend/assets/fontes/`, referenciados por `@font-face` no CSS.
 *
 * Uso: npm run vendorizar
 */

import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = resolve(RAIZ, 'src/frontend/assets/vendor');
const DESTINO_FONTES = resolve(RAIZ, 'src/frontend/assets/fontes');

async function versaoDoPacote(pacote) {
  const bruto = await readFile(resolve(RAIZ, 'node_modules', pacote, 'package.json'), 'utf8');
  return JSON.parse(bruto).version;
}

const PACOTES = [
  {
    nome: 'chart.esm.js',
    entrada: 'scripts/vendor/chart-entrada.js',
    pacote: 'chart.js',
    licenca: 'MIT — https://github.com/chartjs/Chart.js/blob/master/LICENSE.md'
  },
  {
    nome: 'gsap.esm.js',
    entrada: 'scripts/vendor/gsap-entrada.js',
    pacote: 'gsap',
    licenca: 'GreenSock Standard License (gratuito) — https://gsap.com/standard-license'
  }
];

/** Fontes IBM Plex Sans em subconjunto latino, nos pesos usados pela interface. */
const PESOS_FONTE = [300, 400, 500, 600];

await mkdir(DESTINO, { recursive: true });
await mkdir(DESTINO_FONTES, { recursive: true });

const linhas = ['# Bibliotecas de terceiros empacotadas', '',
  'Arquivos gerados por `npm run vendorizar`. O codigo-fonte permanece nos pacotes npm.', '',
  '| Arquivo | Pacote | Versao | Licenca |', '| --- | --- | --- | --- |'];

for (const pacote of PACOTES) {
  const versao = await versaoDoPacote(pacote.pacote ?? pacote.entrada);
  const resultado = await build({
    entryPoints: [resolve(RAIZ, pacote.entrada)],
    bundle: true,
    format: 'esm',
    minify: true,
    legalComments: 'none',
    target: ['es2022'],
    outfile: resolve(DESTINO, pacote.nome),
    banner: {
      js: `/* ${pacote.nome} — ${pacote.pacote ?? pacote.entrada} v${versao} | Licenca: ${pacote.licenca} | Gerado por npm run vendorizar. Nao editar a mao. */`
    },
    metafile: true
  });
  const bytes = Object.values(resultado.metafile.outputs)[0].bytes;
  console.log(`${pacote.nome}  ${(bytes / 1024).toFixed(1)} KB  (${pacote.pacote ?? pacote.entrada} v${versao})`);
  linhas.push(`| \`${pacote.nome}\` | \`${pacote.pacote ?? pacote.entrada}\` | ${versao} | ${pacote.licenca} |`);
}

const versaoFonte = await versaoDoPacote('@fontsource/ibm-plex-sans');
const arquivosFonte = [];
for (const peso of PESOS_FONTE) {
  const nome = `ibm-plex-sans-latin-${peso}-normal.woff2`;
  await copyFile(
    resolve(RAIZ, 'node_modules', '@fontsource', 'ibm-plex-sans', 'files', nome),
    resolve(DESTINO_FONTES, nome)
  );
  arquivosFonte.push(nome);
}
await copyFile(
  resolve(RAIZ, 'node_modules', '@fontsource', 'ibm-plex-sans', 'LICENSE'),
  resolve(DESTINO_FONTES, 'LICENSE-IBM-PLEX-SANS.txt')
);
console.log(`fontes  ${arquivosFonte.length} arquivo(s)  (@fontsource/ibm-plex-sans v${versaoFonte})`);

linhas.push('');
linhas.push('## Fontes');
linhas.push('');
linhas.push(`IBM Plex Sans ${versaoFonte} (SIL Open Font License 1.1), subconjunto latino, pesos ${PESOS_FONTE.join(', ')}.`);
linhas.push('Copiadas de `node_modules/@fontsource/ibm-plex-sans/files/` para `src/frontend/assets/fontes/`.');

await writeFile(resolve(DESTINO, 'LICENCAS.md'), `${linhas.join('\n')}\n`, 'utf8');
