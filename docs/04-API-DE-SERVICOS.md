# 04 — Contrato de serviços

**API pública:** `src/backend/index.js`
**Tipagem:** `contract/labucs.d.ts`
**Regra:** a interface não acessa o estado interno nem recalcula regras.

---

## 1. Inicialização

```js
import { criarAplicacao, ErroApp } from './src/backend/index.js';

const baseReal = await fetch('./data/base-real.json')
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);

const app = await criarAplicacao({ baseReal });
```

`criarAplicacao` é assíncrona: carrega/cria o IndexedDB, deriva hashes PBKDF2 na primeira carga, garante backup e restaura a sessão.

| Opção | Padrão | Uso |
| --- | --- | --- |
| `baseReal` | `null` | conteúdo de `data/base-real.json` |
| `usarDadosReais` | `true` | `false` para testes com base mínima |
| `armazenamento` | IndexedDB/localStorage/memória | memória em testes |
| `persistenciaSessao` | `sessionStorage` | memória em testes |
| `clock` | relógio do sistema | relógio determinístico |
| `iteracoesSenha` | `120000` | reduzir em testes |
| `parametros` | padrão | timeout, dias de alerta etc. |

## 2. Namespaces

| Namespace | Principais métodos |
| --- | --- |
| `auth` | `login`, `logout`, `sessao`, `renovar`, `segundosRestantes`, `alterarSenha` |
| `meta` | `info`, `funcionalidades`, `enums`, `saude` |
| `painel` | `resumo`, `alertas`, `agenda` |
| `laboratorios` | `listar`, `obter`, `criar`, `atualizar`, `inativar`, `reativar` |
| `usuarios` | `listar`, `obter`, `criar`, `atualizar`, `inativar`, `reativar`, `redefinirSenha`, `anonimizar`, `meusDados` |
| `fornecedores` | `listar`, `obter`, `criar`, `atualizar`, `inativar`, `reativar` |
| `categorias` | CRUD de categorias e subcategorias |
| `itens` | `listar`, `obter`, `criar`, `atualizar`, `inativar`, `reativar` |
| `equipamentos` | `listar`, `obter`, `criar`, `atualizar`, `inativar`, `reativar`, `historico`, `sinalizados` |
| `solicitacoes` | `listar`, `obter`, `criar`, `aprovar`, `rejeitar` |
| `eventos` | `listar`, `obter`, `criar`, `atualizar`, `realizar`, `cancelar`, `calcularPrevia` |
| `relatorios` | inventário, situação, histórico, Anexos 1/2/4/5, custos, exportar |
| `auditoria` | `listar`, `obter` (somente Gestor Geral) |
| `config` | parâmetros, backups, exportar/importar, reiniciar |
| `lgpd` | aviso, meus dados, anonimização |

## 3. Autenticação

```js
const { token, usuario } = await app.auth.login('gestor.lasfi@labucs.local', 'Senha@123');
const sessao = app.auth.sessao();
// sessao.usuario, sessao.permissoes, sessao.funcionalidades, sessao.segundosRestantes
await app.auth.logout();
```

A sessão é mantida em `sessionStorage`; a interface não deve copiar o token para `localStorage`.

## 4. Erros

```js
try { app.equipamentos.criar(dados); }
catch (erro) {
  if (erro instanceof ErroApp) {
    erro.codigo;   // VALIDACAO, SEM_PERMISSAO, REGRA_NEGOCIO...
    erro.message;  // PT-BR, exibível
    erro.campos;   // { campo: 'mensagem' } para formulários
  }
}
```

| Código | Uso |
| --- | --- |
| `VALIDACAO` | campos inválidos/ausentes |
| `NAO_AUTENTICADO` / `SESSAO_EXPIRADA` | login/sessão |
| `SEM_PERMISSAO` | perfil/escopo |
| `NAO_ENCONTRADO` | recurso inexistente/fora do escopo |
| `CONFLITO` | unicidade/estado |
| `REGRA_NEGOCIO` | guardas e CA ausente |
| `LIMITE` | tentativas de login |
| `IMPORTACAO` | arquivo/estado inválido |

