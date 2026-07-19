# Aprendizados do FLUXO para a Consultoria SaaS

Data: 2026-07-12
Escopo: comparar boas decisoes do projeto App Carne / FLUXO com o estado atual do app de Consultoria SaaS, sem copiar codigo cegamente e sem alterar a arquitetura atual.

## 1. Premissa tecnica

O app de Consultoria SaaS deve continuar com a arquitetura atual:

- Flutter como frontend principal;
- API Node/TypeScript como camada central de negocio, seguranca, permissoes, planos e IA;
- banco atual SQLite em ambiente local/demo, com evolucao planejada para Postgres;
- isolamento por `companyId`;
- perfis `ADMIN`, `OWNER` e `EMPLOYEE`.

Nao e recomendado substituir a arquitetura por acesso direto Flutter -> Supabase sem uma analise separada. O principal valor atual esta na API Node como fronteira unica de regras de negocio.

## 2. Ideias do FLUXO que ja foram aplicadas

### Flutter como frontend principal

Status: aplicado.

O Flutter ja e o frontend principal do produto. A web React/Vite antiga foi tratada como secundaria/prototipo e nao deve ser considerada produto comercial sem revisao.

### Organizacao/empresa como centro dos dados

Status: aplicado em grande parte.

O app ja usa empresa como unidade principal:

- empresas sao criadas pelo ADMIN;
- usuarios pertencem a empresas;
- pesquisas, tarefas, dashboards, relatorios e PDFs sao filtrados por empresa;
- o E2E multiempresa valida isolamento entre Empresa A e Empresa B.

### Tela de plano atual

Status: aplicado.

OWNER possui tela `/plan` para consultar plano atual, assinatura interna e uso dos limites.

### Limites por plano

Status: aplicado na primeira versao.

Ja existem:

- `plans`;
- `company_subscriptions`;
- `usage_counters`;
- plano `Starter`;
- plano `Growth`;
- bloqueios no backend para usuarios, pesquisas, PDFs, tarefas e IA;
- erro `402 PLAN_LIMIT_REACHED`.

### Isolamento por usuario/empresa

Status: aplicado e testado.

O E2E valida que:

- OWNER A nao acessa dados da Empresa B;
- EMPLOYEE A nao acessa dados da Empresa B;
- ADMIN consegue consultar globalmente quando permitido;
- ADMIN nao responde pesquisa.

### Documentacao para rodar local e producao

Status: parcialmente aplicado.

Ja existem:

- `PLANO_LANCAMENTO_SAAS.md`;
- `CHECKLIST_LANCAMENTO.md`;
- `docs/AMBIENTES_SAAS.md`;
- `.env.example` na API;
- orientacao para Flutter com `--dart-define=API_BASE_URL`.

Ainda falta documentacao de deploy real, Postgres, backup, CI/CD e runbook.

### Preparacao para SaaS comercial

Status: aplicado para beta manual.

O produto ja permite venda beta manual:

- ADMIN cria empresa e OWNER;
- empresa entra em Starter automaticamente;
- ADMIN pode trocar plano manualmente entre Starter e Growth;
- pagamento ainda e operacional/manual.

## 3. Ideias do FLUXO que ainda vale trazer

## Aplicar agora

### 1. Configuracoes da empresa

Motivo:

O FLUXO tende a tratar a organizacao como uma entidade configuravel. A Consultoria ainda tem empresa como cadastro simples.

Aplicar no app de Consultoria:

- criar tela "Configuracoes da empresa" para OWNER;
- permitir editar dados basicos da propria empresa, dentro de regras seguras;
- campos sugeridos:
  - nome fantasia;
  - setor;
  - porte;
  - telefone;
  - responsavel;
  - logo opcional em fase futura;
  - preferencias de diagnostico.

Cuidados:

- OWNER so pode editar a propria empresa;
- ADMIN continua com visao global;
- nao permitir OWNER alterar plano, status financeiro ou dados de outra empresa.

### 2. Experiencia de sessao/login mais simples

Motivo:

O login ainda carrega marcas de demo e depende de fluxos administrativos. Para beta comercial, a experiencia precisa parecer produto real.

Aplicar:

- revisar textos da tela de login;
- esconder definitivamente blocos de demo em staging/production;
- melhorar estados de erro:
  - credenciais invalidas;
  - usuario inativo;
  - empresa inativa;
  - sessao expirada;
- criar fluxo de "esqueci minha senha" como pendencia planejada ou primeira versao operacional.

### 3. Tela administrativa de plano mais informativa

Motivo:

