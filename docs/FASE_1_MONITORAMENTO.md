# Fase 1 — Monitoramento do Plano de Ação

## Estado inicial verificado

Checkout `/workspace/consultoria_app`, branch `work`, HEAD `e039fc6 Initial commit`, working tree limpo antes das alterações. `git log --oneline -10` continha somente esse commit. Não existiam `011_action_plan_monitoring_phase1.sql`, `fix_enums.js`, `fix_missing_props.js`, estruturas de evidências/histórico ou alterações parciais nos tipos/schema. A implementação partiu dessa base real, sem duplicar uma tentativa anterior.

## Implementação

- Planos: título/descrição, empresa, diagnóstico opcional, status, início/prazo, criador, timestamps e progresso calculado.
- Tarefas: plano, responsável, prioridade, início/prazo, status, progresso inteiro 0–100, observações, conclusão e timestamps.
- Status/prioridades em português conforme especificação. Atraso calculado por prazo vencido, excluindo tarefas concluídas/canceladas.
- Progresso geral: média das tarefas não canceladas; zero sem tarefas válidas. Concluir plano exige ao menos uma tarefa válida e todas concluídas. Concluir tarefa força 100%; reabrir redefine 0% e reativa plano concluído.
- Evidências: comentário e link HTTP/HTTPS, sem credenciais na URL. Sem upload de arquivos.
- Histórico append-only: criação, responsável, prazo, prioridade, status, progresso, evidência, conclusão, reabertura e demais edições, com ator, nome do ator na ocasião, horário e valores anterior/novo. Migração histórica é marcada explicitamente como `MIGRACAO`, sem inventar ator antigo.
- Dashboard por plano/empresa, filtros combináveis e visão operacional por funcionário. Sem ranking ou avaliação de desempenho.
- Geração por pesquisa preserva as regras existentes de pilares, prioridade por score, prazos e deduplicação, agora associada a um plano e com geração idempotente.

Datas sem horário usam início/fim do dia UTC. Conclusão é distinta de atingir 100% de progresso: funcionário pode enviar para validação, mas gestão conclui/reabre.

## Banco e migração

`saas/apps/api/migrations/011_action_plan_monitoring_phase1.sql` é aplicada automaticamente por `initDatabase`, por meio de `src/database/monitoring-migration.ts`, dentro de uma transação e registrada em `schema_migrations`. Não executar o SQL isoladamente: o runner controla a aplicação única. O schema bootstrap existente foi preservado para suportar o upgrade e é seguido pela mesma migração tanto em bancos novos quanto existentes.

Novas tabelas: `action_plans`, `action_plan_evidence`, `action_plan_history`, `schema_migrations`. `action_plan_tasks` é reconstruída preservando IDs/dados, convertendo enums e associando tarefas antigas a planos por empresa/diagnóstico. Chaves estrangeiras compostas protegem vínculo de plano, diagnóstico, responsável, tarefa, evidência e histórico por tenant. CHECKs protegem enums, progresso e coerência da conclusão. Dados antigos incompatíveis causam rollback, não correção silenciosa.

SQLite está com `foreign_keys=ON` e timeout para contenção. Mudança de tarefa/evidência e seu histórico são atômicos. O SQLite versionado não foi alterado: seu upgrade foi testado em uma cópia, além de bancos limpos e fixtures legadas. Tarefas antigas foram preservadas e o runner foi reaplicado sem duplicação.

## API

Todas as rotas abaixo exigem Bearer token. OWNER/EMPLOYEE/ADMIN vinculado usam a empresa do usuário relida do banco. ADMIN global sem empresa deve selecionar explicitamente `?companyId=<id>`. Body de criação pode indicar empresa, mas a autorização sempre valida esse contexto contra a identidade no banco.

| Método | Rota | Uso |
| --- | --- | --- |
| GET / POST | `/action-plan/plans` | Listar/criar planos |
| GET / PUT | `/action-plan/plans/:id` | Ler/editar plano e seu status |
| GET / POST | `/action-plan/tasks` | Listar/criar tarefas |
| GET / PUT | `/action-plan/tasks/:id` | Ler/editar tarefa |
| PATCH | `/action-plan/tasks/:id/status` | Iniciar, validar, concluir, cancelar, reabrir |
| GET / POST | `/action-plan/tasks/:id/evidence` | Listar/adicionar comentário ou link |
| GET | `/action-plan/tasks/:id/history` | Histórico imutável |
| GET | `/action-plan/dashboard` | Indicadores de execução |
| GET | `/action-plan/employees` | Resumo operacional por funcionário |
| GET | `/action-plan/members` | Responsáveis ativos disponíveis para gestão |
| POST | `/research/submissions/:id/generate-action-plan` | Geração por pesquisa, preservando regras anteriores |

