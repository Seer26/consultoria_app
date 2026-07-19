# Ambiente de staging

## Objetivo

Staging deve reproduzir o comportamento de produção sem usar dados, bancos, chaves ou credenciais reais. A arquitetura permanece Flutter Web → HTTPS → API Node/TypeScript → SQLite persistente, com uma única instância ativa da API.

Esta documentação prepara a publicação, mas não afirma que exista um ambiente externo implantado. A publicação depende de provedor, domínio, DNS, certificado, armazenamento persistente, provider de e-mail e segredos aprovados.

## Perfil obrigatório

- `APP_ENV=staging` identifica o ambiente funcional.
- `NODE_ENV=production` habilita o comportamento seguro e otimizado do Node.
- `ENABLE_DEMO_SEED=false` impede contas conhecidas.
- `SHOW_DEMO_CREDENTIALS=false` é obrigatório no build Flutter.
- `API_REPLICA_COUNT=1` e `SQLITE_VOLUME_ACK=single-instance-persistent-volume` registram a limitação operacional do SQLite.
- API, frontend, CORS e links de recuperação devem usar HTTPS e host não local.
- Segredos devem vir do cofre da plataforma, nunca do repositório.

O processo da API valida esse perfil na inicialização e recusa configurações inseguras, incluindo localhost, segredo JWT fraco, múltiplas réplicas, provider de e-mail de teste, logs não estruturados e seed demo.

## Estado da infraestrutura externa

| Item | Situação nesta sprint | Evidência ou pendência |
|---|---|---|
| Dockerfile da API | validado estaticamente e por testes | Docker não está instalado na máquina; imagem real não foi construída |
| Compose de referência | preparado | `deploy/staging/docker-compose.yml` |
| CI | preparado | build/testes da API e Flutter, carga leve e build web |
| Hospedagem da API | ausente | contratar ou escolher provedor |
| Hospedagem Flutter Web | ausente | escolher host estático/CDN |
| Domínio, DNS e TLS | ausentes | provisionar hosts HTTPS exclusivos |
| Provider de e-mail | ausente | contratar, autenticar domínio e validar entrega |
| Volume persistente | ausente | provisionar volume exclusivo para SQLite |
| Backup externo | adapter testado localmente | provisionar destino externo persistente |
| Cofre de segredos | ausente | configurar no provedor escolhido |
| Alertas externos | adapter HTTP testado localmente | configurar webhook seguro real |

## Variáveis mínimas da API

Use `saas/apps/api/.env.example` como fonte canônica. Exemplo sem valores reais:

```dotenv
APP_ENV=staging
NODE_ENV=production
PORT=3000

DATABASE_PATH=/var/lib/consultoria/consultoria.sqlite
SQLITE_BACKUP_DIR=/var/backups/consultoria
SQLITE_BACKUP_RETENTION=14
API_REPLICA_COUNT=1
SQLITE_VOLUME_ACK=single-instance-persistent-volume

APP_PUBLIC_URL=https://app-staging.example.invalid
API_PUBLIC_URL=https://api-staging.example.invalid
CORS_ORIGINS=https://app-staging.example.invalid
TRUST_PROXY_HOPS=1

JWT_SECRET=SUBSTITUIR_PELO_COFRE
ENABLE_DEMO_SEED=false
ENABLE_INTERNAL_METRICS=true
REQUIRE_LEGAL_ACCEPTANCE=true
REQUIRE_AI_IN_READINESS=false
LOG_FORMAT=json

EMAIL_PROVIDER=http
EMAIL_ALLOW_TEST_PROVIDER=false
EMAIL_API_URL=https://email-provider.example.invalid/send
EMAIL_API_KEY=SUBSTITUIR_PELO_COFRE
EMAIL_FROM=no-reply@example.invalid

OPENAI_API_KEY=

ENABLE_EXTERNAL_ALERTS=false
ALERT_WEBHOOK_URL=
ALERT_WEBHOOK_TIMEOUT_MS=3000

BACKUP_EXTERNAL_PROVIDER=filesystem
BACKUP_EXTERNAL_DIRECTORY=/mnt/backup-externo
```

Substitua os domínios reservados `.invalid` apenas quando houver infraestrutura aprovada. Nunca versionar os valores reais de `JWT_SECRET`, `EMAIL_API_KEY` ou `OPENAI_API_KEY`.

## Build da API

