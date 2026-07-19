# Relatório da Sprint 3.6 — Baseline Git

Data: 19/07/2026.

## 1. Objetivo

Consolidar o estado funcional acumulado do Consultoria SaaS em uma baseline Git
local, segura, reproduzível e auditável, sem implementar funcionalidades, sem
alterar dados empresariais e sem publicar branch, commit ou tag.

## 2. Estado alcançado

- código, testes, migrations, scripts e documentação preservados;
- banco operacional preservado e protegido por backup consistente;
- `node_modules`, `dist` e SQLite retirados do índice sem exclusão local;
- WAL, SHM, backups, builds, caches e secrets cobertos por regras de ignore;
- branch local `codex/release-baseline` criada;
- suíte completa aprovada;
- commit de baseline e tag anotada local definidos;
- nenhum push, pull request, deploy, PostgreSQL ou pagamento executado;
- decisão geral mantida como `NO-GO PARA BETA EXTERNO`.

## 3. Histórico consolidado das sprints anteriores

O projeto começou como MVP de demonstração com Flutter, API Node/TypeScript,
pesquisa, diagnóstico, plano de ação, dashboard, relatório executivo e PDF.
Empresa passou a ser a unidade central de isolamento e a API permaneceu como a
única fronteira de acesso aos dados.

As Sprints 1 a 2.5 consolidaram cadastro administrativo de empresa, primeiro
OWNER, EMPLOYEE, isolamento multiempresa, planos Starter/Growth, limites,
alteração manual de plano, histórico, configurações da empresa, sessão e
onboarding de cliente beta.

As Sprints 3.0 a 3.2 reforçaram autenticação e autorização, recuperação de
senha, rate limits, JWT revogável, logs sanitizados, request ID, health,
readiness, métricas, alertas, aceite legal e backup/restore SQLite.

As Sprints 3.3 a 3.5 prepararam Docker, Flutter Web/Nginx, perfil de staging,
seed sintético isolado, runbooks e documentação de publicação. Não houve
staging externo: provedor, domínio, DNS, e-mail, storage, alertas, OpenAI,
jurídico e suporte permaneceram como dependências externas.

As Sprints 3.7 e 3.8 estabilizaram a apresentação local, removeram fallback
demonstrativo do dashboard, permitiram retomada de pesquisa parcial, alinharam
senha mínima e protegeram o perfil local contra bancos demo/E2E/teste/staging.
A Sprint 3.8 não inseriu dados empresariais porque não recebeu conteúdo e
autorização do cliente.

## 4. Estado inicial do Git

- branch: `main`, acompanhando `origin/main`;
- commit: `e039fc641f45378a9f7e7ac8d9371813ba4d952d`;
- histórico: somente `e039fc6 Initial commit`;
- remoto: `origin`, repositório GitHub sem credencial embutida na URL;
- tags existentes: nenhuma;
- caminhos rastreados alterados: 209;
- arquivos não rastreados: 139;
- entradas resumidas no status: 213 modificadas, 2 excluídas e 73 agrupamentos
  não rastreados;
- caminhos gerados/dados rastreados: 6.276;
- risco principal: várias sprints sem checkpoint, o que tornava rollback por
  Git inseguro.

Nenhuma alteração foi feita durante a inspeção inicial.

## 5. Banco operacional

Banco:

```text
C:\Users\Pichau\consultoria_app\saas\apps\api\data\consultoria.sqlite
```

Evidência:

- arquivo existente e identificado como SQLite operacional;
- tamanho: 131.072 bytes;
- SHA-256:
  `8F914633CB20580C9FD51B15AE938155AF99B48A78F5BED3E7B0847922A6A021`;
- WAL: 226.632 bytes, ignorado e não rastreado;
- SHM: 32.768 bytes, ignorado e não rastreado;
- banco principal estava rastreado no início e foi retirado do índice;
- nome não contém demo, E2E, test ou staging;
- `consultoria-presentation-demo.sqlite` existe separadamente e não foi usado;
- nenhum conteúdo empresarial foi aberto ou alterado.

Após todos os testes, os hashes do banco principal e do WAL permaneceram
inalterados. Os bancos temporários das suítes foram removidos.

## 6. Backup de segurança

Backup criado pela rotina oficial `db:backup:sqlite`:

```text
C:\tmp\consultoria-sprint-3-6-backups\consultoria-2026-07-19T18-25-26-042Z.backup.sqlite
```