## 5. Exemplos por fluxo

### Equipamentos

```js
app.equipamentos.listar({
  busca, laboratorioId, categoriaId, situacao, sinal,
  statusCalibracao, completude, pagina, tamanho
});

app.equipamentos.obter(id); // DTO + eventos + solicitações
app.equipamentos.criar({ laboratorioId, itemId, tag, patrimonio, numeroSerie, localizacao, dataAquisicao, dataColocacaoUso, valorAquisicaoCentavos });
app.equipamentos.atualizar(id, { ...campos, motivo });
app.equipamentos.inativar(id, motivo);
```

O DTO entrega `caCalibracaoEfetivo`, `periodicidade...`, `proximaCalibracao`, `diasParaVencimento*`, `status*`, `sinalizacoes` e `camposPendentes`.

### Eventos

```js
app.eventos.criar({
  tipo: 'CALIBRACAO', equipamentoId,
  dataRealizacao: '2026-11-08',
  numeroCertificado: 'CERT-123',
  erroMedido: -0.4, incerteza: 0.05,
  fornecedorId, custoRealizadoCentavos, observacoes, motivo
});

app.eventos.realizar(id, { dataRealizacao, erroMedido, incerteza });
app.eventos.cancelar(id, motivo);
app.eventos.calcularPrevia({ equipamentoId, tipo, erroMedido, incerteza });
```

`dataRealizacao` preenchida ⇒ realizado; vazia + `dataPrevista` ⇒ agendado.

### Solicitações

```js
app.solicitacoes.criar({ equipamentoId, tipoEvento, justificativa, dataDesejada });
app.solicitacoes.aprovar(id, { motivo });   // GL; cria evento AGENDADO
app.solicitacoes.rejeitar(id, { justificativaRejeicao });
```

### Relatórios

```js
const tabela = app.relatorios.inventario({ laboratorioId, de, ate });
const arquivo = app.relatorios.exportar('inventario', 'pdf', filtros);
// { nomeArquivo, mime, bytes: Uint8Array }
```

Download:

```js
const blob = new Blob([arquivo.bytes], { type: arquivo.mime });
const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: arquivo.nomeArquivo });
a.click();
```

### Configuração/LGPD

```js
app.config.atualizar({ ...parametros, motivo });
await app.config.criarBackup(motivo);
await app.config.exportarDados();
await app.config.importarDados(texto, motivo);
app.lgpd.meusDados();
app.usuarios.anonimizar(id, motivo);
```

## 6. Sincronização

- Após mutações, reconsulte os DTOs/listas; não mantenha cópias profundas.
- `await app.flush()` grava a fila do IndexedDB; use em `visibilitychange`/`pagehide` e antes de exportar.
- `app.inscrever(fn)` permite invalidar stores/caches.
- `app.temSessao()`, `app.segundosSessao()`, `app.versao`.

## 7. Permissões e navegação

`app.meta.funcionalidades()` retorna `{ codigo, nome, rota, permissoes, acessivel }`. A interface oculta `acessivel === false`; o backend bloqueia mesmo assim.

Permissões principais: `equipamentos.gerenciar`, `eventos.registrar`, `solicitacoes.aprovar`, `usuarios.gerenciar`, `relatorios.operacionais`, `indicadores.custos`, `auditoria.consultar`, `config.gerenciar`, `backup.gerenciar`, `lgpd.gerenciar`.

## 8. Integração com a camada visual

O frontend em `src/frontend/` é uma implementação de referência da identidade UCS. Outra camada visual pode importar apenas `src/backend/index.js` e `contract/labucs.d.ts`; não há dependência do DOM no backend.

Requisitos de integração:

- Não recalcular Erro+U, prazos, permissões ou relatórios no componente.
- Usar `erro.campos` nos formulários.
- Datas em `YYYY-MM-DD`; dinheiro em centavos.
- Diferenciar `null` (não informado) de zero em custos/receita.
- Chamar `app.flush()` ao sair/ocultar.
