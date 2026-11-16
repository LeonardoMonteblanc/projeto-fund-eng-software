/**
 * Componentes UI Light Mode - UCS style.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { spaceRem } from './theme';

/* Button - Light mode UCS style */
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; leftIcon?: ReactNode; rightIcon?: ReactNode; fullWidth?: boolean }>(
  ({ variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, fullWidth = false, disabled, className = '', style, children, ...props }, ref) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      primary: { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--color-fg-on-blue)' },
      secondary: { backgroundColor: 'var(--color-bg-section)', borderColor: 'var(--color-border)', color: 'var(--color-fg)' },
      danger: { backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-fg-on-blue)' },
      ghost: { backgroundColor: 'transparent', borderColor: 'transparent', color: 'var(--color-fg-muted)' },
      outline: { backgroundColor: 'transparent', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' },
    };
    const sizeStyles: Record<string, React.CSSProperties> = { sm: { padding: '6px 12px', fontSize: 'var(--font-size-sm)' }, md: { padding: '10px 20px', fontSize: 'var(--font-size-base)' }, lg: { padding: '12px 24px', fontSize: 'var(--font-size-lg)' } };
    const baseStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-sans)', fontWeight: 600, borderWidth: '1px', borderStyle: 'solid', borderRadius: '4px', cursor: disabled || loading ? 'not-allowed' : 'pointer', transition: 'all 120ms ease', width: fullWidth ? '100%' : 'auto', opacity: disabled || loading ? 0.6 : 1, textDecoration: 'none', whiteSpace: 'nowrap' };
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
export { Card, CardHeader, CardContent, CardFooter } from './Card';
export { Badge, type BadgeVariant, StatusBadge } from './Badge';

/* Space utility - re-export from theme */
export { spaceRem } from './theme';