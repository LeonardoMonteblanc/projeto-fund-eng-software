# 03 — Regras de negócio

**Código:** `src/backend/domain/metrology.js` (cálculos) e `src/backend/application/*` (casos de uso).

---

## 1. Aceitação metrológica

```
erroAbsoluto = |erroMedido|
erroMaisU    = erroAbsoluto + incerteza (U)
resultado    = APROVADO  se erroMaisU ≤ CA efetivo
               REPROVADO se erroMaisU > CA efetivo
margem       = CA efetivo − erroMaisU
```

- O erro pode ser negativo; o módulo é aplicado antes da soma.
- A incerteza deve ser ≥ 0.
- A comparação é arredondada a 6 casas; `erroMaisU == CA` é **Aprovado**.
- O CA efetivo é congelado no evento (`caEfetivo`) para preservar a rastreabilidade.

### Exemplos

| Erro | U | CA | Erro+U | Resultado |
| ---: | ---: | ---: | ---: | --- |
| 0,4 | 0,05 | 1,0 | 0,45 | Aprovado |
| 0,9 | 0,1 | 1,0 | 1,00 | Aprovado (limite) |
| 0,900001 | 0,1 | 1,0 | 1,000001 | Reprovado |
| −1,2 | 0,1 | 1,0 | 1,30 | Reprovado |

### CA e periodicidade efetivos

```
CA efetivo =
  CA do equipamento, se informado;
  senão CA do item;
  senão indefinido → bloqueia calibração/verificação.
```

O mesmo vale para as periodicidades. A interface exibe a origem (`herdado do item` / `do equipamento`). CAs derivados na importação estão marcados em `parametrosEstimados`.

## 2. Prazos

```
base = última realização do mesmo tipo
       ou data de colocação em uso (fallback)
próxima = base + periodicidade em meses, se periodicidade > 0
          senão indefinida
dias = próxima − hoje
```

- Soma de meses com ajuste de fim de mês: `31/01 + 1 mês = 28/02` (ou `29/02` em ano bissexto).
- Periodicidade `0` significa “não definida”, gera a sinalização RF17 e não calcula data.
- Evento agendado não altera a próxima data até ser realizado.

| Dias | Status |
| --- | --- |
| `< 0` | Vencido |
| `0` a `30` (configurável) | A vencer |
| `> 30` | Em dia |
| sem data | Sem data |

`diasParaVencimento` do equipamento é o menor entre calibração e verificação; se nenhum existir, usa a manutenção preventiva.

## 3. Sinalizações (RF17)

| Código | Condição | Severidade |
| --- | --- | --- |
| `CALIBRACAO_VENCIDA` | próxima calibração < hoje | Crítico |
| `CALIBRACAO_REPROVADA` | último resultado de calibração = Reprovado | Crítico |
| `VERIFICACAO_VENCIDA` | próxima verificação < hoje | Alto |
| `PERIODICIDADE_ZERO` | periodicidade de calibração ou verificação = 0 | Médio |

**Sem bloqueio automático:** o equipamento continua `ATIVO`; a decisão é humana. A situação só muda por inativação/reativação ou por manutenção corretiva com estado de retorno.

### Conflito com o caso de uso de calibração

O passo 13 do caso de uso sugere atualizar a situação conforme o resultado. O RF17, mais específico, veda bloqueio/alteração automática. **O RF17 prevalece**; o resultado fica no evento e gera sinalização.

## 4. Manutenções

### Preventiva

- Agendada com `dataPrevista` ≥ hoje, descrição e custo estimado.
- Se recorrente e PMP > 0, ao realizar o evento o sistema calcula `próxima = realização + PMP`, grava `proximaDataPrevista` e cria novo `AGENDADO` se não existir.

### Corretiva

- Registrada após a realização, com problema/serviço, fornecedor obrigatório e estado de retorno.

