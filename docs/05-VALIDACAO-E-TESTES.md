# 05 — Validação e testes

**Comando:** `npm test`
**Resultado:** 56 testes, 56 aprovados.
**Node:** 20+ (executado em Node 24.21).

---

## 1. Estratégia

| Nível | Arquivo | Cobertura |
| --- | --- | --- |
| Domínio | `tests/domain.test.js` | Erro+U, arredondamento, meses/anos bissextos, herança, prazos, sinais, completude |
| Serviços | `tests/services.test.js` | Login, sessão, perfis/escopo, CRUD, eventos, manutenções, aprovações, auditoria, LGPD, backup, parâmetros |
| Persistência | `tests/storage.test.js` | Atomicidade, backup, exportação/importação, integridade referencial |
| Base real | `tests/acceptance.test.js` | 1.911 equipamentos, escopo por laboratório, RF17, relatórios, PDF paginado |
| Exportações | `tests/exports.test.js` | CSV/BOM, XLSX/OOXML, PDF/xref, CRC32/ZIP |
| Interface | `scripts/inspecionar.js` | Smoke Chrome headless (login, painel, ficha, evento, configuração) |

Os testes usam relógio fixo, armazenamento em memória e 1.000 iterações de PBKDF2. A base real é usada apenas na aceitação.

## 2. Matriz RF → teste

| RF | Teste principal |
| --- | --- |
| RF01 | `RF01: funcionalidades acessíveis variam por perfil` |
| RF02 | `Item em uso não pode ser inativado...` |
| RF03 | `Cadastro de equipamento valida unicidade, datas e inativação lógica` |
| RF04 | `Cadastro de equipamento...`; `Matriz de perfis...` |
| RF05 | `Relatórios: inventário...`; `Relatórios reais...` |
| RF06 | `Usuário: e-mail único...`; `LGPD...` |
| RF07 | `Laboratório: sigla única...` |
| RF08 | `Calibração calcula |erro| + U...` |
| RF09 | `Erro + U: aprova no limite...`; `RF09: prévia...` |
| RF10 | `Calibração reprovada... e verificação...` |
| RF11 | `Manutenção preventiva...`; `...corretiva...` |
| RF12 | `Solicitação: técnico solicita...`; `Segregação...` |
| RF13 | `Painel: alertas...` |
| RF14 | `Relatórios...`; `Histórico importado...` |
| RF15 | `RF15: custos x receita...`; `Custos reais...` |
| RF16 | `Fornecedor: CNPJ...` |
| RF17 | `RF17 real...`; `Métricas...` |

## 3. Matriz RNF → evidência

| RNF | Evidência |
| --- | --- |
| RNF01 | `Login válido, inválido, logout...` |
| RNF02 | `Matriz de perfis...` |
| RNF03 | `Auditoria registra alterações...` |
| RNF04 | `Sessão expira por inatividade...` |
| RNF05 | `LGPD: anonimização...`; tela de privacidade |
| RNF06 | GitHub Pages; documentado em `docs/06` |
| RNF07 | `Backup, exportação...`; backup diário |
| RNF08 | Interface PT-BR e filtros de busca |
| RNF09 | `ErroApp.campos` e mensagens PT-BR |
| RNF10 | Validações de unicidade, datas, CA e integridade |
| RNF11 | `Falha dentro do commit...`; backup/exportação |
| RNF12 | `Validação rejeita estado...`; guardas de inativação |
| RNF13 | `Painel: alertas...` |
| RNF14 | `RNF14...`; PDF/XLSX/CSV |
| RNF15 | ES modules, sem app nativo |

## 4. Exportações

- **CSV:** BOM UTF-8, `;`, CRLF, escape de aspas.
- **XLSX:** ZIP OOXML com `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/styles.xml`, `xl/worksheets/sheet1.xml`; aberto com `openpyxl` durante o desenvolvimento.
- **PDF:** `%PDF-1.4`, `xref` válido, `/Count`, 48 páginas no inventário completo, codificação WinAnsi e rodapé “POC sem valor legal”.

## 5. Smoke de interface

```bash
npm run dev
node scripts/inspecionar.js http://127.0.0.1:4173/ \
  --login=tecnico.lasfi@labucs.local --goto="#/equipamentos/1"
```

O script usa Chrome/Edge headless via DevTools Protocol, verifica exceções de console e salva `.tmp_console.png`.

## 6. Roteiro de demonstração

1. Login Técnico LASFI → painel com 86 equipamentos e 73 calibrações vencidas.
2. `FIT 01` → CA herdado, prazos, histórico.
3. Registrar calibração: `-0,4` e `0,05` → aprovado; `2,0` e `0,1` → reprovado e sinal.
4. Solicitar evento como Técnico; aprovar como Gestor LASFI; mostrar segregação.
5. Relatórios: inventário, Anexo 4 e ficha; exportar PDF/Excel.
6. Gestor Geral: custos × receita e auditoria.
7. Administrador: usuários, parâmetros, backup e privacidade.
8. Recarregar e demonstrar persistência.

## 7. Limitações da validação

- Sem E2E de todos os cliques; smoke cobre fluxos críticos.
- Sem teste automatizado de acessibilidade (a UI segue contraste/foco e deve ser auditada à parte).
- Sem concorrência entre abas/dispositivos (modelo local).
- PDF validado estruturalmente, não em um leitor específico.