Filtros de tarefas: `planId`, `submissionId`, `status`, `responsibleUserId`, `priority`, `overdue=true/false`, `completed=true/false`. Dashboard/visão por funcionário aceitam `planId` e o mesmo contexto de empresa. Progresso/títulos/datas/links/enums inválidos retornam 400; permissão negada 403; registros fora do escopo 404; inconsistência de ciclo de vida 409.

## Segurança

- Roles reais: ADMIN, OWNER, EMPLOYEE; sem novos roles.
- ADMIN global e OWNER gerenciam planos/tarefas no escopo autorizado. ADMIN vinculado não pode usar administração global para invadir outro tenant.
- EMPLOYEE vê apenas tarefas atribuídas e planos onde há tarefas suas; atualiza progresso/observações, inicia e envia para validação em plano ATIVO. Não atribui, muda prazo/prioridade, conclui nem reabre. Plano/tarefa cancelados ou concluídos bloqueiam execução pelo funcionário.
- A identidade é relida do banco na autenticação e no serviço; claims antigos e dados de ator/tenant do body não concedem acesso. Responsável precisa estar ativo e pertencer à mesma empresa.
- Evidências e histórico são acessados somente após autorização da tarefa. Não há endpoints para editar/apagar histórico. Tenant B tentando ler/alterar plano, tarefa, evidência ou histórico do tenant A é testado explicitamente, inclusive B-ADMIN.
- Cadastro privilegiado público foi fechado; criação pelo endpoint de registro requer ADMIN global autenticado. O middleware do módulo de empresas foi limitado às suas próprias rotas para não bloquear OWNER/EMPLOYEE nos demais módulos.
- O segredo JWT público fixo foi removido. Sem JWT_SECRET, desenvolvimento usa chave aleatória por processo (sessões expiram ao reiniciar). Produção exige JWT_SECRET configurado com pelo menos 32 caracteres. Valores de segredos não são versionados.

## Frontend

React (`saas/apps/web`) foi selecionado para este fluxo: `saas/README.md` o identifica como nova base SaaS. No Flutter, `ActionPlanPage` não é referenciada pelo roteador ativo; o controller é demonstrativo com `_seed` e a rota `/tasks` mostra apenas `ModulePage`. Portanto não foi duplicado um fluxo demonstrativo/inativo de plano de ação. O app Flutter não foi alterado nem validado nesta fase.

A nova seção inicial “Plano de ação” usa API real: login, seleção de empresa para ADMIN global, planos, dashboard, filtros, cards de tarefas, criação/edição, ações conforme permissão, evidências/histórico e visão por funcionário. O módulo novo não usa mocks; as telas demonstrativas anteriores de diagnóstico/dashboard permanecem fora do escopo desta fase.

O Vite encaminha `/api` para a API, por padrão em `127.0.0.1:3333` (substituível por `API_TARGET`). Token em sessionStorage; não há credenciais codificadas na tela. Formulários ficam no fluxo da página, sem modais que escapem da tela. Rascunhos da mesma tarefa sobrevivem a inclusão de evidência, alteração de status e falha transitória de atualização; erro de autorização remove a visualização.

## Executar e verificar localmente

Toolchain: Node 22.23.3 (`saas/.nvmrc`). O checkout inicial versiona node_modules e builds; por isso a instalação, banco mutável e validações foram executados na cópia de runtime em `/workspace/consultoria-runtime`, sem gerar diffs desses artefatos no checkout.

Para atualizar essa cópia a partir do checkout, parar somente serviços próprios antes de reinstalar:

