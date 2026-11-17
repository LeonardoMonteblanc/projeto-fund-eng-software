/**
 * Componentes UI institucionais UCS (identidade visual 10/nov).
 * Cantos retos, caixa alta, molduras de 2px.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { spaceRem } from './theme';

/* Button - institucional: caixa alta, borda 2px, canto reto */
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; leftIcon?: ReactNode; rightIcon?: ReactNode; fullWidth?: boolean }>(
  ({ variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, fullWidth = false, disabled, className = '', style, children, ...props }, ref) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--color-fg-on-blue)' },
      secondary: { backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' },
      danger: { backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' },
      ghost: { backgroundColor: 'transparent', borderColor: 'transparent', color: 'var(--color-fg-muted)' },
      outline: { backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' },
    };
    const sizeStyles: Record<string, React.CSSProperties> = { sm: { padding: '3px 8px', fontSize: '10px', minHeight: '24px' }, md: { padding: '7px 14px', fontSize: '12px', minHeight: '36px' }, lg: { padding: '10px 18px', fontSize: '13px', minHeight: '40px' } };
    const baseStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'var(--font-sans)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', borderWidth: '2px', borderStyle: 'solid', borderRadius: '0', cursor: disabled || loading ? 'not-allowed' : 'pointer', transition: 'background var(--transition-base), color var(--transition-base), border-color var(--transition-base)', width: fullWidth ? '100%' : 'auto', opacity: disabled || loading ? 0.5 : 1, textDecoration: 'none', whiteSpace: 'nowrap', lineHeight: 1.3 };
    return (
      <button ref={ref} className={className} style={{ ...baseStyle, ...sizeStyles[size], ...variantStyles[variant], ...style }} disabled={disabled || loading} aria-busy={loading} {...props}>
        {loading ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" /></svg> : <> {leftIcon && <span>{leftIcon}</span>} {children} {rightIcon && <span>{rightIcon}</span>} </>}
      </button>
    );
  }
);
Button.displayName = 'Button';

/* Re-exports from separate files */
export { Input } from './Input';
export { Select, type SelectOption } from './Select';
export { Card, CardHeader, CardContent, CardFooter, PageHeader } from './Card';
export { Badge, type BadgeVariant, StatusBadge } from './Badge';

/* Space utility - re-export from theme */
export { spaceRem } from './theme';