- destino fora da raiz e fora do Git;
- WAL incorporado pela API de backup do SQLite;
- tamanho: 176.128 bytes;
- SHA-256:
  `5B65CD1613B6B04F0DD1603A0F72F8738DF99C9113E8756443A5BCEBD120C46B`;
- `PRAGMA quick_check`: `ok` na origem e no backup;
- backup revalidado depois da retirada do índice e dos testes;
- banco original não foi substituído;
- restore não foi executado.

A primeira tentativa no sandbox falhou com `EPERM` ao criar o diretório externo.
A repetição autorizada fora dessa restrição foi concluída com sucesso.

## 7. Auditoria do repositório

Classificação dos 139 arquivos inicialmente não rastreados:

- 37 documentos/checklists/relatórios;
- 15 fontes Flutter;
- 60 fontes da API, incluindo 4 migrations e 13 testes;
- 11 arquivos de CI/deploy/configuração;
- 17 arquivos JavaScript gerados ao lado de fontes TypeScript equivalentes;
- 1 script PowerShell;
- 1 Compose PostgreSQL já documentado, sem ativação nesta sprint.

Os 17 JavaScript gerados foram cobertos pelo `.gitignore`; permaneceram no
disco e não entraram no commit.

Fontes, migrations, testes, workflows, scripts, lockfiles, configurações modelo
e documentação foram classificados como necessários para a baseline.

## 8. Auditoria de secrets

A auditoria analisou o conteúdo candidato à baseline e o commit inicial sem
imprimir valores.

Resultados:

- arquivos `.env`/`.env.local` rastreados: zero;
- `.env.local` encontrado localmente: 1, ignorado, não aberto para exibição;
- chaves privadas: zero;
- tokens com formato OpenAI/GitHub: zero;
- URLs com credenciais reais: zero;
- 4 ocorrências de URL com usuário/senha: exemplos locais ou placeholders;
- 13 arquivos com atribuições fixas de senha/token: testes automatizados e
  documentação de exemplo;
- 38 arquivos referenciam nomes de variáveis sensíveis, sem valor real
  detectado;
- Flutter não contém token com formato de provedor nem chave privada;
- bundle web não recebe chave privada.

Não foi identificada necessidade de substituição ou rotação. Se algum secret
real tiver sido compartilhado fora desta auditoria, a rotação continua sendo
responsabilidade operacional e não foi executada automaticamente.

## 9. Arquivos retirados do índice

Retirada explícita com preservação local:

- 6.224 arquivos em `saas/node_modules/`;
- 45 arquivos em `saas/apps/api/dist/`;
- 6 arquivos em `saas/packages/domain/dist/`;
- 1 arquivo `saas/apps/api/data/consultoria.sqlite`.

Total: 6.276 caminhos.

Não havia WAL ou SHM rastreado. `build/`, `.dart_tool/`, `coverage/` e
`saas/apps/web/dist/` também não estavam no índice.

## 10. Arquivos preservados

- Flutter e API;
- domínio compartilhado e frontend Vite legado;
- migrations;
- testes e CI;
- `package-lock.json`, `pubspec.lock` e manifests;
- scripts de banco, backup, restore, staging e build;
- Dockerfile e Compose sem secrets;
- checklists e documentação permanente;
- documentação jurídica em rascunho;
- banco, WAL, SHM, dependências e builds no disco local;
- `VALIDACAO_FUNCIONAL_DADOS_REAIS.md`;
- `ROTEIRO_APRESENTACAO_CLIENTE.md`;
- `CHECKLIST_APRESENTACAO_MVP.md`;
- `GO_NO_GO_BETA.md`;
- todo o conteúdo de `docs/` e `deploy/`.

`docs/RELATORIO_STATUS_CLIENTE.md` foi preservado por ser documentação de
status do cliente dentro de `docs/`, não relatório de sprint duplicado.

## 11. Gitignore e Dockerignore

O `.gitignore` já cobria dependências, builds, caches, coverage, bancos,
WAL/SHM, backups SQLite, dumps, `.env.*`, `.secrets*` e logs.

Foram acrescentados:

- `Thumbs.db`;
- `**/*.backup`;
- JavaScript emitido ao lado das fontes TypeScript do frontend Vite.

O `saas/.dockerignore` passou a cobrir também:

- `*.backup` e `*.backup.sqlite`;
- `*.tsbuildinfo`;
- logs;
- `.DS_Store` e `Thumbs.db`.

