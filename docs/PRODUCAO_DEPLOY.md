# Producao, Postgres e deploy

Este documento define o caminho operacional da Fase 3 sem trocar a arquitetura do produto: Flutter continua consumindo a API Node/TypeScript, e a API continua sendo a fronteira de seguranca.

## Estrategia adotada

- SQLite continua disponivel para desenvolvimento local e E2E atuais.
- Postgres foi preparado por `DATABASE_URL`, migrations versionadas, validacao de schema, Docker Compose local e healthcheck.
- Os repositórios usam um adapter assíncrono centralizado que seleciona
  SQLite ou PostgreSQL por configuração. A execução PostgreSQL local ainda
  precisa completar a matriz da Sprint 3.12 em uma máquina com PostgreSQL.

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

Observacao: o Docker Compose sobe API + Postgres, aplica migrations no startup
do perfil local e valida conectividade no `/health`. A implementacao existe,
mas não deve ser declarada aprovada até E2E, smoke, migrador, backup e restore
PostgreSQL passarem.

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

`GET /health` consulta a conectividade do banco e retorna 503 quando ela falha.
`GET /ready` também valida schema/migrations, provider de e-mail, URL pública
HTTPS em ambientes restritos e IA quando exigida. As respostas mostram apenas
provider e estados sanitizados, sem caminho, host ou credenciais.

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
