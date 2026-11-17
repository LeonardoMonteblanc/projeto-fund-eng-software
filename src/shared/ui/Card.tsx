/**
 * Card components - institucional UCS (identidade visual 10/nov).
 * Cartões brancos, moldura 2px, canto reto, sombra azulada sutil.
 */

import { type ReactNode, type CSSProperties } from 'react';

const cardBaseStyle: CSSProperties = { backgroundColor: 'var(--color-bg-elevated)', borderRadius: '0', boxShadow: 'var(--shadow-sm)', border: '2px solid var(--color-border)' };
const cardPaddedStyle: CSSProperties = { padding: '16px' };

const cardHeaderWrapperStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', paddingBottom: '9px', borderBottom: '2px solid var(--color-border)' };
const cardHeaderTitleStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: 'var(--color-accent)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.01em' };
const cardHeaderSubtitleStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)', margin: 0 };
const cardHeaderActionStyle: CSSProperties = { flexShrink: 0 };

const cardFooterStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid var(--color-border)' };

export function Card({ children, className = '', style, padded = true, bordered = true, hoverable = false, onClick }: { children: ReactNode; className?: string; style?: CSSProperties; padded?: boolean; bordered?: boolean; hoverable?: boolean; onClick?: () => void }) {
  const combinedStyle: CSSProperties = {
    ...cardBaseStyle,
    ...(bordered ? {} : { border: 'none', boxShadow: 'none' }),
    ...(padded ? cardPaddedStyle : {}),
    ...(onClick || hoverable ? { cursor: 'pointer' } : {}),
    ...style,
  };
  return <div className={className} style={combinedStyle} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}>{children}</div>;
}
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div style={cardHeaderWrapperStyle}>
      <div style={{ minWidth: 0 }}>
        <h3 style={cardHeaderTitleStyle}>{title}</h3>
        {subtitle && <p style={cardHeaderSubtitleStyle}>{subtitle}</p>}
      </div>
      {action && <div style={cardHeaderActionStyle}>{action}</div>}
    </div>
  );
}
export function CardContent({ children, style }: { children: ReactNode; style?: CSSProperties }) { return <div style={style}>{children}</div>; }
export function CardFooter({ children }: { children: ReactNode }) { return <div style={cardFooterStyle}>{children}</div>; }

/**
 * PageHeader - faixa institucional azul com filete rosa (identidade 10/nov).
 */
export function PageHeader({ titulo, subtitulo, eyebrow, acoes, chips }: { titulo: string; subtitulo?: string; eyebrow?: string; acoes?: ReactNode; chips?: ReactNode }) {
  return (
    <div className="faixa-pagina" style={{ background: 'var(--color-accent)', color: 'var(--color-fg-on-blue)', padding: '22px 24px', marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap', borderLeft: '8px solid var(--color-rosa)' }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div style={{ fontSize: '10px', letterSpacing: '0.16em', fontWeight: 700, color: 'var(--color-rosa-claro)', marginBottom: '4px', textTransform: 'uppercase' }}>{eyebrow}</div>}
        <h1 style={{ color: 'var(--color-fg-on-blue)', fontSize: 'var(--font-size-3xl)', fontWeight: 600, letterSpacing: '-0.012em', margin: '2px 0 0', textTransform: 'uppercase', lineHeight: 1.2 }}>{titulo}</h1>
        {subtitulo && <p style={{ color: '#DBE4EE', fontSize: '12.5px', marginTop: '5px', maxWidth: '850px' }}>{subtitulo}</p>}
        {chips && <div style={{ marginTop: '8px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>{chips}</div>}
      </div>
      {acoes && <div style={{ alignSelf: 'center', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>{acoes}</div>}
    </div>
  );
}
