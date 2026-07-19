# Revisão e integração da baseline no GitHub

Data de preparação: 19/07/2026.

## Escopo

Branch revisada:

```text
codex/dependency-hardening
```

Base:

```text
codex/release-baseline
```

Commits principais do hardening:

```text
23feb6e chore: normalize repository line endings
fc29f7b chore: remediate dependency vulnerabilities
55a997f docs: prepare baseline integration evidence
```

A baseline e a hardening permanecem publicadas no repositório privado. A
revisão confirmou escopo somente de padronização Git, atualização compatível
do lockfile e documentação. O GitHub CLI não estava disponível e não foi
instalado; nenhum pull request foi simulado ou declarado. Foi usada a
integração local auditada expressamente permitida, com base
`codex/release-baseline`, head `codex/dependency-hardening`, estratégia de
merge commit e resultado
`63b0c0e758fa63fc65590b5d8648c3b2cf0cea11`.

## Arquivos proibidos verificados

- [x] nenhum SQLite, WAL, SHM ou `.db` rastreado;
- [x] nenhum backup ou dump rastreado;
- [x] nenhum `.env` real ou `.secrets*` rastreado;
- [x] nenhum token de provedor ou chave privada detectado;
- [x] nenhum `node_modules`, `dist`, `build`, `.dart_tool` ou `coverage`;
- [x] nenhum log ou PDF rastreado;
- [x] `.env.example` contém somente contrato e placeholders.

## Testes pré e pós-merge

Validação aprovada duas vezes em 19/07/2026, antes e depois do merge:

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
npm.cmd run build
```

- `flutter pub get`: aprovado;
- `flutter analyze`: aprovado, sem issues;
- `flutter test --reporter expanded`: 19/19 aprovados;
- `npm.cmd ci`: aprovado e lockfile inalterado;
- `npm.cmd audit --json`: zero em todas as severidades;
- build da API: aprovado;
- unitários, operações e E2E: aprovados separadamente;
- suíte agregada da API: aprovada;
- smoke da API: aprovado;
- build raiz: aprovado.

Os testes de API utilizaram bancos temporários. Os resultados, a classificação
das dependências e os hashes de preservação do banco operacional ficam
consolidados em `RELATORIO_SPRINT_3_12_MIGRACAO_POSTGRESQL.md`.

O audit inicial encontrou 6 vulnerabilidades: 2 baixas, 3 moderadas e 1 alta.
Atualizações compatíveis no lockfile corrigiram todas elas sem `--force`,
mudança de major ou alteração dos manifests. O audit final registrou zero
vulnerabilidades.

A política de `.gitattributes` agora mantém fontes portáveis em LF, scripts
Windows em CRLF e binários fora da normalização. Os sete registradores desktop
gerados pelo Flutter continuam versionados e `flutter pub get` não modifica
mais o status por diferença de quebra de linha.

## Comparação e integração

No dispositivo local:

```powershell
git fetch origin
git show --stat 63b0c0e758fa63fc65590b5d8648c3b2cf0cea11
git show --no-patch --format="%H %P %s" 63b0c0e758fa63fc65590b5d8648c3b2cf0cea11
```

O diff revisado antes da integração continha seis caminhos: `.gitattributes`,
`saas/package-lock.json`, dois documentos, o relatório consolidado e a remoção
do relatório anterior. Não houve alteração funcional, migration, banco,
secret ou artefato compilado. O merge tem como pais a baseline anterior
`668ac3c0c512a1e804b3d72d565660558cbf67f1` e a hardening publicada
`55a997f7055c86bbd6da69d089896f896c5ddd7e`.

## Checklist de revisão

- [x] confirmar que o repositório continua privado;
- [x] confirmar que a branch publicada corresponde ao commit local;
- [x] revisar todos os caminhos adicionados ou modificados;
- [x] confirmar que exclusões de `node_modules`, `dist` e SQLite são
      intencionais;
- [x] confirmar que migrations e scripts operacionais não mudaram;
- [x] revisar contratos `.env.example` sem inserir valores reais;
- [x] conferir resultados de Flutter, API e clone limpo;
- [x] confirmar que as 6 vulnerabilidades reportadas pelo npm foram corrigidas;
- [x] confirmar audit final com zero vulnerabilidades;
- [x] confirmar a política LF/CRLF e os registradores Flutter no Windows;
- [x] confirmar que `main` não foi alterada;
- [x] aprovar a integração auditada;
- [x] registrar que o PR não foi aberto por indisponibilidade da ferramenta.

## Resultado da aprovação

1. branches local e remota foram atualizadas e comparadas;
2. diff, lockfile, `.gitattributes`, documentação e relatório foram revisados;
3. arquivos proibidos e formatos conhecidos de secrets retornaram zero;
4. testes pré-integração foram aprovados;
5. a hardening documental foi publicada;
6. o merge commit auditado foi criado somente na baseline;
7. a matriz pós-merge foi aprovada antes do push;
8. documentação final e tag específica foram preparadas para publicação;
9. deploy e mudança do beta para GO não foram autorizados.

## Rollback

Depois do merge publicado:

1. não usar reset destrutivo ou force push;
2. preferir `git revert` dos commits aprovados;
3. reconstruir dependências e artefatos a partir da fonte;
4. executar toda a suíte;
5. tratar restore de dados como procedimento separado e autorizado.

## Tags

A tag local:

```text
baseline-pre-cloud-2026-07-19
```

permanece somente no dispositivo de origem e não foi movida nem publicada.

A tag nova e específica:

```text
baseline-hardened-pre-postgres-2026-07-19
```

foi criada anotada no commit documental final e publicada individualmente. A
publicação da tag não autoriza deploy.

## Sincronização final

- hardening local/remota:
  `55a997f7055c86bbd6da69d089896f896c5ddd7e`;
- merge de integração:
  `63b0c0e758fa63fc65590b5d8648c3b2cf0cea11`;
- baseline local/remota: commit documental final que contém este registro,
  confirmado igual após o push;
- `main` local/remota:
  `e039fc641f45378a9f7e7ac8d9371813ba4d952d`;
- nova tag: publicada no mesmo commit documental final;
- worktree: limpo após a sincronização;
- beta externo: `NO-GO`.
