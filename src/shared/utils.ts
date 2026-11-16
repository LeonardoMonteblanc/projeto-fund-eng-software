/**
 * Utilitários compartilhados.
 */

import { ulid } from 'ulid';

export function hojeISO(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function formatISO(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export function agoraISO(): string {
  return new Date().toISOString();
}

export function somarMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(ano, mes - 1 + meses, dia);
  if (data.getDate() !== dia) { data.setDate(0); }
  return data.toISOString().split('T')[0]!;
}

export function diferencaDias(deISO: string, ateISO: string): number {
  const de = new Date(deISO + 'T00:00:00');
  const ate = new Date(ateISO + 'T00:00:00');
  return Math.round((ate.getTime() - de.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatarDataBR(dataISO: string | null | undefined): string {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHoraBR(dataISO: string | null | undefined): string {
  if (!dataISO) return '—';
  return new Date(dataISO).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function dataValida(dataISO: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dataISO)) return false;
  const data = new Date(dataISO + 'T00:00:00');
  return !isNaN(data.getTime());
}

export function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

export function centavosParaReais(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
}

export function reaisParaCentavos(valor: string | number): number {
  const num = typeof valor === 'string' ? parseFloat(valor.replace(/[^\d,-]/g, '').replace(',', '.')) : valor;
  return Math.round(num * 100);
}

export function gerarULID(): string {
  return ulid();
}

export function normalizarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ');
}

export function truncar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return texto.slice(0, max - 1) + '…';
}

export function slugify(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function formatarPatrimonio(patrimonio: string): string {
  return patrimonio.replace(/(\d{1,3})(?=(\d{3})+(?!\d))/g, '$1.');
}

export function gerarTAG(labSigla: string, sequencial: number): string {
  return `TAG-${labSigla.toUpperCase()}-${String(sequencial).padStart(4, '0')}`;
}

export function gerarNumeroSerie(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = 'SN-';
  for (let i = 0; i < 10; i++) { resultado += chars.charAt(Math.floor(Math.random() * chars.length)); }
  return resultado;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) if (key in obj) result[key] = obj[key];
  return result;
}

export function deepClone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)); }

export function isEmpty(obj: unknown): boolean {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  if (typeof obj === 'string') return obj.trim() === '';
  return false;
}

export function agruparPor<T>(array: T[], chave: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => { const k = chave(item); (acc[k] ??= []).push(item); return acc; }, {} as Record<string, T[]>);
}

export function ordenarPor<T>(array: T[], chave: (item: T) => string | number, direcao: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => { const va = chave(a), vb = chave(b); if (va < vb) return direcao === 'asc' ? -1 : 1; if (va > vb) return direcao === 'asc' ? 1 : -1; return 0; });
}

export function uniqueBy<T>(array: T[], chave: (item: T) => string): T[] {
  const vistos = new Set<string>();
  return array.filter((item) => { const k = chave(item); if (vistos.has(k)) return false; vistos.add(k); return true; });
}

export function validarEmail(email: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

export function validarCNPJ(cnpj: string): boolean {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return false;
  if (/^(\d)\1+$/.test(limpo)) return false;
  let soma = 0, peso = 2;
  for (let i = 11; i >= 0; i--) { soma += parseInt(limpo[i], 10) * peso; peso = peso === 9 ? 2 : peso + 1; }
  let digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (parseInt(limpo[12], 10) !== digito) return false;
  soma = 0; peso = 2;
  for (let i = 12; i >= 0; i--) { soma += parseInt(limpo[i], 10) * peso; peso = peso === 9 ? 2 : peso + 1; }
  digito = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return parseInt(limpo[13], 10) === digito;
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(...args), ms); };
}

export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => { const now = Date.now(); if (now - lastCall >= ms) { lastCall = now; fn(...args); } };
}