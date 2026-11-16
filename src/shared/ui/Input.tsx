/**
 * Input component - Light mode UCS style.
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode, type CSSProperties } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string; leftIcon?: ReactNode; rightIcon?: ReactNode; fullWidth?: boolean }>(
  ({ label, error, hint, leftIcon, rightIcon, fullWidth = false, className = '', style, disabled, required, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const wrapperStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', width: fullWidth ? '100%' : 'auto' };
    const labelStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-fg)', marginBottom: '4px' };
    const inputWrapperStyle: CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
    const baseInputPadding = '10px 12px';
    const leftInputPadding = '10px 12px 10px 40px';
    const rightInputPadding = '10px 40px 10px 12px';
    const inputStyle: CSSProperties = { width: '100%', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-base)', color: 'var(--color-fg)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-input)', borderRadius: '4px', padding: leftIcon ? leftInputPadding : rightIcon ? rightInputPadding : baseInputPadding, outline: 'none', transition: 'all 120ms ease' };
    const iconStyle: CSSProperties = { position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg-muted)', pointerEvents: 'none' };
    const leftIconStyle: CSSProperties = { ...iconStyle, left: '12px' };
    const rightIconStyle: CSSProperties = { ...iconStyle, right: '12px' };
    return (
      <div style={wrapperStyle} className={className}>
        {label && <label htmlFor={inputId} style={labelStyle}>{label} {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}</label>}
        <div style={inputWrapperStyle}>
          {leftIcon && <span style={leftIconStyle}>{leftIcon}</span>}
          <input ref={ref} id={inputId} style={{ ...inputStyle, paddingRight: rightIcon ? '40px' : '12px' }} disabled={disabled} required={required} aria-invalid={error ? 'true' : 'false'} {...props} />
          {rightIcon && <span style={rightIconStyle}>{rightIcon}</span>}
        </div>
        {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', marginTop: '4px' }}>{error}</p>}
        {hint && !error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)', marginTop: '4px' }}>{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';