| Estado de retorno | Situação do equipamento |
| --- | --- |
| `APTO` | `ATIVO` |
| `EM_MANUTENCAO` | `EM_MANUTENCAO` |
| `INATIVO` | `INATIVO` |

Equipamento em manutenção não pode ser calibrado/verificado até retornar.

## 5. Solicitações (RF12)

```
Técnico/GL/GG solicita → PENDENTE
  GL do laboratório aprova → evento AGENDADO (data desejada ou hoje + 7)
  GL rejeita (justificativa) → REJEITADA, sem evento
```

- Apenas o Gestor de Laboratório do equipamento aprova/rejeita.
- O solicitante não aprova a própria solicitação (segregação de funções), salvo parâmetro `permitirAutoAprovacao`.
- Uma solicitação só é avaliada uma vez; não pode haver duas pendentes do mesmo tipo/equipamento.

## 6. Validação (RNF10)

Obrigatoriedade, formato (e-mail, CNPJ, telefone, datas), domínio de enums, unicidade, coerência de datas, periodicidade ≥ 0 e ≤ 1.200 meses, CA > 0, custos ≥ 0, integridade referencial e limites de texto. Erros retornam `ErroApp` com `campos` por campo.

## 7. Inativação lógica

Não há exclusão física.

| Entidade | Guarda |
| --- | --- |
| Laboratório | Bloqueia se houver equipamentos |
| Item | Bloqueia se houver equipamento ativo/em manutenção |
| Categoria/subcategoria | Bloqueia se houver item/subcategoria ativa |
| Fornecedor | Bloqueia se houver evento agendado |
| Equipamento | Bloqueia se houver evento agendado |
| Usuário | Bloqueia auto-inativação e último Administrador |

## 8. Relatórios e custos

- **Inventário:** equipamentos ativos; divergências são eventos `DIVERGENCIA_INVENTARIO` no período.
- **Anexo 4:** uma linha por equipamento; `Pc (anos) = meses / 12`; CS indica solicitação de calibração pendente/aprovada.
- **Anexo 5:** programação e PMP em meses.
- **Anexo 2:** corretivas realizadas no período, com problema, retorno e custo.
- **Custos (RF15):**

```
meses = round(dias do período / 30,4375), mínimo 1
receitaPeríodo = receitaMensal × meses
custoTotal = Σ custoRealizado dos eventos realizados no período
custo/receita = custoTotal / receitaPeríodo
```

`null` = receita não informada (indicador indisponível); `0` = receita zero informada (relação indisponível). Custos só consideram eventos `REALIZADO` com custo não nulo.

## 9. Auditoria e LGPD

- Toda mutação gera log na mesma transação: usuário, data/hora, ação, tabela, registro, antes/depois, motivo e IP.
- Hashes/salts nunca aparecem nos dados do log.
- Consulta exclusiva do Gestor Geral; log append-only.
- LGPD: aviso, acesso aos próprios dados, alteração de senha e anonimização irreversível pelo Administrador (preserva o ID para auditoria).

## 10. Sessão e segurança

- PBKDF2-SHA256, sal por usuário, 120.000 iterações (1.000 nos testes).
- Sessão em `sessionStorage`, timeout de 30 minutos de inatividade; atividade renova.
- Bloqueio de 120 s após 5 tentativas de login inválidas.
- Perfis exclusivos e escopo por laboratório aplicado no serviço.

## 11. Decisões registradas

| ID | Decisão |
| --- | --- |
| D01 | POC 100% estática, sem backend servidor |
| D02 | Dados no IndexedDB por navegador |
| D03 | TAG única por laboratório |
| D04 | Periodicidade em meses |
| D05 | CA estimado por categoria quando ausente |
| D06 | Campos ausentes não são inventados |
| D07 | RF17 prevalece sobre o passo 13 do UC de calibração |
| D08 | Segregação de funções na aprovação |
| D09 | Divergência de inventário é evento adicional |
| D10 | IP local simulado |
| D11 | Eventos realizados são imutáveis |
| D12 | `null` × zero em custos |
