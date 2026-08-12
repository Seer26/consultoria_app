# Deploy da release-baseline no Railway

Este documento prepara o deploy; ele não contém credenciais e não executa operações na conta Railway. A primeira implantação deve usar a branch `codex/release-baseline` depois que esta preparação for revisada e integrada nela.

## 1. Arquitetura

```text
Navegador
  -> Flutter Web público (nginx)
  -> API pública HTTPS (Node/Express)
  -> PostgreSQL Railway

API -> Gemini
```

O navegador precisa chamar o domínio público HTTPS da API. A rede privada Railway não é acessível pelo Flutter executado no navegador. A chave Gemini existe somente no serviço API.

## 2. Projeto e serviços

Na conta do cliente, criar um projeto vazio com três serviços no mesmo ambiente:

1. `Postgres`, usando o template PostgreSQL do Railway;
2. `api`, conectado ao repositório GitHub e à branch `codex/release-baseline`;
3. `web`, conectado ao mesmo repositório e branch.

Não conectar inicialmente a branch de preparação `codex/railway-deployment`. Ela deve ser revisada e integrada à baseline antes do deploy.

## 3. Dockerfiles e monorepo

### API

- Root Directory: `/saas`
- `RAILWAY_DOCKERFILE_PATH=/apps/api/Dockerfile`
- Dockerfile: `saas/apps/api/Dockerfile`
- contexto: workspace npm em `saas`;
- build: `npm ci`, domínio compartilhado e API TypeScript;
- runtime: artefatos compilados, dependências de produção e migrations SQL;
- start: `node --import tsx dist/server.js`;
- o entrypoint rejeita `DATABASE_URL` ausente ou não PostgreSQL.

Não configurar Start Command customizado: usar `ENTRYPOINT`/`CMD` do Dockerfile.

### Flutter Web

- Root Directory: `/`
- `RAILWAY_DOCKERFILE_PATH=/Dockerfile.flutter`
- Dockerfile: `Dockerfile.flutter`
- build arg: `API_BASE_URL`;
- build: `flutter pub get` e `flutter build web --release --dart-define=API_BASE_URL=...`;
- runtime: nginx;
- fallback SPA: `try_files $uri $uri/ /index.html`.

O fallback cobre `/login`, `/research`, `/change-password`, `/company-settings`, `/team` e demais rotas Flutter. Não configurar Start Command customizado.

## 4. Domínios e comunicação

1. Gerar primeiro um domínio público HTTPS para a API.
2. Definir esse domínio, sem barra final, em `API_PUBLIC_URL` da API e `API_BASE_URL` do web.
3. Gerar o domínio público HTTPS do web.
4. Definir esse domínio em `APP_PUBLIC_URL` e `CORS_ORIGINS` da API.
5. Reimplantar o web se `API_BASE_URL` mudar, pois é uma variável de build.

Não usar `localhost` nem o hostname privado da API no Flutter de produção. Para múltiplas origens autorizadas, `CORS_ORIGINS` aceita uma lista separada por vírgulas. Não usar `*` em produção.

## 5. Variáveis do serviço API

Somente nomes e finalidade são registrados aqui. Segredos devem ser configurados e selados no Railway.

### Obrigatórias

| Nome | Finalidade |
| --- | --- |
| `NODE_ENV` | Executar o runtime em modo de produção. |
| `APP_ENV` | Identificar o ambiente operacional de produção. |
| `DATABASE_URL` | Conexão exclusiva ao PostgreSQL Railway. Usar referência entre serviços. |
| `JWT_SECRET` | Assinatura dos tokens; segredo forte e exclusivo, com pelo menos 32 caracteres. |
| `CORS_ORIGINS` | Origem HTTPS pública permitida para o Flutter Web. |
| `APP_PUBLIC_URL` | URL HTTPS pública do Flutter Web. |
| `API_PUBLIC_URL` | URL HTTPS pública da API. |
| `AI_ENABLED` | Ativar o fluxo consultivo de IA. |
| `AI_PROVIDER` | Selecionar Gemini. |
| `AI_MODEL` | Selecionar o modelo aprovado. |
| `GEMINI_API_KEY` | Credencial Gemini, exclusiva da API. |
| `REQUIRE_AI_IN_READINESS` | Exigir configuração de IA no readiness. |
| `REQUIRE_LEGAL_ACCEPTANCE` | Ativar o gate jurídico. |
| `EMAIL_PROVIDER` | Provedor de e-mail real; necessário para readiness em produção. |
| `EMAIL_FROM` | Remetente válido do e-mail. |
| `EMAIL_API_URL` | Endpoint HTTPS do provedor de e-mail HTTP. |
| `EMAIL_API_KEY` | Credencial do provedor de e-mail. |
| `ENABLE_DEMO_SEED` | Deve permanecer desativado. |
| `LOG_FORMAT` | Logs estruturados em JSON. |

Configuração conceitual da referência do banco:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Configuração aprovada da IA:

```text
AI_ENABLED=true
AI_PROVIDER=gemini
AI_MODEL=gemini-3.5-flash-lite
```

### Opcionais com defaults seguros

