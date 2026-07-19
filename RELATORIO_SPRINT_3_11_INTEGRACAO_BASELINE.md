# Relatório da Sprint 3.11 — Integração da Baseline

Data: 19/07/2026.

## 1. Objetivo

Revisar o hardening de dependências e de finais de linha, integrar
`codex/dependency-hardening` em `codex/release-baseline` sem alterar `main` e
publicar no GitHub toda a evidência versionada da baseline anterior à migração
para PostgreSQL.

Este documento está sendo preparado na branch de hardening antes da
integração. As seções de merge, validação pós-merge, tag e sincronização final
serão concluídas na baseline somente com evidências efetivamente obtidas.

## 2. Estado alcançado

Estado pré-integração aprovado:

- worktree limpo no início;
- hardening local e remoto no commit
  `5873dca8c9a6d125165a7d3c9bd6b1ec507e3b6e`;
- baseline local e remota no commit
  `668ac3c0c512a1e804b3d72d565660558cbf67f1`;
- `main` local e remota no commit
  `e039fc641f45378a9f7e7ac8d9371813ba4d952d`;
- auditoria npm com zero vulnerabilidades;
- matriz completa pré-integração aprovada;
- banco operacional e arquivos auxiliares preservados;
- nenhum arquivo proibido ou formato conhecido de secret rastreado.

## 3. Histórico consolidado das sprints anteriores

O produto partiu de um MVP Flutter com API Node.js/TypeScript e evoluiu para
um SaaS multiempresa. Foram validados pesquisa, diagnóstico, plano de ação,
tarefas, dashboards, relatório executivo e PDF, com isolamento por empresa e
papéis `ADMIN`, `OWNER` e `EMPLOYEE`.

As sprints de produto acrescentaram onboarding real de empresa e primeiro
`OWNER`, seed demo controlado por flag, planos Starter/Growth, entitlements,
limites, troca manual de plano pelo `ADMIN`, histórico de assinatura,
configurações da própria empresa pelo `OWNER`, mensagens de sessão e
documentação de onboarding beta.

As sprints operacionais acrescentaram migrações versionadas, suporte
preparatório a PostgreSQL por `DATABASE_URL`, execução local em SQLite,
Docker/deploy documentados, health/readiness, logs estruturados, backup e
restore, CI, recuperação de senha, aceite de documentos legais, rate limits e
proteções de autenticação. A arquitetura foi preservada: Flutter consome a API
Node/TypeScript; o frontend não acessa diretamente o banco.

A Sprint 3.9 estabeleceu e publicou uma baseline privada na branch
`codex/release-baseline`, com `main` intocada. A Sprint 3.10 criou
`codex/dependency-hardening` a partir da baseline, publicou a branch e validou
clone limpo. Seus commits temáticos foram:

```text
23feb6e chore: normalize repository line endings
fc29f7b chore: remediate dependency vulnerabilities
c7d8606 docs: record dependency hardening evidence
f094fa9 docs: record clean clone evidence
5873dca docs: record hardening branch publication
```

O hardening reduziu o `npm audit` de 6 ocorrências — 2 baixas, 3 moderadas e
1 alta — para zero, somente com atualização compatível do lockfile, sem
`--force`, mudança de major nos manifests ou alteração funcional. A política
de `.gitattributes` passou a fixar fontes portáveis em LF, scripts Windows em
CRLF e binários fora de normalização. Sete registradores Flutter versionados
permaneceram estáveis.

Arquivos locais de banco, WAL, SHM, backups, ambientes, dependências e builds
foram retirados ou mantidos fora do índice por `.gitignore`. A auditoria não
detectou chaves privadas, tokens de provedor nem segredos reais versionados.
O clone limpo da branch de hardening reproduziu instalação, audit zero e build.

Riscos herdados: migração e ensaio real de PostgreSQL ainda pendentes,
infraestrutura de staging/produção não provisionada, backup externo e restore
real dependentes do provedor, integração real de e-mail/alertas pendente e
beta externo ainda bloqueado pelo `GO_NO_GO_BETA.md`. Pagamentos permanecem
fora do escopo.

## 4. Estado inicial do Git

Após `git fetch --prune origin`:

| Referência | Commit |
|---|---|
| `codex/dependency-hardening` | `5873dca8c9a6d125165a7d3c9bd6b1ec507e3b6e` |
| `origin/codex/dependency-hardening` | `5873dca8c9a6d125165a7d3c9bd6b1ec507e3b6e` |
| `codex/release-baseline` | `668ac3c0c512a1e804b3d72d565660558cbf67f1` |
| `origin/codex/release-baseline` | `668ac3c0c512a1e804b3d72d565660558cbf67f1` |
| `main` e `origin/main` | `e039fc641f45378a9f7e7ac8d9371813ba4d952d` |

O remoto `origin` é o repositório privado esperado. O worktree estava limpo.
A tag anotada antiga `baseline-pre-cloud-2026-07-19` existia somente localmente
e não foi movida nem publicada.

## 5. Sincronização local e remota

