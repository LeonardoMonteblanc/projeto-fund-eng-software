/**
 * Select component - institucional UCS (identidade visual 10/nov).
 */

import { type ReactNode, type SelectHTMLAttributes, type CSSProperties } from 'react';

export interface SelectOption { value: string; label: string; disabled?: boolean; }

export function Select(props: { label?: string; error?: string; hint?: string; options: SelectOption[]; placeholder?: string; fullWidth?: boolean; className?: string; style?: CSSProperties; disabled?: boolean; required?: boolean; id?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const { label, error, hint, options, placeholder, fullWidth = false, className = '', style, disabled, required, id, ...rest } = props;
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  const wrapperStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', width: fullWidth ? '100%' : 'auto', minWidth: 0 };
  const labelStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: '10.5px', fontWeight: 700, color: 'var(--color-fg-light)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '1px' };
  const selectStyle: CSSProperties = { width: '100%', appearance: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-fg)', backgroundColor: disabled ? 'var(--color-bg-section)' : 'var(--color-bg-elevated)', border: `2px solid ${error ? 'var(--color-danger)' : 'var(--color-border-input)'}`, borderRadius: '0', padding: '8px 10px', minHeight: '40px', cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none', transition: 'border-color var(--transition-base), box-shadow var(--transition-base)', backgroundImage: 'linear-gradient(45deg, transparent 50%, var(--color-fg-muted) 50%), linear-gradient(135deg, var(--color-fg-muted) 50%, transparent 50%)', backgroundPosition: 'calc(100% - 17px) 50%, calc(100% - 12px) 50%', backgroundSize: '5px 5px, 5px 5px', backgroundRepeat: 'no-repeat', paddingRight: '30px' };
  return (
    <div style={wrapperStyle} className={className}>
      {label && <label htmlFor={selectId} style={labelStyle}>{label} {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}</label>}
      <div style={{ position: 'relative' }}>
        <select
          id={selectId} style={selectStyle} disabled={disabled} required={required} aria-invalid={error ? 'true' : 'false'}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(29, 73, 117, 0.22)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border-input)'; e.currentTarget.style.boxShadow = 'none'; }}
          {...rest}
        >
          {placeholder && <option value="" disabled selected hidden>{placeholder}</option>}
          {options.map((opt) => <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>)}
        </select>
      </div>
      {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--color-danger)', marginTop: '4px' }}>{error}</p>}
      {hint && !error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', color: 'var(--color-fg-muted)', marginTop: '4px' }}>{hint}</p>}
    </div>
  );
}
