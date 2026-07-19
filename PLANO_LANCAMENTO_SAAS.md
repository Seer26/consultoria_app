# Plano de Lancamento SaaS

Projeto: Plataforma de Consultoria Empresarial
Data: 2026-07-11
Objetivo: transformar o MVP de demonstracao em um SaaS utilizavel por empresas reais, preservando o fluxo atual de demo enquanto as camadas comerciais, operacionais e de producao sao adicionadas.

Atualizacao da Fase 1 em 2026-07-11:

- seed de demonstracao passou a ser controlado por `ENABLE_DEMO_SEED`;
- em `NODE_ENV=production`, o seed fica desligado por padrao;
- `JWT_SECRET` passou a ser obrigatorio em producao;
- CORS passou a aceitar configuracao por `CORS_ORIGINS`;
- URL da API no Flutter passou a aceitar `--dart-define=API_BASE_URL=...`;
- credenciais de demo no login passaram a ser escondidas em `ENV=production`;
- ADMIN ganhou fluxo de onboarding para criar empresa + primeiro OWNER numa operacao transacional.

Atualizacao da sprint multiempresa em 2026-07-11:

- teste E2E/API multiempresa criado em `saas/apps/api/src/tests/multitenant.e2e.ts`;
- fluxo sem seed validado por onboarding administrativo e OWNER real;
- listagens de pesquisa e plano de acao agora retornam `403` quando usuario nao ADMIN tenta consultar outro `companyId`;
- registro publico em `/auth/register` foi desabilitado para o lancamento inicial;
- mutacoes legadas `POST /api/diagnosis/submissions` e `POST /ai-diagnosis` foram desativadas;
- rota placeholder `/team` foi removida do shell Flutter;
- ambientes documentados em `docs/AMBIENTES_SAAS.md`;
- exemplo de ambiente criado em `saas/apps/api/.env.example`.

Atualizacao da Fase 2 em 2026-07-12:

- schema inicial de planos criado com `plans`, `company_subscriptions` e `usage_counters`;
- toda empresa nova recebe assinatura interna `Starter` automaticamente, sem pagamento ainda;
- service/middleware de entitlements criado em `saas/apps/api/src/modules/entitlements/`;
- backend passou a bloquear limites de usuarios, pesquisas mensais, PDFs mensais, tarefas ativas e perguntas de IA mensais;
- endpoint `GET /billing/current-plan` criado para consultar plano, assinatura interna e uso atual;
- Flutter ganhou tela `/plan` para OWNER acompanhar o plano atual e consumo por limite;
- E2E multiempresa passou a validar tambem os limites de plano.

Atualizacao comercial manual da Fase 2 em 2026-07-12:

- ADMIN ganhou endpoints para listar planos, consultar plano de uma empresa e alterar plano manualmente;
- tela administrativa de Empresas passou a mostrar o plano comercial da empresa selecionada;
- ADMIN pode trocar empresa entre `Starter` e `Growth` com confirmacao;
- OWNER e EMPLOYEE continuam sem permissao para alterar plano;
- mensagens de limite atingido no Flutter foram padronizadas para orientar contato com o administrador;
- pagamento, checkout, webhooks, faturas e historico financeiro continuam fora do escopo desta etapa beta;
- a data da troca manual fica registrada em `company_subscriptions.updated_at`;
- historico detalhado de alteracoes de plano segue pendente para a fase de auditoria/billing.

Atualizacao Sprint 2.5 em 2026-07-12:

- OWNER ganhou tela Flutter `Configuracoes da empresa`;
- API ganhou endpoints `GET /company/settings` e `PUT /company/settings` para OWNER consultar/editar apenas dados basicos da propria empresa;
- campos de empresa expandidos com setor, porte, telefone, responsavel e observacoes/preferencias;
- EMPLOYEE nao altera configuracoes da empresa;
- troca manual de plano passou a gerar historico em `company_subscription_events`;
- ADMIN visualiza historico simples de plano na tela da empresa;
- login recebeu mensagens melhores para credenciais invalidas, usuario inativo, empresa inativa e API indisponivel;
- checklist de cliente beta criado em `docs/ONBOARDING_CLIENTE_BETA.md`.

Atualizacao inicial da Fase 3 em 2026-07-12:

- Postgres preparado por `DATABASE_URL`;
- migrations versionadas criadas para o schema atual;
- planos `Starter` e `Growth` criados de forma idempotente via migration;
- comandos `db:migrate` e `db:validate` adicionados;
- Dockerfile da API e Docker Compose local com Postgres criados;
- `/health` passou a informar API, ambiente, banco e OpenAI sem expor secrets;
- logs estruturados e auditoria basica adicionados;
- documentacao operacional criada em `docs/PRODUCAO_DEPLOY.md` e `docs/BACKUP_RESTORE_POSTGRES.md`;
- decisao tecnica: a persistencia funcional completa em Postgres fica para uma sprint dedicada de refatoracao async dos repositórios, pois o runtime atual usa `better-sqlite3` sincrono.

