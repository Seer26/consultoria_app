# Relatório da Sprint 3.12 — Migração PostgreSQL

Data: 19/07/2026.

## 1. Objetivo

Preparar um runtime PostgreSQL reversível, preservando SQLite e a arquitetura
`Flutter -> API Node/TypeScript -> repositories -> banco`, sem deploy,
pagamentos, clientes reais ou alteração de `main`.

## 2. Estado alcançado

Estado **PARCIAL**. Foram implementados adapter assíncrono, migrations,
migrador não destrutivo, health/readiness, testes, CI, Compose, backup/restore
e documentação. SQLite, audit, Flutter, build e clone limpo passaram.
PostgreSQL não foi iniciado porque Docker, servidor PostgreSQL, `psql`,
`pg_dump` e `pg_restore` não existem nesta máquina. Portanto, não houve merge
na baseline nem tag de aprovação.

## 3. Histórico consolidado das sprints anteriores

O MVP Flutter/API evoluiu para SaaS multiempresa com `ADMIN`, `OWNER` e
`EMPLOYEE`; onboarding de empresa/OWNER; pesquisa, diagnóstico, scores, plano
de ação, tarefas, responsáveis, dashboards, relatório e PDF; planos
Starter/Growth, limites, troca manual e histórico; configurações da empresa;
recuperação de senha; aceite legal; rate limits; logs e checklists beta.

A Sprint 3.11 integrou o hardening na baseline privada. O audit passou de seis
ocorrências para zero; `.gitattributes` fixou LF/CRLF; bancos, WAL/SHM,
backups, secrets, dependências e builds ficaram fora do Git; Flutter 19/19,
API e clone limpo passaram. A baseline consolidada que iniciou esta sprint foi
`7251727dd8783758de365c4c879b7ce8f1157551`, com a tag remota
`baseline-hardened-pre-postgres-2026-07-19`. `main` permaneceu em
`e039fc641f45378a9f7e7ac8d9371813ba4d952d`.

Riscos herdados: PostgreSQL ainda não ensaiado, staging/produção não
provisionados, e-mail/alertas reais ausentes, backup externo dependente de
provedor, documentos jurídicos em rascunho e beta externo em `NO-GO`.

## 4. Estado inicial do Git

- branch: `codex/release-baseline`;
- worktree: limpo;
- baseline local/remota:
  `7251727dd8783758de365c4c879b7ce8f1157551`;
- `main` local/remota:
  `e039fc641f45378a9f7e7ac8d9371813ba4d952d`;
- tag pré-PostgreSQL: publicada no alvo da baseline;
- divergência local/remota: nenhuma.

## 5. Branch e sincronização inicial

Foi criada e publicada `codex/postgres-migration` a partir da baseline. Os
hashes local/remoto iniciais eram
`7251727dd8783758de365c4c879b7ce8f1157551`.

## 6. SQLite operacional e backup

| Arquivo | Bytes | SHA-256 |
|---|---:|---|
| `consultoria.sqlite` | 131072 | `8F914633CB20580C9FD51B15AE938155AF99B48A78F5BED3E7B0847922A6A021` |
| `consultoria.sqlite-wal` | 226632 | `6EFB2EA82DD12CB63746D324B8192DB27713EE87923105DF1F28528D3F60FF4F` |
| `consultoria.sqlite-shm` | 32768 | `089354E6C7B52B5868794FB729C50AB9A05B49C0FF4DD9580F7249420FB83F9A` |

O `quick_check` retornou `ok`. O backup consistente ignorado pelo Git foi:

`saas/apps/api/data/sprint-3-12-backups/consultoria-2026-07-19T21-24-04-346Z.backup.sqlite`

Tamanho 176128 bytes, SHA-256
`5B65CD1613B6B04F0DD1603A0F72F8738DF99C9113E8756443A5BCEBD120C46B`,
`quick_check=ok`. Os hashes do banco/WAL/SHM permaneceram iguais ao final.
Nenhum restore foi executado.

## 7. Auditoria da camada de dados