A troca manual de plano ja existe, mas ainda e simples.

Aplicar:

- mostrar na tela ADMIN:
  - plano atual;
  - uso atual de cada limite;
  - data da ultima alteracao;
  - aviso "pagamento manual beta";
- destacar empresas proximas do limite;
- filtro por plano: Starter/Growth.

### 4. Historico simples de alteracao de plano

Motivo:

O FLUXO valoriza rastreabilidade comercial. Hoje a Consultoria registra apenas `company_subscriptions.updated_at`.

Aplicar:

- criar tabela `company_subscription_events` ou `subscription_audit_logs`;
- registrar:
  - empresa;
  - plano anterior;
  - novo plano;
  - usuario ADMIN que alterou;
  - data/hora;
  - motivo opcional;
  - origem: `MANUAL_ADMIN`;
- expor no ADMIN como historico simples.

### 5. Checklist operacional de cliente beta

Motivo:

Para vender manualmente antes do pagamento automatizado, o processo precisa ser repetivel.

Aplicar:

- criar `docs/ONBOARDING_CLIENTE_BETA.md`;
- incluir:
  - criar empresa;
  - criar OWNER;
  - escolher plano;
  - registrar pagamento manual fora do sistema;
  - validar login;
  - executar primeira pesquisa;
  - gerar primeiro PDF;
  - conferir limites.

## Aplicar depois

### 1. Pagamento recorrente

Nao aplicar agora porque o objetivo atual e comercial manual beta.

Aplicar depois:

- checkout;
- gateway;
- webhooks idempotentes;
- faturas;
- status `TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELED`;
- bloqueio gradual por inadimplencia.

### 2. Self-service signup

Nao aplicar agora se o processo comercial ainda e consultivo/manual.

Aplicar depois:

- cadastro publico de empresa;
- criacao do primeiro OWNER sem ADMIN;
- email de verificacao;
- trial automatico;
- protecao contra abuso.

### 3. Convites de usuarios

Hoje ADMIN cria usuarios. Para SaaS real, OWNER provavelmente deve convidar usuarios da propria empresa.

Aplicar depois:

- convites por email;
- token de convite;
- expiracao;
- aceite com criacao de senha;
- limite de usuarios por plano antes do convite.

### 4. Preferencias avancadas por empresa

Aplicar depois:

- branding;
- templates de relatorio;
- parametros de diagnostico;
- idioma;
- regras de notificacao;
- modulos contratados.

### 5. Observabilidade e metricas SaaS

Aplicar depois, junto da Fase 3/Producao:

- logs estruturados;
- eventos de uso por empresa;
- metricas de ativacao;
- custo de IA por empresa;
- alertas de erro;
- auditoria de acoes administrativas.

## Nao aplicar diretamente

### 1. Flutter acessando Supabase direto para regras centrais

Nao copiar se o FLUXO usa acesso mais direto do Flutter ao Supabase.

Motivo:

No app de Consultoria, a API Node ja concentra:

- RBAC;
- isolamento multiempresa;
- limites por plano;
- OpenAI;
- geracao de PDF;
- regras de pesquisa;
- dashboards;
- alteracao manual de plano.

Mover regras para Flutter/Supabase direto criaria duplicidade e risco de bypass.

### 2. Regras de plano apenas no frontend

Nao aplicar.

O app ja fez corretamente o bloqueio no backend. O Flutter pode esconder botoes e melhorar mensagens, mas nao deve ser fonte de verdade para limites.

### 3. Copiar tabelas de assinatura sem adaptar ao dominio

Nao aplicar literalmente.

O dominio da Consultoria tem uso de IA, pesquisas, relatorios e tarefas. Os limites precisam refletir esse produto, nao apenas um modelo generico de assinatura.

### 4. Trocar JWT/API Node por Auth externo sem plano de migracao

Nao aplicar agora.

Pode ser avaliado futuramente, mas exigiria:

- migracao de usuarios;
- compatibilidade com roles;
- claims por empresa;
- revisao de middleware;
- estrategia de sessao no Flutter;
- testes multiempresa completos.

## 4. Riscos de misturar Supabase/Flutter direto com API Node

### Risco 1: duas fontes de verdade

Se Flutter escrever diretamente no Supabase e a API Node tambem escrever no banco, regras podem divergir.

Exemplo:

- API bloqueia PDF por limite;
- Flutter direto no banco cria registro ou altera uso sem passar pela API;
- limite deixa de ser confiavel.

### Risco 2: bypass de permissoes

