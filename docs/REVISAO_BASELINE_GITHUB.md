# Revisão da baseline no GitHub

Data de preparação: 19/07/2026.

## Escopo

Branch de revisão:

```text
codex/release-baseline
```

Base:

```text
main
```

Commits principais antes da documentação da Sprint 3.9:

```text
327fce5 feat: establish validated consultoria saas baseline
0c0e032 docs: record baseline release evidence
```

Não fazer merge, excluir a branch ou publicar a tag sem revisão humana.

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

Os testes de API utilizaram bancos temporários. Os resultados e hashes de
preservação do banco operacional ficam registrados em
`RELATORIO_SPRINT_3_9_GITHUB_PRIVADO.md`.

## Comparar com main

No dispositivo local:

```powershell
git fetch origin
git diff origin/main...origin/codex/release-baseline --stat
git diff origin/main...origin/codex/release-baseline --name-status
git log --oneline --decorate --graph origin/main..origin/codex/release-baseline
```

No GitHub, use a comparação entre `main` e `codex/release-baseline`. Revise
especialmente autenticação, isolamento multiempresa, migrations, operações de
banco, configuração, CI e remoções de artefatos.

## Checklist de revisão

- [ ] confirmar que o repositório continua privado;
- [ ] confirmar que a branch publicada corresponde ao commit local;
- [ ] revisar todos os caminhos adicionados ou modificados;
- [ ] confirmar que exclusões de `node_modules`, `dist` e SQLite são
      intencionais;
- [ ] verificar migrations e scripts operacionais;
- [ ] revisar contratos `.env.example` sem inserir valores reais;
- [ ] conferir resultados de Flutter, API e clone limpo;
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
