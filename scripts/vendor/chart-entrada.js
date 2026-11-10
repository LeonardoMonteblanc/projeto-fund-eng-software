/**
 * Ponto de entrada do bundle Chart.js.
 *
 * O pacote principal exporta o nucleo sem registrar controladores, escalas e
 * elementos. Este arquivo usa a variante `chart.js/auto`, que registra tudo o
 * necessario, e reexporta o construtor como export padrao para o carregamento
 * sob demanda feito em `src/frontend/components/charts.js`.
 */

import Chart from 'chart.js/auto';

export { Chart };
export default Chart;
