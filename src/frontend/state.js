/** Estado de filtros e paginação compartilhado pelas páginas. */
export const estadoTelas = {
  equipamentos: {
    busca: '', laboratorioId: '', categoriaId: '', situacao: '', sinal: '',
    completude: '', statusCalibracao: '', pagina: 1, _ultimaQuery: ''
  },
  itens: { busca: '', categoriaId: '', subcategoriaId: '', ativo: '', pagina: 1 },
  eventos: {
    busca: '', laboratorioId: '', tipo: '', situacao: '', de: '', ate: '',
    pagina: 1, _ultimaQuery: ''
  },
  solicitacoes: { situacao: 'PENDENTE', laboratorioId: '', pagina: 1 },
  fornecedores: { busca: '', ativo: '', pagina: 1 },
  laboratorios: { busca: '', ativo: '', pagina: 1 },
  usuarios: { busca: '', perfil: '', ativo: '', pagina: 1 },
  auditoria: { busca: '', tabela: '', acao: '', de: '', ate: '', pagina: 1 },
  agenda: { de: '', ate: '', laboratorioId: '' },
  relatorios: { relatorio: 'inventario', filtros: {} },
  config: { aba: 'parametros' }
};
