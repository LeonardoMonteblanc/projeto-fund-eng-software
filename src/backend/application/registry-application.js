import {
  ACOES_LOG,
  ACAO_LOG_ROTULO,
  ESTADOS_RETORNO,
  FUNCIONALIDADES,
  LIMITES,
  NIVEIS_ALERTA,
  PARAMETROS_PADRAO,
  PERFIL_ROTULO,
  PERFIS,
  PERMISSOES_POR_PERFIL,
  RESULTADO_ROTULO,
  SITUACAO_EQUIPAMENTO_ROTULO,
  SITUACAO_EVENTO_ROTULO,
  SITUACAO_POR_ESTADO_RETORNO,
  SITUACAO_SOLICITACAO_ROTULO,
  SITUACOES_EQUIPAMENTO,
  SITUACOES_EVENTO,
  SITUACOES_SOLICITACAO,
  SINALIZACOES,
  STATUS_PRAZO,
  STATUS_PRAZO_ROTULO,
  TIPO_EVENTO_ROTULO,
  TIPO_INDICACAO_ABREVIADO,
  TIPO_INDICACAO_ROTULO,
  TIPOS_EVENTO,
  TIPOS_EVENTO_MANUTENCAO,
  TIPOS_EVENTO_METROLOGICOS,
  TIPOS_INDICACAO,
  TABELAS_AUDITADAS
} from '../../shared/constants.js';
import { ErroApp, CODIGOS_ERRO } from '../../shared/errors.js';
import {
  PERMISSOES,
  exigirEscopo,
  exigirPermissao,
  exigirAdministrador,
  exigirGestorLaboratorio,
  exigirGestorGeral,
  escopoLaboratorio,
  funcionalidadesPara,
  pode,
  podeVerLaboratorio
} from '../domain/permissions.js';
import {
  CAMPOS_OBRIGATORIOS_EQUIPAMENTO,
  ROTULO_CAMPO,
  calcularMetricas,
  calcularResultado,
  caEfetivo,
  camposPendentesEquipamento,
  equipamentoCompleto,
  periodicidadeEfetiva,
  statusPrazo
} from '../domain/metrology.js';
import {
  adicionarDias,
  agoraISO,
  clonar,
  contem,
  formatarBRL,
  formatarDataBR,
  hojeISO,
  normalizar,
  ordenarPor,
  paginar,
  somarMeses,
  toISO
} from '../../shared/utils.js';
import { Validador, cnpjValido, formatarCNPJ, normalizarEmail, senhaValida } from '../../shared/validation.js';
import { criarCredenciais } from '../infrastructure/session.js';
import {
  construirInventario,
  construirSituacao,
  construirHistorico,
  construirCalibracoes,
  construirManutencoesPreventivas,
  construirManutencoesCorretivas,
  construirFichaEquipamento,
  construirCustos,
  exportarTabela
} from '../reports/index.js';

/* ------------------------------------------------------------------ */

import { sanitizar, proximoId, localizar, mesmo, exigirMotivo } from './helpers.js';

import { IdentityApplication } from './identity-application.js';

export class RegistryApplication extends IdentityApplication {

  listarLaboratorios(filtros = {}) {
    const ctx = this.ctxLeitura();
    let labs = this.estado.laboratorios;
    if (ctx.usuario.perfil === PERFIS.GESTOR_LAB || ctx.usuario.perfil === PERFIS.TECNICO) {
      labs = labs.filter((l) => l.id === ctx.usuario.laboratorioId);
    }
    if (filtros.busca) labs = labs.filter((l) => contem(l.nome, filtros.busca) || contem(l.sigla, filtros.busca) || contem(l.codigo, filtros.busca));
    if (filtros.ativo !== undefined && filtros.ativo !== null && filtros.ativo !== '') {
      const ativo = filtros.ativo === true || filtros.ativo === 'true';
      labs = labs.filter((l) => l.ativo === ativo);
    }
    labs = ordenarPor(labs, filtros.ordenarPor ?? 'sigla', filtros.direcao ?? 'asc');
    const pagina = paginar(labs, filtros.pagina ?? 1, filtros.tamanho ?? 50);
    return { ...pagina, itens: pagina.itens.map((l) => this._dtoLaboratorio(l)) };
  }

  obterLaboratorio(id) {
    const ctx = this.ctxLeitura();
    const lab = localizar(this.estado, 'laboratorios', id, 'Laboratório');
    if (!podeVerLaboratorio(ctx.usuario, lab.id)) throw ErroApp.naoEncontrado('Laboratório', id);
    return this._dtoLaboratorio(lab);
  }

  _validarLaboratorio(dados, id = null) {
    const v = new Validador();
    const nome = v.texto('nome', dados.nome, { min: 3, max: LIMITES.NOME_LONGO, rotulo: 'Nome' });
    const sigla = v.texto('sigla', dados.sigla, { min: 2, max: 20, rotulo: 'Sigla' }).toUpperCase();
    const codigo = v.texto('codigo', dados.codigo, { min: 2, max: 30, rotulo: 'Código' }).toUpperCase();
    const localizacao = v.texto('localizacao', dados.localizacao, { obrigatorio: false, max: 200, rotulo: 'Localização' });
    const receita = v.decimal('receitaMensalCentavos', dados.receitaMensalCentavos ?? null, { obrigatorio: false, min: 0, rotulo: 'Receita mensal' });
    v.manual('sigla', !this.estado.laboratorios.some((l) => l.id !== Number(id) && mesmo(l.sigla, sigla)), 'Já existe um laboratório com esta sigla.');
    v.manual('codigo', !this.estado.laboratorios.some((l) => l.id !== Number(id) && mesmo(l.codigo, codigo)), 'Já existe um laboratório com este código.');
    v.lancar();
    return { nome, sigla, codigo, localizacao: localizacao ?? null, receitaMensalCentavos: receita === null ? null : Math.round(receita) };
  }

