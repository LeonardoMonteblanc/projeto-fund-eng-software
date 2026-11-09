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

import { ApplicationCore } from './application-core.js';
import { AVISO_PRIVACIDADE } from '../domain/lgpd.js';

export class IdentityApplication extends ApplicationCore {

  async login(email, senha) {
    const resultado = await this.sessoes.entrar(email, senha);
    if (!resultado.ok) {
      const usuario = this.estado.usuarios.find((u) => u.email === normalizarEmail(email));
      this._mutar(() => {
        this._registrarLog(
          { usuario: usuario ?? null, ip: 'local (POC estático)' },
          {
            acao: ACOES_LOG.LOGIN_FALHA,
            tabela: 'usuarios',
            registroId: usuario?.id ?? null,
            antes: null,
            depois: { email: normalizarEmail(email), motivo: resultado.motivo },
            motivo: 'Tentativa de login malsucedida'
          }
        );
      });
      throw new ErroApp(CODIGOS_ERRO.NAO_AUTENTICADO, 'E-mail ou senha inválidos.');
    }

    const ctx = { usuario: resultado.usuario, ip: this.sessoes._registro?.ip ?? 'local (POC estático)' };
    this._mutar(() => {
      resultado.usuario.ultimoAcessoEm = this.agora;
      this._registrarLog(ctx, {
        acao: ACOES_LOG.LOGIN,
        tabela: 'usuarios',
        registroId: resultado.usuario.id,
        antes: null,
        depois: { perfil: resultado.usuario.perfil, laboratorioId: resultado.usuario.laboratorioId ?? null },
        motivo: 'Login realizado'
      });
    });
    return {
      token: resultado.token,
      usuario: this._dtoUsuario(resultado.usuario, this._indices())
    };
  }

  async logout(motivo = 'Logout solicitado pelo usuário') {
    try {
      const ctx = this.ctx(null);
      this._mutar(() => {
        this._registrarLog(ctx, {
          acao: ACOES_LOG.LOGOUT,
          tabela: 'usuarios',
          registroId: ctx.usuario.id,
          antes: null,
          depois: null,
          motivo
        });
      });
    } catch { /* sessão já expirada */ }
    await this.sessoes.sair();
    return { ok: true };
  }

  sessao() {
    const { usuario } = this.ctx(null);
    const indices = this._indices();
    return {
      usuario: this._dtoUsuario(usuario, indices),
      segundosRestantes: this.sessoes.segundosRestantes(),
      timeoutMinutos: Number(this.parametros.timeoutSessaoMinutos ?? 30),
      permissoes: this.permissoesDoUsuario(usuario),
      funcionalidades: funcionalidadesPara(usuario)
    };
  }

  permissoesDoUsuario(usuario) {
    const modulo = this._permissoesDoPerfil(usuario.perfil);
    return modulo;
  }

  _permissoesDoPerfil(perfil) {
    return PERMISSOES_POR_PERFIL[perfil] ?? [];
  }

  infoMeta() {
    this.ctx(null);
    return {
      sistema: this.parametros.nomeSistema,
      sigla: 'LabUcs',
      versao: this.estado.meta.versaoApp,
      esquema: this.estado.esquema,
      geradoEm: this.estado.meta.criadoEm,
      atualizadoEm: this.estado.meta.atualizadoEm,
      origemBase: this.estado.meta.origemBase,
      contagens: {
        laboratorios: this.estado.laboratorios.length,
        usuarios: this.estado.usuarios.length,
        fornecedores: this.estado.fornecedores.length,
        itens: this.estado.itens.length,
        equipamentos: this.estado.equipamentos.length,
        eventos: this.estado.eventos.length,
        solicitacoes: this.estado.solicitacoes.length,
        logs: this.estado.logs.length
      }
    };
  }

  listarFuncionalidades() {
    const { usuario } = this.ctx(null);
    return funcionalidadesPara(usuario);
  }

