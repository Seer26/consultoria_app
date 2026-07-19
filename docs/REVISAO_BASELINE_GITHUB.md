# Revisão da baseline no GitHub

Data de preparação: 19/07/2026.

## Escopo

Branch de revisão:

```text
codex/dependency-hardening
```

Base:

```text
codex/release-baseline
```

Commits principais do hardening antes da documentação da Sprint 3.10:

```text
23feb6e chore: normalize repository line endings
fc29f7b chore: remediate dependency vulnerabilities
```

Não fazer merge, excluir a branch ou publicar a tag sem revisão humana.

A baseline permanece publicada no repositório privado. A branch
`codex/dependency-hardening` também foi publicada e rastreia
`origin/codex/dependency-hardening`. Ela contém somente padronização Git,
atualização compatível do lockfile e documentação. Nenhum pull request foi
aberto.

## Arquivos proibidos verificados

- [x] nenhum SQLite, WAL, SHM ou `.db` rastreado;
- [x] nenhum backup ou dump rastreado;
- [x] nenhum `.env` real ou `.secrets*` rastreado;
- [x] nenhum token de provedor ou chave privada detectado;
- [x] nenhum `node_modules`, `dist`, `build`, `.dart_tool` ou `coverage`;
- [x] nenhum log ou PDF rastreado;
- [x] `.env.example` contém somente contrato e placeholders.

## Testes

Validação aprovada em 19/07/2026:

```powershell
flutter pub get
flutter analyze
flutter test --reporter expanded
npm.cmd --workspace @consultoria/api run build
npm.cmd --workspace @consultoria/api run test
npm.cmd --workspace @consultoria/api run test:smoke
npm.cmd run build
```

- `flutter pub get`: aprovado;
- `flutter analyze`: aprovado, sem issues;
- `flutter test --reporter expanded`: 19/19 aprovados;
- build da API: aprovado;
- suíte agregada da API: aprovada;
- smoke da API: aprovado;
- build raiz: aprovado.

Os testes de API utilizaram bancos temporários. Os resultados, a classificação
das dependências e os hashes de preservação do banco operacional ficam
registrados em `RELATORIO_SPRINT_3_10_HARDENING_REPOSITORIO.md`.

O audit inicial encontrou 6 vulnerabilidades: 2 baixas, 3 moderadas e 1 alta.
Atualizações compatíveis no lockfile corrigiram todas elas sem `--force`,
mudança de major ou alteração dos manifests. O audit final registrou zero
vulnerabilidades.

A política de `.gitattributes` agora mantém fontes portáveis em LF, scripts
Windows em CRLF e binários fora da normalização. Os sete registradores desktop
gerados pelo Flutter continuam versionados e `flutter pub get` não modifica
mais o status por diferença de quebra de linha.

## Comparar com main

No dispositivo local:

```powershell
git fetch origin
git diff origin/codex/release-baseline...origin/codex/dependency-hardening --stat
git diff origin/codex/release-baseline...origin/codex/dependency-hardening --name-status
git log --oneline --decorate --graph origin/codex/release-baseline..origin/codex/dependency-hardening
```

No GitHub, use a comparação entre `codex/release-baseline` e
`codex/dependency-hardening`. Revise especialmente o lockfile,
`.gitattributes`, o resultado do audit e a documentação. Não há alteração
funcional, migration ou banco nesta branch.

## Checklist de revisão

- [ ] confirmar que o repositório continua privado;
- [ ] confirmar que a branch publicada corresponde ao commit local;
- [ ] revisar todos os caminhos adicionados ou modificados;
- [ ] confirmar que exclusões de `node_modules`, `dist` e SQLite são
      intencionais;
- [ ] verificar migrations e scripts operacionais;
- [ ] revisar contratos `.env.example` sem inserir valores reais;
- [ ] conferir resultados de Flutter, API e clone limpo;
- [x] confirmar que as 6 vulnerabilidades reportadas pelo npm foram corrigidas;
- [x] confirmar audit final com zero vulnerabilidades;
- [x] confirmar a política LF/CRLF e os registradores Flutter no Windows;
- [ ] confirmar que `main` não foi alterada;
- [ ] aprovar ou solicitar correções;
- [ ] decidir separadamente se um pull request deve ser aberto.

## Procedimento de aprovação

1. dois revisores, quando disponíveis, conferem o diff e este checklist;
2. o responsável confirma que não há dados empresariais ou secrets;
3. o responsável valida a decisão GO/NO-GO vigente;
4. somente depois decide-se sobre PR e merge;
5. tag e deploy continuam decisões separadas.

## Rollback

Antes de merge, rollback significa manter `main` intacta e interromper a
revisão. Correções devem entrar em novos commits na branch, sem reescrever
histórico compartilhado.

Depois de qualquer merge futuro:

1. não usar reset destrutivo ou force push;
2. preferir `git revert` dos commits aprovados;
3. reconstruir dependências e artefatos a partir da fonte;
4. executar toda a suíte;
5. tratar restore de dados como procedimento separado e autorizado.

## Publicação futura da tag

A tag local:

```text
baseline-pre-cloud-2026-07-19
```

permanece somente no dispositivo de origem. Após aprovação humana, confirme
que ela aponta para o commit pretendido e publique somente essa tag:

```powershell
git push origin baseline-pre-cloud-2026-07-19
```

Nunca use `git push --tags` nesta baseline. A publicação da tag não autoriza
deploy.
