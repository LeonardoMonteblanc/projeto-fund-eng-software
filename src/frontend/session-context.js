/** Contexto de sessão/permissões usado pelas páginas. */

export function permissoes(app) {
  return app.auth.sessao()?.permissoes ?? [];
}

export function temPermissao(app, permissao) {
  return permissoes(app).includes(permissao);
}

/** Reexecuta a renderização atual (após uma mutação). */
export function recarregar() {
  window.__labucsAtualizar?.();
}
