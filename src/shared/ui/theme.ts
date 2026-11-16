/**
 * Design System Industrial Brutalist - UCS Colors.
 * Cores institucionais da Universidade de Caxias do Sul.
 */

export const theme = {
  colors: {
    // Base - Dark brutalist backgrounds
    bg: '#1a1a2e',           // Dark navy background
    bgElevated: '#22223b',   // Elevated surfaces
    bgHover: '#2a2a4a',      // Hover states
    bgLight: '#F3F3F5',      // UCS light section background

    // Borders
    border: '#3d3d5c',       // Subtle borders
    borderBright: '#4d4d7a', // Brighter borders
    borderAccent: '#337ab7', // UCS primary blue accent
    borderUCS: '#CECECE',    // UCS standard border gray

    // Foreground
    fg: '#f0f0f5',           // Primary text (near white)
    fgMuted: '#8a8a9a',      // Muted text
    fgDim: '#6d6d8a',        // Dim text
    fgDark: '#393A3F',       // UCS dark text for light surfaces

    // UCS Brand Colors
    accent: '#337ab7',       // UCS Primary Blue
    accentDim: '#23527c',    // UCS Dark Blue (hover)
    accentBg: '#1a3a5c',     // UCS Blue background tint
    accentLight: '#e8f0fa',  // UCS Light blue background

    // Semantic - adapted to UCS palette
    danger: '#c0392b',       // Danger red
    dangerDim: '#962d22',    // Danger hover
    dangerBg: '#3a1a1a',     // Danger background
    warning: '#e67e22',      // Warning orange
    warningDim: '#d35400',   // Warning hover
    warningBg: '#3a2a10',    // Warning background
    info: '#337ab7',         // Info = UCS Blue
    infoDim: '#23527c',      // Info hover
    infoBg: '#1a3a5c',       // Info background

    // Status colors
    critico: '#c0392b',
    alto: '#e67e22',
    medio: '#337ab7',        // UCS Blue for medium
    sucesso: '#27ae60',      // Success green
  },
  font: { mono: '"IBM Plex Mono", "JetBrains Mono", "Fira Code", monospace', sans: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  fontSize: { xs: '0.7rem', sm: '0.8rem', base: '0.9rem', lg: '1rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '2rem' },
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  spacing: 8,
  borderWidth: 2,
  borderRadius: 0,
  shadow: { sm: '2px 2px 0 0 #000', md: '4px 4px 0 0 #000', lg: '8px 8px 0 0 #000', accent: '4px 4px 0 0 #337ab7' },
  transition: { fast: '80ms ease', base: '120ms ease', slow: '200ms ease' },
  zIndex: { dropdown: 100, modal: 200, toast: 300, tooltip: 400 },
  breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
} as const;

export type Theme = typeof theme;
export const spaceRem = (mult: number) => `${theme.spacing * mult}px`;