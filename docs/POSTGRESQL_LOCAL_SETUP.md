# PostgreSQL local

## Escopo

O runtime mantém uma única fronteira de dados:

```text
Flutter -> API Node/TypeScript -> repositories -> SQLite ou PostgreSQL
```

O Flutter nunca recebe `DATABASE_URL` e não acessa o banco diretamente.

## Pré-requisitos

- Node.js 22 e npm;
- Docker Desktop com Compose ou PostgreSQL 16 e ferramentas cliente;
- portas 3000 e 5432 livres, ou valores alternativos no ambiente;
- nenhum dado ou segredo real.

Na Sprint 3.12 desta máquina, Docker, `psql`, `pg_dump` e `pg_restore` não
estavam instalados. Os comandos abaixo foram preparados, mas a matriz
PostgreSQL local permanece pendente até ser executada em uma máquina apta.

## Subir API e PostgreSQL pelo Compose

No diretório `saas`, defina valores locais descartáveis fora do Git:

```powershell
$env:POSTGRES_DB='consultoria_local'
$env:POSTGRES_USER='consultoria_local'
$env:POSTGRES_PASSWORD='<senha-local-descartavel>'
$env:POSTGRES_PORT='5432'
docker compose -f docker-compose.postgres.yml up --build
```

O Compose usa PostgreSQL 16, volume local, usuário/banco exclusivos,
healthcheck e porta configurável. Não reutilize credenciais de staging ou
produção.

## Executar sem o container da API

Crie `saas/apps/api/.env.local` a partir de `.env.example`:

```env
NODE_ENV=development
APP_ENV=local-postgres
DATABASE_URL=postgres://<usuario>:<senha>@127.0.0.1:5432/<banco>
RUN_MIGRATIONS_ON_STARTUP=false
ENABLE_DEMO_SEED=false
JWT_SECRET=<segredo-local-forte>
CORS_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
EMAIL_PROVIDER=console
```

Depois:

```powershell
Set-Location saas
npm.cmd ci
npm.cmd --workspace @consultoria/api run db:migrate
npm.cmd --workspace @consultoria/api run db:migrate
npm.cmd --workspace @consultoria/api run db:validate
npm.cmd --workspace @consultoria/api start
```

A segunda execução de `db:migrate` deve ser idempotente.

## Cadastrar o primeiro ADMIN

Depois de aplicar e validar as migrations, use `admin:bootstrap` somente em
ambiente local ou de teste e apenas quando ainda não existir um ADMIN. Defina
as variáveis temporárias com dados fictícios e a confirmação exata:

```powershell
$env:BOOTSTRAP_ADMIN_NAME='<NOME_FICTICIO>'
$env:BOOTSTRAP_ADMIN_EMAIL='<EMAIL_FICTICIO>'
$env:BOOTSTRAP_ADMIN_PASSWORD='<SENHA_FICTICIA_FORTE>'
$env:BOOTSTRAP_CONFIRM='CREATE-FIRST-ADMIN'
npm.cmd --workspace @consultoria/api run admin:bootstrap
Remove-Item Env:BOOTSTRAP_ADMIN_NAME, Env:BOOTSTRAP_ADMIN_EMAIL,
  Env:BOOTSTRAP_ADMIN_PASSWORD, Env:BOOTSTRAP_CONFIRM
```

O comando exige `DATABASE_URL` PostgreSQL, recusa `NODE_ENV=production`, não
executa migrations automaticamente e falha se já existir um ADMIN.

## Validação

```powershell
npm.cmd --workspace @consultoria/api run test:e2e:postgres
npm.cmd --workspace @consultoria/api run test:smoke:postgres
```

Cada execução deve usar banco isolado e descartável. Não execute em banco
operacional, staging compartilhado ou produção.

Valide também:

- `/health`: `database.provider=postgres` e conectividade;
- `/ready`: HTTP 200 com migrations atuais;
- indisponibilidade do banco: `/health` e `/ready` devem retornar 503;
- nenhum host, usuário, senha ou connection string na resposta.

## Voltar ao SQLite

Pare a API, remova `DATABASE_URL` do ambiente e configure `DATABASE_PATH`.
Consulte `ROLLBACK_POSTGRESQL_TO_SQLITE.md`.
