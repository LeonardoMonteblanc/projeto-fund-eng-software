/**
 * Serviço de auditoria (RNF03): log interno de alterações.
 */

import type { IDBPDatabase } from 'idb';
import { gerarULID, agoraISO } from './utils';
import { getDB } from './db';
import type { LogAuditoria } from './domain';
import type { AcaoLog } from './constants';

interface ContextoAuditoria {
  usuarioId?: string;
  usuarioNome?: string;
  usuarioPerfil?: string;
}

let contextoAtual: ContextoAuditoria = {};

export function definirContextoAuditoria(ctx: ContextoAuditoria): void {
  contextoAtual = ctx;
}

export function contextoAuditoria(): ContextoAuditoria {
  return contextoAtual;
}

interface EntradaLog {
  tabela: string;
  registroId: string;
  acao: AcaoLog | string;
  dadosAnteriores?: Record<string, unknown> | null;
  dadosNovos?: Record<string, unknown> | null;
  motivo?: string;
  ip?: string;
  timestamp?: string;
}

export async function registrarLog(db: IDBPDatabase<any>, entrada: EntradaLog): Promise<void> {
  try {
    const database = db ?? (await getDB());
    const registro: LogAuditoria = {
      id: gerarULID(),
      tabela: entrada.tabela,
      registroId: entrada.registroId,
      acao: entrada.acao,
      usuarioId: contextoAtual.usuarioId ?? 'anonimo',
      usuarioNome: contextoAtual.usuarioNome ?? 'Não autenticado',
      usuarioPerfil: contextoAtual.usuarioPerfil ?? 'N/A',
      dadosAnteriores: entrada.dadosAnteriores ?? null,
      dadosNovos: entrada.dadosNovos ?? null,
      motivo: entrada.motivo,
      ip: entrada.ip ?? 'web-demo',
      timestamp: entrada.timestamp ?? agoraISO(),
    };
    await (database as any).put('auditoria', registro);
  } catch (e) {
    console.warn('[Auditoria] Falha ao registrar log:', e);
  }
}
