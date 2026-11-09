/** Helpers compartilhados pelas telas do console funcional. */

import {
  PERFIL_ROTULO,
  SITUACAO_EQUIPAMENTO_ROTULO,
  SITUACAO_EVENTO_ROTULO,
  SITUACAO_SOLICITACAO_ROTULO,
  TIPO_EVENTO_ROTULO,
  TIPOS_EVENTO
} from '../../shared/constants.js';
import { abrirModal, campo, fecharModal, lerCampos, marcarErros, tratarErro, esc } from './ui.js';

export { campo, lerCampos, marcarErros, tratarErro, esc };

export function opcoesLab(app, { incluirTodos = false, apenasAtivos = true } = {}) {
  const labs = app.laboratorios.listar({ tamanho: 200 }).itens;
  const opcoes = labs
    .filter((l) => !apenasAtivos || l.ativo)
    .map((l) => ({ valor: l.id, rotulo: `${l.sigla} — ${l.nome}` }));
  return incluirTodos ? [{ valor: '', rotulo: 'Todos os laboratórios' }, ...opcoes] : opcoes;
}

export function opcoesLabSigla(app, sigla) {
  return app.laboratorios.listar({ tamanho: 200 }).itens.map((l) => ({ valor: l.id, rotulo: `${l.sigla} — ${l.nome}`, sigla: l.sigla }));
}

export function opcoesCategoria(app) {
  return app.categorias.listar({}).itens.map((c) => ({ valor: c.id, rotulo: c.nome }));
}

export function opcoesSubcategoria(app) {
  const cats = app.categorias.listar({}).itens;
  const opcoes = [];
  for (const cat of cats) {
    for (const sub of cat.subcategorias) {
      opcoes.push({ valor: sub.id, rotulo: `${cat.nome} › ${sub.nome}` });
    }
  }
  return opcoes;
}

export function opcoesItem(app, { apenasAtivos = true } = {}) {
  const itens = app.itens.listar({ tamanho: 2000, ativo: apenasAtivos ? true : undefined }).itens;
  return itens.map((i) => ({ valor: i.id, rotulo: `${i.nome} — ${i.fabricante}${i.modelo ? ` (${i.modelo})` : ''}` }));
}

export function opcoesFornecedor(app, { incluirVazio = true, apenasAtivos = true } = {}) {
  const lista = app.fornecedores.listar({ tamanho: 200 }).itens.filter((f) => !apenasAtivos || f.ativo);
  const opcoes = lista.map((f) => ({ valor: f.id, rotulo: f.razaoSocial }));
  return incluirVazio ? [{ valor: '', rotulo: '— Nenhum —' }, ...opcoes] : opcoes;
}

export function opcoesPerfil() {
  return Object.entries(PERFIL_ROTULO).map(([valor, rotulo]) => ({ valor, rotulo }));
}

export function opcoesTipoEvento({ incluirDivergencia = false } = {}) {
  const tipos = [
    TIPOS_EVENTO.CALIBRACAO, TIPOS_EVENTO.VERIFICACAO,
    TIPOS_EVENTO.MANUTENCAO_PREVENTIVA, TIPOS_EVENTO.MANUTENCAO_CORRETIVA
  ];
  if (incluirDivergencia) tipos.push(TIPOS_EVENTO.DIVERGENCIA_INVENTARIO);
  return tipos.map((t) => ({ valor: t, rotulo: TIPO_EVENTO_ROTULO[t] }));
}

export function opcoesSituacaoEquipamento() {
  return Object.entries(SITUACAO_EQUIPAMENTO_ROTULO).map(([valor, rotulo]) => ({ valor, rotulo }));
}

export function opcoesSituacaoEvento() {
  return Object.entries(SITUACAO_EVENTO_ROTULO).map(([valor, rotulo]) => ({ valor, rotulo }));
}

export function opcoesSituacaoSolicitacao() {
  return Object.entries(SITUACAO_SOLICITACAO_ROTULO).map(([valor, rotulo]) => ({ valor, rotulo }));
}

export function opcoesSinal() {
  return [
    { valor: '', rotulo: 'Todos' },
    { valor: 'CALIBRACAO_VENCIDA', rotulo: 'Calibração vencida' },
    { valor: 'CALIBRACAO_REPROVADA', rotulo: 'Calibração reprovada' },
    { valor: 'VERIFICACAO_VENCIDA', rotulo: 'Verificação vencida' },
    { valor: 'PERIODICIDADE_ZERO', rotulo: 'Periodicidade zero' }
  ];
}

export function rotuloPerfil(perfil) {
  return PERFIL_ROTULO[perfil] ?? perfil;
}

export function dataInput(iso) {
  return iso ?? '';
}

export function valorReais(centavos) {
  return centavos === null || centavos === undefined ? '' : (centavos / 100).toFixed(2);
}

