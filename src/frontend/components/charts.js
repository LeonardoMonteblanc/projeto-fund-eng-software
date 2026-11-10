/**
 * Gráficos da interface LabUcs.
 *
 * O Chart.js é carregado sob demanda: o bundle de 200 KB só é baixado quando
 * uma tela realmente apresenta um gráfico. O módulo monta os gráficos a partir
 * de uma configuração declarativa e aplica a paleta institucional UCS.
 */

import { esc } from './ui.js';

let promessaChart = null;

async function carregarChart() {
  if (!promessaChart) {
    promessaChart = import('../assets/vendor/chart.esm.js').then((mod) => mod.default ?? mod.Chart);
  }
  return promessaChart;
}

const PALETA = {
  azul: '#1d4975',
  azulClaro: '#2d5f91',
  rosa: '#cc7e89',
  cinza: '#4b5158',
  ok: '#36a551',
  alerta: '#b36b00',
  erro: '#c13438',
  info: '#0076b9',
  borda: '#dedede'
};

/** Configuração comum: grade discreta, sem legenda nativa, tipografia da casa. */
function base(opcoes) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 620, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: PALETA.cinza,
        titleFont: { family: 'IBM Plex Sans', size: 12, weight: '600' },
        bodyFont: { family: 'IBM Plex Sans', size: 12 },
        padding: 10,
        cornerRadius: 0,
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10
      }
    },
    scales: opcoes.escala === false ? undefined : {
      x: {
        grid: { display: false, drawBorder: true, color: PALETA.borda },
        border: { color: PALETA.borda },
        ticks: { color: PALETA.cinza, font: { family: 'IBM Plex Sans', size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: PALETA.borda, drawBorder: false },
        border: { display: false },
        ticks: { color: PALETA.cinza, font: { family: 'IBM Plex Sans', size: 11 }, precision: 0 }
      }
    }
  };
}

/**
 * @param {string} seletor elemento <canvas> alvo
 * @param {object} configuracao configuração do Chart.js
 */
async function desenhar(seletor, configuracao) {
  const canvas = document.querySelector(seletor);
  if (!canvas) return null;
  const Chart = await carregarChart();
  const existente = Chart.getChart(canvas);
  if (existente) existente.destroy();
  return new Chart(canvas, configuracao);
}

/** Barras empilhadas: composição de custos por laboratório. */
export async function graficoCustosPorLaboratorio(seletor, linhas) {
  const dados = linhas.filter((l) => l.custoTotal !== null && l.custoTotal !== undefined);
  if (!dados.length) return null;
  return desenhar(seletor, {
    type: 'bar',
    data: {
      labels: dados.map((l) => l.laboratorio),
      datasets: [
        { label: 'Calibração', data: dados.map((l) => (l.custoCalibracao ?? 0) / 100), backgroundColor: PALETA.azul, borderWidth: 0 },
        { label: 'Verificação', data: dados.map((l) => (l.custoVerificacao ?? 0) / 100), backgroundColor: PALETA.azulClaro, borderWidth: 0 },
        { label: 'Preventiva', data: dados.map((l) => (l.custoPreventiva ?? 0) / 100), backgroundColor: PALETA.ok, borderWidth: 0 },
        { label: 'Corretiva', data: dados.map((l) => (l.custoCorretiva ?? 0) / 100), backgroundColor: PALETA.rosa, borderWidth: 0 }
      ]
    },
    options: {
      ...base({}),
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: PALETA.cinza, font: { family: 'IBM Plex Sans', size: 11 } } },
        y: { stacked: true, beginAtZero: true, grid: { color: PALETA.borda }, border: { display: false }, ticks: { color: PALETA.cinza, font: { family: 'IBM Plex Sans', size: 11 }, callback: (v) => `R$ ${v.toLocaleString('pt-BR')}` } }
      }
    }
  });
}