`.env.example`, migrations, lockfiles, código, testes e configurações
necessárias permanecem versionáveis.

## 12. Branch criada

Branch local:

```text
codex/release-baseline
```

Foi criada a partir de `e039fc6`, preservando o índice e o worktree. Nenhum push
foi executado.

## 13. Commits criados

A consolidação criou o commit funcional:

```text
327fce5 feat: establish validated consultoria saas baseline
```

Depois da verificação de reprodutibilidade, a evidência final é registrada em
um segundo commit estritamente documental:

```text
docs: record baseline release evidence
```

O hash desse segundo commit é o alvo da tag e pode ser consultado diretamente
no `git log`, evitando autorreferência impossível dentro do próprio commit.

## 14. Tag local

Tag anotada local criada após o commit documental:

```text
baseline-pre-cloud-2026-07-19
```

Mensagem: baseline local validada, sem publicação externa, sem PostgreSQL, sem
pagamentos, banco operacional não versionado e testes aprovados.

A tag aponta para o estado final documentado, é local e não foi publicada.

## 15. Formatação executada

Somente cinco arquivos Dart funcionalmente modificados na Sprint 3.8 foram
selecionados. Dois precisaram de ajuste:

- `lib/core/utils/validators.dart`;
- `lib/features/diagnosis/presentation/pages/chat_diagnosis_page.dart`.

A primeira execução ficou sem saída até o timeout do sandbox. A repetição
limitada aos mesmos cinco arquivos terminou em 0,10 segundo. Não houve
formatação global.

## 16. Testes Flutter

- `flutter pub get`: aprovado;
- `flutter analyze`: aprovado, sem issues;
- `flutter test --reporter expanded`: 19/19 aprovados.

## 17. Testes da API

Todos aprovados:

- build da API;
- `test:unit`;
- `test:operations`;
- `test:e2e`;
- suíte agregada `test`;
- `test:smoke`;
- `test:load:lite`;
- `test:staging:start`;
- build raiz do domínio, API e frontend Vite.

A carga leve executou 25 requisições com concorrência 2 e zero falhas. O E2E
aprovou isolamento multiempresa, autenticação, sessão, pesquisa, diagnóstico,
planos/limites, tarefas, dashboards, relatório e PDF.

Todos usaram arquivos temporários ou isolados. O banco operacional permaneceu
com o mesmo tamanho e SHA-256.

## 18. Reprodutibilidade

Antes do primeiro commit, dependências, builds e toda a suíte foram
reconstruídos com sucesso. Depois do commit `327fce5`, a verificação executou:

```text
flutter pub get
npm.cmd install
flutter analyze
npm.cmd --workspace @consultoria/api run build
npm.cmd --workspace @consultoria/api run test
```

Resultados pós-commit:

- `flutter pub get`: aprovado;
- `npm.cmd install`: aprovado, dependências atualizadas sem mudança de lockfile;
- `flutter analyze`: aprovado, sem issues;
- build da API: aprovado;
- suíte agregada da API: aprovada;
- artefatos reconstruídos permaneceram ignorados;
- nenhum banco temporário permaneceu no diretório de dados;
- banco operacional, WAL e backup mantiveram seus hashes.

## 19. Estado final do Git

Estado final:

- branch `codex/release-baseline`;
- commit funcional `327fce5`;
- commit documental de evidência;
- tag local `baseline-pre-cloud-2026-07-19` no estado documentado;
- somente fonte e documentação versionáveis;
- `node_modules`, `dist`, bancos, WAL/SHM, backups e caches ignorados;
- worktree limpo;
- nenhum push.

Os builds pós-commit não fizeram artefatos reaparecerem no status.

## 20. Falhas encontradas

- sandbox impediu a criação inicial do backup externo;
- `dart format` ficou travado no sandbox;
- dependências e builds estavam historicamente rastreados;
- banco operacional estava historicamente rastreado;
- 17 saídas JavaScript eram emitidas ao lado das fontes TypeScript;
- avisos de conversão futura LF/CRLF apareceram, sem erro de conteúdo;
- `node dist/server.js` continua não sendo o runtime operacional suportado.

As duas falhas de sandbox foram resolvidas por execução autorizada e limitada.

## 21. Riscos restantes

- baseline reúne várias sprints em um commit amplo;
- SQLite exige instância única;
- banco operacional e backup continuam dependentes deste dispositivo;
- staging, produção e restore remoto não foram comprovados;
- runtime direto de `dist/server.js` permanece incompatível com imports ESM
  emitidos;
