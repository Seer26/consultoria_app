# Relatório de Retomada — Sprint 3.12.1

Data da auditoria: 01/08/2026.

## 1. Objetivo

Registrar, sem alterar código nem executar PostgreSQL, o ponto exato de retomada
da migração SQLite → PostgreSQL, confrontando o relatório da Sprint 3.12 com o
checkout, o remoto Git e as ferramentas disponíveis nesta máquina.

A raiz indicada na solicitação (`C:\Users\sgmca\projetos\consultoria_app_clean`)
não corresponde a esta estação. A auditoria foi realizada na raiz compartilhada
e confirmada pelo Git: `C:\Users\Pichau\consultoria_app`.

Restrições observadas: nenhum container iniciado; nenhuma migration, suíte longa,
merge, tag ou deploy executado; `main` não foi alterada; nenhum arquivo de código
foi editado.

## 2. Estado atual do Git

- branch atual: `codex/postgres-migration`;
- `HEAD`: `91a1ac8dbdf2d338f390be741b787904e85a090b`;
- upstream: `origin/codex/postgres-migration` no mesmo hash;
- relação com a baseline: 4 commits à frente e 0 atrás de
  `origin/codex/release-baseline`;
- worktree inicial: **não limpo**;
- arquivos já marcados como modificados antes da criação deste relatório:
  - `lib/features/dashboard/presentation/pages/employee_home_page.dart`;
  - `lib/features/diagnosis/presentation/pages/research_start_page.dart`.

`git diff --raw`, `git diff --stat` e `git diff --check` não mostraram hunks de
conteúdo nesses arquivos, mas emitiram aviso de que CRLF será substituído por LF
quando o Git os tocar. `git status --porcelain=v2` continuou retornando `.M` para
ambos. O estado foi tratado como sujo e preservado, sem normalização, descarte ou
stage.

Consequência: a regra da solicitação “não faça commit se o worktree não estiver
limpo” impede o commit e o push deste relatório nesta execução.

## 3. Sincronização com o GitHub

`git fetch --prune origin` foi concluído. `git ls-remote` confirmou:

- `origin/codex/postgres-migration`:
  `91a1ac8dbdf2d338f390be741b787904e85a090b`;
- `origin/codex/release-baseline`:
  `7251727dd8783758de365c4c879b7ce8f1157551`;
- `origin/main`: `e039fc641f45378a9f7e7ac8d9371813ba4d952d`.

Logo, o código e a documentação já publicados da Sprint 3.12 estão iguais entre
local e remoto até `91a1ac8`. Este novo relatório ainda não está publicado. Não
foi possível inferir execução bem-sucedida do workflow apenas pela existência do
arquivo de CI; esta auditoria não consultou nem executou jobs do GitHub Actions.

Tags locais:

- `baseline-hardened-pre-postgres-2026-07-19`;
- `baseline-pre-cloud-2026-07-19`.

Tag confirmada no remoto:

- `baseline-hardened-pre-postgres-2026-07-19` (tag anotada apontando para a
  baseline documentada).

`baseline-pre-cloud-2026-07-19` não apareceu em `git ls-remote --tags origin`.
A tag de aprovação PostgreSQL `postgres-ready-pre-staging-2026-07-19` não existe
localmente nem no remoto, como esperado para um gate ainda reprovado.

## 4. Commits existentes

Commits exclusivos de `codex/postgres-migration`, do mais recente para o mais
antigo:

1. `91a1ac8` — `docs: document postgres setup migration and rollback`;
2. `b4991c0` — `test: validate sqlite and postgres database backends`;
3. `614f770` — `feat: add postgres migrations and sqlite migration tool`;
4. `23b8185` — `feat: add postgres database adapter`.

O diff acumulado contra a baseline contém 62 arquivos, 3.081 inserções e 1.195
remoções, abrangendo adapter assíncrono, conversão dos repositories/services,
migrations, testes, CI, Compose e documentação.

## 5. Estado da baseline e da main

- baseline de trabalho: `codex/release-baseline` em
  `7251727dd8783758de365c4c879b7ce8f1157551` local e remotamente;