| Componente | SQLite atual | Compatibilidade PostgreSQL | Alteração necessária |
|---|---|---|---|
| conexão | `better-sqlite3` eager | incompatível com pool async | import lazy e pool `pg` |
| repositories | chamadas síncronas | driver `pg` assíncrono | contratos convertidos para Promise |
| placeholders | `?`/`@nome` | `$1...$n` | helper central |
| upsert | `INSERT OR IGNORE` | `ON CONFLICT` | tradução central |
| datas | `date`/`julianday` | funções distintas | tradução para UTC/PG |
| transações | `BEGIN IMMEDIATE` | client dedicado | contexto por transação |
| IDs | texto UUID/string | compatível | preservado |
| JSON | texto e metadata | texto/`jsonb` | serialização preservada |
| tenant | `company_id` na API | compatível | filtros mantidos |
| migrations | SQL versionado | runner existente parcial | runner, status e validação |

Não foram encontrados autoincremento, `last_insert_rowid`, `INSERT OR REPLACE`,
`strftime` ou paginação incompatível nos repositories funcionais.

## 8. Estratégia de abstração

`DATABASE_URL` válida seleciona PostgreSQL; sua ausência seleciona SQLite.
`data-source.ts` centraliza conexão, query, placeholders, diferenças SQL,
transações, ping e fechamento. Services e Flutter não possuem condicionais de
banco. Nenhum ORM ou acesso direto do Flutter foi introduzido.

## 9. PostgreSQL local

O Compose usa PostgreSQL 16 Alpine, usuário/banco locais, volume, porta
configurável e healthcheck. O Dockerfile copia migrations ao `dist`.
Execução: **BLOQUEADA** por ausência de Docker/PostgreSQL nesta máquina.

## 10. Migrations PostgreSQL

Foram preservadas as migrations 001–004 e adicionada
`005_postgres_runtime_hardening.sql`, com auditoria, índices multiempresa e
checks de status, papéis, prioridades, origens e limites. O runner registra
cada migration, usa transação e localiza SQL em `src` ou `dist`.

Aplicação em banco vazio e repetição: **NÃO EXECUTADAS**. A CI foi preparada
com serviço PostgreSQL para executá-las duas vezes e validar o schema.

## 11. Compatibilidade das queries

O adapter converte placeholders posicionais/nomeados, `INSERT OR IGNORE`,
aliases camelCase e datas de dashboard. Testes unitários cobrem essas
traduções. Repositories, controllers, middleware e services foram convertidos
para async, mantendo regras e respostas da API.

## 12. Isolamento multiempresa

Os filtros por empresa continuam nos repositories e o tenant continua vindo
do usuário autenticado. `ADMIN` mantém apenas acessos globais permitidos;
`OWNER`/`EMPLOYEE` não confiam em `companyId` enviado pelo Flutter. O E2E
SQLite com duas empresas passou. O E2E PostgreSQL equivalente foi criado,
mas não executado.

## 13. Migrador SQLite para PostgreSQL

`db:migrate:sqlite-to-postgres` exige origem, confirmação e destino; recusa
origem operacional direta, nomes sintéticos/teste e destino produtivo sem
flag; valida `quick_check`; não apaga a origem; protege destino não vazio;
executa migrations; importa em ordem de foreign keys e transação; preserva
IDs/datas/tenant; faz rollback; imprime somente contagens; oferece
`--dry-run`; e recusa/reconcilia repetição por conflito/contagens.

## 14. Verificação de dados

O migrador compara contagens de empresas, planos, usuários, assinaturas,
pesquisas, respostas, tarefas, contadores, eventos, tokens e aceites. Também
verifica órfãos de empresa/pesquisa/tarefa. Execução contra banco de teste:
**BLOQUEADA**. Nenhum dado operacional foi migrado.

## 15. Health e readiness

`/health` informa API, ambiente, provider, conectividade, schema e migrations
sem host/usuário/URL. `/ready` também exige banco/schema/migrations e
dependências operacionais. O teste local com PostgreSQL indisponível passou:
ambos retornaram 503, sem vazamento.

## 16. Backup e restore PostgreSQL

