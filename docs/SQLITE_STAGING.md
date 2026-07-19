# SQLite em staging

## Restrição obrigatória

**SQLite staging suporta somente uma instância ativa da API.**

Não executar duas réplicas gravando no mesmo arquivo, não usar filesystem de rede incompatível com locking e não tratar volume efêmero como persistência.

## Layout recomendado

- Banco: `/var/lib/consultoria/consultoria.sqlite`
- WAL/SHM: no mesmo filesystem do banco
- Backups locais: `/var/backups/consultoria`
- Backup externo: volume/mount separado ou adapter externo

`DATABASE_PATH` e `SQLITE_BACKUP_DIR` devem ser absolutos e distintos. O processo usa WAL, foreign keys e busy timeout. `API_REPLICA_COUNT=1` e `SQLITE_VOLUME_ACK=single-instance-persistent-volume` são confirmações explícitas de operação.

## Provisionamento

- [ ] Criar volume persistente exclusivo.
- [ ] Garantir permissão de leitura/escrita para o usuário não root do container.
- [ ] Confirmar capacidade, alertas de espaço e política de retenção.
- [ ] Validar que reinício/redeploy preserva banco, WAL e backups.
- [ ] Confirmar que somente uma instância fica ativa durante deploy.
- [ ] Separar banco, backup local e cópia externa.

## Manutenção

Consultar `/ready`, espaço disponível, erros de lock e duração das operações. Antes de manutenção ou restore, retirar a API do tráfego e suspender escrita. Não copiar somente o arquivo `.sqlite` enquanto há transações; use o comando consistente de backup.

## Backup e restore

```powershell
npm.cmd --workspace @consultoria/api run db:backup:sqlite
npm.cmd --workspace @consultoria/api run db:backup:external
```

Restore é operação destrutiva e deve seguir `docs/RUNBOOK_BETA.md`, com confirmação explícita, validação da origem, cópia pré-restore e smoke posterior.

## Escalabilidade

Este perfil serve ao beta controlado de baixa concorrência. Múltiplas réplicas, alta disponibilidade e escala horizontal exigem concluir o runtime PostgreSQL e adaptar rate limits/locks distribuídos antes da mudança.