| Nome | Finalidade |
| --- | --- |
| `PORT` | Porta injetada pelo Railway; não precisa ser fixada. |
| `JWT_EXPIRES_IN` | Validade dos tokens. |
| `TRUST_PROXY_HOPS` | Número de proxies confiáveis para IP/rate limit. Avaliar `1` no Railway. |
| `API_REPLICA_COUNT` | Quantidade declarada de réplicas da API. |
| `RUN_MIGRATIONS_ON_STARTUP` | Manter `false`; usar Pre-Deploy Command. |
| `AI_TIMEOUT_MS` | Timeout do provedor de IA. |
| `AI_MIN_QUESTIONS` | Mínimo de perguntas; default oficial 5. |
| `AI_MAX_QUESTIONS` | Máximo de perguntas; default oficial 10. |
| `AI_MIN_PILLARS` | Cobertura mínima; default oficial 3. |
| `AI_RATE_LIMIT_WINDOW_MS` | Janela do rate limit de IA. |
| `AI_RATE_LIMIT_MAX` | Limite de chamadas de IA por janela. |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Janela do rate limit de login. |
| `LOGIN_RATE_LIMIT_MAX` | Limite de tentativas de login. |
| `PASSWORD_FORGOT_RATE_LIMIT_WINDOW_MS` | Janela de recuperação de senha. |
| `PASSWORD_FORGOT_RATE_LIMIT_MAX` | Limite de pedidos de recuperação. |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Validade do token de recuperação. |
| `PDF_RATE_LIMIT_WINDOW_MS` | Janela do rate limit de PDF. |
| `PDF_RATE_LIMIT_MAX` | Limite de PDFs por janela. |
| `EMAIL_TIMEOUT_MS` | Timeout do provedor de e-mail. |
| `EMAIL_API_AUTH_HEADER` | Nome do cabeçalho de autenticação do provedor. |
| `EMAIL_API_AUTH_SCHEME` | Esquema do cabeçalho de autenticação. |
| `EMAIL_API_FROM_FIELD` | Mapeamento do campo remetente. |
| `EMAIL_API_TO_FIELD` | Mapeamento do campo destinatário. |
| `EMAIL_API_SUBJECT_FIELD` | Mapeamento do campo assunto. |
| `EMAIL_API_HTML_FIELD` | Mapeamento do conteúdo HTML. |
| `EMAIL_API_TEXT_FIELD` | Mapeamento do conteúdo texto. |
| `EMAIL_API_MESSAGE_ID_FIELD` | Mapeamento do identificador da mensagem. |
| `ENABLE_INTERNAL_METRICS` | Expor métricas internas aos papéis autorizados. |
| `ENABLE_EXTERNAL_ALERTS` | Ativar alertas externos. |
| `ALERT_WEBHOOK_URL` | Webhook HTTPS de alertas. |
| `ALERT_WEBHOOK_TIMEOUT_MS` | Timeout do webhook. |
| `TERMS_VERSION` | Versão vigente dos termos. |
| `PRIVACY_VERSION` | Versão vigente da política de privacidade. |

### Demo/Beta — não ativar na primeira produção

`BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_CONFIRM`, `EMAIL_ALLOW_TEST_PROVIDER`, `BACKUP_EXTERNAL_PROVIDER` e `BACKUP_EXTERNAL_DIRECTORY` são usados apenas por procedimentos administrativos controlados. Variáveis `DEMO_*`, `STAGING_*`, `CONFIRM_STAGING_SMOKE`, `SQLITE_*`, `DATABASE_PATH`, `OPENAI_API_KEY` e `AI_API_URL` não fazem parte do runtime Railway planejado.

## 6. Variável do serviço web

| Nome | Classificação | Finalidade |
| --- | --- | --- |
| `API_BASE_URL` | Obrigatória | URL HTTPS pública da API, incorporada no build Flutter. |
| `RAILWAY_DOCKERFILE_PATH` | Obrigatória | Selecionar `/Dockerfile.flutter`. |
| `PORT` | Opcional | Injetada pelo Railway e consumida pelo template nginx. |

Nunca colocar `GEMINI_API_KEY`, `JWT_SECRET` ou `DATABASE_URL` no serviço web.

## 7. Migrations 001–007

O migrador oficial é transacional por arquivo e idempotente por `schema_migrations`. Não executar migrations durante o build da imagem.

No serviço API, configurar o Pre-Deploy Command:

```text
npm run db:migrate:prod
```

O comando roda dentro da imagem, em `/app/apps/api`, depois do build e antes de iniciar a nova API. Se falhar, o deploy deve parar. Manter `RUN_MIGRATIONS_ON_STARTUP=false` evita concorrência entre réplicas.

Ordem segura:

```text
Postgres disponível -> Pre-Deploy migrations -> start API -> /ready = 200
```

## 8. Banco vazio e dados da beta

As migrations 001–007 criam um banco vazio completo e os planos obrigatórios. Para a primeira implantação sem dados beta, rodar apenas o pre-deploy.

Para migrar posteriormente `consultoria_local`, fazer uma janela separada e aprovada:

