/**
 * Persistência local-first, sem backend.
 *
 * O estado completo vive em memória; cada mutação é confirmada de forma atômica no
 * armazenamento (IndexedDB, com fallback para localStorage/memória). O POC é
 * hospedado como site estático (GitHub Pages): não há servidor, API remota nem banco.
 */

import { ErroApp, CODIGOS_ERRO } from '../../shared/errors.js';
import { clonar, hojeISO, agoraISO } from '../../shared/utils.js';

const BANCO = 'labucs-poc';
const LOJA = 'kv';
const CHAVE_ESTADO = 'estado';
const CHAVE_BACKUPS = 'backups:index';
const PREFIXO_BACKUP = 'backup:';

/* ------------------------------------------------------------------ */
/* Adaptadores                                                        */
/* ------------------------------------------------------------------ */

export class ArmazenamentoMemoria {
  constructor() { this.mapa = new Map(); }
  async obter(chave) { return this.mapa.has(chave) ? this.mapa.get(chave) : null; }
  async definir(chave, valor) { this.mapa.set(chave, valor); }
  async remover(chave) { this.mapa.delete(chave); }
  async chaves() { return [...this.mapa.keys()]; }
}

class ArmazenamentoLocalStorage {
  constructor(chave = 'labucs-poc') { this.chave = chave; }
  async obter(nome) { return globalThis.localStorage.getItem(`${this.chave}:${nome}`); }
  async definir(nome, valor) { globalThis.localStorage.setItem(`${this.chave}:${nome}`, valor); }
  async remover(nome) { globalThis.localStorage.removeItem(`${this.chave}:${nome}`); }
  async chaves() {
    const prefixo = `${this.chave}:`;
    const saida = [];
    for (let i = 0; i < globalThis.localStorage.length; i += 1) {
      const k = globalThis.localStorage.key(i);
      if (k?.startsWith(prefixo)) saida.push(k.slice(prefixo.length));
    }
    return saida;
  }
}

class ArmazenamentoIndexedDB {
  constructor(nome = BANCO) { this.nome = nome; this.db = null; }

  async abrir() {
    if (this.db) return this.db;
    if (!globalThis.indexedDB) throw new Error('IndexedDB indisponível');
    this.db = await new Promise((resolve, reject) => {
      const req = globalThis.indexedDB.open(this.nome, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LOJA)) db.createObjectStore(LOJA);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  async executar(modo, fn) {
    const db = await this.abrir();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LOJA, modo);
      const store = tx.objectStore(LOJA);
      let resultado;
      try { resultado = fn(store); } catch (erro) { reject(erro); return; }
      tx.oncomplete = () => {
        const valor = resultado && typeof resultado === 'object' && 'result' in resultado
          ? resultado.result
          : resultado;
        resolve(valor);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transação abortada'));
    });
  }

  async obter(chave) {
    return this.executar('readonly', (store) => store.get(chave));
  }

  async definir(chave, valor) {
    await this.executar('readwrite', (store) => store.put(valor, chave));
  }

  async remover(chave) {
    await this.executar('readwrite', (store) => store.delete(chave));
  }

  async chaves() {
    const chaves = await this.executar('readonly', (store) => store.getAllKeys());
    return chaves ?? [];
  }
}

/** Escolhe o melhor armazenamento disponível; nunca falha na inicialização. */
export function criarArmazenamento() {
  try {
    if (globalThis.indexedDB) return new ArmazenamentoIndexedDB();
  } catch { /* segue para o fallback */ }
  try {
    if (globalThis.localStorage) return new ArmazenamentoLocalStorage();
  } catch { /* modo privado */ }
  return new ArmazenamentoMemoria();
}

/* ------------------------------------------------------------------ */
/* Banco                                                               */
/* ------------------------------------------------------------------ */

export class Banco {
  /**
   * @param {object} opcoes
   * @param {object} opcoes.armazenamento
   * @param {() => Date} opcoes.clock
   * @param {() => Promise<object>} opcoes.semente
   * @param {(estado: object) => void} [opcoes.validarEstado]
   * @param {(erro: Error) => void} [opcoes.aoFalharPersistencia]
   */
  constructor({ armazenamento, clock, semente, validarEstado, aoFalharPersistencia }) {
    this.armazenamento = armazenamento;
    this.clock = clock;
    this.semente = semente;
    this.validarEstado = validarEstado;
    this.aoFalharPersistencia = aoFalharPersistencia;
    this._estado = null;
    this._fila = Promise.resolve();
    this._pendente = false;
    this.erroPersistencia = null;
  }

  get estado() {
    if (!this._estado) throw new ErroApp(CODIGOS_ERRO.INTERNO, 'Banco de dados não inicializado.');
    return this._estado;
  }

  get pronto() { return Boolean(this._estado); }

  async iniciar() {
    const bruto = await this.armazenamento.obter(CHAVE_ESTADO);
    if (bruto) {
      try {
        const estado = JSON.parse(bruto);
        this.validarEstado?.(estado);
        this._estado = estado;
      } catch (erro) {
        console.error('Estado local inválido; recriando a partir da base inicial.', erro);
        this._estado = await this.semente();
        await this.persistirAgora();
      }
    } else {
      this._estado = await this.semente();
      await this.persistirAgora();
      await this.criarBackup('Carga inicial da demonstração');
    }
    await this.garantirBackupDiario();
    return this._estado;
  }

