# 06 — Deploy no GitHub Pages

O LabUcs é um site estático: **não há servidor de aplicação**. O “backend” é a camada JavaScript em `src/backend/`, executada no navegador; o estado fica no IndexedDB.

---

## 1. Arquivos publicados

```
index.html
src/
  backend/        regras, persistência, relatórios
  frontend/       interface, estilos, logos e fontes
  shared/         constantes, erros, utilidades
data/             base real + relatório de importação
docs/             documentação
contract/         tipagem TypeScript
.nojekyll
```

## 2. Pré-requisitos

- Repositório GitHub.
- GitHub Pages em **Settings → Pages → Source: GitHub Actions**.
- Node.js 20+ apenas para testes/desenvolvimento local.

## 3. Execução local

```bash
npm test
npm run dev       # http://127.0.0.1:4173
```

A primeira carga cria 1.911 equipamentos, 823 itens, 22 usuários e os eventos importados. Abra em janela anônima para começar limpo.

## 4. Workflow

`.github/workflows/pages.yml`:

1. checkout;
2. Node 22;
3. `npm test`;
4. montagem de `_site` com `index.html`, `.nojekyll`, `src/`, `data/`, `docs/` e `contract/`;
5. upload do artefato;
6. deploy.

Disparo por push na `main` ou `workflow_dispatch`.

## 5. Caminhos

- Rotas por hash (`#/painel`, `#/equipamentos/42`), sem necessidade de `404.html`.
- Imports relativos (`./src/...`); funciona em `usuario.github.io/repositorio/`.
- `fetch('./data/base-real.json')` resolve a partir da página; não use `/data/...`.
- Não há `<base href>`.

## 6. HTTPS e Web Crypto

O login usa `crypto.subtle` (PBKDF2), que exige contexto seguro:

- GitHub Pages (HTTPS): OK.
- `http://localhost` / `127.0.0.1`: OK.
- `file://`: login indisponível (mensagem orientativa).

## 7. Dados no navegador

- IndexedDB por origem: `localhost` e `github.io` não compartilham dados.
- Atualizar o site preserva o banco existente; o esquema é validado.
- Para reiniciar: **Configuração → Backups e dados → Reiniciar demonstração**.
- Exporte/importe JSON para backup externo; navegação privada pode descartar dados.

## 8. Cache e tamanho

| Item | Tamanho aproximado |
| --- | ---: |
| `data/base-real.json` | 2,2 MB |
| `src/backend` + `src/frontend` + CSS | ~300 KB |
| Primeira carga total | ~2,6 MB |

A base é carregada uma vez e persistida; cargas seguintes usam o IndexedDB. Se o `fetch` falhar, o app usa a base sintética e avisa.

## 9. Identidade institucional

- Logos oficiais UCS/FUCS e fonte Roboto estão em `src/frontend/assets/`.
- Cores: azul `#1d4975`, secundária `#cc7e89`, cinza `#343a40`, bordas `#dedede`.
- Não há chamadas a CDNs ou fontes externas; o site funciona offline após a primeira carga (exceto links institucionais).

## 10. Segurança do deploy

- Nenhum secret no repositório: as contas de demonstração são públicas.
- Não publique dados pessoais além do necessário. O POC usa nomes de responsáveis técnicos (função pública) e e-mails sintéticos.
- O aviso “POC acadêmica, sem uso institucional” aparece no login, no rodapé e nos PDFs.

## 11. Checklist

- [ ] `npm test` verde.
- [ ] `npm run importar` executado.
- [ ] `index.html`, `.nojekyll`, `src/`, `data/`, `docs/`, `contract/` no artefato.
- [ ] Nenhum temporário (`tmp_*`, `.tmp_*`, `_*.json`) no commit.
- [ ] GitHub Pages configurado para GitHub Actions.
- [ ] Login e painel abrem em janela anônima.
- [ ] PDF abre e contém todas as linhas.
- [ ] Recarregar mantém sessão e dados.

## 12. Rollback

Reverta o commit de deploy; o workflow republica a versão anterior. O IndexedDB local não reverte; exporte/importe o JSON ou restaure um backup em **Configuração → Backups e dados**.
