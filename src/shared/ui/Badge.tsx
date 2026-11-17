/**
 * Badge components - institucional UCS (identidade visual 10/nov).
 * Chips em caixa alta com raio mínimo de 2px.
 */

import { type ReactNode, type CSSProperties } from 'react';

export type BadgeVariant = 'default' | 'accent' | 'danger' | 'warning' | 'info' | 'success' | 'outline';

export function Badge({ children, variant = 'default', size = 'md', dot = false }: { children: ReactNode; variant?: BadgeVariant; size?: 'sm' | 'md' | 'lg'; dot?: boolean }) {
  const variantStyles: Record<string, CSSProperties> = {
    default: { backgroundColor: '#EDEDED', borderColor: '#D4D4D4', color: '#4B5158' },
    accent: { backgroundColor: '#E8F2FA', borderColor: '#A9C9E6', color: '#0E4B75' },
    danger: { backgroundColor: '#FBECEC', borderColor: '#EEC2C4', color: '#9C2428' },
    warning: { backgroundColor: '#FFF4E2', borderColor: '#E9C987', color: '#855000' },
    info: { backgroundColor: '#E8F2FA', borderColor: '#A9C9E6', color: '#0E4B75' },
    success: { backgroundColor: '#E8F5EC', borderColor: '#B9DFC6', color: '#1C6A38' },
    outline: { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-fg)' },
  };
  const sizeStyles: Record<string, CSSProperties> = {
    sm: { padding: '2px 7px', fontSize: '10px', gap: '4px' },
    md: { padding: '2px 7px', fontSize: '10px', gap: '4px' },
    lg: { padding: '4px 10px', fontSize: '11px', gap: '6px' },
  };
  return <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', borderWidth: '1px', borderStyle: 'solid', borderRadius: '2px', whiteSpace: 'nowrap', lineHeight: 1.5, ...variantStyles[variant], ...sizeStyles[size] }}>{dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor', flexShrink: 0 }} />}{children}</span>;
}
export function StatusBadge({ status, size = 'md', showDot = true }: { status: string; size?: 'sm' | 'md' | 'lg'; showDot?: boolean }) {
  const statusVariantMap: Record<string, BadgeVariant> = { ATIVO: 'success', INATIVO: 'default', EM_MANUTENCAO: 'warning', AGENDADO: 'info', REALIZADO: 'success', CANCELADO: 'danger', PENDENTE: 'warning', APROVADA: 'success', REJEITADA: 'danger', APROVADO: 'success', REPROVADO: 'danger', CONFORME: 'success', ATENCAO: 'warning', NAO_CONFORME: 'danger', SEM_DADOS: 'default' };
  const statusLabelMap: Record<string, string> = { ATIVO: 'Ativo', INATIVO: 'Inativo', EM_MANUTENCAO: 'Em manutenção', AGENDADO: 'Agendado', REALIZADO: 'Realizado', CANCELADO: 'Cancelado', PENDENTE: 'Pendente', APROVADA: 'Aprovada', REJEITADA: 'Rejeitada', APROVADO: 'Aprovado', REPROVADO: 'Reprovado', CONFORME: 'Conforme', ATENCAO: 'Atenção', NAO_CONFORME: 'Não conforme', SEM_DADOS: 'Sem dados' };
  return <Badge variant={statusVariantMap[status] || 'default'} size={size} dot={showDot}>{statusLabelMap[status] || status}</Badge>;
}
