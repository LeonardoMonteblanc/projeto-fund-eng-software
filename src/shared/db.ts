/**
 * IndexedDB via idb.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { CHAVE_DB, VERSAO_ESQUEMA } from './constants';

export interface LabUCSDB extends DBSchema {
  users: { key: string; value: any; indexes: { 'by-email': string; 'by-perfil': string; 'by-lab': string } };
  labs: { key: string; value: any; indexes: { 'by-sigla': string; 'by-codigo': string; 'by-ativo': string } };
  categorias: { key: string; value: any; indexes: { 'by-nome': string; 'by-ordem': number } };
  subcategorias: { key: string; value: any; indexes: { 'by-nome': string; 'by-categoria': string } };
  itens: { key: string; value: any; indexes: { 'by-chave': number; 'by-categoria': string; 'by-subcategoria': string; 'by-ativo': string } };
  equipamentos: { key: string; value: any; indexes: { 'by-patrimonio': string; 'by-tag': string; 'by-numeroSerie': string; 'by-laboratorio': string; 'by-item': string; 'by-situacao': string; 'by-ativo': string } };
  eventos: { key: string; value: any; indexes: { 'by-equipamento': string; 'by-tipo': string; 'by-situacao': string; 'by-dataRealizacao': string; 'by-fornecedor': string; 'by-responsavel': string } };
  fornecedores: { key: string; value: any; indexes: { 'by-cnpj': string; 'by-situacao': string } };
  solicitacoes: { key: string; value: any; indexes: { 'by-equipamento': string; 'by-situacao': string; 'by-solicitante': string } };
  auditoria: { key: string; value: any; indexes: { 'by-tabela': string; 'by-registro': string; 'by-usuario': string; 'by-timestamp': string } };
  config: { key: string; value: any; indexes: {} };
  seedMeta: { key: string; value: any; indexes: {} };
}

type StoreName = 'users' | 'labs' | 'categorias' | 'subcategorias' | 'itens' | 'equipamentos' | 'eventos' | 'fornecedores' | 'solicitacoes' | 'auditoria' | 'config' | 'seedMeta';

const ALL_STORE_NAMES: StoreName[] = ['users', 'labs', 'categorias', 'subcategorias', 'itens', 'equipamentos', 'eventos', 'fornecedores', 'solicitacoes', 'auditoria', 'config', 'seedMeta'];

let dbPromise: Promise<IDBPDatabase<LabUCSDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<LabUCSDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LabUCSDB>(CHAVE_DB, VERSAO_ESQUEMA, {
      upgrade(db) {
        const usersStore = db.createObjectStore('users', { keyPath: 'id' });
        usersStore.createIndex('by-email', 'email', { unique: true });
        usersStore.createIndex('by-perfil', 'perfil');
        usersStore.createIndex('by-lab', 'laboratorioId');

        const labsStore = db.createObjectStore('labs', { keyPath: 'id' });
        labsStore.createIndex('by-sigla', 'sigla', { unique: true });
        labsStore.createIndex('by-codigo', 'codigo', { unique: true });
        labsStore.createIndex('by-ativo', 'ativo');

        const catStore = db.createObjectStore('categorias', { keyPath: 'id' });
        catStore.createIndex('by-nome', 'nome', { unique: true });
        catStore.createIndex('by-ordem', 'ordem');

        const subStore = db.createObjectStore('subcategorias', { keyPath: 'id' });
        subStore.createIndex('by-nome', 'nome');
        subStore.createIndex('by-categoria', 'categoriaId');

        const itensStore = db.createObjectStore('itens', { keyPath: 'id' });
        itensStore.createIndex('by-chave', 'chave', { unique: true });
        itensStore.createIndex('by-categoria', 'categoriaId');
        itensStore.createIndex('by-subcategoria', 'subcategoriaId');
        itensStore.createIndex('by-ativo', 'ativo');

        const eqStore = db.createObjectStore('equipamentos', { keyPath: 'id' });
        eqStore.createIndex('by-patrimonio', 'patrimonio', { unique: true });
        eqStore.createIndex('by-tag', 'tag', { unique: true });
        eqStore.createIndex('by-numeroSerie', 'numeroSerie', { unique: true });
        eqStore.createIndex('by-laboratorio', 'laboratorioId');
        eqStore.createIndex('by-item', 'itemId');
        eqStore.createIndex('by-situacao', 'situacao');
        eqStore.createIndex('by-ativo', 'ativo');

        const evtStore = db.createObjectStore('eventos', { keyPath: 'id' });
        evtStore.createIndex('by-equipamento', 'equipamentoId');
        evtStore.createIndex('by-tipo', 'tipo');
        evtStore.createIndex('by-situacao', 'situacao');
        evtStore.createIndex('by-dataRealizacao', 'dataRealizacao');
        evtStore.createIndex('by-fornecedor', 'fornecedorId');
        evtStore.createIndex('by-responsavel', 'responsavelId');

        const fornStore = db.createObjectStore('fornecedores', { keyPath: 'id' });
        fornStore.createIndex('by-cnpj', 'cnpj', { unique: true });
        fornStore.createIndex('by-situacao', 'situacao');

        const solStore = db.createObjectStore('solicitacoes', { keyPath: 'id' });
        solStore.createIndex('by-equipamento', 'equipamentoId');
        solStore.createIndex('by-situacao', 'situacao');
        solStore.createIndex('by-solicitante', 'solicitanteId');

        const audStore = db.createObjectStore('auditoria', { keyPath: 'id' });
        audStore.createIndex('by-tabela', 'tabela');
        audStore.createIndex('by-registro', 'registroId');
        audStore.createIndex('by-usuario', 'usuarioId');
        audStore.createIndex('by-timestamp', 'timestamp');

        db.createObjectStore('config', { keyPath: 'id' });
        db.createObjectStore('seedMeta', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function clearDB(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(ALL_STORE_NAMES, 'readwrite');
  await Promise.all(ALL_STORE_NAMES.map((name) => tx.objectStore(name).clear()));
  await tx.done;
  dbPromise = null;
}

export async function isSeeded(): Promise<boolean> { const db = await getDB(); const meta = await db.get('seedMeta', 'init'); return !!meta; }
export async function markSeeded(data: { versao: number; geradoEm: string; totalEquipamentos: number; totalItens: number }): Promise<void> { const db = await getDB(); await db.put('seedMeta', { id: 'init', ...data }); }

export async function getAll(storeName: StoreName): Promise<any[]> { const db = await getDB(); return db.getAll(storeName); }
export async function getById(storeName: StoreName, id: string): Promise<any | undefined> { const db = await getDB(); return db.get(storeName, id); }
export async function put(storeName: StoreName, value: any): Promise<string> { const db = await getDB(); return db.put(storeName, value); }
export async function putAll(storeName: StoreName, values: any[]): Promise<void> { const db = await getDB(); const tx = db.transaction(storeName, 'readwrite'); await Promise.all(values.map((v) => tx.store.put(v))); await tx.done; }
export async function deleteById(storeName: StoreName, id: string): Promise<void> { const db = await getDB(); await db.delete(storeName, id); }
export async function getByIndex(storeName: StoreName, indexName: string, value: string | number | Date): Promise<any[]> { const db = await getDB(); return db.getAllFromIndex(storeName as any, indexName as any, value); }
export async function getFirstByIndex(storeName: StoreName, indexName: string, value: string | number | Date): Promise<any | undefined> { const db = await getDB(); return db.getFromIndex(storeName as any, indexName as any, value); }
export async function count(storeName: StoreName): Promise<number> { const db = await getDB(); return db.count(storeName); }