  criarLaboratorio(dados) {
    const ctx = this.ctx(PERMISSOES.LABORATORIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const valores = this._validarLaboratorio(dados);
    return this._mutar(() => {
      const id = proximoId(this.estado, 'laboratorios');
      const lab = { id, ...valores, ativo: true, criadoEm: this.agora, atualizadoEm: this.agora };
      this.estado.laboratorios.push(lab);
      this._registrarLog(ctx, {
        acao: ACOES_LOG.CRIAR, tabela: 'laboratorios', registroId: id, depois: lab, motivo: 'Cadastro de laboratório'
      });
      return this._dtoLaboratorio(lab);
    });
  }

  atualizarLaboratorio(id, dados) {
    const ctx = this.ctx(PERMISSOES.LABORATORIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const lab = localizar(this.estado, 'laboratorios', id, 'Laboratório');
    const motivo = exigirMotivo(dados.motivo);
    const valores = this._validarLaboratorio({ ...lab, ...dados }, id);
    return this._mutar(() => {
      const antes = clonar(lab);
      Object.assign(lab, valores, { atualizadoEm: this.agora });
      this._registrarLog(ctx, {
        acao: ACOES_LOG.ATUALIZAR, tabela: 'laboratorios', registroId: id, antes, depois: lab, motivo
      });
      return this._dtoLaboratorio(lab);
    });
  }

  inativarLaboratorio(id, motivo) {
    const ctx = this.ctx(PERMISSOES.LABORATORIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const lab = localizar(this.estado, 'laboratorios', id, 'Laboratório');
    const m = exigirMotivo(motivo);
    const equipamentos = this.estado.equipamentos.filter((e) => e.laboratorioId === lab.id);
    if (equipamentos.length) {
      throw ErroApp.regra(`Não é possível inativar: o laboratório possui ${equipamentos.length} equipamento(s) vinculado(s). Transfira ou inative-os primeiro.`);
    }
    return this._mutar(() => {
      const antes = clonar(lab);
      lab.ativo = false;
      lab.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.INATIVAR, tabela: 'laboratorios', registroId: id, antes, depois: lab, motivo: m });
      return this._dtoLaboratorio(lab);
    });
  }

  reativarLaboratorio(id, motivo) {
    const ctx = this.ctx(PERMISSOES.LABORATORIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const lab = localizar(this.estado, 'laboratorios', id, 'Laboratório');
    const m = exigirMotivo(motivo);
    return this._mutar(() => {
      const antes = clonar(lab);
      lab.ativo = true;
      lab.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.REATIVAR, tabela: 'laboratorios', registroId: id, antes, depois: lab, motivo: m });
      return this._dtoLaboratorio(lab);
    });
  }

  listarFornecedores(filtros = {}) {
    this.ctxLeitura();
    let lista = this.estado.fornecedores;
    if (filtros.busca) lista = lista.filter((f) => contem(f.razaoSocial, filtros.busca) || f.cnpj.includes(String(filtros.busca).replace(/\D/g, '')));
    if (filtros.ativo !== undefined && filtros.ativo !== null && filtros.ativo !== '') {
      const ativo = filtros.ativo === true || filtros.ativo === 'true';
      lista = lista.filter((f) => f.ativo === ativo);
    }
    lista = ordenarPor(lista, filtros.ordenarPor ?? 'razaoSocial', filtros.direcao ?? 'asc');
    const pagina = paginar(lista, filtros.pagina ?? 1, filtros.tamanho ?? 50);
    return { ...pagina, itens: pagina.itens.map((f) => this._dtoFornecedor(f)) };
  }

  obterFornecedor(id) {
    this.ctxLeitura();
    return this._dtoFornecedor(localizar(this.estado, 'fornecedores', id, 'Fornecedor'));
  }

  _validarFornecedor(dados, id = null) {
    const v = new Validador();
    const razaoSocial = v.texto('razaoSocial', dados.razaoSocial, { min: 3, max: LIMITES.NOME_LONGO, rotulo: 'Razão social' });
    const cnpj = v.cnpj('cnpj', dados.cnpj);
    const telefone = v.telefone('telefone', dados.telefone);
    const email = v.email('email', dados.email);
    v.manual('cnpj', !this.estado.fornecedores.some((f) => f.id !== Number(id) && f.cnpj === cnpj), 'Já existe um fornecedor com este CNPJ.');
    v.lancar();
    return { razaoSocial, cnpj, telefone, email };
  }

  criarFornecedor(dados) {
    const ctx = this.ctx(PERMISSOES.FORNECEDORES_GERENCIAR);
    const valores = this._validarFornecedor(dados);
    return this._mutar(() => {
      const id = proximoId(this.estado, 'fornecedores');
      const fornecedor = { id, ...valores, ativo: true, observacoes: dados.observacoes ?? null, criadoEm: this.agora, atualizadoEm: this.agora };
      this.estado.fornecedores.push(fornecedor);
      this._registrarLog(ctx, { acao: ACOES_LOG.CRIAR, tabela: 'fornecedores', registroId: id, depois: fornecedor, motivo: 'Cadastro de fornecedor' });
      return this._dtoFornecedor(fornecedor);
    });
  }

  atualizarFornecedor(id, dados) {
    const ctx = this.ctx(PERMISSOES.FORNECEDORES_GERENCIAR);
    const fornecedor = localizar(this.estado, 'fornecedores', id, 'Fornecedor');
    const motivo = exigirMotivo(dados.motivo);
    const valores = this._validarFornecedor({ ...fornecedor, ...dados }, id);
    return this._mutar(() => {
      const antes = clonar(fornecedor);
      Object.assign(fornecedor, valores, { observacoes: dados.observacoes ?? fornecedor.observacoes, atualizadoEm: this.agora });
      this._registrarLog(ctx, { acao: ACOES_LOG.ATUALIZAR, tabela: 'fornecedores', registroId: id, antes, depois: fornecedor, motivo });
      return this._dtoFornecedor(fornecedor);
    });
  }

