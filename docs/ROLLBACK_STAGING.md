# Rollback de staging

Status da Sprint 3.5: procedimento documentado, mas não ensaiado. Não existe ambiente externo, versão publicada, registry, volume ou DNS sobre o qual executar rollback.

## Princípios

- preservar o volume do SQLite e o destino externo de backups;
- nunca apagar/recriar volume como parte de rollback de aplicação;
- fazer backup verificado imediatamente antes de publicar;
- voltar para imagem e bundle Flutter identificados por versão imutável;
- não reverter migration destrutiva sem plano específico;
- restaurar banco primeiro em arquivo temporário e validar antes da troca.

## Gatilhos

- `/health` ou `/ready` falha após deploy;
- login, isolamento multiempresa, relatório ou PDF apresenta regressão;
- erro sustentado acima do limite operacional;
- corrupção/inacessibilidade do SQLite;
- CORS/TLS impede uso do aplicativo.

## API

1. interromper novas publicações e registrar o horário.
2. manter o volume anexado e gerar cópia/checksum se ainda acessível.
3. selecionar a imagem anterior conhecida e aprovada.
4. confirmar que ela usa o mesmo `DATABASE_PATH` e uma réplica.
5. publicar sem alterar secrets ou volume.
6. testar `/health`, `/ready`, login e consulta de empresa sintética.
7. se houver incompatibilidade de schema, não iniciar downgrade cego; restaurar o backup pré-deploy em arquivo temporário e seguir o runbook de restore.

## Flutter Web

1. republicar o artefato anterior.
2. manter a mesma `API_BASE_URL`.
3. invalidar o cache do HTML/service worker, sem eliminar assets necessários.
4. validar abertura direta de rotas, login e logout.

## Configuração, secrets e DNS

- reverter uma variável por vez usando histórico do secret manager;
- não colar o valor em terminal/log;
- preservar TTL e registro DNS anterior até a nova versão estabilizar;
- rotação de `JWT_SECRET` encerra sessões e precisa de decisão explícita.

## Banco

Seguir `docs/SQLITE_STAGING.md` e `docs/BACKUP_EXTERNO_STAGING.md`. Restauração é última medida, exige janela, cópia do arquivo atual, checksum e teste sobre arquivo temporário. Nunca restaurar com a API escrevendo no banco.

## Encerramento

Registrar versão problemática, versão restaurada, integridade do volume, backup utilizado, testes executados, impacto, responsável e ação preventiva. O staging só volta a receber beta após novo GO.
