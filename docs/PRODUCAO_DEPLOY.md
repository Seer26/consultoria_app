# Producao, Postgres e deploy

Este documento define o caminho operacional da Fase 3 sem trocar a arquitetura do produto: Flutter continua consumindo a API Node/TypeScript, e a API continua sendo a fronteira de seguranca.

## Estrategia adotada

- SQLite continua disponivel para desenvolvimento local e E2E atuais.
- Postgres foi preparado por `DATABASE_URL`, migrations versionadas, validacao de schema, Docker Compose local e healthcheck.
- Os repositórios da API ainda usam `better-sqlite3` de forma síncrona. A virada completa do runtime para Postgres deve ser feita em uma sprint controlada de refatoração async dos repositórios para preservar o MVP.

## Variaveis obrigatorias

Local SQLite:

```env
NODE_ENV=development
PORT=3000
DATABASE_PATH=./data/consultoria.sqlite
ENABLE_DEMO_SEED=true
JWT_SECRET=replace-with-a-strong-local-secret
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
OPENAI_API_KEY=
```

Staging/production com Postgres:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@host:5432/database
ENABLE_DEMO_SEED=false
JWT_SECRET=<secret-forte-do-secret-manager>
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://app.seu-dominio.com
OPENAI_API_KEY=<secret-do-ambiente>
AI_API_URL=https://api.openai.com/v1/responses
AI_MODEL=gpt-4o-mini
AI_QUESTION_MODEL=gpt-4.1-mini
AI_TIMEOUT_MS=20000
```

Nunca versionar `.env.local`, senhas de banco, JWT real ou chave OpenAI.

## Comandos de banco

Rodar migrations Postgres:

```powershell
cd C:\Users\Pichau\consultoria_app\saas
npm.cmd --workspace @consultoria/api run db:migrate
```

Validar schema:

```powershell
cd C:\Users\Pichau\consultoria_app\saas
npm.cmd --workspace @consultoria/api run db:validate
```

As migrations ficam em:

```text
saas/apps/api/src/database/migrations
```

## Criar banco novo do zero

1. Criar um banco Postgres vazio.
2. Configurar `DATABASE_URL`.
3. Rodar `npm.cmd --workspace @consultoria/api run db:migrate`.
4. Rodar `npm.cmd --workspace @consultoria/api run db:validate`.
5. Confirmar que os planos `starter` e `growth` existem.
6. Criar ADMIN pelo processo operacional interno.
7. Criar empresa + OWNER pelo ADMIN.

## Docker local com Postgres

```powershell
cd C:\Users\Pichau\consultoria_app\saas
docker compose -f docker-compose.postgres.yml up --build
```

Healthcheck:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3000/health -UseBasicParsing
```

Observacao: o Docker Compose sobe API + Postgres e valida conectividade no `/health`. A persistencia funcional completa da API em Postgres depende da sprint de refatoracao dos repositórios síncronos para acesso async.

## Deploy sem prender a provedor

Requisitos mínimos do provedor:

- Node.js 22;
- container Docker ou runtime Node com `npm ci` e `npm run build`;
- Postgres gerenciado;
- secret manager;
- healthcheck HTTP em `/health`;
- backup automatico do banco;
- logs stdout/stderr coletados.

Opções viáveis:

- Render/Railway/Fly para API containerizada;
- Neon/Supabase/Render/Railway para Postgres gerenciado;
- qualquer provedor que exponha `DATABASE_URL` e suporte backups.

Não usar Flutter acessando banco direto. O Flutter deve continuar usando apenas `API_BASE_URL`.

## Healthcheck

`GET /health` retorna:

- status da API;
- ambiente atual;
- provider do banco;
- conectividade com banco;
- se OpenAI está configurada ou não.

O endpoint não expõe secrets.

## Atualização operacional da Sprint 3.2

`GET /health` é apenas liveness e não consulta dependências. `GET /ready` verifica banco SQLite/runtime, schema mínimo, provider de e-mail, URL pública HTTPS em ambientes restritos e configuração de IA quando exigida. Readiness retorna `ready`, `degraded` ou `not_ready`, sem chamada paga à OpenAI e sem revelar caminhos ou segredos. Para staging, seguir `docs/STAGING.md`.

O runtime funcional permanece SQLite de instância única. A infraestrutura/migrations PostgreSQL existente não significa que os repositórios síncronos já operem em Postgres.

## Logs

Os logs são JSON em stdout/stderr e removem campos sensíveis conhecidos, como senha, token, segredo e chave de API.

Eventos auditados:

- login falho;
- criação de empresa;
- criação de usuário;
- alteração manual de plano;
- geração de PDF;
- bloqueio por limite de plano;
- erro de IA.

## Checklist antes do beta real

- [ ] Rodar migrations em banco staging limpo.
- [ ] Rodar validacao de schema.
- [ ] Testar `/health` com banco conectado.
- [ ] Configurar CORS apenas para domínio real.
- [ ] Configurar `JWT_SECRET` forte.
- [ ] Confirmar `ENABLE_DEMO_SEED=false`.
- [ ] Confirmar backup automatico no provedor.
- [ ] Executar teste de restore documentado.
- [ ] Rodar build API, E2E, Flutter analyze e Flutter test.
