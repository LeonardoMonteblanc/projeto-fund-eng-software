/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* ------------------------------------------------------------------ */
/* Declaração de módulo para SVGs                                      */
/* ------------------------------------------------------------------ */

declare module '*.svg' {
  import type React from 'react';
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

/* ------------------------------------------------------------------ */
/* Declaração para CSS Modules (se usado)                              */
/* ------------------------------------------------------------------ */

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}