O `fetch --prune` foi concluído sem divergências. A consulta direta ao remoto
confirmou as três branches e nenhum ref de tag publicado no início da sprint.
Não havia commit exclusivo do computador nas branches em escopo.

## 6. Auditoria de arquivos proibidos

Foram auditados 457 caminhos rastreados. Resultado: zero ocorrências proibidas
para SQLite/SQLite3/WAL/SHM, backup/dump, `.env`, `.env.local`, `.secrets*`,
`node_modules`, `dist`, `build`, `.dart_tool`, `coverage`, logs e PDFs gerados.
Arquivos `.env.example` foram preservados como contratos sem valores reais.

## 7. Auditoria de secrets

Busca por formatos de chave privada, tokens OpenAI e tokens GitHub conhecidos:
zero arquivos. Os nomes `OPENAI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`,
`SMTP_PASSWORD`, `EMAIL_API_KEY` e `ALERT_WEBHOOK_URL` continuam permitidos
somente como contratos, referências a variáveis de ambiente ou placeholders.
Nenhum valor sensível foi impresso durante a auditoria.

## 8. Diff entre branches

Antes da consolidação deste relatório, o diff da baseline para o hardening
continha somente:

- `.gitattributes`;
- `saas/package-lock.json`;
- documentação de revisão e de novo dispositivo;
- relatório consolidado da Sprint 3.10;
- remoção consolidada do relatório da Sprint 3.9.

Não houve mudança de regra de negócio, autenticação, isolamento multiempresa,
planos, migrations, dados operacionais, banco, secrets ou artefatos
compilados.

## 9. Dependências e audit

Na pasta `saas`:

- `npm.cmd ci`: aprovado, 257 pacotes instalados;
- `npm.cmd audit`: zero vulnerabilidades;
- `npm.cmd audit --json`: 0 info, 0 low, 0 moderate, 0 high e 0 critical;
- SHA-256 do lockfile antes e depois:
  `691DC526EF96549E47DA815A9F6FC6A37371ADCE3D6453EAC7E5798C20A44478`;
- nenhum arquivo rastreado alterado.

O aviso de manutenção do instalador legado usado por uma dependência nativa
permanece informativo e não representa vulnerabilidade registrada pelo audit.

## 10. Testes pré-integração

Todos aprovados em execução sequencial:

| Validação | Resultado |
|---|---|
| `flutter pub get` | aprovado |
| `flutter analyze` | sem issues |
| `flutter test --reporter expanded` | 19/19 |
| build da API | aprovado |
| testes unitários da API | aprovados, 7 casos de política de senha |
| testes operacionais | aprovados |
| testes E2E | aprovados |
| suíte agregada da API | aprovada |
| smoke da API | aprovado |
| build raiz domain/API/web | aprovado, Vite 6.4.3 |

Os E2E confirmaram isolamento multiempresa, autenticação, pesquisa, plano de
ação, tarefas, dashboards, relatório/PDF, segurança, operações e readiness.
Usaram bancos temporários e não alteraram arquivos rastreados.

## 11. Publicação da branch de hardening

A branch já estava publicada em `origin/codex/dependency-hardening`. Esta
preparação documental consolidará o relatório anterior em novo commit
`docs: prepare baseline integration evidence`; após o push, os hashes local e
remoto serão novamente comparados.

## 12. Pull request ou integração auditada

Base obrigatória: `codex/release-baseline`.

Head obrigatória: `codex/dependency-hardening`.

Título preparado:
`chore: harden dependencies and normalize repository line endings`.

Caso o GitHub CLI não esteja disponível, será registrado o link de comparação
e usada a integração local auditada expressamente autorizada, sem afirmar que
um pull request foi criado.

## 13. Revisão

A revisão prévia confirmou escopo exclusivamente de hardening, lockfile,
política de finais de linha, documentação e consolidação de relatório. A
revisão final será repetida após a publicação deste documento.

## 14. Estratégia de merge

Estratégia planejada: merge commit sem fast-forward, com mensagem
`merge: integrate dependency hardening into release baseline`. Não haverá
merge em `main`, force push ou reescrita de histórico.

## 15. Baseline após merge

Pendente até a integração auditada e a obtenção do hash real do merge.

## 16. Testes pós-merge

Pendente. A mesma matriz de dependências, audit, Flutter, API, smoke e build
raiz será executada na baseline antes do push.

## 17. Banco operacional

Arquivos locais ignorados e ausentes do índice:

| Arquivo | Tamanho | SHA-256 |
|---|---:|---|
| `consultoria.sqlite` | 131072 bytes | `8F914633CB20580C9FD51B15AE938155AF99B48A78F5BED3E7B0847922A6A021` |
| `consultoria.sqlite-wal` | 226632 bytes | `6EFB2EA82DD12CB63746D324B8192DB27713EE87923105DF1F28528D3F60FF4F` |
| `consultoria.sqlite-shm` | 32768 bytes | `089354E6C7B52B5868794FB729C50AB9A05B49C0FF4DD9580F7249420FB83F9A` |

