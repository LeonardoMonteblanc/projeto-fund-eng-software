/**
 * Calendário mensal da agenda.
 *
 * Recebe os eventos já filtrados pelo backend e monta uma grade de sete
 * colunas com seis semanas. Cada dia exibe a data, os eventos do dia e o
 * excedente quando houver mais de três.
 */

import { esc, fmtData } from './ui.js';
import { icone } from './icons.js';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MAXIMO_POR_DIA = 3;

function chaveMes(iso) {
  return String(iso ?? '').slice(0, 7);
}

function diaSemana(iso) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

function ultimoDiaDoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

function somarDias(iso, dias) {
  const data = new Date(`${iso}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

/** Lista as datas do mês, incluindo as bordas das semanas vizinhas. */
export function diasDoMes(mes) {
  const [ano, mesNumero] = mes.split('-').map(Number);
  const primeiro = `${mes}-01`;
  const total = ultimoDiaDoMes(ano, mesNumero - 1);
  const inicio = somarDias(primeiro, -diaSemana(primeiro));
  const celulas = Math.ceil((diaSemana(primeiro) + total) / 7) * 7;
  const dias = [];
  for (let i = 0; i < celulas; i += 1) {
    const data = somarDias(inicio, i);
    dias.push({ data, fora: chaveMes(data) !== mes });
  }
  return dias;
}

function classeDoEvento(evento) {
  const tipo = String(evento.tipo ?? '').toLowerCase();
  if (tipo.includes('calibracao')) return 'agenda-evento--calibracao';
  if (tipo.includes('verificacao')) return 'agenda-evento--verificacao';
  if (tipo.includes('preventiva')) return 'agenda-evento--preventiva';
  if (tipo.includes('corretiva')) return 'agenda-evento--corretiva';
  if (tipo.includes('divergencia')) return 'agenda-evento--divergencia';
  return '';
}

function tituloDoEvento(evento) {
  return `${evento.tipoRotulo ?? evento.tipo ?? 'Evento'} — ${evento.equipamentoTag ?? ''}`.trim();
}

/**
 * @param {object} opcoes
 * @param {string} opcoes.mes mês no formato AAAA-MM
 * @param {Array} opcoes.eventos eventos do período
 * @param {string} opcoes.hoje data corrente
 */
export function calendarioMensal({ mes, eventos, hoje }) {
  const porDia = new Map();
  for (const evento of eventos) {
    const dia = String(evento.dataReferencia ?? '').slice(0, 10);
    if (!dia) continue;
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(evento);
  }

  const dias = diasDoMes(mes);
  const colunas = 7;
  const linhas = Math.ceil(dias.length / colunas);
  const rows = Array.from({ length: linhas }, (_, r) => {
    const celulas = dias.slice(r * colunas, r * colunas + colunas).map((dia) => {
      const doDia = porDia.get(dia.data) ?? [];
      const visiveis = doDia.slice(0, MAXIMO_POR_DIA);
      const excedente = doDia.length - visiveis.length;
      const classes = ['agenda-dia'];
      if (dia.fora) classes.push('agenda-dia--fora');
      if (dia.data === hoje) classes.push('agenda-dia--hoje');
      const rotulo = fmtData(dia.data);
      const ariaDate = dia.data;

      const eventosHtml = visiveis.map((evento) => `
        <a class="agenda-evento ${classeDoEvento(evento)}${evento.situacao === 'REALIZADO' ? ' agenda-evento--realizado' : ''}"
          href="#/equipamentos/${esc(evento.equipamentoId)}"
          title="${esc(`${rotulo} · ${tituloDoEvento(evento)}${evento.laboratorioSigla ? ` · ${evento.laboratorioSigla}` : ''}`)}">
          ${esc(evento.tipoRotulo ?? evento.tipo ?? 'Evento')}
        </a>`).join('');

      return `<td class="${classes.join(' ')}" aria-label="${esc(rotulo)}">
        <div class="agenda-dia-topo">
          <span class="agenda-dia-numero">${Number(dia.data.slice(8, 10))}</span>
          ${doDia.length ? `<span class="agenda-dia-contagem">${doDia.length}</span>` : ''}
        </div>
        <div class="agenda-eventos">${eventosHtml}</div>
        ${excedente > 0 ? `<a class="agenda-mais" href="#/agenda">+${excedente} mais</a>` : ''}
      </td>`;
    }).join('');
    return `<tr>${celulas}</tr>`;
  }).join('');

  const cabecalhos = DIAS.map((dia) => `<th scope="col" abbr="${dia}" class="agenda-cabecalho">${dia}</th>`).join('');

  return `<table class="agenda-calendario" aria-label="Calendário mensal de eventos">
    <caption class="sr-only">Calendário mensal</caption>
    <thead>
      <tr class="agenda-cabecalhos">${cabecalhos}</tr>
    </thead>
    <tbody class="agenda-grade">
      ${rows}
    </tbody>
  </table>`;
}

/** Rótulo do mês corrente: "Março 2026". */
export function rotuloMes(mes) {
  const [ano, mesNumero] = mes.split('-').map(Number);
  return `${MESES[mesNumero - 1]} ${ano}`;
}

/** Desloca um mês no formato AAAA-MM. */
export function moverMes(mes, delta) {
  const [ano, mesNumero] = mes.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mesNumero - 1 + delta, 1));
  return data.toISOString().slice(0, 7);
}

/** Primeiro e último dia do mês, para consultar a agenda. */
export function intervaloDoMes(mes) {
  const [ano, mesNumero] = mes.split('-').map(Number);
  const ultimo = ultimoDiaDoMes(ano, mesNumero - 1);
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

/** Botões de navegação do mês. */
export function navegacaoDoMes(mes) {
  return `<div class="agenda-navegacao">
    <button type="button" class="btn btn-secundario btn-mini" data-mes-anterior aria-label="Mês anterior">${icone('anterior', { classe: 'ucs-icone--sm' })}</button>
    <strong class="agenda-titulo">${esc(rotuloMes(mes))}</strong>
    <button type="button" class="btn btn-secundario btn-mini" data-mes-proximo aria-label="Próximo mês">${icone('proximo', { classe: 'ucs-icone--sm' })}</button>
    <button type="button" class="btn btn-secundario btn-mini" data-mes-hoje>Hoje</button>
  </div>`;
}