- `main`: `e039fc641f45378a9f7e7ac8d9371813ba4d952d` local e remotamente;
- a branch PostgreSQL deriva da baseline e está quatro commits à frente;
- nenhum merge da branch PostgreSQL na baseline foi realizado;
- `main` permanece no commit inicial e não foi tocada nesta auditoria.

## 6. Documentos analisados

Foram lidos integralmente:

- `RELATORIO_SPRINT_3_12_MIGRACAO_POSTGRESQL.md`;
- `GO_NO_GO_BETA.md`;
- `docs/POSTGRESQL_LOCAL_SETUP.md`;
- `docs/POSTGRESQL_MIGRATION.md`;
- `docs/POSTGRESQL_BACKUP_RESTORE.md`;
- `docs/ROLLBACK_POSTGRESQL_TO_SQLITE.md`;
- `docs/CONFIGURACAO_NOVO_DISPOSITIVO.md`.

Os documentos são coerentes ao classificar a Sprint 3.12 como parcial, manter
SQLite como fallback, proibir promoção sem evidência real do PostgreSQL e manter
o beta externo em `NO-GO`. Eles não foram reescritos nesta etapa.

## 7. Implementação PostgreSQL encontrada

| Item | Estado | Evidência confirmada | Validação atual |
|---|---|---|---|
| Adapter/data source | Implementado | `saas/apps/api/src/database/data-source.ts` | Não validado contra PostgreSQL real nesta máquina |
| Seleção SQLite/PostgreSQL | Implementado | `DATABASE_URL` seleciona `postgres`; ausência seleciona `sqlite` em `env.ts` | Confirmado estaticamente |
| Pool PostgreSQL | Implementado | `src/database/postgres.ts`, `Pool` e `Client` | Não validado com servidor disponível |
| Driver `pg` | Implementado | `pg` e `@types/pg` no `package.json` da API | Presença confirmada; conexão não executada |
| Placeholders/dialeto | Implementado | tradução de `?`, `@nome`, datas, aliases e `INSERT OR IGNORE` | Teste unitário existe; não foi reexecutado agora |
| Transações | Implementado | contexto por `AsyncLocalStorage`, `BEGIN/COMMIT/ROLLBACK` | Não validado no PostgreSQL real |
| Repositories/services assíncronos | Implementado | diff da branch converte as camadas sem acesso direto pelo Flutter | Não revalidado por suíte nesta auditoria |
| Health/readiness | Implementado | `src/health/health.service.ts` consulta conexão, schema e migrations | Estado conectado não validado |
| Dockerfile | Implementado | copia migrations ao `dist` e executa API como usuário não root | Imagem não construída agora |
| CI PostgreSQL | Implementado | job com PostgreSQL 16, migrations repetidas, schema, E2E, smoke e indisponibilidade | Execução do job não confirmada nesta auditoria |
| Scripts do `package.json` | Implementado | migrate, validate, migrador, E2E/smoke PG, indisponibilidade, backup e restore | Comandos não executados agora |

A arquitetura continua `Flutter → API Node/TypeScript → repositories → adapter
SQLite/PostgreSQL`. Não há acesso direto do Flutter ao banco nem ORM novo.

## 8. Migrations encontradas

O runner `src/database/migrate.ts` encontra SQL em `src` ou `dist`, cria
`schema_migrations`, ordena arquivos, aplica cada migration em transação e ignora
IDs já registrados. Foram confirmadas cinco migrations:

| Migration | Conteúdo principal | Estado |
|---|---|---|
| `001_initial_postgres_schema.sql` | empresas, usuários, pesquisas/respostas, tarefas, planos, assinaturas, uso e eventos | Implementada; não aplicada nesta máquina |
| `002_seed_required_plans.sql` | Starter e Growth por upsert idempotente | Implementada; não aplicada nesta máquina |
| `003_security_beta.sql` | `auth_version` e tokens de recuperação | Implementada; não aplicada nesta máquina |
| `004_legal_acceptances.sql` | aceites legais e índice | Implementada; não aplicada nesta máquina |
| `005_postgres_runtime_hardening.sql` | auditoria, índices e constraints de domínio/limites | Implementada; não aplicada nesta máquina |

`src/database/validate.ts` exige as tabelas do domínio, `schema_migrations`,
`audit_events`, planos Starter/Growth e ausência de migrations pendentes. Banco
vazio, primeira aplicação, segunda aplicação idempotente e validação do schema
continuam **não executados localmente**.