## 1. Estado atual

O produto ja possui um nucleo funcional validado para demonstracao:

- Frontend principal em Flutter.
- API Node/TypeScript com Express.
- Autenticacao por JWT.
- Perfis `ADMIN`, `OWNER` e `EMPLOYEE`.
- Cadastro administrativo de empresas e usuarios.
- Pesquisa Empresarial com respostas por empresa.
- Diagnostico, score, insights e recomendacoes.
- Geracao de plano de acao a partir da pesquisa.
- Dashboard por perfil.
- Relatorio executivo e PDF.
- ADMIN em modo somente consulta para pesquisas.
- OWNER e EMPLOYEE respondem pela propria empresa.
- Build da API aprovado.
- `flutter analyze` sem issues.
- `flutter test` aprovado.
- `npm start` funcionando.
- Integracao OpenAI configurada, dependendo de creditos ativos na OpenAI Platform.

O sistema ainda deve ser tratado como MVP estabilizado, nao como SaaS comercial. Existem dependencias de seed, configuracao local, SQLite, credenciais de demonstracao, mocks e ausencia de billing/planos.

## 2. Estrutura relevante

### Frontend principal

- `lib/`: app Flutter principal.
- `lib/core/`: rotas, RBAC, HTTP, storage e configuracoes.
- `lib/features/auth/`: login e sessao.
- `lib/features/admin_management/`: empresas e usuarios por ADMIN.
- `lib/features/diagnosis/`: pesquisa e chat de diagnostico.
- `lib/features/action_plan/`: plano de acao.
- `lib/features/dashboard/`: dashboards.
- `lib/features/reports/`: relatorios e PDF.
- `test/`: testes Flutter.

### Backend

- `saas/apps/api/src/app.ts`: Express, CORS e rotas.
- `saas/apps/api/src/config/env.ts`: variaveis de ambiente.
- `saas/apps/api/src/db/schema.ts`: schema SQLite atual.
- `saas/apps/api/src/database/init.ts`: migracoes locais e seed de demo.
- `saas/apps/api/src/modules/auth/`: login, registro e JWT.
- `saas/apps/api/src/modules/companies/`: empresas e usuarios.
- `saas/apps/api/src/modules/research/`: pesquisas.
- `saas/apps/api/src/modules/action-plan/`: tarefas e plano de acao.
- `saas/apps/api/src/modules/dashboard/`: dashboards.
- `saas/apps/api/src/modules/reports/`: relatorios e PDF.
- `saas/apps/api/src/modules/ai-question/` e `ai-diagnosis/`: IA.

### Web secundaria

- `saas/apps/web/`: app React/Vite antigo/prototipo.
- Contem mocks em `saas/apps/web/src/features/diagnosis/data/mockDiagnosis.ts`.
- Nao deve ser considerado frontend de lancamento enquanto Flutter for o frontend principal.

## 3. Dependencias de demo, mock ou configuracao manual

### Seed automatico

Arquivo: `saas/apps/api/src/database/init.ts`

Hoje a API cria automaticamente:

- empresa `Empresa Demo`;
- usuarios `admin@teste.com`, `owner@teste.com`, `employee@teste.com`;
- senha padrao `123456`;
- pesquisa concluida de demonstracao;
- respostas, scores e tarefas iniciais.

Para lancamento, esse seed precisa ser controlado por ambiente. Em producao ele nao deve rodar automaticamente.

### Banco local

Arquivo: `saas/apps/api/src/config/env.ts`

O caminho padrao do banco e `./data/consultoria.sqlite`. Isso e adequado para demo/local, mas nao para SaaS comercial. Para producao, o projeto precisa de banco gerenciado, migracoes versionadas e backup.

### Segredos e ambiente

Arquivo: `saas/apps/api/src/config/env.ts`

Pontos atuais:

- `JWT_SECRET` tem fallback local: `consultoria-local-dev-secret`.
- `OPENAI_API_KEY` e lido de ambiente ou `.env.local`.
- `CORS` aceita `origin: '*'` em `saas/apps/api/src/app.ts`.
- URLs do Flutter ainda apontam para localhost em `lib/core/constants/app_constants.dart`.
- Existe `lib/core/config/app_config.dart`, mas o cliente HTTP principal usa `AppConstants.baseUrl`.

