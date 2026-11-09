/**
 * Modelo de tabela dos relatórios: colunas, períodos e resolução de nomes.
 */
import { adicionarDias, formatarDataBR, somarMeses } from '../../shared/utils.js';
import { escopoLaboratorio } from '../domain/permissions.js';

export const COL = {
  texto: (chave, rotulo, largura = 2, opcoes = {}) => ({ chave, rotulo, tipo: 'texto', largura, ...opcoes }),
  data: (chave, rotulo, largura = 1.2) => ({ chave, rotulo, tipo: 'data', largura }),
  inteiro: (chave, rotulo, largura = 0.8) => ({ chave, rotulo, tipo: 'inteiro', largura }),
  numero: (chave, rotulo, largura = 1) => ({ chave, rotulo, tipo: 'numero', largura }),
  moeda: (chave, rotulo, largura = 1.2) => ({ chave, rotulo, tipo: 'moeda', largura }),
  percentual: (chave, rotulo, largura = 1) => ({ chave, rotulo, tipo: 'percentual', largura })
};

export function periodo(filtros, hoje) {
  const de = filtros.de ?? adicionarDias(somarMeses(hoje, -12), 1);
  const ate = filtros.ate ?? hoje;
  return { de, ate };
}

export function tituloPeriodo(de, ate) {
  return `Período: ${formatarDataBR(de)} a ${formatarDataBR(ate)}`;
}

export function equipamentosVisiveis(app, usuario, laboratorioId = null) {
  const escopo = escopoLaboratorio(usuario) ?? (laboratorioId ? Number(laboratorioId) : null);
  return { escopo, lista: app.estado.equipamentos.filter((e) => escopo === null || e.laboratorioId === escopo) };
}

export function nomeLab(app, id) {
  return app.estado.laboratorios.find((l) => l.id === id)?.sigla ?? '—';
}

export function nomeItem(app, equipamento) {
  return app.estado.itens.find((i) => i.id === equipamento.itemId)?.nome ?? '—';
}

export function somaCentavos(eventos) {
  return eventos.reduce((acc, e) => acc + (e.custoRealizadoCentavos ?? 0), 0);
}