  enums() {
    this.ctx(null);
    return {
      perfis: PERFIL_ROTULO,
      tiposEvento: TIPO_EVENTO_ROTULO,
      situacoesEvento: SITUACAO_EVENTO_ROTULO,
      situacoesSolicitacao: SITUACAO_SOLICITACAO_ROTULO,
      situacoesEquipamento: SITUACAO_EQUIPAMENTO_ROTULO,
      resultados: RESULTADO_ROTULO,
      estadosRetorno: ESTADOS_RETORNO,
      statusPrazo: STATUS_PRAZO_ROTULO,
      sinalizacoes: SINALIZACOES,
      tiposIndicacao: TIPO_INDICACAO_ROTULO,
      acoesLog: ACAO_LOG_ROTULO
    };
  }

  saude() {
    return {
      ok: true,
      persistencia: this.banco.erroPersistencia ? 'ERRO' : 'OK',
      erroPersistencia: this.banco.erroPersistencia ? String(this.banco.erroPersistencia.message) : null,
      autenticado: this.sessoes.ativa,
      agora: this.agora
    };
  }

  obterParametrosPublicos() {
    this.ctx(null);
    return {
      nomeSistema: this.parametros.nomeSistema,
      diasAlertaVencimento: this.parametros.diasAlertaVencimento,
      timeoutSessaoMinutos: this.parametros.timeoutSessaoMinutos,
      moeda: this.parametros.moeda
    };
  }

