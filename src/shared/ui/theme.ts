/**
 * Design System institucional UCS (identidade visual 10/nov).
 * Azul da área de Exatas #1d4975 / secundária #cc7e89.
 * Cantos retos, títulos e botões em caixa alta, bordas 2px.
 */

export const theme = {
  colors: {
    bg: '#F2F2F2',
    bgElevated: '#FFFFFF',
    bgHover: '#F0F4F9',
    bgSection: '#E8E8E8',
    bgFooter: '#343A40',
    bgFooterMain: '#FFFFFF',

    border: '#DEDEDE',
    borderBright: '#DEDEDE',
    borderAccent: '#1D4975',
    borderInput: '#DEDEDE',

    fg: '#221F1F',
    fgMuted: '#555555',
    fgDim: '#4B5158',
    fgLight: '#343A40',
    fgOnDark: '#FFFFFF',
    fgOnBlue: '#FFFFFF',

    accent: '#1D4975',
    accentDim: '#163A5E',
    accentBg: '#EAF0F6',
    accentLight: '#DBE4EE',
    rosa: '#CC7E89',
    rosaClaro: '#F2C4CB',

    danger: '#C13438',
    dangerDim: '#9C2428',
    dangerBg: '#FBECEC',
    warning: '#B36B00',
    warningDim: '#855000',
    warningBg: '#FFF4E2',
    info: '#0076B9',
    infoDim: '#0E4B75',
    infoBg: '#E8F2FA',
    sucesso: '#36A551',
    sucessoDim: '#1C6A38',
    sucessoBg: '#E8F5EC',

    critico: '#C13438',
    alto: '#B36B00',
    medio: '#0076B9',
    pendente: '#B36B00',
  },
  font: { mono: 'ui-monospace, SFMono-Regular, Consolas, monospace', sans: '"IBM Plex Sans", "Segoe UI", Arial, Helvetica, sans-serif' },
  fontSize: { xs: '0.7rem', sm: '0.8rem', base: '0.9rem', lg: '1rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '2rem' },
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  spacing: 8,
  borderWidth: 2,
  borderRadius: 0,
  shadow: { sm: '0 2px 10px rgba(29,73,117,0.06)', md: '0 2px 10px rgba(29,73,117,0.06)', lg: '0 4px 16px rgba(29,73,117,0.12)', accent: '0 2px 10px rgba(29,73,117,0.22)', dura: '8px 8px 0 rgba(16,44,73,0.12)' },
  transition: { fast: '80ms ease', base: '140ms cubic-bezier(0.2, 0, 0.38, 0.9)', slow: '320ms cubic-bezier(0.2, 0, 0.38, 0.9)' },
  zIndex: { dropdown: 100, modal: 200, toast: 300, tooltip: 400 },
  breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
} as const;

export type Theme = typeof theme;
export const spaceRem = (mult: number) => `${theme.spacing * mult}px`;