## 9. Testes PostgreSQL encontrados

| Teste | Estado de implementação | Resultado conhecido |
|---|---|---|
| Adapter unitário | Implementado em `database-adapter.unit.ts` | Relatório anterior registra aprovação; não reexecutado agora |
| E2E PostgreSQL | Implementado em `postgres-runtime.e2e.ts` | Não executado localmente contra PostgreSQL |
| Smoke PostgreSQL | Implementado como a mesma suíte com `--smoke` | Não executado localmente; cobertura smoke não é uma suíte independente |
| Indisponibilidade | Implementado em `postgres-readiness-unavailable.e2e.ts` | Relatório anterior registra aprovação; não reexecutado agora |
| CI PostgreSQL | Implementado em `.github/workflows/ci.yml` | Resultado do workflow não confirmado nesta auditoria |

O E2E existente cobre migrations, ADMIN, OWNER, EMPLOYEE, duas empresas,
configurações, plano/evento, pesquisa parcial e completa, plano de ação, tarefas,
dashboard, relatório/PDF, recuperação, health/readiness e nega acesso cruzado.
Ter o teste no repositório não equivale a evidência de execução bem-sucedida.

## 10. Migrador SQLite para PostgreSQL

`src/database/migrate-sqlite-to-postgres.ts` está **implementado, porém não
validado em PostgreSQL real**. Ele:

- exige origem explícita, confirmação e `DATABASE_URL` de destino;
- recusa SQLite operacional direto e nomes sintéticos/teste;
- abre a origem somente para leitura e executa `quick_check`;
- protege destino não vazio e produção por flags explícitas;
- aplica migrations, importa 12 tabelas em ordem e usa transação;
- preserva a origem e executa rollback em erro de importação;
- compara contagens e quatro classes de órfãos;
- possui modo `--dry-run`.

Limitação confirmada: não existe teste automatizado que injete uma falha no meio
da importação para comprovar o rollback transacional. A presença do bloco
`ROLLBACK` no código é apenas evidência estática. Dry-run, importação sintética,
contagens, órfãos, repetição e falha transacional permanecem pendentes.

## 11. Backup e restore

| Item | Estado | Observação |
|---|---|---|
| Backup SQLite anterior | Concluído historicamente | Relatório registra backup consistente e hashes; não foi revalidado agora |
| Script PostgreSQL de backup | Implementado | `scripts/backup-postgres.ps1` usa `pg_dump` custom, sem owner/privileges, e calcula SHA-256 |
| Script PostgreSQL de restore | Implementado | `scripts/restore-postgres.ps1` exige confirmação e banco isolado |
| Backup PostgreSQL real | Não validado | `pg_dump` ausente e nenhum servidor iniciado |
| Restore PostgreSQL isolado | Não validado | `pg_restore` ausente e nenhum banco de destino iniciado |
| Comparação pós-restore | Não validada | schema, contagens, órfãos, health, readiness e login ainda pendentes |

Nenhum dump, restore ou dado operacional foi criado, lido ou alterado nesta
auditoria.

## 12. Docker, WSL e ferramentas disponíveis

Resultado em 01/08/2026:

| Verificação | Resultado |
|---|---|
| `docker --version` | indisponível; comando não reconhecido |
| `docker compose version` | indisponível; comando não reconhecido |
| `docker info` | indisponível; não foi possível consultar Engine |
| `wsl --status` | WSL não instalado |
| `where.exe docker` | não encontrado |
| `where.exe git` | encontrado em duas instalações locais |
| `where.exe psql` | não encontrado |
| `where.exe pg_dump` | não encontrado |
| `where.exe pg_restore` | não encontrado |

Conclusões:

- Docker Desktop: não detectado;
- Docker Engine: não disponível;
- Docker Compose: não disponível;
- WSL 2: não instalado e, portanto, não funcional;
- clientes PostgreSQL no host: ausentes;
- `psql`, `pg_dump` e `pg_restore` dentro do container: tecnicamente possíveis
  após instalar Docker e iniciar a imagem PostgreSQL, mas impossíveis no estado
  atual porque nenhum runtime de containers existe.