1. criar e validar um backup local fora do repositório;
2. confirmar que local e remoto estão em migrations 001–007;
3. deixar o destino sem dados de negócio;
4. gerar um dump PostgreSQL 16 custom-format, somente dados, sem owner/ACL, excluindo `schema_migrations` e `plans`;
5. restaurar em transação ou em janela de manutenção, preservando a ordem das chaves estrangeiras;
6. comparar previamente os IDs de `plans`, pois assinaturas dependem deles;
7. validar contagens, relações, papéis, isolamento e ausência de órfãos;
8. executar `db:validate`, `/health` e `/ready`;
9. apagar ou arquivar o dump em armazenamento seguro — nunca no Git.

Não usar um dump schema+data sobre um banco já migrado: ele pode conflitar com tabelas e constraints criadas pelo migrador. Se for decidido restaurar schema+data, o destino deve ser novo e a migration history precisa ser auditada antes de iniciar a API.

## 9. Healthchecks

- API Railway Healthcheck Path: `/ready` — valida conectividade, schema, migrations, URLs públicas, e-mail e IA quando exigida.
- Web Railway Healthcheck Path: `/healthz` — valida o nginx estático.

`/health` continua útil para diagnóstico, mas `/ready` é o gate correto de tráfego da API.

## 10. Segurança online

- usar somente HTTPS público; a terminação TLS fica no Railway;
- `NODE_ENV=production`, segredo JWT forte e variáveis sensíveis seladas;
- CORS limitado ao domínio web configurado;
- rate limits existentes preservados e `TRUST_PROXY_HOPS` revisado;
- aceitação jurídica habilitada;
- Gemini chamado somente pela API;
- nunca enviar chave Gemini ao Flutter;
- logs permanecem sanitizados, sem senha, token, chave ou URL de banco;
- não registrar prompts/respostas empresariais brutos;
- não executar seed, bootstrap ou migração SQLite na inicialização;
- revisar provedor real de e-mail antes de liberar recuperação de senha;
- restringir acesso ao projeto Railway e aplicar menor privilégio.

## 11. Rollback

1. não reverter automaticamente migration de banco;
2. manter backup validado antes de qualquer importação de dados;
3. no Railway, selecionar o deployment anterior da API e executar rollback/redeploy;
4. confirmar que o código anterior é compatível com as colunas aditivas da migration 007;
5. reverter o web independentemente, se necessário;
6. validar `/ready`, login, isolamento e pesquisa após o rollback;
7. restaurar banco somente em incidente comprovado, com janela, aprovação e teste do dump.

## 12. Checklist pós-deploy

- [ ] migrations aplicadas: 7, pendentes: 0;
- [ ] API `/health` retorna 200 e provider PostgreSQL;
- [ ] API `/ready` retorna 200;
- [ ] web `/healthz` retorna 200;
- [ ] `/login` e deep links retornam o Flutter, não 404;
- [ ] CORS aceita o domínio web e rejeita origem não autorizada;
- [ ] login ADMIN/OWNER/EMPLOYEE validado sem expor credenciais;
- [ ] OWNER vê somente sua equipe;
- [ ] privacidade de respostas de EMPLOYEE validada;
- [ ] Gemini gera pergunta pelo backend;
- [ ] recuperação de senha usa o provedor real;
- [ ] logs não contêm segredo, token, senha ou conteúdo bruto;
- [ ] métricas, alertas e consumo inicial monitorados.

## 13. Sequência manual exata na conta do cliente

1. revisar e integrar `codex/railway-deployment` em `codex/release-baseline`;
2. criar projeto Railway e ambiente de produção;
3. adicionar PostgreSQL;
4. criar serviço `api`, conectar GitHub e selecionar `codex/release-baseline`;
5. definir Root Directory `/saas` e `RAILWAY_DOCKERFILE_PATH=/apps/api/Dockerfile`;
6. configurar as variáveis obrigatórias da API, usando `DATABASE_URL=${{Postgres.DATABASE_URL}}` e selando segredos;
7. configurar Pre-Deploy Command `npm run db:migrate:prod`;
8. configurar Healthcheck Path `/ready`;
9. gerar domínio público da API e preencher `API_PUBLIC_URL`;
10. criar serviço `web`, conectar o mesmo repositório e branch;
11. definir Root Directory `/` e `RAILWAY_DOCKERFILE_PATH=/Dockerfile.flutter`;
12. configurar `API_BASE_URL` com o domínio HTTPS público da API;
13. configurar Healthcheck Path `/healthz`;
14. gerar domínio público do web;
15. preencher `APP_PUBLIC_URL` e `CORS_ORIGINS` da API com o domínio HTTPS do web;
16. revisar todas as staged changes do Railway e implantar Postgres, API e web;
17. verificar logs do pre-deploy, sem copiar segredos;
18. executar o checklist pós-deploy;
19. só depois planejar, aprovar e executar a migração dos dados beta em uma janela separada.

Referências oficiais consultadas: [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [monorepos](https://docs.railway.com/deployments/monorepo), [Pre-Deploy Command](https://docs.railway.com/deployments/pre-deploy-command), [variáveis](https://docs.railway.com/variables) e [healthchecks](https://docs.railway.com/deployments/healthchecks).