O isolamento por empresa hoje esta na API. Acesso direto exige Row Level Security muito bem desenhada. Sem isso, um erro de query pode vazar dados entre empresas.

### Risco 3: duplicidade de autenticacao

JWT proprio + Supabase Auth ao mesmo tempo pode gerar inconsistencias:

- usuario existe em um auth e nao no outro;
- role divergente;
- `companyId` divergente;
- sessao valida no Flutter, mas invalida na API.

### Risco 4: regras comerciais espalhadas

Planos, limites e assinatura devem ficar em uma camada unica. Se parte ficar no Supabase, parte no Flutter e parte na API, manutencao e auditoria ficam mais dificeis.

### Risco 5: dificultar E2E e suporte

O E2E atual valida a API como contrato. Se parte dos fluxos contornar a API, os testes deixam de cobrir o produto real.

## 5. Melhor aproveitamento do FLUXO sem trocar a arquitetura

O caminho recomendado e reaproveitar conceitos, nao estrutura interna:

- manter Flutter como app principal;
- manter API Node como boundary de seguranca;
- migrar banco para Postgres quando entrar em producao;
- se usar Supabase, considerar inicialmente apenas como Postgres gerenciado;
- usar RLS apenas como camada adicional de seguranca, nao como substituto imediato da API;
- manter todos os fluxos sensiveis passando pela API.

## 6. Proximos passos recomendados

### Prioridade 1

1. Criar tela de configuracoes da empresa para OWNER.
2. Criar historico de alteracao manual de plano.
3. Criar checklist de onboarding de cliente beta.
4. Melhorar login/sessao para experiencia comercial real.

### Prioridade 2

1. Planejar Postgres/migracoes versionadas.
2. Criar logs estruturados e auditoria ADMIN.
3. Criar CI com build API, E2E, `flutter analyze` e `flutter test`.
4. Criar documentacao de deploy staging/production.

### Prioridade 3

1. Escolher provedor de pagamento.
2. Modelar trial/inadimplencia/cancelamento.
3. Implementar checkout e webhooks.
4. Criar upgrade self-service.

## 7. Prompts futuros recomendados

### Configuracoes da empresa

> Implemente uma tela de Configuracoes da Empresa para OWNER no Flutter e endpoints na API Node para consultar/editar apenas dados permitidos da propria empresa. ADMIN deve manter gestao global. Nao permitir OWNER alterar plano, status financeiro ou outra empresa. Criar testes E2E de isolamento.

### Historico de alteracao de plano

> Crie historico/auditoria de troca manual de plano: tabela `company_subscription_events`, registro de plano anterior/novo, ADMIN responsavel, data, motivo opcional e origem MANUAL_ADMIN. Exibir historico na tela ADMIN da empresa e atualizar E2E.

### Onboarding beta

> Crie `docs/ONBOARDING_CLIENTE_BETA.md` com checklist operacional para vender manualmente o SaaS: criar empresa, OWNER, usuarios, escolher plano, registrar pagamento manual fora do sistema, validar login, executar primeira pesquisa, gerar plano, dashboard e PDF.

### Login e sessao comercial

> Revise a experiencia de login/sessao do Flutter para beta comercial: textos sem demo em staging/production, mensagens amigaveis para credenciais invalidas, usuario inativo, empresa inativa e sessao expirada. Nao alterar a autenticacao JWT atual sem necessidade.

### Postgres e producao

> Planeje e implemente a Fase 3 de producao: migracao de SQLite para Postgres, migracoes versionadas, variaveis `DATABASE_URL`, Docker/deploy, healthcheck, logs estruturados, backup, restore e documentacao de staging/production, preservando o MVP atual.

### Pagamento futuro

> Modele a etapa de pagamento sem implementar ainda: comparar Stripe, Asaas, Mercado Pago e Pagar.me para assinatura recorrente no Brasil, definir tabelas de assinatura/faturas/webhooks, estados de trial/inadimplencia/cancelamento e impacto nos bloqueios por plano.

## 8. Conclusao

Os principais aprendizados do FLUXO ja foram incorporados na direcao certa: Flutter principal, empresa como centro, isolamento multiempresa, plano atual, limites por plano e preparacao comercial manual.

O que falta trazer nao e uma nova stack, mas maturidade operacional:

- configuracoes da empresa;
- auditoria;
- onboarding beta;
- producao/Postgres;
- login mais polido;
- pagamento recorrente em fase posterior.

A recomendacao tecnica e manter a arquitetura Flutter + API Node/TypeScript, aproveitando ideias do FLUXO como padroes de produto e operacao, nao como copia direta de implementacao.