## 13. Compose identificado

Foram encontrados dois arquivos Compose:

- `saas/docker-compose.postgres.yml`: Compose correto para a validação local
  PostgreSQL da Sprint 3.12.1;
- `deploy/staging/docker-compose.yml`: API de staging configurada para SQLite,
  sem serviço PostgreSQL; não serve para esta matriz local PostgreSQL.

Detalhes do Compose correto:

| Propriedade | Valor confirmado |
|---|---|
| serviço PostgreSQL | `postgres` |
| container | `consultoria-postgres` |
| imagem | `postgres:16-alpine` |
| porta | `${POSTGRES_PORT:-5432}:5432` |
| volume | `consultoria_postgres_data:/var/lib/postgresql/data` |
| healthcheck | `pg_isready` para usuário e banco configurados; intervalo 10 s, timeout 5 s, 5 tentativas |
| dependência da API | `service_healthy` |
| serviço API | `api`, porta `3000:3000` |

Variáveis do PostgreSQL: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e
`POSTGRES_PORT`. Todas têm defaults locais, portanto o YAML não exige valor para
ser interpretado; por segurança, a senha de placeholder deve ser substituída por
um valor descartável fora do Git antes da execução. A API recebe `DATABASE_URL`
montada por interpolação, migrations no startup, JWT, CORS, seed desativado,
provider de e-mail local e chave OpenAI vazia. Os valores de senha/JWT no arquivo
são placeholders reconhecíveis, não secrets reais, e não são adequados fora do
ambiente local.

Comandos preparados, **não executados**:

```powershell
# Na raiz do repositório, iniciar somente o PostgreSQL
docker compose -f saas/docker-compose.postgres.yml up -d postgres

# Parar somente o PostgreSQL sem apagar o volume
docker compose -f saas/docker-compose.postgres.yml stop postgres

# Consultar estado e health do serviço
docker compose -f saas/docker-compose.postgres.yml ps postgres
docker inspect --format '{{json .State.Health}}' consultoria-postgres
```

Não usar `down -v`, pois removeria o volume nomeado.

## 14. O que já foi concluído

- branch PostgreSQL criada, publicada e igual ao remoto até `91a1ac8`;
- adapter assíncrono SQLite/PostgreSQL e pool `pg` implementados;
- camadas da API convertidas para contratos assíncronos;
- migrations 001–005, runner e validador implementados;
- planos Starter/Growth semeados idempotentemente por migration;
- migrador SQLite → PostgreSQL com proteções, transação e comparadores;
- health/readiness sensíveis ao provider e sanitizados;
- E2E PostgreSQL, smoke e indisponibilidade codificados;
- scripts de backup/restore e documentação operacional criados;
- Compose PostgreSQL, Dockerfile e CI PostgreSQL preparados;
- segundo o relatório de 19/07/2026: SQLite, build, audit, Flutter 19/19, teste
  de indisponibilidade e clone limpo passaram naquela execução;
- fallback para SQLite e procedimento de retorno documentados.

Os resultados históricos acima não foram reexecutados nem promovidos a evidência
nova em 01/08/2026.

## 15. O que ainda não foi validado

- Docker Desktop/Engine/Compose e WSL 2;
- PostgreSQL 16 iniciado e saudável;
- migrations em banco vazio e segunda execução idempotente;
- `db:validate` contra PostgreSQL;
- E2E e smoke PostgreSQL reais;
- isolamento multiempresa comprovado no runtime PostgreSQL;
- migrador com uma base SQLite sintética autorizada;
- equivalência de contagens, IDs, datas, relacionamentos e tenants;
- falha injetada e rollback transacional comprovado;
- backup com `pg_dump`, checksum e armazenamento fora do Git;
- restore com `pg_restore` em banco separado;
- validação pós-restore;
- execução e resultado atual do job PostgreSQL no GitHub Actions;
- testes SQLite, Flutter, build e `npm audit` após a matriz PostgreSQL;
- clone limpo posterior;
- merge na baseline, testes pós-merge e tag de aprovação;
- staging PostgreSQL, HTTPS, persistência, e-mail, alertas e beta externo.

## 16. Divergências em relação ao relatório anterior