- OpenAI depende de chave, crédito e disponibilidade;
- dados reais autorizados ainda não completaram o checklist funcional;
- primeira publicação remota exige revisão humana adicional.

## 22. Pendências externas

- provedor e infraestrutura;
- domínio, DNS e HTTPS;
- PostgreSQL e migração de dados;
- backup remoto;
- e-mail transacional real;
- coleta externa de logs e alertas;
- revisão jurídica;
- responsáveis, canal e SLA de suporte;
- chave/orçamento OpenAI de staging;
- autorização e dados empresariais para validação real.

## 23. Decisão GO/NO-GO

- higiene do Git: **APROVADO**;
- apresentação local assistida: **APROVADO COM RESTRIÇÕES**;
- beta externo: **NO-GO**.

A organização do Git não altera a ausência de staging online, PostgreSQL,
backup externo, e-mail real e aprovação jurídica.

## 24. Critérios de aceite

- [x] backup consistente e validado;
- [x] banco original intacto;
- [x] `node_modules`, `dist` e SQLite fora do índice;
- [x] WAL/SHM e backups fora do índice;
- [x] `.env` e `.env.local` fora do índice;
- [x] `.gitignore` e `.dockerignore` revisados;
- [x] nenhum secret real detectado;
- [x] branch local criada;
- [x] suíte Flutter verde;
- [x] suíte API, smoke e carga leve verdes;
- [x] relatório 3.8 consolidado e removido;
- [x] documentos permanentes preservados;
- [x] referências verificadas;
- [x] nenhum push;
- [x] commit funcional, commit documental e tag local confirmados após
  validação pós-commit.

## 25. Recomendação para a próxima sprint

Realizar revisão humana da baseline local e, somente depois, publicar a branch
para revisão. A sprint seguinte deve tratar publicação controlada separadamente
e manter o `NO-GO` externo até que infraestrutura e dependências operacionais
sejam fornecidas.

Prompt recomendado:

> Revise a branch local `codex/release-baseline`, o commit e a tag
> `baseline-pre-cloud-2026-07-19`. Confirme novamente que banco, backups,
> dependências, builds e secrets não estão versionados. Somente com autorização
> explícita, publique a branch para revisão, sem deploy, sem PostgreSQL e sem
> publicar a tag antes da aprovação.

## Histórico consolidado das sprints anteriores

O histórico necessário das Sprints 1 a 3.8 foi preservado na seção 3, incluindo
arquitetura, funcionalidades, segurança, multiempresa, apresentação, testes,
decisões técnicas, limitações e pendências externas.

Decisões preservadas:

- Flutter como frontend principal;
- API Node/TypeScript como única fronteira de dados;
- organização/empresa como tenant;
- ADMIN administra e consulta, mas não responde pesquisa;
- OWNER e EMPLOYEE operam no próprio tenant;
- Starter/Growth sem pagamento automático;
- seeds apenas em bancos isolados;
- SQLite operacional local nesta etapa;
- dados reais somente com autorização;
- nenhum acesso direto do Flutter ao banco.

## Limpeza de relatórios anteriores

### Relatório anterior lido

- `RELATORIO_SPRINT_3_8_VALIDACAO_REAL.md`, lido integralmente.

### Informações consolidadas

Foram preservados histórico das sprints, arquitetura, funcionalidades,
autenticação e perfis, isolamento, pesquisas, diagnóstico, plano de ação,
tarefas, dashboards, relatório/PDF, planos, testes, estado do SQLite, backup,
riscos Git, limitações de infraestrutura, decisão de apresentação e pendências
externas.

### Arquivo removido

- `RELATORIO_SPRINT_3_8_VALIDACAO_REAL.md`.

### Duplicações encontradas

Nenhuma cópia numerada ou relatório de sprint equivalente foi encontrada na
raiz.

### Documentos preservados

Foram preservados `VALIDACAO_FUNCIONAL_DADOS_REAIS.md`, roteiro, checklists,
`GO_NO_GO_BETA.md`, conteúdo de `docs/` e `deploy/`, rascunhos jurídicos,
código, migrations, testes, configurações e bancos locais.

### Referências atualizadas

A busca não encontrou documento externo referenciando diretamente o nome do
relatório 3.8. Nenhuma referência ficou quebrada. O histórico de sprint passa
a ser concentrado neste relatório 3.6.
