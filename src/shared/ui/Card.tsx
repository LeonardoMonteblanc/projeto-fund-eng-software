/**
 * Card components - Light mode UCS style.
 */

import { type ReactNode, type CSSProperties } from 'react';

const cardBaseStyle: CSSProperties = { backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' };
const cardBorderedStyle: CSSProperties = { border: '1px solid var(--color-border)' };
const cardPaddedStyle: CSSProperties = { padding: '24px' };
const cardClickableStyle: CSSProperties = { cursor: 'pointer' };
const cardDefaultCursorStyle: CSSProperties = { cursor: 'default' };

const cardHeaderWrapperStyle: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' };
const cardHeaderTitleStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-xl)', fontWeight: 600, color: 'var(--color-fg)', margin: '0 0 4px 0' };
const cardHeaderSubtitleStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)', margin: 0 };
const cardHeaderActionStyle: CSSProperties = { flexShrink: 0 };

const cardFooterStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' };

export function Card({ children, className = '', style, padded = true, bordered = true, hoverable = false, onClick }: { children: ReactNode; className?: string; style?: CSSProperties; padded?: boolean; bordered?: boolean; hoverable?: boolean; onClick?: () => void }) {
  const combinedStyle: CSSProperties = {
    ...cardBaseStyle,
    ...(padded ? cardPaddedStyle : {}),
    ...(onClick || hoverable ? cardClickableStyle : cardDefaultCursorStyle),
    ...style,
  };
  return <div className={className} style={combinedStyle} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e: any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}>{children}</div>;
}
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div style={cardHeaderWrapperStyle}>
      <div>
        <h3 style={cardHeaderTitleStyle}>{title}</h3>
        {subtitle && <p style={cardHeaderSubtitleStyle}>{subtitle}</p>}
      </div>
      {action && <div style={cardHeaderActionStyle}>{action}</div>}
    </div>
  );
}
export function CardContent({ children, style }: { children: ReactNode; style?: CSSProperties }) { return <div style={style}>{children}</div>; }
export function CardFooter({ children }: { children: ReactNode }) { return <div style={cardFooterStyle}>{children}</div>; }