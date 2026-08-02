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