Foram criados wrappers de `pg_dump` e `pg_restore` com confirmação, destino
explícito, sem owner/privileges e saída sanitizada. Backup, restore separado e
verificação pós-restore: **BLOQUEADOS**, pois as ferramentas não estão
instaladas.

## 17. Testes SQLite

Passaram: unitários, operacionais, E2E, suíte agregada e smoke. Foram
validados autenticação, sessão, recuperação, empresa/usuários, pesquisa
parcial/concluída, diagnóstico, scores, tarefas/responsáveis/atrasos,
dashboards, relatórios/PDF, planos/limites/configurações, aceite legal,
health/readiness e isolamento.

## 18. Testes PostgreSQL

`test:e2e:postgres` foi criado com banco isolado, migrations, duas empresas,
ADMIN/OWNER/EMPLOYEE, configurações, planos/eventos, retomada parcial, fluxo
completo, tarefas, dashboard, relatório/PDF, recuperação e isolamento.
Resultado local: **NÃO EXECUTADO**.

O teste de indisponibilidade passou. A CI PostgreSQL está preparada, mas não
substitui a evidência local ainda ausente neste relatório.

## 19. Smoke tests

- SQLite: aprovado;
- PostgreSQL: não executado por falta de servidor.

## 20. Clone limpo

Clone temporário da branch publicada:

- `npm ci`: 257 pacotes;
- audit: zero vulnerabilidades;
- build raiz: aprovado;
- suíte API/SQLite: aprovada;
- PostgreSQL indisponível: aprovado;
- Flutter analyze: sem issues;
- Flutter test: 19/19;
- arquivos proibidos rastreados: zero;
- status do clone: limpo.

O clone foi removido após verificação. PostgreSQL real continuou bloqueado.

## 21. Dependências e audit

Não foi adicionado ORM. O driver `pg` já existia no lockfile e foi reutilizado.
`npm audit` retornou zero vulnerabilidades no worktree e no clone limpo. O
aviso de manutenção de `prebuild-install` não é vulnerabilidade registrada.

## 22. Commits e pushes

Publicados na branch:

```text
23b8185cd6418a6858d466a64cddae559686329a feat: add postgres database adapter
614f770c63c683342e5d0f767e90a41a17f31f1c feat: add postgres migrations and sqlite migration tool
b4991c04da90d7acd201f55996bedd150348fbb4 test: validate sqlite and postgres database backends
```

O commit documental final é registrado pela própria história da branch após
a publicação deste relatório.

## 23. Integração na baseline

**NÃO EXECUTADA**. Base prevista: `codex/release-baseline`; compare:
`codex/postgres-migration`. A ausência da matriz PostgreSQL, migrador,
backup/restore e smoke impede merge.

## 24. Testes pós-merge

Não aplicável: nenhum merge foi realizado.

## 25. Banco operacional

Intacto, ignorado pelo Git, sem testes automatizados e com hashes inicial/final
iguais. Somente leitura de tamanho, checksum e `quick_check` foi realizada.

## 26. Documentação

Criados:

- `docs/POSTGRESQL_MIGRATION.md`;
- `docs/POSTGRESQL_LOCAL_SETUP.md`;
- `docs/POSTGRESQL_BACKUP_RESTORE.md`;
- `docs/ROLLBACK_POSTGRESQL_TO_SQLITE.md`.

Atualizados: configuração de novo dispositivo, deploy, backup permanente,
`GO_NO_GO_BETA.md`, Compose, `.env.example` e CI. Nenhum secret foi incluído.

## 27. Tags

`baseline-hardened-pre-postgres-2026-07-19` foi preservada. A tag
`postgres-ready-pre-staging-2026-07-19` **não foi criada**, pois PostgreSQL não
foi validado.

## 28. Estado final do Git

Branch de trabalho: `codex/postgres-migration`. `main` e baseline não foram
alteradas. O estado conclusivo e o hash remoto são confirmados após o commit
documental final.

## 29. Sincronização com o GitHub

Branch inicial e três commits temáticos foram publicados e tiveram igualdade
local/remota confirmada. Documentação e este relatório devem compor o commit
final publicado. Não haverá merge/tag enquanto os gates PostgreSQL estiverem
bloqueados.