Os valores coincidem com a evidência da Sprint 3.10 antes e depois dos testes.
Nenhum conteúdo empresarial foi aberto.

## 18. Documentação publicada

Na preparação do hardening, este relatório substitui o relatório 3.10 e a
referência permanente é corrigida. A atualização conclusiva de
`docs/REVISAO_BASELINE_GITHUB.md`,
`docs/CONFIGURACAO_NOVO_DISPOSITIVO.md`, `docs/PLANO_HIGIENE_GIT.md` e
`GO_NO_GO_BETA.md` ocorrerá no commit documental final da baseline.

## 19. Tags locais e remotas

Estado inicial:

- `baseline-pre-cloud-2026-07-19`: anotada, somente local, preservada;
- `baseline-hardened-pre-postgres-2026-07-19`: ainda inexistente;
- nenhuma tag remota.

A nova tag será criada e publicada somente após merge, testes e commit
documental final.

## 20. Estado final do Git

Pendente até os commits, pushes, merge e tag desta sprint.

## 21. Sincronização com o GitHub

Até esta etapa, hardening, baseline e `main` coincidiam com os respectivos
hashes remotos. O relatório preliminar será publicado na hardening antes da
integração. A sincronização final exigirá baseline e hardening iguais ao
remoto, tag nova publicada, worktree limpo e `main` inalterada.

## 22. Falhas encontradas

Nenhuma falha bloqueante foi encontrada na auditoria ou nos testes
pré-integração. O GitHub CLI ainda será verificado; sua ausência não autoriza
simular um pull request.

## 23. Riscos restantes

- integração ainda não executada neste ponto do relatório;
- revisão humana adicional no GitHub pode não estar disponível no dispositivo;
- migração e ensaio de PostgreSQL continuam pendentes;
- serviços reais de staging, e-mail, alertas, backup externo e restore ainda
  dependem de infraestrutura/provedor;
- dependências Flutter têm versões mais novas fora das restrições atuais, sem
  necessidade de upgrade nesta sprint.

## 24. Pendências externas

Provisionar infraestrutura real, definir responsáveis operacionais, validar
restore real, configurar e-mail/alertas externos, executar staging com
PostgreSQL e obter autorização separada para beta externo. Pagamento,
checkout, gateways e faturas permanecem fora do escopo.

## 25. Critérios de aceite

Pré-integração:

- [x] documentos obrigatórios lidos;
- [x] branches e remoto auditados;
- [x] arquivos proibidos e secrets reauditados;
- [x] diff funcionalmente restrito;
- [x] `npm ci` e audit zero;
- [x] testes pré-integração aprovados;
- [x] banco operacional preservado;
- [ ] hardening documental publicada;
- [ ] revisão final do diff;
- [ ] merge na baseline;
- [ ] testes pós-merge;
- [ ] documentação final publicada;
- [ ] nova tag anotada publicada;
- [ ] sincronização final comprovada.

## 26. Recomendação para próxima sprint

Depois da conclusão e sincronização desta integração, iniciar uma sprint
separada de migração controlada e ensaio de PostgreSQL em staging, mantendo
deploy público e beta externo condicionados ao `GO_NO_GO_BETA.md`.

## Histórico consolidado das sprints anteriores

O histórico útil das sprints anteriores está consolidado nas seções 3, 4, 6,
7, 9, 10, 17, 23 e 24 deste relatório. Ele preserva arquitetura, baseline,
publicação privada, auditorias, hardening, testes, commits, riscos e
pendências sem duplicar integralmente documentos transitórios.

## Limpeza de relatórios anteriores

### Relatório lido

`RELATORIO_SPRINT_3_10_HARDENING_REPOSITORIO.md` foi lido integralmente antes
de qualquer alteração.

### Informações consolidadas

Foram preservados: histórico, arquitetura, estado Git, publicação privada,
auditoria de secrets, exclusões do índice, vulnerabilidades corrigidas, audit
zero, política LF/CRLF, registradores Flutter, testes, clone limpo, branches,
commits, riscos, pendências e hashes de preservação.

### Arquivo removido

`RELATORIO_SPRINT_3_10_HARDENING_REPOSITORIO.md` foi removido explicitamente
depois da consolidação.

### Documentos preservados

Foram preservados `GO_NO_GO_BETA.md`,
`VALIDACAO_FUNCIONAL_DADOS_REAIS.md`, `ROTEIRO_APRESENTACAO_CLIENTE.md`,
checklists, todo o conteúdo de `docs/` e `deploy/`, código, migrations,
testes, configurações, bancos locais ignorados e rascunhos jurídicos.

### Referências atualizadas

A referência permanente em `docs/REVISAO_BASELINE_GITHUB.md` passou a apontar
para este relatório. Menções históricas neste próprio documento identificam o
arquivo removido apenas como evidência consolidada, não como link operacional.

## Sincronização com o GitHub

O registro conclusivo ficará na seção 21 após a integração. Nesta preparação,
as branches locais coincidiam com seus pares remotos e não havia tag remota.
