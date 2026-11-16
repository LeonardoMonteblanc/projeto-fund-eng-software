/**
 * Design System Light Mode - UCS Colors.
 * Baseado no site institucional da UCS (https://www.ucs.br/site)
 * Tema claro com azul institucional UCS.
 */

export const theme = {
  colors: {
    // Base - Light backgrounds (UCS style)
    bg: '#FFFFFF',           // Pure white background
    bgElevated: '#FFFFFF',   // Cards, modals
    bgHover: '#F3F3F5',      // Hover states - UCS light gray
    bgSection: '#F3F3F5',    // Section backgrounds (noticias, fundacao)
    bgFooter: '#000000',     // Footer links bar (black)
    bgFooterMain: '#FFFFFF', // Footer main (white)

    // Borders
    border: '#CECECE',       // UCS standard border gray
    borderBright: '#CECECE', // Same
    borderAccent: '#337ab7', // UCS Blue accent
    borderInput: '#CCCCCC',  // Input borders

    // Foreground - Dark text on light
    fg: '#393A3F',           // UCS dark charcoal (primary text)
    fgMuted: '#6D6E71',      // UCS medium gray (menu topo, meta)
    fgDim: '#808285',        // UCS lighter gray (dropdown, meta)
    fgLight: '#58585A',      // Section titles (Notícias, Fundação)
    fgOnDark: '#FFFFFF',     // Text on dark backgrounds
    fgOnBlue: '#FFFFFF',     // Text on UCS blue

    // UCS Brand Colors
    accent: '#337ab7',       // UCS Primary Blue (links, buttons, navbar)
    accentDim: '#23527c',    // UCS Dark Blue (hover)
    accentBg: '#E8F0FA',     // UCS Light blue background (badges, highlights)
    accentLight: '#D6E9F8',  // Lighter blue bg

    // Semantic - adapted for light mode
    danger: '#C0392B',       // Danger red
    dangerDim: '#962D22',    // Danger hover
    dangerBg: '#FDEDEC',     // Danger background (light red)
    warning: '#E67E22',      // Warning orange
    warningDim: '#D35400',   // Warning hover
    warningBg: '#FEF5E7',    // Warning background (light orange)
    info: '#337AB7',         // Info = UCS Blue
    infoDim: '#23527C',      // Info hover
    infoBg: '#E8F0FA',       // Info background
    sucesso: '#27AE60',      // Success green
    sucessoDim: '#1E8A49',   // Success hover
    sucessoBg: '#E8F8EF',    // Success background

    // Status colors
    critico: '#C0392B',
    alto: '#E67E22',
    medio: '#337AB7',
    pendente: '#F39C12',
  },
  font: { mono: '"IBM Plex Mono", "JetBrains Mono", "Fira Code", monospace', sans: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  fontSize: { xs: '0.7rem', sm: '0.8rem', base: '0.9rem', lg: '1rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '2rem' },
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  spacing: 8,
  borderWidth: 2,
  borderRadius: 0,
  shadow: { sm: '0 1px 3px rgba(0,0,0,0.1)', md: '0 4px 12px rgba(0,0,0,0.1)', lg: '0 8px 24px rgba(0,0,0,0.12)', accent: '0 4px 12px rgba(51,122,183,0.3)' },
  transition: { fast: '80ms ease', base: '120ms ease', slow: '200ms ease' },
  zIndex: { dropdown: 100, modal: 200, toast: 300, tooltip: 400 },
  breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
} as const;

export type Theme = typeof theme;
export const spaceRem = (mult: number) => `${theme.spacing * mult}px`;