  /** Mutação atômica em memória; a gravação é enfileirada e pode ser aguardada com flush(). */
  commit(fn) {
    const antes = clonar(this.estado);
    let resultado;
    try {
      resultado = fn(this.estado);
      this.estado.meta.atualizadoEm = agoraISO(this.clock);
      this.agendarPersistencia();
      return resultado;
    } catch (erro) {
      this._estado = antes;
      throw erro;
    }
  }

  agendarPersistencia() {
    this._pendente = true;
    this._fila = this._fila
      .then(() => this.persistirAgora())
      .catch((erro) => {
        this.erroPersistencia = erro;
        this.aoFalharPersistencia?.(erro);
      });
  }

  async persistirAgora() {
    if (!this._estado) return;
    const texto = JSON.stringify(this._estado);
    await this.armazenamento.definir(CHAVE_ESTADO, texto);
    this._pendente = false;
    this.erroPersistencia = null;
  }

  async flush() {
    await this._fila;
    if (this._pendente) await this.persistirAgora();
  }

  async substituirEstado(novoEstado, { criarBackupAntes = true, motivo = 'Substituição do estado' } = {}) {
    if (criarBackupAntes) await this.criarBackup(`Antes de: ${motivo}`);
    this._estado = novoEstado;
    this._estado.meta.atualizadoEm = agoraISO(this.clock);
    await this.persistirAgora();
  }

  async criarBackup(motivo) {
    if (!this._estado) return null;
    const agora = this.clock();
    const id = `BK-${agora.toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;
    const conteudo = JSON.stringify(this._estado);
    await this.armazenamento.definir(`${PREFIXO_BACKUP}${id}`, conteudo);
    const indice = (await this.listarBackups()) ?? [];
    indice.unshift({
      id,
      criadoEm: agora.toISOString(),
      motivo,
      tamanhoBytes: new TextEncoder().encode(conteudo).length,
      equipamentos: this._estado.equipamentos.length,
      eventos: this._estado.eventos.length
    });
    await this.armazenamento.definir(CHAVE_BACKUPS, JSON.stringify(indice));
    this._estado.meta.ultimoBackupEm = agora.toISOString();
    if (motivo === 'Automático diário') this._estado.meta.ultimoBackupAuto = hojeISO(this.clock);
    await this.persistirAgora();
    await this.aplicarRetencao();
    return indice[0];
  }

  async garantirBackupDiario() {
    const hoje = hojeISO(this.clock);
    if (this._estado?.meta?.ultimoBackupAuto === hoje) return;
    const diario = (await this.listarBackups())?.find((b) => b.motivo === 'Automático diário' && b.criadoEm.slice(0, 10) === hoje);
    if (diario) {
      this._estado.meta.ultimoBackupAuto = hoje;
      await this.persistirAgora();
      return;
    }
    await this.criarBackup('Automático diário');
  }

  async aplicarRetencao() {
    const retencao = Number(this._estado?.parametros?.retencaoBackupDias ?? 7);
    const limite = new Date(this.clock().getTime() - retencao * 86400000).toISOString();
    const indice = (await this.listarBackups()) ?? [];
    const manter = [];
    for (const backup of indice) {
      if (backup.criadoEm >= limite || backup.motivo === 'Carga inicial da demonstração') {
        manter.push(backup);
      } else {
        await this.armazenamento.remover(`${PREFIXO_BACKUP}${backup.id}`);
      }
    }
    if (manter.length !== indice.length) await this.armazenamento.definir(CHAVE_BACKUPS, JSON.stringify(manter));
  }

  async listarBackups() {
    const bruto = await this.armazenamento.obter(CHAVE_BACKUPS);
    if (!bruto) return [];
    try { return JSON.parse(bruto) ?? []; } catch { return []; }
  }

  async obterBackup(id) {
    const conteudo = await this.armazenamento.obter(`${PREFIXO_BACKUP}${id}`);
    if (!conteudo) throw new ErroApp(CODIGOS_ERRO.NAO_ENCONTRADO, 'Backup não encontrado.');
    return { conteudo, meta: (await this.listarBackups()).find((b) => b.id === id) ?? null };
  }

  exportarJSON() {
    return JSON.stringify({
      aplicacao: 'LabUcs',
      versao: 1,
      exportadoEm: agoraISO(this.clock),
      esquema: this.estado.esquema,
      dados: this.estado
    }, null, 1);
  }

  async restaurarDoTexto(texto, { motivo = 'Restauração manual' } = {}) {
    let pacote;
    try {
      pacote = JSON.parse(texto);
    } catch {
      throw new ErroApp(CODIGOS_ERRO.IMPORTACAO, 'Arquivo inválido: não é um JSON legível.');
    }
    const dados = pacote?.dados ?? pacote;
    if (!dados || typeof dados !== 'object') {
      throw new ErroApp(CODIGOS_ERRO.IMPORTACAO, 'Arquivo inválido: estrutura de dados não reconhecida.');
    }
    if (Number(dados.esquema) > Number(this.estado.esquema)) {
      throw new ErroApp(CODIGOS_ERRO.IMPORTACAO, 'O arquivo foi gerado por uma versão mais nova do sistema.');
    }
    this.validarEstado?.(dados);
    await this.criarBackup(`Antes de: ${motivo}`);
    this._estado = dados;
    this._estado.meta.atualizadoEm = agoraISO(this.clock);
    await this.persistirAgora();
    return this._estado;
  }
}