/** Barras agrupadas: custo realizado contra receita do período. */
export async function graficoCustoReceita(seletor, linhas) {
  const dados = linhas.filter((l) => l.custoTotal !== null || l.receitaPeriodo !== null);
  if (!dados.length) return null;
  return desenhar(seletor, {
    type: 'bar',
    data: {
      labels: dados.map((l) => l.laboratorio),
      datasets: [
        { label: 'Custo', data: dados.map((l) => (l.custoTotal ?? 0) / 100), backgroundColor: PALETA.azul, borderWidth: 0 },
        { label: 'Receita', data: dados.map((l) => (l.receitaPeriodo ?? 0) / 100), backgroundColor: PALETA.rosa, borderWidth: 0 }
      ]
    },
    options: {
      ...base({}),
      scales: {
        x: { grid: { display: false }, ticks: { color: PALETA.cinza, font: { family: 'IBM Plex Sans', size: 11 } } },
        y: { beginAtZero: true, grid: { color: PALETA.borda }, border: { display: false }, ticks: { color: PALETA.cinza, font: { family: 'IBM Plex Sans', size: 11 }, callback: (v) => `R$ ${v.toLocaleString('pt-BR')}` } }
      }
    }
  });
}

/** Barra horizontal: situation de equipamentos por laboratório. */
export async function graficoEquipamentosPorLaboratorio(seletor, laboratorio) {
  const dados = laboratorio.filter((l) => l.total > 0);
  if (!dados.length) return null;
  return desenhar(seletor, {
    type: 'bar',
    data: {
      labels: dados.map((l) => l.sigla),
      datasets: [
        { label: 'Ativos', data: dados.map((l) => l.ativos), backgroundColor: PALETA.azul, borderWidth: 0 },
        { label: 'Vencidos', data: dados.map((l) => l.vencidas), backgroundColor: PALETA.erro, borderWidth: 0 }
      ]
    },
    options: {
      ...base({}),
      indexAxis: 'y',
      scales: {
        x: { stacked: true, beginAtZero: true, grid: { color: PALETA.borda }, border: { display: false }, ticks: { color: PALETA.cinza, font: { family: 'IBM Plex Sans', size: 11 }, precision: 0 } },
        y: { stacked: true, grid: { display: false }, ticks: { color: PALETA.cinza, font: { family: 'IBM Plex Sans', size: 11 } } }
      }
    }
  });
}

/** Rosca: composição da carteira de equipamentos. */
export async function graficoSituacaoEquipamentos(seletor, fatias) {
  const total = fatias.reduce((acc, f) => acc + f.valor, 0);
  if (!total) return null;
  return desenhar(seletor, {
    type: 'doughnut',
    data: {
      labels: fatias.map((f) => f.rotulo),
      datasets: [{
        data: fatias.map((f) => f.valor),
        backgroundColor: fatias.map((f) => f.cor),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      ...base({ escala: false }),
      cutout: '64%',
      plugins: {
        ...base({ escala: false }).plugins,
        tooltip: {
          ...base({ escala: false }).plugins.tooltip,
          callbacks: {
            label: (contexto) => ` ${contexto.label}: ${contexto.parsed.toLocaleString('pt-BR')} (${Math.round((contexto.parsed / total) * 100)}%)`
          }
        }
      }
    }
  });
}

/** Bloco HTML com título, legenda e área do gráfico. */
export function caixaGrafico({ titulo, subtitulo = '', id, legenda = [], classes = '' }) {
  const itens = legenda.map((l) => `<span class="grafico-legenda-item"><span class="grafico-marca grafico-marca--${esc(l.cor)}"></span>${esc(l.rotulo)}</span>`).join('');
  return `<section class="grafico-caixa ${esc(classes)}" data-revelar>
    <div class="grafico-cabecalho">
      <h3 class="grafico-titulo">${esc(titulo)}</h3>
      ${subtitulo ? `<p class="subtexto">${esc(subtitulo)}</p>` : ''}
    </div>
    <div class="grafico-lienzo"><canvas id="${esc(id)}" role="img" aria-label="${esc(titulo)}"></canvas></div>
    ${itens ? `<div class="grafico-legenda">${itens}</div>` : ''}
  </section>`;
}