| Área | Relatório do Codex | Estado confirmado agora | Próxima ação |
|---|---|---|---|
| Git e GitHub | Branch publicada e sincronizada | `91a1ac8` continua igual ao remoto, mas o worktree atual está sujo por dois arquivos Flutter | Resolver as mudanças fora desta auditoria e só então versionar este relatório |
| SQLite | Operacional, backup e suítes aprovados | Apenas evidência histórica; banco não foi tocado nem revalidado | Reexecutar a matriz SQLite após validar PostgreSQL |
| PostgreSQL | Código preparado; runtime bloqueado | Continua bloqueado: Docker, WSL e clientes ausentes | Instalar runtime autorizado |
| Migrations | 001–005 preparadas; sem execução | Arquivos e runner confirmados; nenhuma execução nova | Aplicar duas vezes em banco vazio |
| E2E | Criado, não executado | Arquivo e cobertura confirmados; ainda não executado | Executar com banco isolado |
| Smoke | Criado, não executado | Script reutiliza o E2E com `--smoke`; ainda não executado | Executar e avaliar se a cobertura reduzida é suficiente |
| Migrador | Implementado, não ensaiado | Proteções e comparações confirmadas estaticamente | Ensaiar somente com dados sintéticos autorizados |
| Rollback transacional | Código possui rollback | Não há teste de falha injetada identificado | Criar/executar ensaio controlado em etapa futura |
| Backup | Wrapper preparado, ferramenta ausente | Script existe; `pg_dump` continua ausente | Executar após instalar runtime/ferramenta |
| Restore | Wrapper preparado, ferramenta ausente | Script existe; `pg_restore` continua ausente | Restaurar em banco separado e validar |
| Health/readiness | Implementados; indisponibilidade aprovada | Implementação confirmada; conectado não validado | Validar 200/ready e ausência de segredos |
| Flutter | Analyze e 19/19 aprovados | Resultado histórico não reexecutado; dois arquivos estão `.M` | Preservar alterações e rodar Flutter no gate final |
| npm audit | Zero vulnerabilidades | Resultado histórico, não reexecutado | Executar após a matriz funcional |
| Clone limpo | Aprovado em 19/07 | Não repetido; checkout atual não está limpo | Repetir após commits definitivos |
| Merge | Não executado | Continua não executado | Somente após todos os gates verdes |
| Tag | Não criada | Continua ausente; tag pré-PostgreSQL preservada | Criar somente após merge/testes pós-merge |
| Staging | Não provisionado | Compose de staging ainda usa SQLite e não há PostgreSQL externo | Tratar em sprint separada após aprovação local |

Além do worktree sujo, a raiz solicitada diverge da raiz efetiva desta estação e
o WSL agora foi explicitamente confirmado como não instalado. Não foi encontrada
divergência funcional que invalide a descrição estática do código da Sprint 3.12.

## 17. Bloqueios atuais

1. Docker/Compose não instalados, impedindo iniciar o serviço PostgreSQL local.
2. WSL não instalado, impedindo o backend Linux normalmente usado pelo Docker
   Desktop no Windows.
3. `psql`, `pg_dump` e `pg_restore` ausentes no host.
4. Worktree já sujo por dois arquivos Flutter, impedindo o commit/push deste
   relatório segundo a regra expressa da solicitação.
5. Ausência de evidência observada de um job PostgreSQL verde no GitHub Actions.

Nenhum desses bloqueios autoriza alterar arquivos do usuário, instalar software,
subir serviços ou promover a branch durante esta auditoria.

## 18. Ordem recomendada de execução

Plano futuro, exatamente em 20 passos e nesta ordem:

