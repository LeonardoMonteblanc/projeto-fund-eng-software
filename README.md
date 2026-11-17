# LabUcs — Gestão de Equipamentos Laboratoriais

POC estática (GitHub Pages) para gestão de equipamentos, calibrações, verificações, manutenções, solicitações, fornecedores, relatórios e indicadores dos laboratórios da UCS (FBI4010X — Fundamentos de Engenharia de Software).

> **Acesso**: <https://leonardomonteblanc.github.io/projeto-fund-eng-software/>

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estado | Zustand (persistência localStorage) |
| Roteamento | React Router v6 (SPA, basename dinâmico p/ GitHub Pages) |
| UI | Tema claro institucional UCS (Roboto + azul #337AB7, identidade visual da semana 1) |
| Tabelas | TanStack Table v8 |
| Banco | IndexedDB (via `idb`) — seed a partir de `public/data/base-real.json` |
| Exportação | CSV nativo, XLSX (`xlsx`), PDF (janela de impressão) |
| Testes | Vitest (unit) |
| Deploy | GitHub Pages (workflow `deploy.yml`) |

## Funcionalidades implementadas (todas)

- **Auth & RBAC (RF01, RF06, RNF01–RNF05)** — login demo por perfil (Admin, Gestor Geral, Gestor Lab, Técnico), troca de perfil no header, rotas protegidas, escopo por laboratório.
- **Equipamentos (RF03, RF04, RF17)** — CRUD completo, filtros, sinalizações metrológicas (calibração vencida/reprovada, verificação vencida, periodicidade zero).
- **Itens e Catálogo (RF02)** — itens, categorias e subcategorias com herança de CA/periodicidade.
- **Eventos (RF08–RF11, RF09)** — calibração, verificação, manutenção preventiva/corretiva e divergência de inventário; cálculo automático da regra de decisão (|erro| + U ≤ CA → Aprovado/Reprovado); atualização da situação do equipamento por estado de retorno.
- **Solicitações (RF12)** — solicitar, aprovar/rejeitar; aprovação gera o evento correspondente (AGENDADO).
- **Fornecedores (RF16)** — CRUD com validação de CNPJ e e-mail.
- **Laboratórios (RF07, RF15)** — CRUD, sigla única, receita mensal.
- **Usuários (RF06)** — CRUD, perfil único, vínculo com laboratório para Gestor Lab/Técnico.
- **Relatórios (RF05, RF14, RNF14)** — inventário, situação dos equipamentos e histórico de eventos com exportação CSV/XLSX/PDF.
- **Inventário (RF05)** — inventário anual por laboratório com registro de divergências via evento.
- **Indicadores de Custos (RF15)** — custos realizados por laboratório/tipo de evento × receita mensal.
- **Auditoria (RNF03)** — log interno completo (usuário, data/hora, ação, dados anteriores/novos, motivo) consultável apenas pelo Gestor Geral; todos os módulos registram alterações.
- **Agenda (RF13)** — calendário mensal de eventos programados.
- **Configurações (RNF04)** — parâmetros globais (dias de alerta, timeout de sessão, retenção de backup, tentativas de login, moeda).
- **Backup e Dados (RNF07, RNF11)** — exportar backup JSON completo, restaurar e reiniciar a demonstração.
- **Privacidade (LGPD, RNF05)** — aviso de privacidade e registro local de consentimento.

## Dados de demonstração (base-real.json)

- **10 laboratórios**: LASFI, LAMEC, LCMEC, LMC, LAMAT, LAPA, LCOR, LAPAM, LBTEC, LQFS
- **823 itens** (modelos) em 10 categorias e 60+ subcategorias
- **1911 equipamentos** distribuídos por laboratório
- Eventos, fornecedores e solicitações fictícias geradas no seed (IndexedDB do navegador)

## Scripts

```bash
npm run dev         # Vite dev server (porta 3000)
npm run build       # tsc + vite build → dist/
npm run preview     # Preview local do build
npm run test        # Vitest
npm run lint        # ESLint (flat config, max-warnings 0)
npm run typecheck   # tsc --noEmit
```

## Deploy no GitHub Pages

1. Push na `main` dispara `.github/workflows/deploy.yml`
2. Jobs: instalação → typecheck → lint → testes → build (com `BASE_URL=/<repo>/`) → upload do artefato → deploy
3. URL: `https://<user>.github.io/<repo>/`
4. `public/404.html` + basename dinâmico garantem rotas client-side funcionando no subdiretório

## Estrutura

```
src/
├── app/            # rotas (basename dinâmico) + providers
├── features/
│   ├── auth/       # store zustand, matriz RBAC, login demo, troca de perfil
│   ├── equipamentos/ eventos/ itens/ solicitacoes/ fornecedores/
│   ├── laboratorios/ usuarios/ relatorios/ custos/ auditoria/
│   ├── config/ backup/ agenda/ privacidade/
├── shared/         # domain (zod), constants, db (idb), seed, metrology,
│   ├── utils, audit (log interno), exportar (CSV/XLSX/PDF), ui (tema UCS)
├── widgets/        # Header (navegação por módulos acessíveis) + Layout
├── pages/          # Dashboard, NotFound
└── styles/         # tema claro UCS (CSS vars)
```

## Licença

POC acadêmica — UCS / FBI4010X — 2026