  inativarFornecedor(id, motivo) {
    const ctx = this.ctx(PERMISSOES.FORNECEDORES_GERENCIAR);
    const fornecedor = localizar(this.estado, 'fornecedores', id, 'Fornecedor');
    const m = exigirMotivo(motivo);
    const pendentes = this.estado.eventos.filter((e) => e.fornecedorId === fornecedor.id && e.situacao === SITUACOES_EVENTO.AGENDADO);
    if (pendentes.length) throw ErroApp.regra(`Não é possível inativar: há ${pendentes.length} evento(s) agendado(s) vinculado(s) a este fornecedor.`);
    return this._mutar(() => {
      const antes = clonar(fornecedor);
      fornecedor.ativo = false;
      fornecedor.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.INATIVAR, tabela: 'fornecedores', registroId: id, antes, depois: fornecedor, motivo: m });
      return this._dtoFornecedor(fornecedor);
    });
  }

  reativarFornecedor(id, motivo) {
    const ctx = this.ctx(PERMISSOES.FORNECEDORES_GERENCIAR);
    const fornecedor = localizar(this.estado, 'fornecedores', id, 'Fornecedor');
    const m = exigirMotivo(motivo);
    return this._mutar(() => {
      const antes = clonar(fornecedor);
      fornecedor.ativo = true;
      fornecedor.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.REATIVAR, tabela: 'fornecedores', registroId: id, antes, depois: fornecedor, motivo: m });
      return this._dtoFornecedor(fornecedor);
    });
  }

  listarCategorias(filtros = {}) {
    this.ctxLeitura();
    let lista = this.estado.categorias;
    if (filtros.busca) lista = lista.filter((c) => contem(c.nome, filtros.busca));
    if (filtros.ativo !== undefined && filtros.ativo !== null && filtros.ativo !== '') {
      const ativo = filtros.ativo === true || filtros.ativo === 'true';
      lista = lista.filter((c) => c.ativo === ativo);
    }
    lista = ordenarPor(lista, filtros.ordenarPor ?? 'ordem', filtros.direcao ?? 'asc');
    return {
      itens: lista.map((c) => {
        const subs = this.estado.subcategorias.filter((s) => s.categoriaId === c.id);
        return {
          ...c,
          subcategorias: subs.map((s) => ({ ...s, itens: this.estado.itens.filter((i) => i.subcategoriaId === s.id).length })),
          totalItens: this.estado.itens.filter((i) => i.categoriaId === c.id).length
        };
      }),
      total: lista.length
    };
  }

  _validarCategoria(dados, id = null) {
    const v = new Validador();
    const nome = v.texto('nome', dados.nome, { min: 2, max: 120, rotulo: 'Nome da categoria' });
    const descricao = v.texto('descricao', dados.descricao, { obrigatorio: false, max: LIMITES.DESCRICAO, rotulo: 'Descrição' });
    v.manual('nome', !this.estado.categorias.some((c) => c.id !== Number(id) && mesmo(c.nome, nome)), 'Já existe uma categoria com este nome.');
    v.lancar();
    return { nome, descricao: descricao ?? null };
  }

  criarCategoria(dados) {
    const ctx = this.ctx(PERMISSOES.CATALOGO_GERENCIAR);
    const valores = this._validarCategoria(dados);
    return this._mutar(() => {
      const id = proximoId(this.estado, 'categorias');
      const categoria = { id, ...valores, ordem: this.estado.categorias.length + 1, ativo: true, criadoEm: this.agora, atualizadoEm: this.agora };
      this.estado.categorias.push(categoria);
      this._registrarLog(ctx, { acao: ACOES_LOG.CRIAR, tabela: 'categorias', registroId: id, depois: categoria, motivo: 'Cadastro de categoria' });
      return categoria;
    });
  }

  atualizarCategoria(id, dados) {
    const ctx = this.ctx(PERMISSOES.CATALOGO_GERENCIAR);
    const categoria = localizar(this.estado, 'categorias', id, 'Categoria');
    const motivo = exigirMotivo(dados.motivo);
    const valores = this._validarCategoria({ ...categoria, ...dados }, id);
    return this._mutar(() => {
      const antes = clonar(categoria);
      Object.assign(categoria, valores, { atualizadoEm: this.agora });
      this._registrarLog(ctx, { acao: ACOES_LOG.ATUALIZAR, tabela: 'categorias', registroId: id, antes, depois: categoria, motivo });
      return categoria;
    });
  }

  inativarCategoria(id, motivo) {
    const ctx = this.ctx(PERMISSOES.CATALOGO_GERENCIAR);
    const categoria = localizar(this.estado, 'categorias', id, 'Categoria');
    const m = exigirMotivo(motivo);
    const itens = this.estado.itens.filter((i) => i.categoriaId === categoria.id && i.ativo);
    if (itens.length) throw ErroApp.regra(`Não é possível inativar: há ${itens.length} item(ns) ativo(s) nesta categoria.`);
    const subs = this.estado.subcategorias.filter((s) => s.categoriaId === categoria.id && s.ativo);
    if (subs.length) throw ErroApp.regra(`Não é possível inativar: há ${subs.length} subcategoria(s) ativa(s).`);
    return this._mutar(() => {
      const antes = clonar(categoria);
      categoria.ativo = false;
      categoria.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.INATIVAR, tabela: 'categorias', registroId: id, antes, depois: categoria, motivo: m });
      return categoria;
    });
  }

  reativarCategoria(id, motivo) {
    const ctx = this.ctx(PERMISSOES.CATALOGO_GERENCIAR);
    const categoria = localizar(this.estado, 'categorias', id, 'Categoria');
    const m = exigirMotivo(motivo);
    return this._mutar(() => {
      const antes = clonar(categoria);
      categoria.ativo = true;
      categoria.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.REATIVAR, tabela: 'categorias', registroId: id, antes, depois: categoria, motivo: m });
      return categoria;
    });
  }

  listarSubcategorias(filtros = {}) {
    this.ctxLeitura();
    let lista = this.estado.subcategorias;
    if (filtros.categoriaId) lista = lista.filter((s) => s.categoriaId === Number(filtros.categoriaId));
    if (filtros.busca) lista = lista.filter((s) => contem(s.nome, filtros.busca));
    if (filtros.ativo !== undefined && filtros.ativo !== null && filtros.ativo !== '') {
      const ativo = filtros.ativo === true || filtros.ativo === 'true';
      lista = lista.filter((s) => s.ativo === ativo);
    }
    return {
      itens: lista.map((s) => ({
        ...s,
        categoriaNome: this.estado.categorias.find((c) => c.id === s.categoriaId)?.nome ?? null,
        totalItens: this.estado.itens.filter((i) => i.subcategoriaId === s.id).length
      })),
      total: lista.length
    };
  }

  _validarSubcategoria(dados, id = null) {
    const v = new Validador();
    const nome = v.texto('nome', dados.nome, { min: 2, max: 120, rotulo: 'Nome da subcategoria' });
    const categoriaId = v.inteiro('categoriaId', dados.categoriaId, { min: 1, rotulo: 'Categoria' });
    const descricao = v.texto('descricao', dados.descricao, { obrigatorio: false, max: LIMITES.DESCRICAO, rotulo: 'Descrição' });
    if (categoriaId && !this.estado.categorias.some((c) => c.id === categoriaId)) v.falhar('categoriaId', 'Categoria inválida.');
    v.manual('nome', !this.estado.subcategorias.some((s) => s.id !== Number(id) && s.categoriaId === categoriaId && mesmo(s.nome, nome)), 'Já existe uma subcategoria com este nome nesta categoria.');
    v.lancar();
    return { nome, categoriaId, descricao: descricao ?? null };
  }

  criarSubcategoria(dados) {
    const ctx = this.ctx(PERMISSOES.CATALOGO_GERENCIAR);
    const valores = this._validarSubcategoria(dados);
    return this._mutar(() => {
      const id = proximoId(this.estado, 'subcategorias');
      const sub = { id, ...valores, ativo: true, criadoEm: this.agora, atualizadoEm: this.agora };
      this.estado.subcategorias.push(sub);
      this._registrarLog(ctx, { acao: ACOES_LOG.CRIAR, tabela: 'subcategorias', registroId: id, depois: sub, motivo: 'Cadastro de subcategoria' });
      return sub;
    });
  }

  atualizarSubcategoria(id, dados) {
    const ctx = this.ctx(PERMISSOES.CATALOGO_GERENCIAR);
    const sub = localizar(this.estado, 'subcategorias', id, 'Subcategoria');
    const motivo = exigirMotivo(dados.motivo);
    const valores = this._validarSubcategoria({ ...sub, ...dados }, id);
    return this._mutar(() => {
      const antes = clonar(sub);
      Object.assign(sub, valores, { atualizadoEm: this.agora });
      this._registrarLog(ctx, { acao: ACOES_LOG.ATUALIZAR, tabela: 'subcategorias', registroId: id, antes, depois: sub, motivo });
      return sub;
    });
  }

  inativarSubcategoria(id, motivo) {
    const ctx = this.ctx(PERMISSOES.CATALOGO_GERENCIAR);
    const sub = localizar(this.estado, 'subcategorias', id, 'Subcategoria');
    const m = exigirMotivo(motivo);
    const itens = this.estado.itens.filter((i) => i.subcategoriaId === sub.id && i.ativo);
    if (itens.length) throw ErroApp.regra(`Não é possível inativar: há ${itens.length} item(ns) ativo(s) nesta subcategoria.`);
    return this._mutar(() => {
      const antes = clonar(sub);
      sub.ativo = false;
      sub.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.INATIVAR, tabela: 'subcategorias', registroId: id, antes, depois: sub, motivo: m });
      return sub;
    });
  }

  reativarSubcategoria(id, motivo) {
    const ctx = this.ctx(PERMISSOES.CATALOGO_GERENCIAR);
    const sub = localizar(this.estado, 'subcategorias', id, 'Subcategoria');
    const m = exigirMotivo(motivo);
    return this._mutar(() => {
      const antes = clonar(sub);
      sub.ativo = true;
      sub.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.REATIVAR, tabela: 'subcategorias', registroId: id, antes, depois: sub, motivo: m });
      return sub;
    });
  }

  listarItens(filtros = {}) {
    this.ctx(PERMISSOES.ITENS_CONSULTAR);
    const indices = this._indices();
    let lista = this.estado.itens;
    if (filtros.busca) lista = lista.filter((i) => contem(i.nome, filtros.busca) || contem(i.fabricante, filtros.busca) || contem(i.modelo, filtros.busca));
    if (filtros.categoriaId) lista = lista.filter((i) => i.categoriaId === Number(filtros.categoriaId));
    if (filtros.subcategoriaId) lista = lista.filter((i) => i.subcategoriaId === Number(filtros.subcategoriaId));
    if (filtros.ativo !== undefined && filtros.ativo !== null && filtros.ativo !== '') {
      const ativo = filtros.ativo === true || filtros.ativo === 'true';
      lista = lista.filter((i) => i.ativo === ativo);
    }
    lista = ordenarPor(lista, filtros.ordenarPor ?? 'nome', filtros.direcao ?? 'asc');
    const pagina = paginar(lista, filtros.pagina ?? 1, filtros.tamanho ?? 25);
    return {
      ...pagina,
      itens: pagina.itens.map((i) => ({
        ...this._dtoItem(i, indices),
        equipamentosAtivos: this.estado.equipamentos.filter((e) => e.itemId === i.id && e.situacao === SITUACOES_EQUIPAMENTO.ATIVO).length,
        equipamentosTotal: this.estado.equipamentos.filter((e) => e.itemId === i.id).length
      }))
    };
  }

  obterItem(id) {
    this.ctx(PERMISSOES.ITENS_CONSULTAR);
    const indices = this._indices();
    const item = localizar(this.estado, 'itens', id, 'Item');
    return {
      ...this._dtoItem(item, indices),
      equipamentos: this.estado.equipamentos
        .filter((e) => e.itemId === item.id)
        .map((e) => ({ id: e.id, tag: e.tag, laboratorioId: e.laboratorioId, situacao: e.situacao }))
    };
  }

  _validarItem(dados, id = null) {
    const itemAtual = id ? this.estado.itens.find((i) => i.id === Number(id)) : null;
    const parcial = Boolean(itemAtual && itemAtual.origem === 'IMPORTADO');
    const v = new Validador();
    const nome = v.texto('nome', dados.nome, { min: 2, max: LIMITES.NOME_LONGO, rotulo: 'Nome' });
    const descricao = v.texto('descricao', dados.descricao, { min: 2, max: LIMITES.DESCRICAO, rotulo: 'Descrição' });
    const fabricante = v.texto('fabricante', dados.fabricante, { min: 1, max: 120, rotulo: 'Fabricante' });
    const modelo = v.texto('modelo', dados.modelo, { obrigatorio: !parcial, max: 120, rotulo: 'Modelo' });
    const subcategoriaId = v.inteiro('subcategoriaId', dados.subcategoriaId, { min: 1, rotulo: 'Subcategoria' });
    const caCalibracao = v.decimal('caCalibracao', dados.caCalibracao, { min: 0.000001, rotulo: 'CA de calibração' });
    const caVerificacao = v.decimal('caVerificacao', dados.caVerificacao, { obrigatorio: !parcial, min: 0.000001, rotulo: 'CA de verificação' });
    const perCal = v.inteiro('periodicidadeCalibracaoMeses', dados.periodicidadeCalibracaoMeses, { min: 0, max: 1200, rotulo: 'Periodicidade de calibração (meses)' });
    const perVer = v.inteiro('periodicidadeVerificacaoMeses', dados.periodicidadeVerificacaoMeses, { obrigatorio: !parcial, min: 0, max: 1200, rotulo: 'Periodicidade de verificação (meses)' });
    const perPmp = v.inteiro('periodicidadeManutencaoPreventivaMeses', dados.periodicidadeManutencaoPreventivaMeses ?? 0, { min: 0, max: 1200, rotulo: 'Periodicidade de manutenção (meses)' });
    const tipoIndicacao = dados.tipoIndicacao
      ? v.enum('tipoIndicacao', dados.tipoIndicacao, Object.values(TIPOS_INDICACAO), { rotulo: 'Tipo de indicação' })
      : null;
    if (subcategoriaId) {
      const sub = this.estado.subcategorias.find((s) => s.id === subcategoriaId);
      if (!sub) v.falhar('subcategoriaId', 'Subcategoria inválida.');
      else if (!sub.ativo) v.falhar('subcategoriaId', 'A subcategoria está inativa.');
    }
    v.lancar();
    return {
      nome, descricao, fabricante, modelo: modelo ?? null, subcategoriaId,
      categoriaId: this.estado.subcategorias.find((s) => s.id === subcategoriaId)?.categoriaId ?? null,
      capacidadeMedicao: dados.capacidadeMedicao ?? null,
      resolucao: dados.resolucao ?? null,
      tipoIndicacao,
      caCalibracao, caVerificacao, periodicidadeCalibracaoMeses: perCal,
      periodicidadeVerificacaoMeses: perVer, periodicidadeManutencaoPreventivaMeses: perPmp,
      parametrosEstimados: []
    };
  }

  criarItem(dados) {
    const ctx = this.ctx(PERMISSOES.ITENS_GERENCIAR);
    const valores = this._validarItem(dados);
    return this._mutar(() => {
      const id = proximoId(this.estado, 'itens');
      const item = { id, ...valores, origem: 'MANUAL', ativo: true, criadoEm: this.agora, atualizadoEm: this.agora };
      this.estado.itens.push(item);
      this._registrarLog(ctx, { acao: ACOES_LOG.CRIAR, tabela: 'itens', registroId: id, depois: item, motivo: 'Cadastro de item' });
      return this._dtoItem(item, this._indices());
    });
  }

  atualizarItem(id, dados) {
    const ctx = this.ctx(PERMISSOES.ITENS_GERENCIAR);
    const item = localizar(this.estado, 'itens', id, 'Item');
    const motivo = exigirMotivo(dados.motivo);
    const valores = this._validarItem({ ...item, ...dados }, id);
    return this._mutar(() => {
      const antes = clonar(item);
      Object.assign(item, valores, { atualizadoEm: this.agora });
      this._registrarLog(ctx, { acao: ACOES_LOG.ATUALIZAR, tabela: 'itens', registroId: id, antes, depois: item, motivo });
      return this._dtoItem(item, this._indices());
    });
  }

  inativarItem(id, motivo) {
    const ctx = this.ctx(PERMISSOES.ITENS_GERENCIAR);
    const item = localizar(this.estado, 'itens', id, 'Item');
    const m = exigirMotivo(motivo);
    const equipamentos = this.estado.equipamentos.filter((e) => e.itemId === item.id && e.situacao !== SITUACOES_EQUIPAMENTO.INATIVO);
    if (equipamentos.length) throw ErroApp.regra(`Não é possível inativar: há ${equipamentos.length} equipamento(s) ativo(s) ou em manutenção vinculado(s) a este item.`);
    return this._mutar(() => {
      const antes = clonar(item);
      item.ativo = false;
      item.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.INATIVAR, tabela: 'itens', registroId: id, antes, depois: item, motivo: m });
      return this._dtoItem(item, this._indices());
    });
  }

  reativarItem(id, motivo) {
    const ctx = this.ctx(PERMISSOES.ITENS_GERENCIAR);
    const item = localizar(this.estado, 'itens', id, 'Item');
    const m = exigirMotivo(motivo);
    const sub = this.estado.subcategorias.find((s) => s.id === item.subcategoriaId);
    if (sub && !sub.ativo) throw ErroApp.regra('A subcategoria do item está inativa. Reative-a primeiro.');
    return this._mutar(() => {
      const antes = clonar(item);
      item.ativo = true;
      item.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.REATIVAR, tabela: 'itens', registroId: id, antes, depois: item, motivo: m });
      return this._dtoItem(item, this._indices());
    });
  }

  listarEquipamentos(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.EQUIPAMENTOS_CONSULTAR);
    const indices = this._indices();
    const escopo = this.escopoLaboratorio(ctx.usuario, filtros.laboratorioId);
    let base = this.estado.equipamentos.filter((e) => escopo === null || e.laboratorioId === escopo);

    if (filtros.situacao) base = base.filter((e) => e.situacao === filtros.situacao);
    if (filtros.itemId) base = base.filter((e) => e.itemId === Number(filtros.itemId));
    if (filtros.completude) base = base.filter((e) => (e.completude ?? 'COMPLETA') === filtros.completude);
    if (filtros.busca) {
      const termo = filtros.busca;
      base = base.filter((e) => {
        const item = indices.itens.get(e.itemId);
        return contem(e.tag, termo) || contem(e.tagOriginal, termo) || contem(e.patrimonio, termo)
          || contem(e.numeroSerie, termo) || contem(item?.nome, termo) || contem(item?.fabricante, termo);
      });
    }
    if (filtros.categoriaId || filtros.subcategoriaId) {
      base = base.filter((e) => {
        const item = indices.itens.get(e.itemId);
        if (!item) return false;
        if (filtros.categoriaId && item.categoriaId !== Number(filtros.categoriaId)) return false;
        if (filtros.subcategoriaId && item.subcategoriaId !== Number(filtros.subcategoriaId)) return false;
        return true;
      });
    }

    let dtos = base.map((e) => this._dtoEquipamento(e, indices));

    if (filtros.sinal) {
      const sinal = String(filtros.sinal);
      dtos = dtos.filter((d) => d.sinalizacoes.some((s) => s.codigo === sinal));
    }
    if (filtros.statusCalibracao) dtos = dtos.filter((d) => d.statusCalibracao === filtros.statusCalibracao);
    if (filtros.vencidos === true || filtros.vencidos === 'true') {
      dtos = dtos.filter((d) => d.sinalizacoes.some((s) => s.codigo === SINALIZACOES.CALIBRACAO_VENCIDA));
    }

    const resumo = {
      total: dtos.length,
      ativos: dtos.filter((d) => d.situacao === SITUACOES_EQUIPAMENTO.ATIVO).length,
      inativos: dtos.filter((d) => d.situacao === SITUACOES_EQUIPAMENTO.INATIVO).length,
      emManutencao: dtos.filter((d) => d.situacao === SITUACOES_EQUIPAMENTO.EM_MANUTENCAO).length,
      parciais: dtos.filter((d) => d.completude === 'PARCIAL').length,
      sinalizados: dtos.filter((d) => d.sinalizacoes.length > 0).length,
      calibracoesVencidas: dtos.filter((d) => d.sinalizacoes.some((s) => s.codigo === SINALIZACOES.CALIBRACAO_VENCIDA)).length
    };

    const ordenar = filtros.ordenarPor ?? 'tag';
    if (ordenar === 'diasParaVencimento') {
      dtos.sort((a, b) => {
        const va = a.diasParaVencimento === null ? Number.POSITIVE_INFINITY : a.diasParaVencimento;
        const vb = b.diasParaVencimento === null ? Number.POSITIVE_INFINITY : b.diasParaVencimento;
        return va - vb;
      });
    } else if (ordenar === 'proximaCalibracao') {
      dtos.sort((a, b) => String(a.proximaCalibracao ?? '9999').localeCompare(String(b.proximaCalibracao ?? '9999')));
    } else {
      dtos = ordenarPor(dtos, ordenar, filtros.direcao ?? 'asc');
    }

    const pagina = paginar(dtos, filtros.pagina ?? 1, filtros.tamanho ?? 25);
    return { ...pagina, resumo };
  }

  obterEquipamento(id) {
    const ctx = this.ctx(PERMISSOES.EQUIPAMENTOS_CONSULTAR);
    const equipamento = localizar(this.estado, 'equipamentos', id, 'Equipamento');
    if (!podeVerLaboratorio(ctx.usuario, equipamento.laboratorioId)) throw ErroApp.naoEncontrado('Equipamento', id);
    const indices = this._indices();
    const dto = this._dtoEquipamento(equipamento, indices);
    const eventos = (indices.eventosPorEquipamento.get(equipamento.id) ?? [])
      .slice()
      .sort((a, b) => String(b.dataRealizacao ?? b.dataPrevista ?? '').localeCompare(String(a.dataRealizacao ?? a.dataPrevista ?? '')))
      .slice(0, 100)
      .map((e) => this._dtoEvento(e, indices));
    return { ...dto, eventos, solicitacoes: this.estado.solicitacoes.filter((s) => s.equipamentoId === equipamento.id).map((s) => this._dtoSolicitacao(s, indices)) };
  }

  _validarEquipamento(dados, id = null) {
    const atual = id ? this.estado.equipamentos.find((e) => e.id === Number(id)) : null;
    const parcial = Boolean(atual && atual.completude === 'PARCIAL');
    const v = new Validador();
    const itemId = v.inteiro('itemId', dados.itemId, { min: 1, rotulo: 'Item' });
    const laboratorioId = v.inteiro('laboratorioId', dados.laboratorioId, { min: 1, rotulo: 'Laboratório' });
    const patrimonio = v.texto('patrimonio', dados.patrimonio, { obrigatorio: !parcial, max: 60, rotulo: 'Nº de patrimônio' });
    const tag = v.texto('tag', dados.tag, { min: 1, max: 80, rotulo: 'TAG' });
    const numeroSerie = v.texto('numeroSerie', dados.numeroSerie, { obrigatorio: !parcial, max: 120, rotulo: 'Nº de série' });
    const localizacao = v.texto('localizacao', dados.localizacao, { obrigatorio: !parcial, max: 200, rotulo: 'Localização' });
    const dataAquisicao = v.data('dataAquisicao', dados.dataAquisicao, { obrigatorio: !parcial, rotulo: 'Data de aquisição', max: this.hoje });
    const dataColocacaoUso = v.data('dataColocacaoUso', dados.dataColocacaoUso, { obrigatorio: !parcial, rotulo: 'Data de colocação em uso', max: this.hoje });
    const valor = v.decimal('valorAquisicaoCentavos', dados.valorAquisicaoCentavos ?? null, { obrigatorio: !parcial, min: 0, rotulo: 'Valor de aquisição' });
    const caCalibracao = v.decimal('caCalibracao', dados.caCalibracao ?? null, { obrigatorio: false, min: 0.000001, rotulo: 'CA de calibração' });
    const caVerificacao = v.decimal('caVerificacao', dados.caVerificacao ?? null, { obrigatorio: false, min: 0.000001, rotulo: 'CA de verificação' });
    const perCal = v.inteiro('periodicidadeCalibracaoMeses', dados.periodicidadeCalibracaoMeses ?? null, { obrigatorio: false, min: 0, max: 1200, rotulo: 'Periodicidade de calibração' });
    const perVer = v.inteiro('periodicidadeVerificacaoMeses', dados.periodicidadeVerificacaoMeses ?? null, { obrigatorio: false, min: 0, max: 1200, rotulo: 'Periodicidade de verificação' });
    const perPmp = v.inteiro('periodicidadeManutencaoPreventivaMeses', dados.periodicidadeManutencaoPreventivaMeses ?? null, { obrigatorio: false, min: 0, max: 1200, rotulo: 'Periodicidade de manutenção preventiva' });

    const item = itemId ? this.estado.itens.find((i) => i.id === itemId) : null;
    if (!item) v.falhar('itemId', 'Item inválido.');
    else if (!item.ativo) v.falhar('itemId', 'O item está inativo.');
    const lab = laboratorioId ? this.estado.laboratorios.find((l) => l.id === laboratorioId) : null;
    if (!lab) v.falhar('laboratorioId', 'Laboratório inválido.');
    else if (!lab.ativo) v.falhar('laboratorioId', 'O laboratório está inativo.');
    if (atual && Number(dados.laboratorioId) !== atual.laboratorioId) {
      v.falhar('laboratorioId', 'O laboratório do equipamento não pode ser alterado. Inative e recadastre se necessário.');
    }

    if (tag) {
      const duplicada = this.estado.equipamentos.some(
        (e) => e.id !== Number(id) && e.laboratorioId === laboratorioId && mesmo(e.tag, tag)
      );
      if (duplicada) v.falhar('tag', 'Já existe um equipamento com esta TAG neste laboratório.');
    }
    if (patrimonio) {
      const duplicado = this.estado.equipamentos.some((e) => e.id !== Number(id) && e.patrimonio && mesmo(e.patrimonio, patrimonio));
      if (duplicado) v.falhar('patrimonio', 'Já existe um equipamento com este patrimônio.');
    }
    if (numeroSerie) {
      const duplicado = this.estado.equipamentos.some((e) => e.id !== Number(id) && e.numeroSerie && mesmo(e.numeroSerie, numeroSerie));
      if (duplicado) v.falhar('numeroSerie', 'Já existe um equipamento com este número de série.');
    }
    if (dataAquisicao && dataColocacaoUso && dataAquisicao > dataColocacaoUso) {
      v.falhar('dataColocacaoUso', 'A data de colocação em uso não pode ser anterior à data de aquisição.');
    }
    v.lancar();

    return {
      itemId,
      laboratorioId,
      patrimonio: patrimonio ?? null,
      tag,
      tagOriginal: atual?.tagOriginal ?? tag,
      numeroSerie: numeroSerie ?? null,
      localizacao: localizacao ?? null,
      dataAquisicao: dataAquisicao ?? null,
      dataColocacaoUso: dataColocacaoUso ?? null,
      valorAquisicaoCentavos: valor === null ? null : Math.round(valor),
      caCalibracao: caCalibracao ?? null,
      caVerificacao: caVerificacao ?? null,
      periodicidadeCalibracaoMeses: perCal,
      periodicidadeVerificacaoMeses: perVer,
      periodicidadeManutencaoPreventivaMeses: perPmp
    };
  }

  criarEquipamento(dados) {
    const ctx = this.ctx(PERMISSOES.EQUIPAMENTOS_GERENCIAR);
    exigirGestorLaboratorio(ctx.usuario);
    const escopo = this.escopoLaboratorio(ctx.usuario, dados.laboratorioId, { escrita: true });
    if (escopo !== Number(dados.laboratorioId)) throw ErroApp.permissao('Cadastre equipamentos apenas no seu laboratório.');
    const valores = this._validarEquipamento({ ...dados, laboratorioId: escopo });
    return this._mutar(() => {
      const id = proximoId(this.estado, 'equipamentos');
      const equipamento = {
        id,
        ...valores,
        situacao: SITUACOES_EQUIPAMENTO.ATIVO,
        origem: 'MANUAL',
        completude: 'COMPLETA',
        camposPendentes: [],
        observacoes: dados.observacoes ?? null,
        fonte: null,
        criadoEm: this.agora,
        atualizadoEm: this.agora
      };
      equipamento.camposPendentes = camposPendentesEquipamento(equipamento);
      equipamento.completude = equipamento.camposPendentes.length ? 'PARCIAL' : 'COMPLETA';
      this.estado.equipamentos.push(equipamento);
      this._registrarLog(ctx, {
        acao: ACOES_LOG.CRIAR, tabela: 'equipamentos', registroId: id, depois: equipamento, motivo: dados.motivo ?? 'Cadastro de equipamento'
      });
      return this._dtoEquipamento(equipamento, this._indices());
    });
  }

  atualizarEquipamento(id, dados) {
    const ctx = this.ctx(PERMISSOES.EQUIPAMENTOS_GERENCIAR);
    exigirGestorLaboratorio(ctx.usuario);
    const equipamento = localizar(this.estado, 'equipamentos', id, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    const motivo = exigirMotivo(dados.motivo);
    if (dados.situacao && dados.situacao !== equipamento.situacao) {
      throw ErroApp.regra('A situação operacional é alterada por inativação ou por evento de manutenção corretiva.');
    }
    const valores = this._validarEquipamento({ ...equipamento, ...dados }, id);
    return this._mutar(() => {
      const antes = clonar(equipamento);
      Object.assign(equipamento, valores, {
        observacoes: dados.observacoes ?? equipamento.observacoes,
        atualizadoEm: this.agora
      });
      equipamento.camposPendentes = camposPendentesEquipamento(equipamento);
      equipamento.completude = equipamento.camposPendentes.length ? 'PARCIAL' : 'COMPLETA';
      this._registrarLog(ctx, { acao: ACOES_LOG.ATUALIZAR, tabela: 'equipamentos', registroId: id, antes, depois: equipamento, motivo });
      return this._dtoEquipamento(equipamento, this._indices());
    });
  }

  inativarEquipamento(id, motivo) {
    const ctx = this.ctx(PERMISSOES.EQUIPAMENTOS_GERENCIAR);
    exigirGestorLaboratorio(ctx.usuario);
    const equipamento = localizar(this.estado, 'equipamentos', id, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    const m = exigirMotivo(motivo);
    const agendados = this.estado.eventos.filter((e) => e.equipamentoId === equipamento.id && e.situacao === SITUACOES_EVENTO.AGENDADO);
    if (agendados.length) throw ErroApp.regra(`Existem ${agendados.length} evento(s) agendado(s). Cancele-os antes de inativar o equipamento.`);
    return this._mutar(() => {
      const antes = clonar(equipamento);
      equipamento.situacao = SITUACOES_EQUIPAMENTO.INATIVO;
      equipamento.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.INATIVAR, tabela: 'equipamentos', registroId: id, antes, depois: equipamento, motivo: m });
      return this._dtoEquipamento(equipamento, this._indices());
    });
  }

  reativarEquipamento(id, motivo) {
    const ctx = this.ctx(PERMISSOES.EQUIPAMENTOS_GERENCIAR);
    exigirGestorLaboratorio(ctx.usuario);
    const equipamento = localizar(this.estado, 'equipamentos', id, 'Equipamento');
    this.escopoLaboratorio(ctx.usuario, equipamento.laboratorioId, { escrita: true });
    const m = exigirMotivo(motivo);
    const item = this.estado.itens.find((i) => i.id === equipamento.itemId);
    if (!item?.ativo) throw ErroApp.regra('O item do equipamento está inativo. Reative o item primeiro.');
    return this._mutar(() => {
      const antes = clonar(equipamento);
      equipamento.situacao = SITUACOES_EQUIPAMENTO.ATIVO;
      equipamento.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.REATIVAR, tabela: 'equipamentos', registroId: id, antes, depois: equipamento, motivo: m });
      return this._dtoEquipamento(equipamento, this._indices());
    });
  }

  historicoEquipamento(id, filtros = {}) {
    const ctx = this.ctx(PERMISSOES.EVENTOS_CONSULTAR);
    const equipamento = localizar(this.estado, 'equipamentos', id, 'Equipamento');
    if (!podeVerLaboratorio(ctx.usuario, equipamento.laboratorioId)) throw ErroApp.naoEncontrado('Equipamento', id);
    const indices = this._indices();
    let eventos = indices.eventosPorEquipamento.get(equipamento.id) ?? [];
    if (filtros.tipo) eventos = eventos.filter((e) => e.tipo === filtros.tipo);
    if (filtros.situacao) eventos = eventos.filter((e) => e.situacao === filtros.situacao);
    if (filtros.de) eventos = eventos.filter((e) => (e.dataRealizacao ?? e.dataPrevista ?? '') >= filtros.de);
    if (filtros.ate) eventos = eventos.filter((e) => (e.dataRealizacao ?? e.dataPrevista ?? '') <= filtros.ate);
    eventos = eventos.slice().sort((a, b) => String(b.dataRealizacao ?? b.dataPrevista ?? '').localeCompare(String(a.dataRealizacao ?? a.dataPrevista ?? '')));
    const dto = this._dtoEquipamento(equipamento, indices);
    return { equipamento: dto, itens: eventos.map((e) => this._dtoEvento(e, indices)), total: eventos.length };
  }

  listarEquipamentosSinalizados(filtros = {}) {
    return this.listarEquipamentos({ ...filtros, sinal: filtros.sinal ?? SINALIZACOES.CALIBRACAO_VENCIDA });
  }

}
