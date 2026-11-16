/**
 * Badge components - Light mode UCS style.
 */

import { type ReactNode, type CSSProperties } from 'react';

export type BadgeVariant = 'default' | 'accent' | 'danger' | 'warning' | 'info' | 'success' | 'outline';

export function Badge({ children, variant = 'default', size = 'md', dot = false }: { children: ReactNode; variant?: BadgeVariant; size?: 'sm' | 'md' | 'lg'; dot?: boolean }) {
  const variantStyles: Record<string, CSSProperties> = { 
    default: { backgroundColor: 'var(--color-bg-section)', borderColor: 'var(--color-border)', color: 'var(--color-fg)' }, 
    accent: { backgroundColor: 'var(--color-accent-bg)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }, 
    danger: { backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }, 
    warning: { backgroundColor: 'var(--color-warning-bg)', borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }, 
    info: { backgroundColor: 'var(--color-info-bg)', borderColor: 'var(--color-info)', color: 'var(--color-info)' }, 
    success: { backgroundColor: 'var(--color-sucesso-bg)', borderColor: 'var(--color-sucesso)', color: 'var(--color-sucesso)' }, 
    outline: { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-fg)' } 
  };
  const sizeStyles: Record<string, CSSProperties> = { 
    sm: { padding: '2px 8px', fontSize: 'var(--font-size-xs)', gap: '4px' }, 
    md: { padding: '4px 10px', fontSize: 'var(--font-size-sm)', gap: '6px' }, 
    lg: { padding: '6px 14px', fontSize: 'var(--font-size-base)', gap: '8px' } 
  };
  return <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontWeight: 600, borderWidth: '1px', borderStyle: 'solid', borderRadius: '12px', whiteSpace: 'nowrap', lineHeight: 1, ...variantStyles[variant], ...sizeStyles[size] }}>{dot && <span style={{ width: size === 'sm' ? '6px' : size === 'md' ? '8px' : '10px', height: size === 'sm' ? '6px' : size === 'md' ? '8px' : '10px', borderRadius: '50%', backgroundColor: 'currentColor', flexShrink: 0 }} />}{children}</span>;
}
export function StatusBadge({ status, size = 'md', showDot = true }: { status: string; size?: 'sm' | 'md' | 'lg'; showDot?: boolean }) {
  const statusVariantMap: Record<string, BadgeVariant> = { ATIVO: 'success', INATIVO: 'default', EM_MANUTENCAO: 'warning', AGENDADO: 'info', REALIZADO: 'success', CANCELADO: 'danger', PENDENTE: 'warning', APROVADA: 'success', REJEITADA: 'danger', APROVADO: 'success', REPROVADO: 'danger', CONFORME: 'success', ATENCAO: 'warning', NAO_CONFORME: 'danger', SEM_DADOS: 'default' };
  const statusLabelMap: Record<string, string> = { ATIVO: 'Ativo', INATIVO: 'Inativo', EM_MANUTENCAO: 'Em manutenção', AGENDADO: 'Agendado', REALIZADO: 'Realizado', CANCELADO: 'Cancelado', PENDENTE: 'Pendente', APROVADA: 'Aprovada', REJEITADA: 'Rejeitada', APROVADO: 'Aprovado', REPROVADO: 'Reprovado', CONFORME: 'Conforme', ATENCAO: 'Atenção', NAO_CONFORME: 'Não conforme', SEM_DADOS: 'Sem dados' };
  return <Badge variant={statusVariantMap[status] || 'default'} size={size} dot={showDot}>{statusLabelMap[status] || status}</Badge>;
}