1. Instalar/autorizar o runtime e iniciar somente o PostgreSQL 16 pelo Compose.
2. Validar o healthcheck do container e a conectividade sem expor credenciais.
3. Executar as migrations uma vez em banco vazio e isolado.
4. Repetir as migrations e confirmar idempotência e zero pendências.
5. Executar o E2E PostgreSQL completo.
6. Executar o smoke PostgreSQL.
7. Confirmar isolamento multiempresa de ADMIN, OWNER e EMPLOYEE no PostgreSQL.
8. Validar o migrador com SQLite exclusivamente sintético e autorizado.
9. Injetar falha durante a importação e comprovar rollback sem importação parcial.
10. Executar backup PostgreSQL em arquivo fora do Git e registrar checksum.
11. Restaurar o dump em um banco PostgreSQL separado e vazio.
12. Comparar contagens, órfãos, migrations, health/readiness e fluxo sintético.
13. Executar toda a suíte SQLite em bancos temporários.
14. Executar `flutter analyze` e todos os testes Flutter.
15. Executar `npm audit`, builds e demais gates de segurança aplicáveis.
16. Revisar o diff completo, segredos, artefatos e estado do worktree.
17. Criar commits temáticos necessários e publicar a branch, sem incluir mudanças alheias.
18. Integrar na `codex/release-baseline` somente após revisão e aprovação explícita.
19. Repetir testes críticos no commit pós-merge e confirmar local/remoto iguais.
20. Criar e publicar a tag de aprovação PostgreSQL somente com todos os gates verdes.

## 19. Critérios para merge na baseline

- worktree limpo e mudanças não relacionadas separadas;
- PostgreSQL 16 saudável em banco isolado;
- migrations aplicadas duas vezes e `db:validate` aprovado;
- E2E, smoke, isolamento e indisponibilidade aprovados;
- migrador sintético com contagens/órfãos aprovados;
- falha transacional com rollback comprovado;
- backup e restore separado aprovados;
- health/readiness conectados e sanitizados;
- suítes SQLite, Flutter, build e audit aprovadas;
- diff revisado sem secrets, banco, dumps ou artefatos;
- branch publicada, revisão concluída e autorização explícita para merge.

Enquanto qualquer item estiver ausente, `codex/postgres-migration` não deve ser
integrada em `codex/release-baseline`.

## 20. Critérios para criação da tag

A tag `postgres-ready-pre-staging-2026-07-19` (ou uma nova tag com data aprovada
na futura execução) somente pode ser criada após:

- merge aprovado na baseline;
- testes pós-merge verdes no hash exato da baseline;
- igualdade entre baseline local e remota;
- PostgreSQL, migrador, rollback, backup/restore e readiness comprovados;
- relatório final atualizado com comandos, resultados e hashes reais;
- nenhuma pendência crítica ou secret versionado.

Não criar a tag diretamente na branch de trabalho nem reutilizar a data/nome sem
confirmar a convenção no momento da aprovação.

## 21. Riscos

- traduções SQL e tipos de data ainda podem falhar somente em runtime PostgreSQL;
- o smoke reutiliza a suíte E2E e pode não representar um teste mínimo independente;
- migrations armazenam vários timestamps históricos como texto por compatibilidade;
- o migrador usa `ON CONFLICT DO NOTHING`, exigindo comparação rigorosa para não
  mascarar conflito de conteúdo com IDs iguais;
- rollback existe no código, mas não possui evidência de falha injetada;
- backup/restore dependem de ferramentas ainda ausentes;
- o Compose local contém placeholders que precisam ser substituídos fora do Git;
- o Compose de staging atual permanece SQLite e de réplica única;
- resultados antigos de Flutter, SQLite, audit e clone podem envelhecer após novas
  mudanças;
- normalizar inadvertidamente os dois arquivos Flutter pode misturar trabalho do
  usuário com a documentação;
- beta externo continua `NO-GO` por infraestrutura, HTTPS, e-mail, alertas,
  jurídico e suporte ainda não comprovados.

## 22. Próximo passo exato

O primeiro bloqueio técnico é a ausência de WSL. Em uma janela futura,
explicitamente autorizada e executada pelo operador em PowerShell como
Administrador, o próximo comando recomendado é:

```powershell
wsl.exe --install
```

Depois do reinício e da instalação/configuração do Docker Desktop, repetir
`docker --version`, `docker compose version` e `docker info`. Somente quando os
três passarem, definir credenciais locais descartáveis fora do Git e executar o
passo 1 da seção 18. Nesta auditoria, o comando acima **não foi executado**.

Antes de versionar este relatório, também é obrigatório resolver ou separar,
com decisão do autor, o estado `.M` dos dois arquivos Flutter. Até lá, o commit
`docs: record postgres migration resumption status` e o push permanecem
deliberadamente pendentes.