```bash
mkdir -p /workspace/consultoria-runtime/saas
cd /workspace/consultoria_app/saas
set -o pipefail
tar --exclude=node_modules --exclude=dist --exclude='*.tsbuildinfo' -cf - . \
  | tar -C /workspace/consultoria-runtime/saas -xf -
export PATH=/workspace/consultoria-runtime/node-v22.23.3-linux-x64/bin:$PATH
export npm_config_cache=/workspace/consultoria-runtime/npm-cache
export npm_config_devdir=/workspace/consultoria-runtime/node-gyp
cd /workspace/consultoria-runtime/saas
npm ci --no-audit --no-fund
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

O SQLite copiado de `apps/api/data` é fixture para o teste de migração. Para iniciar a aplicação, usar um banco mutável externo, em shells separados:

```bash
# Mesmo PATH Node 22 acima; diretório /workspace/consultoria-runtime/saas
PORT=3333 DATABASE_PATH=/workspace/consultoria-runtime/data/consultoria.sqlite npm run dev:api
# Outro shell no mesmo diretório
npm --workspace @consultoria/web run dev -- --host 0.0.0.0 --strictPort
```

Os testes E2E iniciam seus próprios serviços nas portas 3433/5174 e usam SQLite temporário separado. Chromium do sistema é detectado automaticamente; alternativamente configurar `CHROMIUM_PATH` ou instalar o Chromium do Playwright. Não é necessário acessar OpenAI para esta fase. Não usar `dev:all` da base anterior: ele contém `&&` entre processos persistentes.

## Evidência de validação

- 28 testes Node/HTTP/SQLite aprovados, zero falhas/skips. Incluem progressos inválidos, permissão real, manipulação de claims/IDs, tenants A/B, foreign keys, diagnóstico de outro tenant, eventos e rollback, ciclo de conclusão/reabertura, inicialização repetida, migração da fixture versionada, geração por pesquisa e segredo JWT.
- 7 testes Playwright aprovados com Chromium real e API/SQLite reais. Incluem fluxo gestão → funcionário → validação → conclusão → reabertura, administrador global e rascunhos preservados (com injeção de uma falha de rede transitória para testar recuperação).
- Responsividade validada em 1440, 1024, 768 e 390px, incluindo formulários de plano/tarefa, detalhe, link longo, overflow e posição dos botões; screenshots geradas em `test-results/monitoring-<largura>.png` no runtime. A captura mobile também foi inspecionada visualmente.
- `npm run lint`, `npm run typecheck`, `npm run build`: aprovados.
- Backend compilado iniciado com `npm --workspace @consultoria/api start`: health, login, migração e criação de plano verificados por HTTP.
- `git diff --check`: aprovado. Sem alterações nos node_modules, builds ou SQLite versionados.
- Revisão independente apontou regressão na geração por pesquisa e descarte de rascunhos; ambos reproduzidos com testes e corrigidos.

Sem pendências funcionais conhecidas da Fase 1. Sem commit, push, PR ou deploy. A validação não inclui Flutter ou os módulos explicitamente excluídos da solicitação.

## Arquivos alterados/adicionados
- `.gitignore`
- `docs/FASE_1_MONITORAMENTO.md`
- `docs/superpowers/plans/2026-10-17-action-plan-phase1.md`
- `docs/superpowers/specs/2026-10-17-action-plan-phase1.md`
- `saas/.nvmrc`
- `saas/apps/api/migrations/011_action_plan_monitoring_phase1.sql`
- `saas/apps/api/package.json`
- `saas/apps/api/src/config/env.ts`
- `saas/apps/api/src/database/init.ts`
- `saas/apps/api/src/database/monitoring-migration.ts`
- `saas/apps/api/src/db/database.ts`
- `saas/apps/api/src/db/schema.ts`
- `saas/apps/api/src/modules/action-plan/action-plan.controller.ts`
- `saas/apps/api/src/modules/action-plan/action-plan.generation.ts`
- `saas/apps/api/src/modules/action-plan/action-plan.repository.ts`
- `saas/apps/api/src/modules/action-plan/action-plan.router.ts`
- `saas/apps/api/src/modules/action-plan/action-plan.service.ts`
- `saas/apps/api/src/modules/action-plan/action-plan.types.ts`
- `saas/apps/api/src/modules/auth/auth.middleware.ts`
- `saas/apps/api/src/modules/auth/auth.router.ts`
- `saas/apps/api/src/modules/companies/companies.router.ts`
- `saas/apps/api/test/action-plan.test.ts`
- `saas/apps/api/test/jwt-config.test.ts`
- `saas/apps/web/e2e/monitoring.spec.ts`
- `saas/apps/web/package.json`
- `saas/apps/web/src/app/App.tsx`
- `saas/apps/web/src/app/navigation.ts`
- `saas/apps/web/src/features/action-plan/MonitoringPage.tsx`
- `saas/apps/web/src/features/action-plan/PlanForms.tsx`
- `saas/apps/web/src/features/action-plan/TaskDetail.tsx`
- `saas/apps/web/src/features/action-plan/api.ts`
- `saas/apps/web/src/features/action-plan/monitoring.css`
- `saas/apps/web/tsconfig.json`
- `saas/apps/web/vite.config.ts`
- `saas/eslint.config.mjs`
- `saas/package-lock.json`
- `saas/package.json`
- `saas/playwright.config.ts`