/**
 * Abre um formulário em modal, com validação de campos e retorno de erros.
 * @param {object} opcoes
 * @param {string} opcoes.titulo
 * @param {Array} opcoes.campos
 * @param {object} opcoes.valores
 * @param {(dados: object) => Promise<any>} opcoes.onSalvar
 * @param {string} [opcoes.textoSalvar]
 * @param {string} [opcoes.largura]
 */
export function formularioModal({ titulo, campos, valores = {}, onSalvar, textoSalvar = 'Salvar', largura = '760px' }) {
  const htmlCampos = campos.map((c) => campo({ ...c, valor: valores[c.nome] ?? c.valor ?? '' })).join('');
  const caixa = abrirModal(`
    <form id="form-modal" novalidate>
      <div class="modal-cabecalho">
        <h2>${esc(titulo)}</h2>
        <button type="button" class="icone" data-fechar aria-label="Fechar">✕</button>
      </div>
      <div class="grid-campos">${htmlCampos}</div>
      <p class="erro-geral" data-erro-geral></p>
      <div class="modal-acoes">
        <button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
        <button type="submit" class="btn btn-primario">${esc(textoSalvar)}</button>
      </div>
    </form>`, { largura });

  const form = caixa.querySelector('#form-modal');
  caixa.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fecharModal));
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = lerCampos(form, campos);
    try {
      await onSalvar(dados);
      fecharModal();
    } catch (erro) {
      marcarErros(form, erro);
      if (!erro?.campos || !Object.keys(erro.campos).length) tratarErro(erro);
    }
  });
  return { form, caixa };
}

/** Solicita um motivo obrigatório antes de operações sensíveis. */
export function pedirMotivo({ titulo, mensagem, textoConfirmar = 'Confirmar', perigo = false, rotulo = 'Motivo', valor = '' }) {
  return new Promise((resolve) => {
    const caixa = abrirModal(`
      <form id="form-motivo" novalidate>
        <div class="modal-cabecalho">
          <h2>${esc(titulo)}</h2>
          <button type="button" class="icone" data-fechar aria-label="Fechar">✕</button>
        </div>
        <p class="modal-texto">${mensagem}</p>
        ${campo({ nome: 'motivo', rotulo, tipo: 'textarea', valor, obrigatorio: true, largura: 'full', placeholder: 'Descreva a justificativa (mínimo 5 caracteres)' })}
        <p class="erro-geral" data-erro-geral></p>
        <div class="modal-acoes">
          <button type="button" class="btn btn-secundario" data-fechar>Cancelar</button>
          <button type="submit" class="btn ${perigo ? 'btn-perigo' : 'btn-primario'}">${esc(textoConfirmar)}</button>
        </div>
      </form>`);
    const form = caixa.querySelector('#form-motivo');
    caixa.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', () => { fecharModal(); resolve(null); }));
    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const motivo = form.elements.motivo.value.trim();
      if (motivo.length < 5) {
        form.elements.motivo.classList.add('invalido');
        form.querySelector('[data-erro-geral]').textContent = 'Informe um motivo com pelo menos 5 caracteres.';
        return;
      }
      fecharModal();
      resolve(motivo);
    });
  });
}

export function linkEquipamento(id, tag) {
  return `<a class="link" href="#/equipamentos/${id}">${esc(tag)}</a>`;
}

export function cartaoIndicador({ rotulo, valor, detalhe = '', variante = 'neutro', href = null }) {
  const exibicao = typeof valor === 'number' ? new Intl.NumberFormat('pt-BR').format(valor) : valor;
  const conteudo = `<div class="indicador indicador-${variante}">
    <span class="indicador-rotulo">${esc(rotulo)}</span>
    <strong class="indicador-valor">${esc(exibicao)}</strong>
    ${detalhe ? `<span class="indicador-detalhe">${esc(detalhe)}</span>` : ''}
  </div>`;
  return href ? `<a class="indicador-link" href="${esc(href)}">${conteudo}</a>` : conteudo;
}

export function secao(titulo, conteudo, acoes = '') {
  return `<section class="secao">
    <div class="secao-cabecalho"><h2>${esc(titulo)}</h2>${acoes}</div>
    ${conteudo}
  </section>`;
}

export function filtrosBarra(htmlFiltros, { acao = 'Aplicar filtros', limpar = false } = {}) {
  return `<form class="filtros" data-form-filtros>
    <div class="filtros-campos">${htmlFiltros}</div>
    <div class="filtros-acoes">
      <button type="submit" class="btn btn-primario">${esc(acao)}</button>
      ${limpar ? '<button type="button" class="btn btn-secundario" data-limpar-filtros>Limpar</button>' : ''}
    </div>
  </form>`;
}

export function opcoesEquipamentos(app) {
  const pagina = app.equipamentos.listar({ tamanho: 3000, situacao: 'ATIVO' });
  return pagina.itens.map((e) => ({
    valor: e.id,
    rotulo: `${e.tag} — ${e.item?.nome ?? ''} (${e.laboratorio?.sigla ?? ''})`
  }));
}
