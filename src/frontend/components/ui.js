/** Utilidades de interface: formatação, componentes HTML, modal, avisos e download. */

import { formatarCelula } from '../../shared/format.js';
import { formatarBRL, formatarDataBR, formatarDataHoraBR, hojeISO, normalizar, paraCentavos } from '../../shared/utils.js';

export { formatarCelula, formatarBRL, formatarDataBR, formatarDataHoraBR };

export function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const fmtData = (iso) => (iso ? formatarDataBR(iso) : '—');
export const fmtDataHora = (iso) => (iso ? formatarDataHoraBR(iso) : '—');
export const fmtMoeda = (centavos) => (centavos === null || centavos === undefined ? '—' : formatarBRL(centavos));
export const fmtNumero = (n, casas = 6) => (n === null || n === undefined || n === '' ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas }).format(Number(n)));
export const fmtPercentual = (n) => (n === null || n === undefined ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(n) * 100)}%`);

export function badge(texto, variante = 'neutro') {
  return `<span class="badge badge-${esc(variante)}">${esc(texto)}</span>`;
}

export function badgeSituacao(situacao, rotulo) {
  const mapa = { ATIVO: 'ok', INATIVO: 'cinza', EM_MANUTENCAO: 'alerta', AGENDADO: 'info', REALIZADO: 'ok', CANCELADO: 'cinza', PENDENTE: 'alerta', APROVADA: 'ok', REJEITADA: 'erro', APROVADO: 'ok', REPROVADO: 'erro' };
  return badge(rotulo ?? situacao, mapa[situacao] ?? 'neutro');
}

export function badgeSinal(sinal) {
  const variante = sinal.severidade === 'CRITICO' ? 'erro' : sinal.severidade === 'ALTO' ? 'alerta' : sinal.severidade === 'MEDIO' ? 'info' : 'neutro';
  return `<span class="chip chip-${variante}" title="${esc(sinal.detalhe ?? '')}">${esc(sinal.rotulo)}</span>`;
}

export function badgeStatusPrazo(status, rotulo, dias) {
  const mapa = { VENCIDO: 'erro', A_VENCER: 'alerta', EM_DIA: 'ok', SEM_DATA: 'cinza' };
  const sufixo = dias === null || dias === undefined ? '' : ` (${dias} d)`;
  return badge(`${rotulo ?? status}${sufixo}`, mapa[status] ?? 'neutro');
}

/* ------------------------------------------------------------------ */
/* Modal                                                              */
/* ------------------------------------------------------------------ */

let dialogo = null;

function garantirDialogo() {
  if (dialogo) return dialogo;
  dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.setAttribute('aria-modal', 'true');
  dialogo.innerHTML = '<div class="modal-caixa" id="modal-conteudo" role="document"></div>';
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) fecharModal();
  });
  document.body.appendChild(dialogo);
  return dialogo;
}

export function abrirModal(html, { largura = '640px' } = {}) {
  const d = garantirDialogo();
  const caixa = d.querySelector('#modal-conteudo');
  caixa.style.maxWidth = largura;
  caixa.innerHTML = html;
  if (!d.open) d.showModal();
  d.querySelector('[data-fechar]')?.focus();
  return caixa;
}

export function fecharModal() {
  if (dialogo?.open) dialogo.close();
  if (dialogo) dialogo.querySelector('#modal-conteudo').innerHTML = '';
}

export function confirmar({ titulo, mensagem, textoConfirmar = 'Confirmar', perigo = false }) {
  return new Promise((resolve) => {
    const caixa = abrirModal(`
      <div class="modal-cabecalho">
        <h2>${esc(titulo)}</h2>
        <button type="button" class="icone" data-fechar aria-label="Fechar">✕</button>
      </div>
      <p class="modal-texto">${mensagem}</p>
      <div class="modal-acoes">
        <button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
        <button type="button" class="btn ${perigo ? 'btn-perigo' : 'btn-primario'}" id="confirmar-acao">${esc(textoConfirmar)}</button>
      </div>`);
    const d = dialogo;
    const resolverCleanup = () => {
      d.removeEventListener('close', onClose);
      resolve(false);
    };
    const onClose = () => {
      // resolve false if closed by Esc or backdrop
      resolverCleanup();
    };
    d.addEventListener('close', onClose, { once: true });
    caixa.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => { fecharModal(); resolve(false); }));
    caixa.querySelector('#confirmar-acao').addEventListener('click', () => { fecharModal(); resolve(true); });
  });
}

/* ------------------------------------------------------------------ */
/* Avisos                                                             */
/* ------------------------------------------------------------------ */

let containerAvisos = null;

export function toast(mensagem, tipo = 'info', tempo = 4500) {
  if (!containerAvisos) {
    containerAvisos = document.createElement('div');
    containerAvisos.className = 'avisos';
    document.body.appendChild(containerAvisos);
  }
  const div = document.createElement('div');
  div.className = `aviso aviso-${tipo}`;
  const isErro = tipo === 'erro' || tipo === 'alerta';
  div.setAttribute('role', isErro ? 'alert' : 'status');
  div.setAttribute('aria-live', isErro ? 'assertive' : 'polite');
  div.innerHTML = `<span>${esc(mensagem)}</span><button type="button" class="icone" aria-label="Fechar">✕</button>`;
  div.querySelector('button').addEventListener('click', () => div.remove());
  containerAvisos.appendChild(div);
  setTimeout(() => div.remove(), tempo);
}

export function tratarErro(erro) {
  if (erro?.codigo === 'SESSAO_EXPIRADA' || erro?.codigo === 'NAO_AUTENTICADO') {
    toast(erro.message, 'alerta', 6000);
    window.dispatchEvent(new CustomEvent('labucs:sessao-expirada'));
    return;
  }
  const campos = erro?.campos && Object.keys(erro.campos).length
    ? ` ${Object.values(erro.campos).join(' ')}`
    : '';
  toast(`${erro?.message ?? 'Erro inesperado.'}${campos}`, 'erro', 8000);
}

/* ------------------------------------------------------------------ */
/* Download                                                           */
/* ------------------------------------------------------------------ */

export function baixarArquivo(nomeArquivo, mime, conteudo) {
  const blob = conteudo instanceof Uint8Array
    ? new Blob([conteudo], { type: mime })
    : new Blob([String(conteudo)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ------------------------------------------------------------------ */
/* Componentes de formulário                                          */
/* ------------------------------------------------------------------ */

let campoCounter = 0;

export function campo({
  nome, rotulo, tipo = 'text', valor = '', opcoes = [], obrigatorio = false, ajuda = '',
  placeholder = '', largura = 'half', min, max, passo = 'any', desabilitado = false, linhas = 3, prefixo = ''
}) {
  const baseId = `campo-${prefixo ? prefixo + '-' : ''}${nome}`;
  const id = `${baseId}-${++campoCounter}`;
  const obrig = obrigatorio ? ' <span class="obrig">*</span>' : '';
  const ajudaHtml = ajuda ? `<small class="ajuda">${esc(ajuda)}</small>` : '';
  const comum = `id="${id}" name="${nome}" ${obrigatorio ? 'required' : ''} ${desabilitado ? 'disabled' : ''} ${min !== undefined ? `min="${esc(min)}"` : ''} ${max !== undefined ? `max="${esc(max)}"` : ''}`;
  let controle;
  if (tipo === 'select') {
    const opcoesHtml = opcoes.map((o) => {
      const v = String(o.valor ?? '');
      const sel = String(valor ?? '') === v ? 'selected' : '';
      return `<option value="${esc(v)}" ${sel}>${esc(o.rotulo)}</option>`;
    }).join('');
    controle = `<select class="controle" ${comum}>${opcoesHtml}</select>`;
  } else if (tipo === 'textarea') {
    controle = `<textarea class="controle" ${comum} rows="${linhas}" placeholder="${esc(placeholder)}">${esc(valor ?? '')}</textarea>`;
  } else if (tipo === 'checkbox') {
    return `<div class="campo campo-${largura} campo-check">
      <label class="check-label"><input type="checkbox" id="${id}" name="${nome}" ${valor ? 'checked' : ''} ${desabilitado ? 'disabled' : ''} /> ${esc(rotulo)}</label>
      ${ajudaHtml}<span class="erro-campo" data-erro="${nome}"></span>
    </div>`;
  } else {
    const tipoInput = tipo === 'dinheiro' ? 'text' : tipo;
    const extra = tipo === 'dinheiro' ? 'inputmode="decimal" autocomplete="off"' : (tipo === 'number' ? `step="${passo}"` : '');
    controle = `<input class="controle" type="${tipoInput}" ${comum} value="${esc(valor ?? '')}" placeholder="${esc(placeholder)}" ${extra} />`;
  }
  return `<div class="campo campo-${largura}">
    <label for="${id}">${esc(rotulo)}${obrig}</label>
    ${controle}
    ${ajudaHtml}
    <span class="erro-campo" data-erro="${nome}"></span>
  </div>`;
}

/** Lê os campos definidos, convertendo dinheiro em centavos e números. */
export function lerCampos(form, definicoes) {
  const dados = {};
  for (const def of definicoes) {
    const el = form.elements[def.nome];
    if (!el) continue;
    if (def.tipo === 'checkbox') dados[def.nome] = el.checked;
    else if (def.tipo === 'select' && def.numerico) dados[def.nome] = el.value ? Number(el.value) : null;
    else if (def.tipo === 'dinheiro') dados[def.nome] = el.value === '' ? null : paraCentavos(el.value);
    else if (def.tipo === 'money-centavos') dados[def.nome] = el.value === '' ? null : paraCentavos(el.value);
    else if (def.tipo === 'number') dados[def.nome] = el.value === '' ? null : Number(el.value);
    else dados[def.nome] = el.value === '' ? null : el.value;
  }
  return dados;
}

export function marcarErros(form, erro) {
  form.querySelectorAll('.invalido').forEach((el) => el.classList.remove('invalido'));
  form.querySelectorAll('.erro-campo').forEach((el) => { el.textContent = ''; });
  if (!erro?.campos) return;
  for (const [campoNome, mensagem] of Object.entries(erro.campos)) {
    const input = form.elements[campoNome];
    if (input) {
      input.classList.add('invalido');
      input.setAttribute('aria-invalid', 'true');
      const span = form.querySelector(`[data-erro="${campoNome}"]`);
      if (span) span.textContent = mensagem;
    }
  }
  const primeiro = form.querySelector('.invalido');
  primeiro?.focus();
  const spanGeral = form.querySelector('[data-erro-geral]');
  if (spanGeral) spanGeral.textContent = erro.message ?? '';
}

/* ------------------------------------------------------------------ */
/* Tabela e paginação                                                 */
/* ------------------------------------------------------------------ */

export function tabela(colunas, linhas, { vazio = 'Nenhum registro encontrado.', acoes = null, legenda = '', rolagem = true } = {}) {
  if (!linhas.length) return `<p class="vazio">${esc(vazio)}</p>`;
  const head = colunas.map((c) => `<th scope="col"${c.alinhamento === 'direita' ? ' class="num"' : ''}>${esc(c.rotulo)}</th>`).join('')
    + (acoes ? '<th scope="col" class="col-acoes">Ações</th>' : '');
  const body = linhas.map((linha) => {
    const tds = colunas.map((c) => {
      const valor = formatarCelula(linha[c.chave], c.tipo);
      const conteudo = c.render ? c.render(linha) : esc(valor);
      return `<td${c.alinhamento === 'direita' ? ' class="num"' : ''}>${conteudo}</td>`;
    }).join('');
    return `<tr>${tds}${acoes ? `<td class="col-acoes">${acoes(linha)}</td>` : ''}</tr>`;
  }).join('');
  const caption = legenda ? `<caption>${esc(legenda)}</caption>` : '';
  const envelope = rolagem ? 'tabela-envolucro' : 'tabela-envolucro tabela-envolucro--livre';
  return `<div class="${envelope}"><table class="tabela">${caption}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function paginacao(pagina, aoMudar = 'pagina') {
  if (!pagina || pagina.totalPaginas <= 1) return '';
  return `<nav class="paginacao" aria-label="Paginação">
    <button type="button" class="btn btn-secundario" data-${aoMudar}="${pagina.pagina - 1}" ${pagina.pagina <= 1 ? 'disabled' : ''}>← Anterior</button>
    <span>Página ${pagina.pagina} de ${pagina.totalPaginas} • ${pagina.total} registro(s)</span>
    <button type="button" class="btn btn-secundario" data-${aoMudar}="${pagina.pagina + 1}" ${pagina.pagina >= pagina.totalPaginas ? 'disabled' : ''}>Próxima →</button>
  </nav>`;
}

export function estadoVazio(titulo, mensagem, acaoHtml = '') {
  return `<div class="estado-vazio"><h3>${esc(titulo)}</h3><p>${esc(mensagem)}</p>${acaoHtml}</div>`;
}

/* ------------------------------------------------------------------ */
/* Diversos                                                           */
/* ------------------------------------------------------------------ */

export function hoje() {
  return hojeISO();
}

export function slug(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, '-');
}

export function iniciais(nome) {
  return String(nome ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}
