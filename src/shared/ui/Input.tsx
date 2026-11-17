/**
 * Input component - institucional UCS (identidade visual 10/nov).
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode, type CSSProperties } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string; leftIcon?: ReactNode; rightIcon?: ReactNode; fullWidth?: boolean }>(
  ({ label, error, hint, leftIcon, rightIcon, fullWidth = false, className = '', style, disabled, required, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const wrapperStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', width: fullWidth ? '100%' : 'auto', minWidth: 0 };
    const labelStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: '10.5px', fontWeight: 700, color: 'var(--color-fg-light)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '1px' };
    const inputWrapperStyle: CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
    const inputStyle: CSSProperties = { width: '100%', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-fg)', backgroundColor: 'var(--color-bg-elevated)', border: '2px solid var(--color-border-input)', borderRadius: '0', padding: leftIcon ? '8px 10px 8px 38px' : '8px 10px', minHeight: '40px', outline: 'none', transition: 'border-color var(--transition-base), box-shadow var(--transition-base)' };
    const iconStyle: CSSProperties = { position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg-muted)', pointerEvents: 'none' };
    return (
      <div style={wrapperStyle} className={className}>
        {label && <label htmlFor={inputId} style={labelStyle}>{label} {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}</label>}
        <div style={inputWrapperStyle}>
          {leftIcon && <span style={{ ...iconStyle, left: '12px' }}>{leftIcon}</span>}
          <input
            ref={ref} id={inputId}
            style={{
              ...inputStyle,
              paddingRight: rightIcon ? '38px' : '10px',
              borderColor: error ? 'var(--color-danger)' : 'var(--color-border-input)',
              backgroundColor: error ? '#FFFAFA' : 'var(--color-bg-elevated)',
            }}
            disabled={disabled} required={required} aria-invalid={error ? 'true' : 'false'}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(29, 73, 117, 0.22)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border-input)'; e.currentTarget.style.boxShadow = 'none'; }}
            {...props}
          />
          {rightIcon && <span style={{ ...iconStyle, right: '12px' }}>{rightIcon}</span>}
        </div>
        {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--color-danger)', marginTop: '4px' }}>{error}</p>}
        {hint && !error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