  listarUsuarios(filtros = {}) {
    const ctx = this.ctx(PERMISSOES.USUARIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const indices = this._indices();
    let lista = this.estado.usuarios;
    if (filtros.perfil) lista = lista.filter((u) => u.perfil === filtros.perfil);
    if (filtros.laboratorioId) lista = lista.filter((u) => u.laboratorioId === Number(filtros.laboratorioId));
    if (filtros.ativo !== undefined && filtros.ativo !== null && filtros.ativo !== '') {
      const ativo = filtros.ativo === true || filtros.ativo === 'true';
      lista = lista.filter((u) => u.ativo === ativo);
    }
    if (filtros.busca) lista = lista.filter((u) => contem(u.nome, filtros.busca) || contem(u.email, filtros.busca));
    lista = ordenarPor(lista, filtros.ordenarPor ?? 'nome', filtros.direcao ?? 'asc');
    const pagina = paginar(lista, filtros.pagina ?? 1, filtros.tamanho ?? 50);
    return { ...pagina, itens: pagina.itens.map((u) => this._dtoUsuario(u, indices)) };
  }

  obterUsuario(id) {
    const ctx = this.ctxLeitura();
    if (ctx.usuario.perfil !== PERFIS.ADMIN && ctx.usuario.id !== Number(id)) {
      throw ErroApp.permissao('Você só pode consultar seus próprios dados.');
    }
    const usuario = localizar(this.estado, 'usuarios', id, 'Usuário');
    return this._dtoUsuario(usuario, this._indices());
  }

  async _validarUsuario(dados, id = null) {
    const v = new Validador();
    const nome = v.texto('nome', dados.nome, { min: 3, max: LIMITES.NOME_CURTO, rotulo: 'Nome' });
    const email = v.email('email', dados.email);
    const perfil = v.enum('perfil', dados.perfil, Object.values(PERFIS), { rotulo: 'Perfil' });
    let laboratorioId = dados.laboratorioId ? Number(dados.laboratorioId) : null;
    if (perfil === PERFIS.GESTOR_LAB || perfil === PERFIS.TECNICO) {
      if (!laboratorioId) v.falhar('laboratorioId', 'Selecione o laboratório do usuário.');
      else if (!this.estado.laboratorios.some((l) => l.id === laboratorioId)) v.falhar('laboratorioId', 'Laboratório inválido.');
      else if (!this.estado.laboratorios.find((l) => l.id === laboratorioId)?.ativo) v.falhar('laboratorioId', 'O laboratório está inativo.');
    } else {
      laboratorioId = null;
    }
    v.manual('email', !this.estado.usuarios.some((u) => u.id !== Number(id) && u.email === email), 'Já existe um usuário com este e-mail.');
    let credenciais = null;
    if (!id) {
      const senha = v.senha('senha', dados.senha ?? '');
      if (senha) credenciais = await criarCredenciais(senha, Number(this.parametros.iteracoesSenha ?? 120000));
    }
    v.lancar();
    return { nome, email, perfil, laboratorioId, credenciais };
  }

  async criarUsuario(dados) {
    const ctx = this.ctx(PERMISSOES.USUARIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const valores = await this._validarUsuario(dados);
    return this._mutar(() => {
      const id = proximoId(this.estado, 'usuarios');
      const usuario = {
        id,
        nome: valores.nome,
        email: valores.email,
        senhaHash: valores.credenciais.senhaHash,
        senhaSal: valores.credenciais.senhaSal,
        senhaIteracoes: valores.credenciais.senhaIteracoes,
        perfil: valores.perfil,
        laboratorioId: valores.laboratorioId,
        ativo: dados.ativo !== false,
        anonimizado: false,
        criadoEm: this.agora,
        atualizadoEm: this.agora,
        ultimoAcessoEm: null
      };
      this.estado.usuarios.push(usuario);
      this._registrarLog(ctx, {
        acao: ACOES_LOG.CRIAR, tabela: 'usuarios', registroId: id, depois: usuario, motivo: 'Cadastro de usuário'
      });
      return this._dtoUsuario(usuario, this._indices());
    });
  }

  async atualizarUsuario(id, dados) {
    const ctx = this.ctx(PERMISSOES.USUARIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const usuario = localizar(this.estado, 'usuarios', id, 'Usuário');
    const motivo = exigirMotivo(dados.motivo);
    if (usuario.id === ctx.usuario.id && dados.perfil && dados.perfil !== usuario.perfil) {
      throw ErroApp.regra('Você não pode alterar o próprio perfil. Solicite a outro administrador.');
    }
    const valores = await this._validarUsuario({ ...usuario, ...dados }, id);
    const desativando = dados.ativo === false;
    if (desativando && usuario.id === ctx.usuario.id) throw ErroApp.regra('Você não pode inativar o próprio usuário.');
    if (desativando) this._garantirNaoUltimoAdmin(usuario);
    return this._mutar(() => {
      const antes = clonar(usuario);
      Object.assign(usuario, {
        nome: valores.nome,
        email: valores.email,
        perfil: valores.perfil,
        laboratorioId: valores.laboratorioId,
        ativo: dados.ativo === undefined ? usuario.ativo : dados.ativo !== false,
        atualizadoEm: this.agora
      });
      if (valores.credenciais) {
        usuario.senhaHash = valores.credenciais.senhaHash;
        usuario.senhaSal = valores.credenciais.senhaSal;
        usuario.senhaIteracoes = valores.credenciais.senhaIteracoes;
      }
      this._registrarLog(ctx, { acao: ACOES_LOG.ATUALIZAR, tabela: 'usuarios', registroId: id, antes, depois: usuario, motivo });
      return this._dtoUsuario(usuario, this._indices());
    });
  }

  _garantirNaoUltimoAdmin(usuario) {
    if (usuario.perfil !== PERFIS.ADMIN) return;
    const admins = this.estado.usuarios.filter((u) => u.perfil === PERFIS.ADMIN && u.ativo && !u.anonimizado);
    if (admins.length <= 1) throw ErroApp.regra('Não é possível inativar o último Administrador ativo.');
  }

  inativarUsuario(id, motivo) {
    const ctx = this.ctx(PERMISSOES.USUARIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const usuario = localizar(this.estado, 'usuarios', id, 'Usuário');
    const m = exigirMotivo(motivo);
    if (usuario.id === ctx.usuario.id) throw ErroApp.regra('Você não pode inativar o próprio usuário.');
    this._garantirNaoUltimoAdmin(usuario);
    return this._mutar(() => {
      const antes = clonar(usuario);
      usuario.ativo = false;
      usuario.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.INATIVAR, tabela: 'usuarios', registroId: id, antes, depois: usuario, motivo: m });
      return this._dtoUsuario(usuario, this._indices());
    });
  }

  reativarUsuario(id, motivo) {
    const ctx = this.ctx(PERMISSOES.USUARIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const usuario = localizar(this.estado, 'usuarios', id, 'Usuário');
    const m = exigirMotivo(motivo);
    if (usuario.anonimizado) throw ErroApp.regra('Usuário anonimizado não pode ser reativado.');
    return this._mutar(() => {
      const antes = clonar(usuario);
      usuario.ativo = true;
      usuario.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.REATIVAR, tabela: 'usuarios', registroId: id, antes, depois: usuario, motivo: m });
      return this._dtoUsuario(usuario, this._indices());
    });
  }

  async redefinirSenha(id, novaSenha) {
    const ctx = this.ctx(PERMISSOES.USUARIOS_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const usuario = localizar(this.estado, 'usuarios', id, 'Usuário');
    const v = new Validador();
    const senha = v.senha('novaSenha', novaSenha);
    v.lancar();
    const credenciais = await criarCredenciais(senha, Number(this.parametros.iteracoesSenha ?? 120000));
    return this._mutar(() => {
      usuario.senhaHash = credenciais.senhaHash;
      usuario.senhaSal = credenciais.senhaSal;
      usuario.senhaIteracoes = credenciais.senhaIteracoes;
      usuario.atualizadoEm = this.agora;
      this._registrarLog(ctx, {
        acao: ACOES_LOG.REDEFINIR_SENHA, tabela: 'usuarios', registroId: id, antes: null, depois: { id }, motivo: 'Redefinição administrativa de senha'
      });
      return { ok: true };
    });
  }

  async alterarMinhaSenha(atual, nova) {
    const ctx = this.ctx(null);
    const usuario = localizar(this.estado, 'usuarios', ctx.usuario.id, 'Usuário');
    const { verificarSenha } = await import('../infrastructure/session.js');
    const ok = await verificarSenha(atual, usuario);
    if (!ok) throw new ErroApp(CODIGOS_ERRO.VALIDACAO, 'A senha atual está incorreta.', { campos: { atual: 'Senha atual incorreta.' } });
    const v = new Validador();
    const senha = v.senha('nova', nova);
    v.lancar();
    const credenciais = await criarCredenciais(senha, usuario.senhaIteracoes ?? 120000);
    return this._mutar(() => {
      usuario.senhaHash = credenciais.senhaHash;
      usuario.senhaSal = credenciais.senhaSal;
      usuario.senhaIteracoes = credenciais.senhaIteracoes;
      usuario.atualizadoEm = this.agora;
      this._registrarLog(ctx, { acao: ACOES_LOG.ATUALIZAR, tabela: 'usuarios', registroId: usuario.id, antes: null, depois: { id: usuario.id }, motivo: 'Alteração da própria senha' });
      return { ok: true };
    });
  }

  anonimizarUsuario(id, motivo) {
    const ctx = this.ctx(PERMISSOES.LGPD_GERENCIAR);
    exigirAdministrador(ctx.usuario);
    const usuario = localizar(this.estado, 'usuarios', id, 'Usuário');
    const m = exigirMotivo(motivo, 10);
    if (usuario.id === ctx.usuario.id) throw ErroApp.regra('Você não pode anonimizar o próprio usuário.');
    this._garantirNaoUltimoAdmin(usuario);
    return this._mutar(() => {
      const antes = { nome: usuario.nome, email: usuario.email, ativo: usuario.ativo };
      usuario.nome = `Usuário anonimizado #${usuario.id}`;
      usuario.email = `anonimizado+${usuario.id}@invalid.local`;
      usuario.ativo = false;
      usuario.anonimizado = true;
      usuario.senhaHash = null;
      usuario.senhaSal = null;
      usuario.atualizadoEm = this.agora;
      delete usuario.ultimoAcessoEm;
      this._registrarLog(ctx, {
        acao: ACOES_LOG.ANONIMIZAR, tabela: 'usuarios', registroId: id, antes, depois: { nome: usuario.nome, email: usuario.email, ativo: false, anonimizado: true }, motivo: m
      });
      return this._dtoUsuario(usuario, this._indices());
    });
  }

  meusDados() {
    const ctx = this.ctx(null);
    const indices = this._indices();
    return {
      usuario: this._dtoUsuario(ctx.usuario, indices),
      laboratorio: ctx.usuario.laboratorioId ? this._dtoLaboratorio(indices.laboratorios.get(ctx.usuario.laboratorioId)) : null,
      eventosRegistrados: this.estado.eventos.filter((e) => e.usuarioId === ctx.usuario.id).length,
      solicitacoes: this.estado.solicitacoes.filter((s) => s.solicitanteId === ctx.usuario.id).map((s) => this._dtoSolicitacao(s, indices)),
      aviso: AVISO_PRIVACIDADE
    };
  }

}
