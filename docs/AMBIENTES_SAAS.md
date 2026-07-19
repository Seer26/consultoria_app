# Ambientes do SaaS

Este documento descreve como rodar o produto sem depender do seed de demo e como separar local, staging e producao.

## Escopo de lancamento inicial

Frontend principal: Flutter.

Backend principal: `saas/apps/api`.

Fora do escopo comercial inicial:

- React/Vite em `saas/apps/web`;
- Clientes mockados;
- Formularios mockados;
- Chat antigo;
- Equipe/team;
- Business areas/placeholders;
- endpoints legados `POST /api/diagnosis/submissions` e `POST /ai-diagnosis`.

O fluxo oficial de diagnostico empresarial para lancamento e:

1. login;
2. onboarding administrativo de empresa + primeiro OWNER;
3. Pesquisa Empresarial em `/research/submissions`;
4. conclusao do diagnostico;
5. geracao do Plano de Acao;
6. Dashboard;
7. Relatorio Executivo e PDF.

## Planos e limites sem pagamento

A Fase 2 foi iniciada sem integrar pagamento. O backend cria planos internos e atribui o plano `Starter` para cada empresa.

Limites aplicados no backend:

- usuarios ativos por empresa;
- pesquisas mensais por empresa;
- PDFs mensais por empresa;
- tarefas ativas por empresa;
- perguntas de IA mensais por empresa.

Quando um limite e atingido, a API retorna `402` com `error=PLAN_LIMIT_REACHED`, `feature`, `used`, `limit` e `remaining`.

O OWNER consulta o uso atual no Flutter pela rota `/plan`, consumindo `GET /billing/current-plan`.

### Planos atuais

| Plano | Usuarios ativos | Pesquisas/mes | PDFs/mes | Tarefas ativas | IA/mes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter | 5 | 20 | 30 | 100 | 100 |
| Growth | 20 | 100 | 150 | 500 | 500 |

### Comercial beta manual

Nesta etapa, o pagamento e operacional/manual. Nao existem checkout, gateway, webhooks ou faturas no produto.

Endpoints administrativos:

- `GET /billing/admin/plans`: lista planos disponiveis.
- `GET /billing/admin/companies/:companyId/current-plan`: consulta plano e uso de uma empresa.
- `PUT /billing/admin/companies/:companyId/plan`: altera manualmente o plano da empresa com body `{ "planSlug": "starter" | "growth" }`.

Regras:

- apenas `ADMIN` altera plano;
- `OWNER` consulta apenas o plano da propria empresa em `GET /billing/current-plan`;
- `OWNER` e `EMPLOYEE` recebem `403` nos endpoints administrativos;
- a data da ultima troca fica em `company_subscriptions.updated_at`;
- historico de trocas manuais fica em `company_subscription_events`;
- ADMIN visualiza historico simples na tela da empresa.

## Configuracoes da empresa

OWNER pode consultar e editar dados basicos da propria empresa:

- nome fantasia;
- setor;
- porte;
- telefone;
- responsavel;
- observacoes/preferencias simples.

Endpoints:

- `GET /company/settings`
- `PUT /company/settings`

Regras:

- apenas `OWNER` acessa esses endpoints;
- `EMPLOYEE` nao altera configuracoes da empresa;
- `OWNER` nao altera plano, status comercial ou dados de outra empresa;
- `ADMIN` continua usando a gestao global de empresas.

## Onboarding beta

Checklist operacional criado em `docs/ONBOARDING_CLIENTE_BETA.md`.

## API local operacional sem seed

Use este perfil para preencher dados autorizados pelos fluxos reais. O caminho
do SQLite deve ser absoluto e o nome do arquivo não pode indicar demo, E2E,
teste ou staging.

```powershell
$env:APP_ENV='local'
$env:NODE_ENV='development'
$env:ENABLE_DEMO_SEED='false'
$env:DATABASE_PATH='C:\Users\Pichau\consultoria_app\saas\apps\api\data\consultoria.sqlite'
cd C:\Users\Pichau\consultoria_app\saas
npm.cmd --workspace @consultoria/api start
```