Na raiz do repositório:

```powershell
cd saas
npm.cmd ci
npm.cmd run build
npm.cmd --workspace @consultoria/api run test
```

Build de imagem, quando Docker estiver disponível:

```powershell
docker build -f saas/apps/api/Dockerfile -t consultoria-api:staging saas
```

O container usa usuário não root, healthcheck, diretórios distintos para dados e backups e encerramento controlado para `SIGTERM`/`SIGINT`.

## Build do Flutter Web

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-flutter-web-staging.ps1 `
  -StagingApiUrl https://api-staging.example.invalid
```

O script recusa URL HTTP ou local. A publicação estática deve usar fallback SPA para `index.html`; veja `docs/PUBLICACAO_FLUTTER_WEB_STAGING.md`.

## Execução de referência com Docker Compose

Depois de criar um arquivo `.env.staging` fora do controle de versão:

```powershell
docker compose --env-file .env.staging `
  -f deploy/staging/docker-compose.yml up --build -d
```

O exemplo deve permanecer com uma réplica. Os volumes de banco e backup não podem ser efêmeros nem compartilhados por duas instâncias gravando simultaneamente.

## Health, readiness e métricas

- `GET /health`: confirma que o processo responde e informa o ambiente sem segredos.
- `GET /ready`: confirma banco, schema e dependências obrigatórias; retorna `503` quando `not_ready`.
- `GET /operations/metrics`: métricas agregadas protegidas para ADMIN.

Exemplo:

```powershell
Invoke-WebRequest https://api-staging.example.invalid/health
Invoke-WebRequest https://api-staging.example.invalid/ready
```

O teste automatizado `test:staging:start` inicia um perfil sintético de staging, valida health/readiness e confirma seed desligado. Ele não substitui a execução dentro de uma imagem Docker real.

## Smoke externo

O smoke externo só deve usar empresa e usuários sintéticos dedicados:

```powershell
$env:STAGING_API_URL='https://api-staging.example.invalid'
$env:STAGING_EXPECTED_HOST='api-staging.example.invalid'
$env:STAGING_ADMIN_EMAIL='admin-sintetico@example.invalid'
$env:STAGING_ADMIN_PASSWORD='SEGREDO_TEMPORARIO'
$env:STAGING_OWNER_EMAIL='owner-sintetico@example.invalid'
$env:STAGING_OWNER_PASSWORD='SEGREDO_TEMPORARIO'
$env:I_UNDERSTAND_STAGING_ONLY='yes'
npm.cmd --workspace @consultoria/api run test:smoke:staging
```

O comando possui travas de host, HTTPS e confirmação explícita. Não execute contra produção. Nesta sprint, ele não foi executado externamente porque não há URL/credenciais de staging configuradas.

## Rollback

1. Suspender novas publicações e preservar logs/request IDs.
2. Verificar `/health`, `/ready`, volume e último backup válido.
3. Reimplantar a última imagem validada, sem trocar ou apagar o volume.
4. Se houver mudança de schema, usar apenas procedimento versionado e compatível.
5. Restaurar banco somente com escrita suspensa, autorização e backup prévio.
6. Executar health, readiness e smoke sintético antes de reabrir acesso.

## Limpeza de dados sintéticos

O conjunto controlado usa apenas IDs fixos `staging-synthetic-*`, credenciais recebidas por variáveis temporárias e nunca impressas. Os comandos recusam produção, Postgres, caminho relativo, demo seed habilitado e ausência de confirmação:

```powershell
npm.cmd --prefix saas run staging:seed
npm.cmd --prefix saas run staging:cleanup
```

Consulte `deploy/staging/README.md` para as variáveis e confirmações. A limpeza remove somente os IDs fixos; não usa curinga. Não reutilizar o volume em produção e não copiar dados reais para staging.

## Documentos relacionados

- `docs/SQLITE_STAGING.md`
- `docs/EMAIL_STAGING.md`
- `docs/BACKUP_EXTERNO_STAGING.md`
- `docs/PUBLICACAO_FLUTTER_WEB_STAGING.md`
- `docs/RUNBOOK_BETA.md`
- `docs/SECRETS_STAGING.md`
- `docs/ROLLBACK_STAGING.md`
- `docs/OPCOES_INFRAESTRUTURA_STAGING.md`
- `deploy/staging/README.md`
- `CHECKLIST_PUBLICACAO_STAGING.md`
