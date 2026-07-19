# Plano de higiene do Git

Data da consolidação: 19/07/2026.

## Situação anterior

O repositório permanecia na `main`, acompanhando `origin/main`, com somente o
commit inicial `e039fc6`. O worktree reunia alterações de várias sprints sem
checkpoint: 209 caminhos rastreados alterados, 139 arquivos não rastreados e
6.276 artefatos/dados locais ainda presentes no índice.

Os principais riscos eram:

- rollback sem um ponto funcional validado;
- 6.224 arquivos de `saas/node_modules/` versionados;
- 45 arquivos de `saas/apps/api/dist/` versionados;
- 6 arquivos de `saas/packages/domain/dist/` versionados;
- `saas/apps/api/data/consultoria.sqlite` versionado;
- mistura de fonte, testes, documentação, dependências, builds e dados locais;
- cópia incompleta do banco caso o WAL fosse ignorado em um backup manual.

## Baseline adotada

A Sprint 3.6 adotou um único commit de baseline porque o histórico acumulado
não permitia separar retrospectivamente as mudanças funcionais sem risco de
omissão ou atribuição incorreta.

Branch local:

```text
codex/release-baseline
```

Commit de baseline:

```text
327fce5 feat: establish validated consultoria saas baseline
docs: record baseline release evidence
```

Tag anotada local:

```text
baseline-pre-cloud-2026-07-19
```

A branch, os commits e a tag são exclusivamente locais nesta sprint. O segundo
commit registra os resultados pós-commit e é o alvo da tag. Nenhum push ou
deploy faz parte desta consolidação.

## Arquivos retirados do índice

Foram selecionados explicitamente para retirada do índice, sem exclusão local:

- `saas/node_modules/`;
- `saas/apps/api/dist/`;
- `saas/packages/domain/dist/`;
- `saas/apps/api/data/consultoria.sqlite`.

WAL e SHM já estavam fora do índice e cobertos pelo `.gitignore`. `build/`,
`.dart_tool/` e `coverage/` também não estavam rastreados.

## Arquivos preservados

Continuam versionáveis:

- código Flutter, Node.js e TypeScript;
- migrations e scripts de banco;
- testes automatizados;
- `package-lock.json` e `pubspec.lock`;
- `.env.example`, sem segredo real;
- Dockerfiles, Compose de referência e workflows;
- scripts operacionais;
- documentação técnica, operacional e jurídica em rascunho;
- checklists ainda utilizados.

Os arquivos locais ignorados permanecem no disco, incluindo dependências,
builds, bancos, WAL/SHM e configurações locais.

## Banco e backup de segurança

Banco operacional preservado:

```text
C:\Users\Pichau\consultoria_app\saas\apps\api\data\consultoria.sqlite
```

Backup consistente criado pela rotina oficial:

```text
C:\tmp\consultoria-sprint-3-6-backups\consultoria-2026-07-19T18-25-26-042Z.backup.sqlite
```

Evidência:

- banco principal: 131.072 bytes;
- backup com WAL incorporado: 176.128 bytes;
- SHA-256 do backup:
  `5B65CD1613B6B04F0DD1603A0F72F8738DF99C9113E8756443A5BCEBD120C46B`;
- `PRAGMA quick_check`: `ok` na origem e no backup;
- restore não executado;
- backup fora do Git.

## Regras permanentes

- nunca usar `git add .` sem revisão imediatamente anterior;
- nunca versionar `.env`, `.env.local`, `.secrets*`, bancos ou backups;
- não versionar `node_modules`, `dist`, `build`, `.dart_tool` ou `coverage`;
- usar bancos temporários em testes;
- gerar backup consistente antes de qualquer operação sobre o banco;
- revisar `git diff --cached --name-status` e `git diff --cached --stat`;
- manter apenas o relatório da sprint mais recente;
- não fazer push de branch ou tag sem revisão do responsável.

## Testes da baseline

A baseline só deve ser considerada pronta quando estiverem verdes:

```powershell
flutter pub get
flutter analyze
flutter test --reporter expanded
npm.cmd --workspace @consultoria/api run build
npm.cmd --workspace @consultoria/api run test:unit
npm.cmd --workspace @consultoria/api run test:operations
npm.cmd --workspace @consultoria/api run test:e2e
npm.cmd --workspace @consultoria/api run test
npm.cmd --workspace @consultoria/api run test:smoke
npm.cmd --workspace @consultoria/api run test:load:lite
npm.cmd --workspace @consultoria/api run test:staging:start
npm.cmd run build
```

Todos os testes de API devem apontar para bancos temporários, nunca para
`consultoria.sqlite`.

## Procedimento futuro de push

Somente após revisão do responsável:

1. conferir a branch e o status;
2. revisar o commit e a tag local;
3. confirmar novamente que não há secrets ou dados locais no commit;
4. publicar primeiro a branch;
5. abrir revisão;
6. publicar a tag somente depois da aprovação da baseline.

Comandos previstos, mas não executados nesta sprint:

```powershell
git push -u origin codex/release-baseline
git push origin baseline-pre-cloud-2026-07-19
```

## Procedimento para outro dispositivo

Use `docs/CONFIGURACAO_NOVO_DISPOSITIVO.md`. O banco operacional e os secrets
não vêm do Git: devem ser provisionados por canal seguro e validados
separadamente.

## Procedimento de rollback

Para código:

1. não usar reset destrutivo;
2. criar uma branch a partir da tag local validada;
3. preferir `git revert` para desfazer commits já compartilhados;
4. reinstalar dependências e reconstruir artefatos a partir da fonte;
5. executar a suíte antes de substituir qualquer ambiente.

Para dados:

1. não restaurar automaticamente;
2. validar o backup e o destino;
3. interromper a API;
4. usar somente a rotina oficial de restore com confirmação explícita;
5. preservar a cópia pré-restore;
6. executar `quick_check` e smoke após a restauração.

## Limitações e ações futuras

- SQLite continua limitado a instância única;
- staging externo, PostgreSQL e backup remoto continuam pendentes;
- a tag local não substitui backup externo;
- a primeira publicação remota exige revisão humana do baseline;
- a migração para PostgreSQL deve ocorrer em sprint separada.
