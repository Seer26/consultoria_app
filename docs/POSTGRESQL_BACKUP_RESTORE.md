# Backup e restore PostgreSQL

## Regras

- nunca grave dump no repositório;
- nunca mostre a connection string em log;
- prefira backup/PITR do provedor em staging e produção;
- restaure sempre em banco separado;
- não declare restore aprovado sem execução e verificação.

## Backup lógico

Com `DATABASE_URL` somente no ambiente:

```powershell
Set-Location saas\apps\api
npm.cmd run db:backup:postgres -- -OutputFile C:\backups\consultoria.dump
```

O script usa `pg_dump --format=custom --no-owner --no-privileges` e retorna
somente caminho e SHA-256. Também é possível executar diretamente:

```powershell
pg_dump --format=custom --no-owner --no-privileges `
  --file=C:\backups\consultoria.dump $env:DATABASE_URL
```

## Restore isolado

Crie previamente um banco vazio e use uma URL exclusiva:

```powershell
Set-Location saas\apps\api
npm.cmd run db:restore:postgres -- `
  -InputFile C:\backups\consultoria.dump `
  -TargetDatabaseUrl $env:RESTORE_DATABASE_URL `
  -Confirm restore-into-isolated-database
```

O script usa `pg_restore --exit-on-error --no-owner --no-privileges`. Ele não
cria, apaga ou limpa o banco de destino.

## Verificação pós-restore

Defina temporariamente `DATABASE_URL` para o banco restaurado:

```powershell
npm.cmd run db:validate
npm.cmd run test:smoke:postgres
```

Checklist:

- [ ] checksum do dump registrado fora do Git;
- [ ] restore em banco isolado concluído;
- [ ] migrations sem pendências;
- [ ] contagens sanitizadas comparadas;
- [ ] zero foreign keys órfãs;
- [ ] health e readiness verdes;
- [ ] login sintético e isolamento validados;
- [ ] banco temporário removido por operador autorizado;
- [ ] resultado/data/responsável registrados.

## Situação da Sprint 3.12

Na Sprint 3.12, `pg_dump`, `pg_restore` e `psql` ainda não estavam instalados
nesta máquina, portanto o gate ficou historicamente bloqueado. O PostgreSQL
16.14 foi instalado posteriormente no host, e o backup e o restore foram
aprovados na Sprint 3.12.1. O relatório técnico final contém as evidências
atuais dessa validação.