O startup rejeita configuração local com seed ligado, caminho relativo ou nome
de banco demonstrativo/temporário. Sem seed, é necessário utilizar um ADMIN
criado pelo processo operacional autorizado antes do onboarding.

Os comandos `demo:seed` e `staging:seed` existem somente para bases isoladas e
não fazem parte da validação funcional com dados reais.

## Flutter local apontando para API local

```powershell
cd C:\Users\Pichau\consultoria_app
flutter run -d chrome --dart-define=APP_ENV=local --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=SHOW_DEMO_CREDENTIALS=false
```

## Staging

Staging deve usar banco separado e seed desligado.

API:

```env
NODE_ENV=production
APP_ENV=staging
PORT=3000
DATABASE_PATH=/volume-persistente/consultoria-staging.sqlite
SQLITE_BACKUP_DIR=/volume-backup/sqlite
SQLITE_VOLUME_ACK=single-instance-persistent-volume
API_REPLICA_COUNT=1
ENABLE_DEMO_SEED=false
JWT_SECRET=<secret-do-ambiente>
CORS_ORIGINS=https://staging.seu-dominio.com
APP_PUBLIC_URL=https://staging.seu-dominio.com
API_PUBLIC_URL=https://staging-api.seu-dominio.com
OPENAI_API_KEY=<secret-do-ambiente>
```

Flutter:

```powershell
flutter build web --dart-define=APP_ENV=staging --dart-define=API_BASE_URL=https://staging-api.seu-dominio.com --dart-define=SHOW_DEMO_CREDENTIALS=false
```

## Producao

Em producao:

- `ENABLE_DEMO_SEED` e ignorado e o seed nunca roda;
- `JWT_SECRET` e obrigatorio;
- `CORS_ORIGINS` e obrigatorio;
- credenciais de demo ficam ocultas no Flutter com `APP_ENV=production`;
- SQLite ainda e aceitavel apenas como passo temporario; o proximo passo recomendado e migrar para banco gerenciado.

API:

```env
NODE_ENV=production
PORT=3000
DATABASE_PATH=./data/consultoria-production.sqlite
JWT_SECRET=<secret-forte-do-secret-manager>
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://app.seu-dominio.com
OPENAI_API_KEY=<secret-do-ambiente>
AI_MODEL=gpt-4o-mini
AI_QUESTION_MODEL=gpt-4.1-mini
AI_TIMEOUT_MS=20000
```

Flutter:

```powershell
flutter build web --dart-define=APP_ENV=production --dart-define=API_BASE_URL=https://api.seu-dominio.com --dart-define=SHOW_DEMO_CREDENTIALS=false
```

## Validacoes obrigatorias antes de liberar staging/producao

```powershell
cd C:\Users\Pichau\consultoria_app\saas
npm.cmd run build
npm.cmd --workspace @consultoria/api run test:e2e
```

```powershell
cd C:\Users\Pichau\consultoria_app
flutter analyze
flutter test --reporter expanded
```

## Variaveis obrigatorias

Obrigatorias em producao:

- `NODE_ENV=production`
- `PORT`
- `DATABASE_PATH` em SQLite local ou `DATABASE_URL` em Postgres
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`

Obrigatorias quando IA estiver ativa:

- `OPENAI_API_KEY`
- `AI_API_URL`
- `AI_MODEL`
- `AI_QUESTION_MODEL`
- `AI_TIMEOUT_MS`

## Proximo passo de infraestrutura

Antes de lancamento comercial amplo, concluir a virada do runtime da API para Postgres. A Fase 3 ja criou a base operacional:

- `DATABASE_URL` para Postgres;
- migrations versionadas em `saas/apps/api/src/database/migrations`;
- comandos `db:migrate` e `db:validate`;
- Docker Compose local com API + Postgres;
- healthcheck com status de banco;
- logs estruturados e auditoria basica;
- documentacao de deploy em `docs/PRODUCAO_DEPLOY.md`;
- documentacao de backup/restore em `docs/BACKUP_RESTORE_POSTGRES.md`.

O SQLite permanece como runtime local/E2E enquanto os repositórios síncronos (`better-sqlite3`) são migrados para acesso async em uma sprint dedicada.