Para producao, segredos devem ser obrigatorios, CORS deve ser restrito e o frontend precisa ler URL por flavor/build config.

### Mocks e fallbacks no Flutter

Pontos encontrados:

- `lib/features/auth/presentation/pages/login_page.dart`: preenche email/senha de demo e exibe usuarios de teste.
- `lib/features/forms/data/datasources/forms_remote_data_source.dart`: mantem fallback mock quando a API de formularios falha.
- `lib/features/clients/data/datasources/clients_remote_data_source.dart`: usa dados mockados.
- `lib/features/dashboard/presentation/pages/dashboard_page.dart`: fallback simples se API falhar.
- `lib/features/chat/presentation/pages/chat_page.dart`: menciona respostas mockadas.
- `lib/features/diagnosis/presentation/mock/`: catalogo de workspace demonstrativo.
- `lib/features/dashboard/presentation/pages/business_area_page.dart`: placeholder de modulo.
- Rota `/team` ainda aponta para placeholder, embora esteja fora do menu OWNER.

Para lancamento, telas com mock devem ser removidas, isoladas por feature flag ou claramente fora do pacote comercial.

### Mocks na web secundaria

Pontos encontrados:

- `saas/apps/web/src/features/diagnosis/data/mockDiagnosis.ts`
- `saas/apps/web/src/app/App.tsx` usa dados mockados.
- `saas/apps/web/src/features/diagnosis/api/diagnosisApi.ts` aponta para `http://localhost:3333/api`.

Decisao recomendada: congelar/remover do escopo comercial ate o Flutter estar pronto para producao.

## 4. O que falta para virar SaaS real

### Cadastro real de empresas

Estado atual:

- ADMIN consegue criar empresa em `/companies`.
- Nao ha onboarding publico ou assistido que crie empresa + primeiro OWNER.

Necessario:

- Fluxo transacional de onboarding.
- Validacao de CNPJ/opcional, telefone, responsavel, tamanho, setor e slug.
- Criacao do primeiro OWNER com convite ou senha temporaria.
- Email de boas-vindas/ativacao.
- Estados de empresa: `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`.

### Primeiro usuario OWNER

Estado atual:

- Usuario e criado por ADMIN em `/companies/:companyId/users`.
- `/auth/register` existe, mas exige `companyId` e nao cria empresa.

Necessario:

- Endpoint de signup/onboarding que cria empresa e OWNER juntos.
- Protecao contra criacao indevida de ADMIN.
- Convite por email para usuarios adicionais.
- Redefinicao de senha e verificacao de email.

### Isolamento completo por empresa

Estado atual:

- Fluxos centrais filtram por `companyId` para OWNER/EMPLOYEE.
- ADMIN tem visao global.

Necessario:

- Testes automatizados de isolamento multi-tenant.
- Indices por `company_id`.
- Auditoria de todas as queries e rotas com dados sensiveis.
- Proibir `companyId` arbitrario em payloads de usuarios nao ADMIN.
- Garantir que relatorios, PDFs, tarefas, dashboards e pesquisas nunca vazem dados entre empresas.

### Planos e limites

Estado atual apos inicio da Fase 2:

- existem `plans`, `company_subscriptions` e `usage_counters`;
- o plano `Starter` e criado automaticamente;
- empresas recebem assinatura interna `Starter` ao serem criadas;
- limites ativos no backend:
  - usuarios ativos;
  - pesquisas por mes;
  - relatorios/PDF por mes;
  - tarefas ativas;
  - perguntas de IA por mes;
- middleware/service de entitlement retorna `402 PLAN_LIMIT_REACHED`;
- OWNER consegue consultar plano e uso atual no Flutter.
- ADMIN consegue trocar plano manualmente para venda beta sem gateway de pagamento.

Limites atuais:

| Plano | Usuarios ativos | Pesquisas/mes | PDFs/mes | Tarefas ativas | IA/mes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter | 5 | 20 | 30 | 100 | 100 |
| Growth | 20 | 100 | 150 | 500 | 500 |

Necessario para completar a Fase 2:

- decidir precos e nomes comerciais finais dos planos;
- definir tabela de precos e proposta comercial beta;
- criar historico/auditoria de troca manual de plano;
- criar configuracoes da empresa para OWNER;
- criar tela/acao de upgrade;
- integrar provedor de pagamento;
- criar webhooks idempotentes;
- registrar faturas/eventos de pagamento;
- definir trial, inadimplencia, suspensao e reativacao.

### Assinatura e pagamento

Estado atual:

- Nao ha integracao de pagamento.

Necessario:

