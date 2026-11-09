import { SettingsApplication } from './settings-application.js';
import { AVISO_PRIVACIDADE } from '../domain/lgpd.js';

/** Fachada da aplicação: compõe as camadas e expõe os namespaces usados pela UI. */
export class Application extends SettingsApplication {
  constructor(opcoes) {
    super(opcoes);
    this._montarApi();
  }

  _montarApi() {
    const app = this;

    this.auth = {
      login: (email, senha) => app.login(email, senha),
      logout: (motivo) => app.logout(motivo),
      sessao: () => app.sessao(),
      renovar: () => app.sessoes.renovar(),
      segundosRestantes: () => app.sessoes.segundosRestantes(),
      alterarSenha: (atual, nova) => app.alterarMinhaSenha(atual, nova)
    };

    this.meta = {
      info: () => app.infoMeta(),
      funcionalidades: () => app.listarFuncionalidades(),
      enums: () => app.enums(),
      saude: () => app.saude()
    };

    this.painel = {
      resumo: (filtros) => app.resumoPainel(filtros),
      alertas: (filtros) => app.listarAlertas(filtros),
      agenda: (filtros) => app.listarAgenda(filtros)
    };

    this.laboratorios = {
      listar: (filtros) => app.listarLaboratorios(filtros),
      obter: (id) => app.obterLaboratorio(id),
      criar: (dados) => app.criarLaboratorio(dados),
      atualizar: (id, dados) => app.atualizarLaboratorio(id, dados),
      inativar: (id, motivo) => app.inativarLaboratorio(id, motivo),
      reativar: (id, motivo) => app.reativarLaboratorio(id, motivo)
    };

    this.usuarios = {
      listar: (filtros) => app.listarUsuarios(filtros),
      obter: (id) => app.obterUsuario(id),
      criar: (dados) => app.criarUsuario(dados),
      atualizar: (id, dados) => app.atualizarUsuario(id, dados),
      inativar: (id, motivo) => app.inativarUsuario(id, motivo),
      reativar: (id, motivo) => app.reativarUsuario(id, motivo),
      redefinirSenha: (id, novaSenha) => app.redefinirSenha(id, novaSenha),
      anonimizar: (id, motivo) => app.anonimizarUsuario(id, motivo),
      meusDados: () => app.meusDados()
    };

    this.fornecedores = {
      listar: (filtros) => app.listarFornecedores(filtros),
      obter: (id) => app.obterFornecedor(id),
      criar: (dados) => app.criarFornecedor(dados),
      atualizar: (id, dados) => app.atualizarFornecedor(id, dados),
      inativar: (id, motivo) => app.inativarFornecedor(id, motivo),
      reativar: (id, motivo) => app.reativarFornecedor(id, motivo)
    };

    this.categorias = {
      listar: (filtros) => app.listarCategorias(filtros),
      criar: (dados) => app.criarCategoria(dados),
      atualizar: (id, dados) => app.atualizarCategoria(id, dados),
      inativar: (id, motivo) => app.inativarCategoria(id, motivo),
      reativar: (id, motivo) => app.reativarCategoria(id, motivo),
      listarSubcategorias: (filtros) => app.listarSubcategorias(filtros),
      criarSubcategoria: (dados) => app.criarSubcategoria(dados),
      atualizarSubcategoria: (id, dados) => app.atualizarSubcategoria(id, dados),
      inativarSubcategoria: (id, motivo) => app.inativarSubcategoria(id, motivo),
      reativarSubcategoria: (id, motivo) => app.reativarSubcategoria(id, motivo)
    };

    this.itens = {
      listar: (filtros) => app.listarItens(filtros),
      obter: (id) => app.obterItem(id),
      criar: (dados) => app.criarItem(dados),
      atualizar: (id, dados) => app.atualizarItem(id, dados),
      inativar: (id, motivo) => app.inativarItem(id, motivo),
      reativar: (id, motivo) => app.reativarItem(id, motivo)
    };

    this.equipamentos = {
      listar: (filtros) => app.listarEquipamentos(filtros),
      obter: (id) => app.obterEquipamento(id),
      criar: (dados) => app.criarEquipamento(dados),
      atualizar: (id, dados) => app.atualizarEquipamento(id, dados),
      inativar: (id, motivo) => app.inativarEquipamento(id, motivo),
      reativar: (id, motivo) => app.reativarEquipamento(id, motivo),
      historico: (id, filtros) => app.historicoEquipamento(id, filtros),
      sinalizados: (filtros) => app.listarEquipamentosSinalizados(filtros)
    };

    this.solicitacoes = {
      listar: (filtros) => app.listarSolicitacoes(filtros),
      obter: (id) => app.obterSolicitacao(id),
      criar: (dados) => app.criarSolicitacao(dados),
      aprovar: (id, dados) => app.aprovarSolicitacao(id, dados),
      rejeitar: (id, dados) => app.rejeitarSolicitacao(id, dados)
    };

    this.eventos = {
      listar: (filtros) => app.listarEventos(filtros),
      obter: (id) => app.obterEvento(id),
      criar: (dados) => app.criarEvento(dados),
      atualizar: (id, dados) => app.atualizarEvento(id, dados),
      realizar: (id, dados) => app.realizarEvento(id, dados),
      cancelar: (id, motivo) => app.cancelarEvento(id, motivo),
      calcularPrevia: (dados) => app.calcularPrevia(dados)
    };

    this.relatorios = {
      inventario: (filtros) => app.relatorioInventario(filtros),
      situacao: (filtros) => app.relatorioSituacao(filtros),
      historico: (filtros) => app.relatorioHistorico(filtros),
      calibracoes: (filtros) => app.relatorioCalibracoes(filtros),
      manutencoesPreventivas: (filtros) => app.relatorioManutencoesPreventivas(filtros),
      manutencoesCorretivas: (filtros) => app.relatorioManutencoesCorretivas(filtros),
      fichaEquipamento: (id) => app.relatorioFichaEquipamento(id),
      custos: (filtros) => app.relatorioCustos(filtros),
      exportar: (id, formato, filtros) => app.exportarRelatorio(id, formato, filtros)
    };

    this.auditoria = {
      listar: (filtros) => app.listarAuditoria(filtros),
      obter: (id) => app.obterAuditoria(id)
    };

    this.config = {
      obter: () => app.obterConfiguracoes(),
      publicas: () => app.obterParametrosPublicos(),
      atualizar: (dados) => app.atualizarConfiguracoes(dados),
      backups: () => app.listarBackups(),
      criarBackup: (motivo) => app.criarBackup(motivo),
      exportarDados: () => app.exportarDados(),
      importarDados: (texto, motivo) => app.importarDados(texto, motivo),
      restaurarBackup: (id, motivo) => app.restaurarBackup(id, motivo),
      reiniciar: (motivo) => app.reiniciarDemonstracao(motivo)
    };

    this.lgpd = {
      aviso: () => AVISO_PRIVACIDADE,
      meusDados: () => app.meusDados(),
      anonimizar: (id, motivo) => app.anonimizarUsuario(id, motivo)
    };

  }
}

