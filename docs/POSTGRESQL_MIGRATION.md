# Migração reversível de SQLite para PostgreSQL

## Estratégia

`DATABASE_URL` presente seleciona PostgreSQL; ausente seleciona SQLite. A
diferença fica no adapter da API, não no Flutter ou nos services. A origem
SQLite não é apagada e não existe sincronização bidirecional.

## Pré-condições

1. usar banco PostgreSQL vazio e isolado;
2. criar backup SQLite consistente e validar `PRAGMA quick_check`;
3. usar somente cópia autorizada da origem;
4. confirmar que `DATABASE_URL` aponta ao destino correto;
5. executar migrations e `db:validate`;
6. não usar o arquivo SQLite operacional diretamente.

## Inventário de compatibilidade

| Componente | SQLite | PostgreSQL | Tratamento |
|---|---|---|---|
| conexão | `better-sqlite3` | pool `pg` | factory lazy por `DATABASE_URL` |
| placeholders | `?` e `@nome` | `$1...$n` | conversão centralizada |
| ignore em insert | `INSERT OR IGNORE` | `ON CONFLICT DO NOTHING` | tradução no adapter |
| datas de dashboard | `date`/`julianday` | `CURRENT_DATE`/`NOW` | tradução centralizada |
| transações | `BEGIN IMMEDIATE` | client `BEGIN/COMMIT/ROLLBACK` | contexto transacional |
| JSON de diagnóstico | texto JSON | texto JSON | serialização preservada |
| metadata legal | texto JSON | `jsonb` | parâmetro validado pelo PostgreSQL |
| IDs | texto UUID/string | texto UUID/string | preservados |
| tenant | `company_id` | `company_id` | filtros continuam na API |

Não há autoincremento, `last_insert_rowid`, `INSERT OR REPLACE`, paginação
específica ou booleanos persistidos como contrato do domínio.

## Dry-run

O dry-run valida argumentos, integridade da origem e conectividade do destino,
sem executar migrations nem importar:

```powershell
npm.cmd --workspace @consultoria/api run db:migrate:sqlite-to-postgres -- `
  --source=C:\caminho\copia-autorizada.backup.sqlite `
  --confirm=migrate-sqlite-to-postgres `
  --allow-operational-backup `
  --dry-run
```

O relatório contém somente contagens. Arquivos com `demo`, `e2e`, `test` ou
`staging` no nome são recusados, assim como o SQLite operacional direto.

## Migração

```powershell
npm.cmd --workspace @consultoria/api run db:migrate:sqlite-to-postgres -- `
  --source=C:\caminho\copia-autorizada.backup.sqlite `
  --confirm=migrate-sqlite-to-postgres `
  --allow-operational-backup
```

Flags excepcionais:

- `--allow-non-empty-destination`: somente após revisão; não apaga nem
  sobrescreve registros e a verificação final ainda deve passar;
- `--allow-production-destination`: autorização explícita quando
  `NODE_ENV=production`; fora do escopo desta sprint.

## Ordem e atomicidade

A importação respeita foreign keys:

```text
companies -> plans -> users -> subscriptions -> submissions -> answers
-> action tasks -> usage/events -> reset tokens -> legal acceptances
```

A escrita usa uma transação PostgreSQL. Qualquer erro faz rollback. Os planos
Starter e Growth são criados idempotentemente pelas migrations e reconciliados
pelos mesmos IDs.

## Verificação automática

Ao final, o migrador compara contagens por tabela e verifica:

- usuário empresarial sem empresa;
- pesquisa sem empresa;
- resposta sem pesquisa;
- tarefa sem empresa.

Resultado esperado: contagens equivalentes e zero órfãos. IDs, datas,
relacionamentos e `company_id` são inseridos sem transformação.

Depois execute:

```powershell
npm.cmd --workspace @consultoria/api run db:validate
npm.cmd --workspace @consultoria/api run test:e2e:postgres
npm.cmd --workspace @consultoria/api run test:smoke:postgres
```

## Limite atual da validação

O código foi preparado na Sprint 3.12, mas não foi executado localmente contra
PostgreSQL porque Docker e as ferramentas PostgreSQL estavam indisponíveis.
Não trate esta documentação como evidência de migração aprovada.

