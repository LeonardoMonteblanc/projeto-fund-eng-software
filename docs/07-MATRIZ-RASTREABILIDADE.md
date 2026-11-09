# 07 — Matriz de rastreabilidade

**Legenda:** ✅ implementado e testado · ⚠️ limitação documentada · 🟡 dependência externa

---

## 1. Requisitos funcionais

| ID | Requisito | Código | Teste | Status |
| --- | --- | --- | --- | --- |
| RF01 | Funcionalidades por perfil | `shared/constants.js`, `backend/domain/permissions.js`, `frontend/layout.js` | RF01 | ✅ |
| RF02 | Cadastrar item | `backend/application/registry-application.js` | Item em uso | ✅ |
| RF03 | Cadastrar equipamento | `registry-application.js` | Cadastro de equipamento | ✅ |
| RF04 | Consultar/editar/inativar | `registry-application.js`, `frontend/pages/equipment.js` | Cadastro/Matriz | ✅ |
| RF05 | Inventário | `reports/builders.js` | Relatórios | ✅ |
| RF06 | Usuários/permissões | `identity-application.js` | Usuário | ✅ |
| RF07 | Laboratórios | `registry-application.js` | Laboratório | ✅ |
| RF08 | Calibração | `operations-application.js`, `domain/metrology.js` | Calibração calcula | ✅ |
| RF09 | Cálculo Erro+U | `domain/metrology.js` | Erro + U, RF09 | ✅ |
| RF10 | Verificação | `operations-application.js` | Calibração reprovada | ✅ |
| RF11 | Manutenções | `operations-application.js` | Preventiva/Corretiva | ✅ |
| RF12 | Aprovar solicitações | `operations-application.js` | Solicitação/Segregação | ✅ |
| RF13 | Notificar vencimentos | `operations-application.js`, `frontend/pages/session.js` | Painel | ✅ |
| RF14 | Histórico | `reporting-application.js` | Relatórios/Histórico | ✅ |
| RF15 | Custos × receita | `reports/builders.js` | RF15/Custos reais | ✅ |
| RF16 | Fornecedores | `registry-application.js` | Fornecedor | ✅ |
| RF17 | Sinalizar equipamentos | `domain/metrology.js` | RF17/Métricas | ✅ |

## 2. Requisitos não funcionais

| ID | Requisito | Implementação | Status |
| --- | --- | --- | --- |
| RNF01 | Login e senha | PBKDF2 + sessão local | ✅ |
| RNF02 | Quatro perfis | matriz de permissões + escopo | ✅ |
| RNF03 | Log interno | auditoria append-only, GG | ✅ (IP local) |
| RNF04 | Timeout | `infrastructure/session.js` | ✅ |
| RNF05 | LGPD | aviso, dados do titular, anonimização | ⚠️ demonstração |
| RNF06 | Disponibilidade | GitHub Pages | 🟡 sem SLA próprio |
| RNF07 | Backup diário | `infrastructure/storage.js` | ✅ |
| RNF08 | PT-BR e busca | interface + filtros | ✅ |
| RNF09 | Erros claros | `ErroApp.campos` | ✅ |
| RNF10 | Validação | `shared/validation.js` + serviços | ✅ |
| RNF11 | Não perder dados | transação + backup | ⚠️ limite local |
| RNF12 | Integridade | `validarEstado` + guardas | ✅ |
| RNF13 | Painel | `listarAlertas` | ✅ |
| RNF14 | PDF/Excel | `reports/pdf.js`, `xlsx.js` | ✅ |
| RNF15 | Web | ES modules | ✅ |

## 3. Casos de uso

| UC | Serviço | Interface |
| --- | --- | --- |
| Cadastrar Equipamento | `equipamentos.criar` | `#/equipamentos` |
| Cadastrar Item | `itens.criar` | `#/itens` |
| Registrar Calibração | `eventos.criar` | `#/eventos/novo` |
| Registrar Verificação | `eventos.criar` | `#/eventos/novo` |
| Agendar Preventiva | `eventos.criar` | `#/eventos` |
| Registrar Corretiva | `eventos.criar` | `#/eventos` |
| Consultar Histórico | `equipamentos.historico` | ficha do equipamento |
| Gerar Relatório de Situação | `relatorios.situacao` | `#/relatorios` |
| Gerenciar Usuários | `usuarios.*` | `#/usuarios` |
| Gerenciar Laboratórios | `laboratorios.*` | `#/laboratorios` |
| Gerenciar Fornecedores | `fornecedores.*` | `#/fornecedores` |
| Solicitar Evento | `solicitacoes.criar` | `#/solicitacoes` |
| Avaliar Solicitação | `solicitacoes.aprovar/rejeitar` | `#/solicitacoes` |
| Consultar Agenda | `painel.agenda` | `#/agenda` |
| Consultar Indicadores | `relatorios.custos` | `#/custos` |

## 4. Decisões e riscos

| ID | Decisão/risco | Registro |
| --- | --- | --- |
| D01 | POC estática | `docs/01`, `docs/06` |
| D02 | Dados por navegador | `docs/01`, `docs/04` |
| D03 | TAG única por laboratório | `docs/02` |
| D04 | Periodicidade em meses | `docs/02` |
| D05 | CA estimado | `docs/02`, relatório de importação |
| D06 | Campos ausentes não inventados | `docs/02` |
| D07 | RF17 prevalece sobre UC13 | `docs/03` |
| D08 | Segregação de funções | `docs/03` |
| D09 | Divergência de inventário | `docs/03` |
| D10 | IP local simulado | `docs/02` |
| D11 | Eventos realizados imutáveis | `docs/02` |
| D12 | `null` × zero | `docs/03` |

## 5. Arquivos de referência

| Arquivo | Conteúdo |
| --- | --- |
| `src/backend/domain/metrology.js` | Cálculos, prazos, sinais |
| `src/backend/application/*` | Casos de uso por camada |
| `src/backend/reports/*` | Relatórios e exportações |
| `src/backend/infrastructure/*` | IndexedDB, sessão, semente |
| `src/frontend/*` | Interface UCS |
| `contract/labucs.d.ts` | Contrato TypeScript |
| `tests/*.test.js` | 56 testes |
| `data/base-real.json` | Base real normalizada |
