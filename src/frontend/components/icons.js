/**
 * Ícones da interface LabUcs.
 *
 * Desenhos de traço em grade de 24px, com pontas retas e sem cantos
 * arredondados: a mesma gramática geométrica da identidade institucional
 * (bordas de 2px e cantos retos). São embutidos como SVG inline para
 * dispensar requisições extras e permitir herança de cor via `currentColor`.
 */

const TRACOS = {
  alerta: '<path d="M12 3 22 20H2Z"/><path d="M12 9.5v4.5"/><path d="M12 17.2h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>',
  ok: '<path d="M21 11.1V12a9 9 0 1 1-5.3-8.2"/><path d="M21.5 4.5 12 14l-2.8-2.8"/>',
  erro: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
  calendario: '<path d="M4 6h16v15H4Z"/><path d="M4 10.5h16"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  grafico: '<path d="M4 20h16"/><path d="M7.5 20v-6"/><path d="M12 20V8"/><path d="M16.5 20v-9"/>',
  busca: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.6-4.6"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  anterior: '<path d="M15 5l-7 7 7 7"/>',
  proximo: '<path d="M9 5l7 7-7 7"/>',
  filtro: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
  baixar: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  mais: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  fechar: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  lixeira: '<path d="M4 7h16"/><path d="M9.5 7V3.5h5V7"/><path d="M6.5 7 7.5 21h9L17.5 7"/><path d="M10.5 11v6"/><path d="M13.5 11v6"/>',
  editar: '<path d="M4 20h4L20 8l-4-4L4 16Z"/><path d="M14.5 5.5 18.5 9.5"/>',
  olho: '<path d="M2.5 12S6.5 5.5 12 5.5 21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  ajustes: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5V5"/><path d="M12 19v2.5"/><path d="M2.5 12H5"/><path d="M19 12h2.5"/><path d="M5.2 5.2 7 7"/><path d="M17 17l1.8 1.8"/><path d="M18.8 5.2 17 7"/><path d="M7 17l-1.8 1.8"/>',
  painel: '<path d="M4 4h7v7H4Z"/><path d="M13 4h7v4h-7Z"/><path d="M13 10h7v10h-7Z"/><path d="M4 13h7v7H4Z"/>',
  comando: '<path d="M3 6.5h18v11H3Z"/><path d="M7 10h.01"/><path d="M11 10h.01"/><path d="M15 10h.01"/><path d="M17 14H7"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  livro: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4Z"/><path d="M20 4h-3a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h4Z"/>',
  escudo: '<path d="M12 3 4 6v6c0 5 3.5 8.2 8 9 4.5-.8 8-4 8-9V6Z"/>',
  pasta: '<path d="M3 6h6l2 2h10v12H3Z"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  ficha: '<path d="M9 4H6v17h12V4h-3"/><path d="M9 4h6v3H9Z"/><path d="M9 11h6"/><path d="M9 15h6"/>',
  caixa: '<path d="M3 8l9-5 9 5v8l-9 5-9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'
};

const AMP = String.fromCharCode(38);

const ENTIDADES = {
  '&': `${AMP}amp;`,
  '<': `${AMP}lt;`,
  '>': `${AMP}gt;`,
  '"': `${AMP}quot;`
};

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"]/g, (caractere) => ENTIDADES[caractere]);
}

/**
 * @param {string} nome chave em TRACOS
 * @param {{classe?: string, rotulo?: string, tamanho?: 'sm'|'lg'}} opcoes
 */
export function icone(nome, { classe = '', rotulo = null, tamanho = null } = {}) {
  const traco = TRACOS[nome];
  if (!traco) return '';
  const dimensoes = tamanho ? ` ucs-icone--${tamanho}` : '';
  const acessibilidade = rotulo
    ? `role="img" aria-label="${escapar(rotulo)}"`
    : 'aria-hidden="true"';
  return `<svg class="ucs-icone${dimensoes}${classe ? ` ${classe}` : ''}" viewBox="0 0 24 24" ${acessibilidade} focusable="false">${traco}</svg>`;
}

export const NOMES_ICONE = Object.keys(TRACOS);
