/**
 * Select component - Light mode UCS style.
 */

import { type ReactNode, type SelectHTMLAttributes, type CSSProperties } from 'react';

export interface SelectOption { value: string; label: string; disabled?: boolean; }

export function Select(props: { label?: string; error?: string; hint?: string; options: SelectOption[]; placeholder?: string; fullWidth?: boolean; className?: string; style?: CSSProperties; disabled?: boolean; required?: boolean; id?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const { label, error, hint, options, placeholder, fullWidth = false, className = '', style, disabled, required, id, ...rest } = props;
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  const wrapperStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', width: fullWidth ? '100%' : 'auto' };
  const labelStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-fg)', marginBottom: '4px' };
  const selectStyle: CSSProperties = { width: '100%', appearance: 'none', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-base)', color: 'var(--color-fg)', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border-input)', borderRadius: '4px', padding: '10px 12px', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 120ms ease' };
  return (
    <div style={wrapperStyle} className={className}>
      {label && <label htmlFor={selectId} style={labelStyle}>{label} {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}</label>}
      <div style={{ position: 'relative' }}>
        <select id={selectId} style={selectStyle} disabled={disabled} required={required} aria-invalid={error ? 'true' : 'false'} {...rest}>
          {placeholder && <option value="" disabled selected hidden>{placeholder}</option>}
          {options.map((opt) => <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>)}
        </select>
      </div>
      {error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', marginTop: '4px' }}>{error}</p>}
      {hint && !error && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)', marginTop: '4px' }}>{hint}</p>}
    </div>
  );
}