# Backup e restore Postgres

> Procedimento executável e situação de validação da Sprint 3.12:
> `docs/POSTGRESQL_BACKUP_RESTORE.md`.

## Objetivo

Definir o processo mínimo para recuperar o SaaS em caso de erro operacional, perda de dados ou troca de ambiente.

## Backup

Em produção, preferir backup automático do provedor gerenciado de Postgres. O provedor deve oferecer:

- backups automáticos diários;
- retenção configurável;
- point-in-time recovery quando disponível;
- criptografia em repouso;
- exportação manual sob demanda antes de deploys críticos.

Backup manual com `pg_dump`:

```powershell
pg_dump "<DATABASE_URL>" --format=custom --file consultoria-backup.dump
```

Backup SQL simples:

```powershell
pg_dump "<DATABASE_URL>" --format=plain --file consultoria-backup.sql
```

Não salvar dumps com dados reais dentro do repositório.

## Restore

Restore em banco novo:

```powershell
createdb consultoria_restore
pg_restore --dbname "postgres://user:password@host:5432/consultoria_restore" consultoria-backup.dump
```

Restore de SQL simples:

```powershell
psql "postgres://user:password@host:5432/consultoria_restore" -f consultoria-backup.sql
```

Depois do restore:

```powershell
cd C:\Users\Pichau\consultoria_app\saas
npm.cmd --workspace @consultoria/api run db:validate
```

## Checklist de teste de restore

- [ ] Restaurar backup em banco isolado.
- [ ] Rodar `db:validate`.
- [ ] Subir API apontando para o banco restaurado.
- [ ] Testar `/health`.
- [ ] Fazer login com usuário de teste.
- [ ] Abrir empresa existente.
- [ ] Abrir plano atual.
- [ ] Abrir dashboard.
- [ ] Gerar relatório/PDF em ambiente não produtivo.
- [ ] Registrar data, responsável e resultado do teste.

## Frequência recomendada

- Staging: teste de restore mensal.
- Produção beta: teste de restore quinzenal.
- Produção comercial: teste de restore semanal ou antes de mudanças críticas de banco.
