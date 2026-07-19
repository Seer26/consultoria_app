# Rollback de PostgreSQL para SQLite

## O que significa reversível

A Sprint 3.12 mantém o SQLite intacto e permite selecionar o runtime removendo
`DATABASE_URL`. Não há replicação ou sincronização bidirecional. Dados criados
somente no PostgreSQL depois da virada não aparecem automaticamente no
SQLite.

## Pré-condições

- janela operacional aprovada;
- API parada para impedir novas escritas;
- SQLite de retorno identificado e validado;
- backup consistente do SQLite e checksum registrado;
- impacto de dados divergentes aceito;
- `.env.local` e secrets fora do Git.

## Procedimento

1. pare todas as instâncias da API;
2. preserve um backup PostgreSQL antes da mudança;
3. execute `PRAGMA quick_check` na cópia SQLite que será usada;
4. remova `DATABASE_URL` do ambiente da API;
5. configure `DATABASE_PATH` absoluto;
6. mantenha `ENABLE_DEMO_SEED=false`;
7. inicie exatamente uma instância quando SQLite for usado;
8. valide `/health`, `/ready`, login e fluxo crítico;
9. execute a suíte SQLite em banco temporário, nunca no operacional;
10. monitore logs antes de reabrir o uso.

Exemplo de seleção local:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:DATABASE_PATH='C:\dados\consultoria.sqlite'
npm.cmd --workspace @consultoria/api start
```

## Critérios de abortar

Não prossiga se:

- `quick_check` não retornar `ok`;
- o hash do SQLite mudar sem operação autorizada;
- houver novas escritas no PostgreSQL que precisem ser preservadas;
- health/readiness falhar;
- o arquivo não estiver em volume persistente;
- mais de uma réplica da API estiver ativa com SQLite.

## Retorno ao PostgreSQL

Pare a API, restaure `DATABASE_URL`, execute `db:migrate` e `db:validate` e
suba a API novamente. Não migre automaticamente alterações feitas no SQLite;
qualquer nova reconciliação exige plano e autorização próprios.

