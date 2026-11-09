# 02 — Modelo de dados

**Persistência:** IndexedDB (chave `estado`), com fallback `localStorage`/memória.
**Esquema:** versão 1, documento JSON versionado.
**API:** `src/backend/index.js` e `contract/labucs.d.ts`.

---

## 1. Entidades

```
Laboratório 1 ── * Equipamento * ── 1 Item * ── 1 Subcategoria * ── 1 Categoria
       │                                │
       │                                └── Evento (Calibração | Verificação | Manutenção | Divergência)
       │                                        │
       └── Solicitação * ── 1 Equipamento       ├── Fornecedor
                                                 └── Usuário
Usuário ── * LogAuditoria
```

- **Item** é o modelo abstrato (fabricante, nome/modelo), sem laboratório.
- **Equipamento** é a unidade física, com TAG, patrimônio, série e laboratório.
- **Evento** registra o fato metrológico ou de manutenção.
- **Solicitação** antecede o evento e registra a autorização.
- **LogAuditoria** registra alterações, sem exclusão/edição.

## 2. Campos principais

| Entidade | Campos relevantes |
| --- | --- |
| Laboratório | `id`, `nome`, `sigla`, `codigo`, `localizacao`, `responsavelTecnico`, `ramal`, `bloco`, `sala`, `receitaMensalCentavos`, `ativo` |
| Usuário | `id`, `nome`, `email`, `senhaHash`, `senhaSal`, `senhaIteracoes`, `perfil`, `laboratorioId`, `ativo`, `anonimizado` |
| Fornecedor | `id`, `razaoSocial`, `cnpj`, `telefone`, `email`, `ativo`, `observacoes` |
| Categoria | `id`, `nome`, `descricao`, `ordem`, `ativo` |
| Subcategoria | `id`, `nome`, `descricao`, `categoriaId`, `ativo` |
| Item | `id`, `nome`, `descricao`, `fabricante`, `modelo`, `categoriaId`, `subcategoriaId`, `capacidadeMedicao`, `resolucao`, `tipoIndicacao`, `caCalibracao`, `caVerificacao`, `periodicidadeCalibracaoMeses`, `periodicidadeVerificacaoMeses`, `periodicidadeManutencaoPreventivaMeses`, `parametrosEstimados`, `origem`, `ativo` |
| Equipamento | `id`, `itemId`, `laboratorioId`, `patrimonio`, `tag`, `tagOriginal`, `numeroSerie`, `localizacao`, `dataAquisicao`, `dataColocacaoUso`, `valorAquisicaoCentavos`, `situacao`, `caCalibracao`, `caVerificacao`, `periodicidadeCalibracaoMeses`, `periodicidadeVerificacaoMeses`, `periodicidadeManutencaoPreventivaMeses`, `origem`, `completude`, `camposPendentes` |
| Solicitação | `id`, `equipamentoId`, `solicitanteId`, `tipoEvento`, `justificativa`, `dataSolicitacao`, `dataDesejada`, `situacao`, `avaliadorId`, `dataAvaliacao`, `justificativaRejeicao`, `eventoId` |
| Evento | `id`, `tipo`, `equipamentoId`, `fornecedorId`, `solicitacaoId`, `usuarioId`, `dataPrevista`, `dataRealizacao`, `situacao`, `descricao`, `observacoes`, `numeroCertificado`, `erroMedido`, `incerteza`, `caEfetivo`, `resultado`, `custoEstimadoCentavos`, `custoRealizadoCentavos`, `problemaServico`, `estadoRetorno`, `recorrente`, `proximaDataPrevista`, `origem` |
| Auditoria | `id`, `usuarioId`, `tabelaAfetada`, `registroId`, `dataHora`, `acao`, `dadosAnteriores`, `dadosNovos`, `motivo`, `ip` |

## 3. Enums

| Enum | Valores |
| --- | --- |
| Perfil | `ADMIN`, `GESTOR_LAB`, `GESTOR_GERAL`, `TECNICO` |
| Tipo de evento | `CALIBRACAO`, `VERIFICACAO`, `MANUTENCAO_PREVENTIVA`, `MANUTENCAO_CORRETIVA`, `DIVERGENCIA_INVENTARIO` |
| Situação do evento | `AGENDADO`, `REALIZADO`, `CANCELADO` |
| Situação da solicitação | `PENDENTE`, `APROVADA`, `REJEITADA` |
| Situação do equipamento | `ATIVO`, `INATIVO`, `EM_MANUTENCAO` |
| Resultado | `APROVADO`, `REPROVADO` |
| Estado de retorno | `APTO`, `EM_MANUTENCAO`, `INATIVO` |
| Sinalização | `CALIBRACAO_VENCIDA`, `CALIBRACAO_REPROVADA`, `VERIFICACAO_VENCIDA`, `PERIODICIDADE_ZERO` |
| Status de prazo | `VENCIDO`, `A_VENCER`, `EM_DIA`, `SEM_DATA` |

## 4. Representação

| Grandeza | Formato |
| --- | --- |
| Datas | `YYYY-MM-DD` (UTC) |
| Data/hora | ISO-8601 UTC |
| Dinheiro | inteiro em centavos |
| Erro, U, CA | número com até 6 casas |
| Periodicidade | inteiro em **meses** (1,5 anos = 18 meses) |
| Dias para vencimento | inteiro, dias corridos; negativo = vencido |

## 5. Derivados (não armazenados)

`proximaCalibracao`, `proximaVerificacao`, `proximaManutencaoPreventiva`, `diasParaVencimento*`, `status*`, `sinalizacoes`, `situacaoMetrologica` e os valores efetivos de CA/periodicidade são calculados a cada leitura para não ficarem obsoletos.

## 6. Regras de unicidade

- **TAG:** única **por laboratório**; a base real reutiliza TAGs entre laboratórios e recebe desambiguação `(2)`, `(3)` dentro do mesmo laboratório.
- **Patrimônio/nº de série:** únicos globalmente quando informados; nulos são permitidos em registros importados.
- **E-mail**, **sigla/código de laboratório**, **CNPJ**, **categoria** e **subcategoria no escopo** também são únicos.

## 7. Importação

`scripts/importar-base-real.js` lê as extrações de `EQUIP.xlsx`, `FG 020` e `FG 006`, normaliza a taxonomia e gera `data/base-real.json`. O relatório de cobertura e lacunas fica em `data/RELATORIO-IMPORTACAO.md`.

## 8. Integridade e backup

- A importação valida esquema, coleções e referências antes de substituir o estado.
- Cada mutação é atômica em memória; falha restaura o estado anterior.
- Backup automático diário/manual no IndexedDB, retenção padrão de 7 dias.
- Exportação JSON completa e importação com backup automático antes da substituição.

## 9. Evolução para SGBD relacional

O desenho admite PostgreSQL futuramente: tabelas `laboratorio`, `usuario`, `fornecedor`, `categoria`, `subcategoria`, `item`, `equipamento`, `solicitacao`, `evento` e `log_auditoria`; `NUMERIC(18,2)` para dinheiro, `NUMERIC(18,6)` para metrologia, `DATE`/`TIMESTAMPTZ`, índices por laboratório/TAG e por equipamento/data, e restrições parciais de unicidade. A POC mantém IndexedDB porque o deploy é GitHub Pages.