- Escolher provedor: Stripe, Asaas, Mercado Pago, Pagar.me ou outro.
- Checkout/assinatura recorrente.
- Webhooks idempotentes.
- Historico de faturas.
- Status de pagamento: trial, ativo, vencido, cancelado.
- Bloqueio gradual quando assinatura estiver inadimplente.
- Tratamento fiscal/nota, se fizer parte da oferta.

### Bloqueios por plano

Estado atual:

- RBAC existe por perfil, mas nao por plano.

Necessario:

- Camada `canUseFeature(companyId, feature)`.
- Bloqueio no backend antes da acao.
- Mensagem no frontend explicando limite/plano.
- Evitar depender apenas de esconder botoes no Flutter.

### Ambiente de producao

Estado atual:

- API roda localmente com SQLite.
- `npm start` usa `tsx src/server.ts`.
- Sem pipeline de deploy documentado.

Necessario:

- Banco gerenciado, preferencialmente Postgres.
- Migracoes versionadas.
- Build de producao sem depender de `tsx`.
- Logs estruturados.
- Healthcheck.
- Backups.
- Monitoramento.
- Dominios para API e app.
- Separacao `local`, `staging` e `production`.

### Variaveis de ambiente

Necessario tornar obrigatorias em producao:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL` ou equivalente
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `OPENAI_API_KEY`
- `AI_MODEL`
- `AI_QUESTION_MODEL`
- `CORS_ORIGINS`
- variaveis do provedor de pagamento
- variaveis de email transacional
- URLs publicas de frontend/backend

### Seguranca

Necessario antes de cliente real:

- Remover credenciais de demo da tela de login em producao.
- Desativar seed automatico em producao.
- Exigir `JWT_SECRET` forte.
- Restringir CORS.
- Rate limit em login, IA, PDF e endpoints sensiveis.
- Validacao forte de payloads.
- Politica de senha.
- Recuperacao de senha segura.
- Verificacao de email.
- Logs sem segredos.
- Auditoria de acessos administrativos.
- Revisao de dependencias.
- Politica LGPD: consentimento, exclusao/exportacao de dados e termos.

### Documentacao

Necessario:

- README de setup local.
- Guia de ambientes.
- Guia de deploy.
- Contrato de API principal.
- Guia de operacao/admin.
- Politica de backup/restore.
- Runbook de incidentes.
- Checklist de onboarding de cliente.

## 5. Fases de lancamento

## Fase 1: Produto lancavel

Objetivo: deixar o produto utilizavel por empresas reais em ambiente controlado, ainda sem cobranca automatica.

Entregas:

- Remover ou esconder credenciais de demo da tela de login em builds nao demo.
- Separar seed de demo por flag, por exemplo `ENABLE_DEMO_SEED=true`.
- Criar onboarding administrativo robusto: empresa + primeiro OWNER.
- Garantir que OWNER consiga gerenciar usuarios da propria empresa, se esse for o modelo comercial.
- Auditar isolamento por empresa nos fluxos centrais.
- Adicionar testes E2E de multiempresa.
- Trocar URLs hardcoded por configuracao de ambiente.
- Definir quais modulos entram no lancamento: Pesquisa, Diagnostico, Plano de Acao, Dashboard e Relatorio.
- Remover ou desativar menus/telas de mock fora do escopo.
- Melhorar mensagens de erro para usuario real.

Criterio de aceite:

- Criar uma empresa real sem mexer no banco manualmente.
- Criar OWNER real.
- OWNER responder pesquisa, gerar plano, ver dashboard e PDF sem dados seed.
- Segunda empresa nao acessa dados da primeira.
- Demo continua funcionando quando `ENABLE_DEMO_SEED=true`.

## Fase 2: SaaS com planos e assinatura

Objetivo: adicionar modelo comercial sem comprometer o nucleo do produto.

Entregas:

- Modelagem de planos.
- Assinatura por empresa.
- Trial.
- Limites por plano.
- Tela de plano atual e limites.
- Integracao com provedor de pagamento.
- Webhooks idempotentes.
- Bloqueios por plano no backend.
- Estados de inadimplencia/suspensao.

Criterio de aceite:

- Empresa nova entra em trial ou plano contratado.
- Limites sao aplicados no backend.
- Pagamento aprovado ativa assinatura.
- Pagamento vencido muda status e bloqueia recursos conforme regra.

## Fase 3: Producao/deploy

Objetivo: tornar o sistema operavel em producao.

Entregas:

- Banco gerenciado.
- Migracoes versionadas.
- Comandos de migration e validacao de banco.
- Healthcheck com conectividade de banco.
- Logs estruturados e auditoria operacional basica.
- Backup/restore documentado.
- Build de API para producao.
- Deploy da API.
- Deploy do Flutter Web ou empacotamento do alvo escolhido.
- Configuracao de dominio e HTTPS.
- Segredos em secret manager.
- CORS restrito.
- Logs, metricas e alertas.
- Backups e restore testado.
- Staging separado de production.
- Pipeline CI com build/test.

Criterio de aceite:

- Deploy reproduzivel.
- Ambiente sobe sem dados manuais.
- Rollback definido.
- Healthcheck e logs acessiveis.

## Fase 4: Cliente beta

Objetivo: validar uso real com poucos clientes controlados.

Entregas:

- Onboarding assistido.
- Termos e politica de privacidade.
- Registro de bugs e feedback.
- Observabilidade dos fluxos criticos.
- Suporte operacional.
- Relatorio semanal de uso.
- Ajustes de UX nos gargalos reais.

Criterio de aceite:

- Pelo menos uma empresa usa com dados reais.
- Pesquisa, plano, dashboard e relatorio sao usados sem suporte tecnico direto.
- Incidentes e feedbacks viram backlog priorizado.

## Fase 5: Lancamento comercial

Objetivo: liberar venda recorrente com operacao sustentavel.

Entregas:

- Pricing final.
- Pagina comercial ou canal de vendas.
- Checkout pronto.
- Documentacao de ajuda.
- SLA interno.
- Processo de cancelamento.
- Processo de suporte.
- Indicadores de negocio: ativacao, retencao, churn, receita, uso de IA.

Criterio de aceite:

- Cliente consegue contratar, acessar, usar e pagar.
- Operacao consegue suportar novos clientes sem mexer no banco manualmente.
- Produto tem trilha clara de suporte e evolucao.

## 6. Riscos principais

- Seed de demo rodando em producao e criando usuarios/senhas previsiveis.
- SQLite local sem estrategia de backup, concorrencia e migracao.
- Falta de testes multi-tenant cobrindo vazamento entre empresas.
- CORS aberto e segredos com fallback local.
- Fluxos mockados confundidos com produto real.
- Ausencia de recuperacao de senha/verificacao de email.
- Billing sem webhooks idempotentes pode gerar cobranca/estado incorreto.
- OpenAI depende de creditos, limites e tratamento de custo por empresa.
- PDF e IA podem virar pontos de abuso sem rate limit.
- React/Vite secundario pode gerar escopo duplicado se nao for congelado.

## 7. Ordem recomendada

1. Blindar demo versus producao: seed por flag, remover credenciais visiveis em producao, env obrigatorio.
2. Criar onboarding real: empresa + primeiro OWNER.
3. Auditar e testar isolamento multiempresa.
4. Consolidar Flutter como frontend de lancamento e desativar mocks fora do escopo.
5. Preparar banco/migracoes para producao.
6. Criar planos e limites sem pagamento ainda.
7. Integrar pagamento e webhooks.
8. Montar deploy/staging/production.
9. Rodar beta com clientes controlados.
10. Ajustar pricing, suporte e lancar comercialmente.

## 8. Proximos prompts recomendados

### Fase 1

```text
Implemente a Fase 1 do PLANO_LANCAMENTO_SAAS.md preservando o MVP de demo. Comece por separar seed demo via ENABLE_DEMO_SEED, remover credenciais de demo em production, configurar baseUrl por ambiente no Flutter e criar onboarding administrativo empresa + primeiro OWNER com testes.
```

### Isolamento multiempresa

```text
Audite o isolamento multi-tenant da API. Crie testes automatizados garantindo que OWNER e EMPLOYEE de uma empresa nao acessam pesquisas, tarefas, dashboards, relatorios ou PDFs de outra empresa. Corrija apenas vazamentos confirmados.
```

### Planos e limites

```text
Modele e implemente a primeira versao de planos e limites por empresa: schema, services, middleware de entitlement, endpoints administrativos e bloqueios no backend. Nao integre pagamento ainda.
```

### Pagamento

```text
Implemente assinatura recorrente usando o provedor escolhido. Crie checkout, tabelas de assinatura/faturas, webhooks idempotentes, status de inadimplencia e bloqueios por plano.
```

### Producao/deploy

```text
Prepare o projeto para producao: migracoes versionadas, banco gerenciado, build real da API, variaveis obrigatorias, CORS restrito, logs, healthcheck, README de deploy e pipeline de validacao.
```

### Cliente beta

```text
Prepare o app para um cliente beta real: checklist de onboarding, termos basicos, fluxo de suporte, verificacao de ambiente, monitoramento dos fluxos criticos e roteiro de validacao com dados reais.
```