## 30. Falhas encontradas

- Docker/PostgreSQL e ferramentas cliente ausentes;
- primeira tentativa de audit no sandbox sem rede; repetida com acesso e
  aprovada;
- Flutter test no sandbox bloqueou por ownership do SDK; repetido no contexto
  correto e aprovado 19/19;
- testes antigos esperavam `/health` sem bloco de banco; foram atualizados
  para o contrato sanitizado novo;
- Dockerfile compilado não copiava migrations; corrigido.

## 31. Riscos restantes

- queries/migrations ainda não receberam execução real no PostgreSQL;
- migrador ainda não comprovou equivalência/rollback com banco sintético;
- backup/restore PostgreSQL não ensaiados;
- datas principais permanecem em colunas texto por compatibilidade histórica;
- CI PostgreSQL precisa ser observada após publicação;
- staging, provedor, e-mail, alertas e jurídico continuam externos.

## 32. Pendências externas

Disponibilizar Docker/PostgreSQL 16 e ferramentas cliente; executar a matriz
PostgreSQL em banco isolado; ensaiar migrador, backup e restore; revisar o diff
na interface do GitHub; só então decidir integração/tag. Staging e beta externo
continuam separados e sem autorização.

## 33. Decisão GO/NO-GO

**POSTGRESQL REPROVADO** para promoção nesta sprint local, exclusivamente por
ausência das evidências obrigatórias de execução. O código está preparado para
revisão; beta externo geral permanece **NO-GO**.

## 34. Critérios de aceite

- [x] relatório 3.11 consolidado;
- [x] SQLite/backup intactos e validados;
- [x] adapter, migrations, migrador e rollback preparados;
- [x] SQLite, audit, Flutter, build e clone limpo aprovados;
- [x] branch e commits produzidos publicados;
- [ ] PostgreSQL iniciado e migrations repetidas;
- [ ] E2E/smoke PostgreSQL;
- [ ] migração/contagens/órfãos/rollback;
- [ ] backup/restore PostgreSQL;
- [ ] merge e testes pós-merge;
- [ ] tag de aprovação.

Pelos itens pendentes, a sprint é **PARCIAL**.

## 35. Recomendação para próxima sprint

Executar uma Sprint 3.12.1 exclusivamente de validação em uma máquina com
Docker/PostgreSQL 16: migrations duas vezes, E2E, smoke, migrador sintético,
falha transacional, backup/restore e readiness. Corrigir qualquer achado na
mesma branch; só com todos os gates verdes integrar na baseline e publicar a
tag.

## Histórico consolidado das sprints anteriores

As decisões, funcionalidades, baseline, hardening, audit zero, LF/CRLF,
testes, tags, estado do SQLite, riscos, pendências e `NO-GO` do relatório 3.11
foram consolidados nas seções 2–7, 17, 21, 25, 27 e 31–35.

## Limpeza de relatórios anteriores

### Relatório lido

`RELATORIO_SPRINT_3_11_INTEGRACAO_BASELINE.md` foi lido integralmente.

### Informações consolidadas

Arquitetura, funcionalidades, segurança, Git/GitHub privado, hardening, audit
zero, política LF/CRLF, testes, tags, riscos, pendências externas, hashes do
SQLite e decisão `NO-GO PARA BETA EXTERNO`.

### Arquivo removido

`RELATORIO_SPRINT_3_11_INTEGRACAO_BASELINE.md`, explicitamente e somente após
a consolidação.

### Documentos preservados

`GO_NO_GO_BETA.md`, `VALIDACAO_FUNCIONAL_DADOS_REAIS.md`, checklists, todo
`docs/`, código, migrations, testes, deploy, bancos/backup ignorados e
rascunhos jurídicos.

### Referências atualizadas

`docs/REVISAO_BASELINE_GITHUB.md` passou a apontar para este relatório.

## Sincronização com o GitHub

O histórico de pushes está na seção 22. O commit documental final deve deixar
`HEAD` local e `origin/codex/postgres-migration` iguais. Baseline, `main` e tag
pré-PostgreSQL permanecem intocadas.

