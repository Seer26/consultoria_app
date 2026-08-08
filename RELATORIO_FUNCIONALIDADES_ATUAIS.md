# Relatório de Funcionalidades Atuais

Projeto: Plataforma de Consultoria Empresarial

Branch auditada: `codex/release-baseline`

Checkpoint: `4b93220edf79b6d50037003eec088e033384d9af`

Data do levantamento: 08/08/2026

Escopo: análise estática do Flutter, API Node/TypeScript, migrations, testes e documentação. Nenhum banco foi aberto ou alterado.

## 1. Resumo executivo

O produto possui um núcleo funcional integrado e coerente para operação assistida com PostgreSQL: autenticação, RBAC para `ADMIN`, `OWNER` e `EMPLOYEE`, gestão administrativa de empresas e usuários, pesquisa empresarial, cálculo de resultado, plano de ação, dashboards por perfil, relatórios/PDF, configurações da empresa e planos Starter/Growth com limites. Os fluxos centrais usam API real; não dependem de mocks.

O frontend de lançamento é o Flutter. O app React/Vite em `saas/apps/web` é um protótipo secundário e não deve ser contado como produto entregue. No Flutter, rotas antigas de clientes, formulários, chat e diagnóstico legado são redirecionadas para “recurso indisponível”, embora o código visual/mock continue no repositório.

O levantamento encontrou **59 funcionalidades ou capacidades**, classificadas assim:

| Classe | Significado | Quantidade |
| --- | --- | ---: |
| A | Funcional e aparentemente completa | 31 |
| B | Funcional, mas precisa de melhoria | 8 |
| C | Implementada parcialmente | 2 |
| D | Somente interface/mock ou legado desativado | 5 |
| E | Backend existe, mas o Flutter ativo não utiliza | 4 |
| F | Flutter existe, mas o backend não suporta completamente | 1 |
| G | Ausente | 8 |
| **Total** |  | **59** |

Não foi identificado um defeito confirmado que impeça o núcleo técnico de funcionar. Os bloqueios imediatos para primeiro uso real são operacionais: validar o fluxo completo com uma empresa autorizada, configurar entrega real de e-mail para recuperação de senha e decidir/implementar a aceitação jurídica no Flutter. IA continua dependente de chave, crédito e disponibilidade externa.

## 2. Critério de classificação

- **A** — implementação integrada entre Flutter, API e persistência, com evidência de testes ou fluxos consolidados.
- **B** — funciona, mas possui dependência externa, lacuna de UX, semântica simplificada ou política de permissão a revisar.
- **C** — parte relevante existe, porém o fluxo não está fechado ponta a ponta.
- **D** — tela/protótipo/mock presente sem participação no produto roteado atual.
- **E** — capacidade de backend sem consumidor correspondente no Flutter ativo.
- **F** — interface ou data source Flutter sem suporte completo na API atual.
- **G** — capacidade não implementada. Nem todo item G é obrigatório para o MVP; alguns são deliberadamente fora do escopo.

## 3. Funcionalidades por perfil

### 3.1 ADMIN

O ADMIN possui login, dashboard global, gestão de empresas e usuários, onboarding transacional de empresa com primeiro OWNER, controle de status, consulta e troca manual de plano, histórico de plano, acompanhamento global de pesquisas e relatórios executivos/PDF. O bootstrap do primeiro ADMIN existe como comando operacional separado e não como função de interface.

Não existe uma área administrativa geral de configurações, consulta de auditoria consolidada ou gestão de notificações. Métricas internas existem na API, mas ficam desabilitadas por padrão e não possuem tela. A suspensão de empresa é representada por `INACTIVE`; não existem estados comerciais distintos como `SUSPENDED`, `PAST_DUE` ou `CANCELED`.

### 3.2 OWNER

O OWNER possui dashboard da própria empresa, edição dos dados empresariais, pesquisa empresarial com retomada, perguntas assistidas por IA, conclusão e score, histórico, geração de plano de ação, tarefas, relatórios/PDF e consulta do plano/limites. O isolamento por `company_id` é aplicado nos services/repositories e coberto por E2E.

O OWNER não administra a própria equipe pela interface; somente o ADMIN cria e mantém OWNERs/EMPLOYEEs. Não há onboarding guiado dentro do app após o primeiro login, notificações funcionais, troca autônoma de plano ou pagamento. A troca comercial permanece manual pelo ADMIN.

### 3.3 EMPLOYEE

O EMPLOYEE possui dashboard operacional, pesquisa empresarial, histórico próprio, detalhes, tarefas e filtros de prazo. O backend restringe pesquisas e relatórios ao usuário/empresa e impede acesso cruzado entre empresas.

A tela de relatórios não é liberada para EMPLOYEE, embora a API seja capaz de retornar relatórios das próprias pesquisas. Na área de tarefas, o backend isola por empresa, mas permite ao EMPLOYEE criar/editar tarefas da empresa; essa política deve ser confirmada, pois pode ser mais ampla que “atualizar apenas tarefas atribuídas”. O resumo empresarial exibido no dashboard é deliberadamente reduzido.

## 4. Tabela completa de funcionalidades

Abreviações de persistência: `companies`, `users`, `diagnosis_submissions` (`submissions`), `diagnosis_answers` (`answers`), `action_plan_tasks` (`tasks`), `plans`, `company_subscriptions` (`subscriptions`), `company_subscription_events` (`plan_events`), `usage_counters` (`usage`), `password_reset_tokens` (`reset_tokens`), `legal_acceptances` (`legal`) e `audit_events` (`audit`).

| ID | Funcionalidade | Perfil | Frontend | API/backend | Persistência/repository | Classe | O que falta / impacto | Prioridade |
| --- | --- | --- | --- | --- | --- | :---: | --- | :---: |
| F01 | Restauração de sessão no splash | Todos | `AuthSplashPage`, `TokenStorage` | JWT local; sem refresh endpoint | `users`; `AuthRepository` | B | Sessão depende do token salvo; não há refresh/revogação central. Impacto: novo login após expiração. | P2 |
| F02 | Login | Todos | `/login`, `AuthService` | `POST /auth/login` | `users`, `companies`; `AuthRepository` | A | Fluxo real, mensagens sanitizadas, bloqueio de usuário/empresa inativa e rate limit. | P0 |
| F03 | Logout local | Todos | `AppShell`, serviço legado de logout | Sem endpoint | armazenamento seguro local | A | Remove sessão local; logout server-side/revogação não existe. | P2 |
| F04 | Solicitar recuperação de senha | Todos | `/forgot-password` | `POST /auth/password/forgot` | `reset_tokens`; `AuthRepository`, `EmailService` | B | Código completo, mas utilidade real depende de provedor/URL de e-mail configurados. | P0 |
| F05 | Redefinir senha por token | Todos | `/reset-password` | `POST /auth/password/reset` | `users`, `reset_tokens` | A | Token de uso único, expiração e política de senha implementados. | P0 |
| F06 | RBAC e isolamento de rota | Todos | `RoleGuard`, `RbacGuard`, `GoRouter` | `authenticate`, `authorize`, escopo nos services | todas as tabelas multiempresa | A | Defesa no Flutter e backend; E2E cobre isolamento central. | P0 |
| F07 | Cadastro público | Público | Sem tela | `POST /auth/register` responde `PUBLIC_REGISTRATION_DISABLED` | `users` | G | Ausência intencional para beta assistido. | P3 |
| F08 | Alterar senha estando logado | Todos | Sem tela | Sem endpoint específico | `users` | G | Usuário depende do fluxo “esqueci minha senha” ou alteração administrativa. | P1 |
| F09 | Aceite de termos/políticas | Todos | Sem consumidor | `GET /legal/documents/pending`, `GET /legal/acceptances/current`, `POST /legal/acceptances` | `legal`; `LegalRepository` | E | Backend pronto, mas primeiro login não apresenta nem registra aceite no Flutter. | P0 |
| F10 | Health/readiness | Operação | Sem tela | `GET /health`, `GET /ready` | `dataSource`, migrations | E | Correto como capacidade operacional; não precisa de UI de usuário. | P0 |
| F11 | Métricas internas | ADMIN/operação | Sem tela | `GET /operations/metrics` | métricas em memória | E | Desabilitada por padrão e sem observabilidade externa/tela. | P2 |
| F12 | Notificações | Todos | Dependência e feature flag declaradas, sem uso | Sem módulo/endpoint | nenhuma | G | Sem lembretes de tarefa, push ou central de notificações. | P2 |
| F13 | Dashboard global | ADMIN | `/admin`, `AdminDashboard` | `GET /dashboard/admin` | companies/users/submissions/tasks; `DashboardRepository` | A | Métricas, menores scores, pesquisas e tarefas reais. | P0 |
| F14 | Lista e detalhe de empresas | ADMIN | `/companies`, painel/detalhe na mesma tela | `GET /companies`, `GET /companies/:id` | `companies`; `CompaniesRepository` | B | Tela usa dados da lista; endpoint de detalhe individual não é consumido diretamente. | P1 |
| F15 | Criar empresa | ADMIN | diálogo em `CompaniesManagementPage` | `POST /companies` | companies/subscriptions; `CompaniesRepository` | A | Cria assinatura Starter padrão. | P0 |
| F16 | Onboarding empresa + primeiro OWNER | ADMIN | botão/diálogo “Onboarding” | `POST /companies/onboarding` | companies/users/subscriptions/audit | A | Transacional e testado; falta apenas validação assistida com dados autorizados. | P0 |
| F17 | Editar empresa | ADMIN | painel de empresa | `PUT /companies/:id` | `companies` | A | Nome/slug integrados. | P1 |
| F18 | Ativar/suspender empresa | ADMIN | ação de status | `PATCH /companies/:id/status` | `companies` | B | Implementa `ACTIVE/INACTIVE`; “suspensão” não é um estado distinto e não representa inadimplência. | P1 |
| F19 | Listar usuários por empresa | ADMIN | `/users` e aba na empresa | `GET /companies/:companyId/users` | `users` | A | Dados reais e sanitizados. | P0 |
| F20 | Criar OWNER/EMPLOYEE | ADMIN | diálogo de usuário | `POST /companies/:companyId/users` | `users`, usage/audit | A | Política de senha e limite de assentos aplicados; ADMIN não pode ser criado aqui. | P0 |
| F21 | Editar usuário e definir nova senha | ADMIN | diálogo de edição | `PUT /users/:id` | `users` | A | Nome, e-mail, role e senha opcional. | P1 |
| F22 | Ativar/inativar usuário | ADMIN | ação de status | `PATCH /users/:id/status` | `users` | A | Bloqueio validado no middleware de autenticação. | P1 |
| F23 | Listar planos comerciais | ADMIN | seletor de plano | `GET /billing/admin/plans` | `plans`; `EntitlementsRepository` | A | Starter/Growth reais. | P1 |
| F24 | Consultar plano/uso de empresa | ADMIN | detalhe da empresa | `GET /billing/admin/companies/:id/current-plan` | plans/subscriptions/usage | A | Exibe assinatura e limites. | P1 |
| F25 | Trocar plano manualmente | ADMIN | confirmação e motivo | `PUT /billing/admin/companies/:id/plan` | subscriptions/plan_events/audit | A | Fluxo beta manual; não equivale a cobrança. | P1 |
| F26 | Histórico de mudanças de plano | ADMIN | histórico no detalhe | `GET /billing/admin/companies/:id/plan-events` | `plan_events` | A | Ator, origem, motivo e data disponíveis. | P1 |
| F27 | Acompanhar pesquisas globalmente, sem responder | ADMIN | `/research` e detalhes | endpoints `/research/submissions*` | submissions/answers; `ResearchRepository` | A | `ADMIN_RESEARCH_READ_ONLY` preserva consulta sem resposta. | P1 |
| F28 | Relatórios administrativos e PDF | ADMIN | `/reports`, `/reports/:id` | endpoints `/reports/research*` | submissions/answers/tasks/usage | A | Visão global, relatório executivo e PDF com rate limit. | P1 |
| F29 | Auditoria administrativa consolidada | ADMIN | Sem tela | gravações em log e `audit_events`; sem API geral de consulta | `audit`; `audit()` | C | Eventos existem, mas não há consulta administrativa unificada. | P2 |
| F30 | Configurações administrativas gerais | ADMIN | Sem tela | Sem módulo | nenhuma | G | Sem parâmetros globais, integrações ou preferências operacionais no app. | P3 |
| F31 | Dashboard da empresa | OWNER | `/owner`, `OwnerDashboard` | `GET /dashboard/company` | company/submissions/tasks | A | KPIs, pilares, gargalos, oportunidades e tarefas reais. | P0 |
| F32 | Configurações da própria empresa | OWNER | `/company-settings` | `GET/PUT /company/settings` | `companies` | A | Nome, setor, porte, telefone, responsável e observações. | P1 |
| F33 | Iniciar e retomar pesquisa | OWNER | `/research`, `ResearchStartPage`, `ChatDiagnosisPage` | `POST/GET /research/submissions*` | submissions/answers | A | Banco e API reais; pesquisas em andamento podem ser retomadas. | P0 |
| F34 | Pergunta dinâmica por IA | OWNER | chat de pesquisa | `POST /ai/next-question` | usage/audit + OpenAI | B | Possui fallback de erro, quotas e limites, mas depende de serviço externo. | P1 |
| F35 | Concluir pesquisa, score e insights | OWNER | chat/detalhes | `POST /research/submissions/:id/complete` | submissions/answers | A | Regras determinísticas calculam score, pilares, resumo e recomendações. | P0 |
| F36 | Histórico e detalhe de pesquisas | OWNER | `/research`, `/research/:id` | `GET /research/submissions`, `GET /research/submissions/:id` | submissions/answers | A | Escopo da própria empresa. | P1 |
| F37 | Gerar plano de ação da pesquisa | OWNER | detalhe da pesquisa | `POST /research/submissions/:id/generate-action-plan` | submissions/tasks | A | Requer pesquisa concluída e gera tarefas persistidas. | P0 |
| F38 | Listar, filtrar e abrir tarefas | OWNER | `/tasks` | `GET /action-plan/tasks`, `GET /action-plan/tasks/:id` | tasks; `ActionPlanRepository` | B | Lista/filtros são usados; a UI não consome o endpoint individual de detalhe. | P1 |
| F39 | Criar, editar, atribuir e mudar status de tarefa | OWNER | `/tasks` | POST/PUT/PATCH `/action-plan/tasks*`, assignees | tasks/users/usage | A | Prioridade, prazo, pilar, responsável, status e limites integrados. | P0 |
| F40 | Relatórios e PDF da empresa | OWNER | `/reports`, detalhes | endpoints `/reports/research*` | submissions/answers/tasks/usage | A | Relatório executivo e exportação multiplataforma. | P0 |
| F41 | Plano atual e limites | OWNER | `/plan` | `GET /billing/current-plan` | plans/subscriptions/usage | A | Uso de usuários, pesquisas, PDFs, tarefas e IA. | P1 |
| F42 | Gerenciar equipe da própria empresa | OWNER | Sem tela | Endpoints de usuários são ADMIN-only | `users` | G | OWNER depende do ADMIN para adicionar, editar ou inativar equipe. | P1 |
| F43 | Onboarding guiado após primeiro login | OWNER | Sem wizard | Backend cria empresa/OWNER, docs externas existem | companies/users | C | Não há checklist dentro do produto para completar empresa, equipe e primeira pesquisa. | P1 |
| F44 | Dashboard operacional | EMPLOYEE | `/employee`, `EmployeeDashboard` | `GET /dashboard/employee` | submissions/tasks/company | A | Pesquisas próprias, tarefas atribuídas, atrasos e resumo limitado. | P0 |
| F45 | Responder e concluir pesquisa | EMPLOYEE | `/research`, chat | endpoints `/research/submissions*` e IA | submissions/answers/usage | A | Mesmo fluxo funcional do OWNER, no escopo da própria empresa/usuário. | P0 |
| F46 | Histórico e detalhe próprios | EMPLOYEE | `/research`, `/research/:id` | `GET /research/submissions*` | submissions/answers | A | Backend restringe ao respondente. | P1 |
| F47 | Tarefas atribuídas e filtros | EMPLOYEE | `/tasks` | `GET /action-plan/tasks` | tasks | A | Filtros “minhas”, atrasadas, próximas e concluídas. | P0 |
| F48 | Criar/editar tarefas como EMPLOYEE | EMPLOYEE | mesma tela de tarefas | mutações `/action-plan/tasks*` | tasks | B | Isolado por empresa, porém a política permite alterações amplas dentro dela; confirmar se deve limitar ao responsável/status. | P1 |
| F49 | Resumo da empresa no dashboard | EMPLOYEE | `EmployeeDashboard` | `GET /dashboard/employee` | company/submissions/tasks | B | Exposição é reduzida por desenho; política de quais indicadores o colaborador pode ver deve ser formalizada. | P2 |
| F50 | Relatório da própria pesquisa | EMPLOYEE | Rota `/reports` bloqueada | Backend permite somente relatório do próprio respondente | submissions/answers/tasks | E | Há capacidade segura no backend, mas nenhuma navegação/tela para EMPLOYEE. Decidir se faz parte da oferta. | P2 |
| F51 | Visualizar plano da empresa | EMPLOYEE | Rota `/plan` bloqueada | `GET /billing/current-plan` aceita autenticado com empresa | plans/subscriptions/usage | G | Ausência possivelmente intencional; definir transparência de limites para colaboradores. | P3 |
| F52 | Gestão de clientes | Legado | `ClientsPage`, `ClientDetailsPage`; rota redirecionada | Sem módulo API real | mock local | D | Interface grande, mas não faz parte da versão atual e pode confundir manutenção. | P2 |
| F53 | Formulários genéricos | Legado | `FormsPage`, data source com fallback | Não há rotas `/forms` na API | mock/fallback | F | Flutter tenta API inexistente e cai para mock; rota pública está desativada. | P2 |
| F54 | Chat genérico de consultor | Legado | `ChatPage`; rota redirecionada | Sem módulo API | estado em memória | D | Texto declara respostas mockadas. | P3 |
| F55 | Workspace/diagnóstico legado | Legado | `DiagnosisWorkspaceController`, catálogo mock; rotas redirecionadas | mutação legada retorna 410 | mock + endpoint desativado | D | Substituído pelo fluxo `/research`. | P2 |
| F56 | Frontend React/Vite secundário | Legado | `saas/apps/web` | Integrações/protótipos antigos | mocks | D | Não é frontend de lançamento; congelar ou remover em gate futuro. | P3 |
| F57 | Pagamento, checkout, faturas e cobrança recorrente | Comercial | Sem tela | Sem módulo | somente assinatura interna | G | Planos existem, mas cobrança é manual; necessário para venda self-service. | P3 |
| F58 | Convite e verificação de e-mail | Todos | Sem tela | Sem endpoints | nenhuma | G | Usuários recebem senha definida pelo ADMIN; não há ativação por convite. | P1 |
| F59 | Diagnóstico por endpoint antigo `/ai-diagnosis` | Legado | `AIService`; rota redirecionada | `POST /ai-diagnosis` retorna 410 | nenhuma | D | Código substituído por pesquisa + `/ai/next-question`. | P3 |

## 5. Telas Flutter

Foram identificadas **26 superfícies de tela** (25 classes públicas terminadas em `Page` e a tela privada de indisponibilidade). `AdminDashboardPage`, `OwnerDashboardPage` e `EmployeeHomePage` são wrappers de rota sobre `DashboardPage`; foram contadas porque representam entradas distintas por perfil.

| Tela | Rota/entrada | Perfil | Finalidade | Dados reais | Mock/hardcode, botão sem ação, TODO ou fluxo incompleto |
| --- | --- | --- | --- | :---: | --- |
| `AuthSplashPage` | `/` | Todos | Resolver sessão e redirecionar por role | Sim, storage local | Sem refresh de token |
| `LoginPage` | `/login` | Público | Autenticar | Sim | Credenciais demo só aparecem por flag; fluxo atual é real |
| `ForgotPasswordPage` | `/forgot-password` | Público | Solicitar recuperação | Sim | Depende do serviço de e-mail |
| `ResetPasswordPage` | `/reset-password?token=...` | Público | Definir nova senha | Sim | Requer token recebido externamente |
| `_UnavailableFeaturePage` | `/unavailable` | Autenticado | Informar recurso fora da versão | Não aplicável | Tela intencional, botão voltar funcional |
| `AdminDashboardPage` | `/admin` | ADMIN | Entrada do dashboard global | Sim | Wrapper sem lógica própria |
| `OwnerDashboardPage` | `/owner` | OWNER | Entrada do dashboard empresarial | Sim | Wrapper sem lógica própria |
| `EmployeeHomePage` | `/employee` | EMPLOYEE | Entrada do dashboard operacional | Sim | Wrapper sem lógica própria |
| `DashboardPage` | interna aos três wrappers | ADMIN/OWNER/EMPLOYEE | Carregar endpoint por role e renderizar painel | Sim | Estado de erro real, sem fallback demo |
| `DiagnosisPage` | `/research` | Todos autenticados | Listar/iniciar/retomar pesquisas | Sim | ADMIN fica somente leitura |
| `ResearchStartPage` | componente aberto por `DiagnosisPage` | OWNER/EMPLOYEE | Informar função/setor e iniciar submissão | Sim | Não possui rota independente |
| `ChatDiagnosisPage` | `/research/chat` | OWNER/EMPLOYEE; ADMIN só se `allowRespond` falso | Responder pesquisa e pedir próxima pergunta | Sim | IA externa pode ficar indisponível; resposta já salva é preservada |
| `ResearchDetailsPage` | `/research/:submissionId` | Todos autenticados, com escopo | Resultado, score e geração de plano/PDF | Sim | Ações variam conforme role/status |
| `CompaniesManagementPage` | `/companies` | ADMIN | Empresas, onboarding, plano e histórico | Sim | Tela extensa concentra múltiplas responsabilidades |
| `CompaniesManagementPage` | `/users` com `initialUsersView` | ADMIN | Usuários por empresa | Sim | Reuso da mesma classe, não tela independente |
| `ReportsPage` | `/reports` | ADMIN/OWNER | Lista de relatórios | Sim | EMPLOYEE não tem rota |
| `ReportDetailsPage` | `/reports/:submissionId` | ADMIN/OWNER | Relatório executivo e PDF | Sim | Sem mock |
| `ActionPlanPage` | `/tasks` | ADMIN/OWNER/EMPLOYEE | Lista, filtros, criação e edição de tarefas | Sim | Política de escrita do EMPLOYEE merece revisão |
| `CurrentPlanPage` | `/plan` | OWNER | Plano e consumo de limites | Sim | Sem upgrade/pagamento self-service |
| `CompanySettingsPage` | `/company-settings` | OWNER | Editar dados empresariais | Sim | Sem configurações avançadas/integrações |
| `WelcomePage` | sem rota ativa | Legado | Boas-vindas antiga | Não | Classe não utilizada pelo router |
| `ClientsPage` | `/clients` redireciona para indisponível | Legado | Lista/gestão visual de clientes | Não | Data source TODO e mock |
| `ClientDetailsPage` | `/clients/:id` redireciona | Legado | Detalhe visual de cliente | Não | Mock, sem API |
| `FormsPage` | `/forms` redireciona | Legado | Formulários e respostas | Não de forma confiável | Fallback mock explícito; API inexistente |
| `ChatPage` | `/chat` redireciona | Legado | Chat genérico | Não | Respostas mockadas em memória |
| `ModulePage` | sem rota ativa | Legado | Componente genérico de módulo | Não | Conteúdo estático |
| `BusinessAreaPage` | sem rota ativa | Legado | Área de negócio | Não | Texto “Placeholder do módulo” |

Observação: `ResearchStartPage` e `DashboardPage` são superfícies funcionais compostas, enquanto `/users` reutiliza `CompaniesManagementPage`. Portanto, a contagem por classes e a contagem de URLs não são equivalentes.

## 6. Endpoints da API

A API declara **50 endpoints em 12 grupos de router/entrada**. O Flutter ativo consome diretamente **37**; **13** são operacionais, aliases, legados ou não possuem consumidor ativo.

### 6.1 Auth — 4 endpoints

| Método e rota | Finalidade | Tela Flutter |
| --- | --- | --- |
| `POST /auth/register` | Registro público, atualmente desabilitado | Não |
| `POST /auth/login` | Login JWT | `LoginPage` |
| `POST /auth/password/forgot` | Solicitar reset | `ForgotPasswordPage` |
| `POST /auth/password/reset` | Consumir token e trocar senha | `ResetPasswordPage` |

### 6.2 Companies, users e settings — 12 endpoints

| Método e rota | Finalidade | Tela Flutter |
| --- | --- | --- |
| `GET /companies` | Listar empresas | Empresas ADMIN |
| `GET /companies/:id` | Obter empresa | Sem consumo direto; tela usa a lista |
| `POST /companies` | Criar empresa | Empresas ADMIN |
| `POST /companies/onboarding` | Criar empresa + OWNER | Empresas ADMIN |
| `PUT /companies/:id` | Editar empresa | Empresas ADMIN |
| `PATCH /companies/:id/status` | Alterar status | Empresas ADMIN |
| `GET /companies/:companyId/users` | Listar usuários | Usuários ADMIN |
| `POST /companies/:companyId/users` | Criar usuário | Usuários ADMIN |
| `PUT /users/:id` | Editar usuário | Usuários ADMIN |
| `PATCH /users/:id/status` | Alterar status | Usuários ADMIN |
| `GET /company/settings` | Ler empresa própria | Configurações OWNER |
| `PUT /company/settings` | Editar empresa própria | Configurações OWNER |

### 6.3 Research — 6 endpoints

Todos possuem tela/fluxo Flutter em Pesquisa Empresarial.

- `POST /research/submissions`
- `POST /research/submissions/:id/answers`
- `POST /research/submissions/:id/complete`
- `POST /research/submissions/:id/generate-action-plan`
- `GET /research/submissions`
- `GET /research/submissions/:id`

### 6.4 Action plan/tasks — 6 endpoints

| Método e rota | Tela Flutter |
| --- | --- |
| `GET /action-plan/assignees` | Plano de Ação |
| `GET /action-plan/tasks` | Plano de Ação |
| `GET /action-plan/tasks/:id` | Sem consumo direto |
| `POST /action-plan/tasks` | Plano de Ação |
| `PUT /action-plan/tasks/:id` | Plano de Ação |
| `PATCH /action-plan/tasks/:id/status` | Plano de Ação |

### 6.5 Reports — 3 endpoints

Todos possuem tela Flutter para ADMIN/OWNER.

- `GET /reports/research`
- `GET /reports/research/:submissionId/executive`
- `GET /reports/research/:submissionId/executive/pdf`

### 6.6 Billing/plans — 5 endpoints

Todos possuem consumidor Flutter em Plano Atual ou Empresas ADMIN.

- `GET /billing/current-plan`
- `GET /billing/admin/plans`
- `GET /billing/admin/companies/:companyId/current-plan`
- `PUT /billing/admin/companies/:companyId/plan`
- `GET /billing/admin/companies/:companyId/plan-events`

### 6.7 Dashboard — 3 endpoints

- `GET /dashboard/admin` → dashboard ADMIN.
- `GET /dashboard/company` → dashboard OWNER.
- `GET /dashboard/employee` → dashboard EMPLOYEE.

### 6.8 AI — 3 endpoints

- `POST /ai/next-question` → consumido pelo chat de pesquisa.
- `POST /ai/question/next` → alias sem consumidor Flutter identificado.
- `POST /ai-diagnosis` → legado desativado, retorna HTTP 410.

### 6.9 Diagnosis legado — 2 endpoints

- `GET /api/diagnosis/questionnaires/default` → backend disponível, sem tela ativa correspondente.
- `POST /api/diagnosis/submissions` → legado desativado, retorna HTTP 410.

### 6.10 Legal — 3 endpoints

- `GET /legal/documents/pending`
- `GET /legal/acceptances/current`
- `POST /legal/acceptances`

Não há tela Flutter correspondente.

### 6.11 Health/readiness — 2 endpoints

- `GET /health`
- `GET /ready`

São endpoints operacionais, sem necessidade de tela de produto.

### 6.12 Operations — 1 endpoint

- `GET /operations/metrics` — ADMIN, desabilitado por padrão e sem tela.

## 7. Inconsistências frontend/backend e sinais de incompletude

### 7.1 Achados funcionais legítimos

- `TODO` usado como status de tarefa não é débito técnico; é valor de domínio (`TODO`, `IN_PROGRESS`, `DONE`, `CANCELED`).
- `placeholder` em `migrate-sqlite-to-postgres.ts` refere-se a parâmetros SQL e não a conteúdo incompleto.
- Botões com `onPressed: null` encontrados são estados de loading/validação, não callbacks abandonados.
- Endpoints 410 de diagnóstico são desativações intencionais de fluxos substituídos.

### 7.2 Débitos confirmados

- `ClientsRemoteDataSource` contém TODO explícito e retorna mock.
- `FormsRemoteDataSource` tenta endpoints inexistentes e mantém fallback mock.
- `ChatPage` informa respostas mockadas na sessão.
- `diagnosis_workspace_catalog.dart` alimenta workspace mockado e fora do router ativo.
- `BusinessAreaPage` se declara placeholder.
- `DiagnosisRemoteDataSource` contém TODO para envio ao backend, mas o fluxo oficial usa `ResearchService`.
- `AIService` aponta para `/ai-diagnosis`, endpoint legado 410; a rota está indisponível e o serviço oficial é `AiQuestionService`.
- Flutter declara `flutter_local_notifications` e `enablePushNotifications`, mas não inicializa nem usa notificações.
- Legal acceptance possui API e persistência, sem interface.
- `GET /companies/:id`, `GET /action-plan/tasks/:id` e o alias `/ai/question/next` não possuem consumo ativo identificado.
- EMPLOYEE pode ter escopo de mutação de tarefas mais amplo que o esperado pelo discurso do produto.
- A URL padrão Flutter é local (`http://127.0.0.1:3000`); Android físico exige `API_BASE_URL` com IP da máquina.

## 8. Cobertura da proposta do produto

| Área | Cobertura atual | Avaliação |
| --- | --- | --- |
| Gestão multiempresa | Escopo por `company_id`, ADMIN global, E2E de vazamento | Adequada para MVP |
| ADMIN | Dashboard, empresas, usuários, planos, pesquisas e relatórios | Forte; faltam auditoria/configurações gerais |
| OWNER | Dashboard, empresa, pesquisa, ação, relatório e plano | Forte; falta gestão de equipe e onboarding guiado |
| EMPLOYEE | Dashboard, pesquisa e tarefas | Adequada; revisar política de edição de tarefas |
| Diagnósticos/pesquisas | Fluxo `/research` completo, score e IA opcional | Adequada; legado deve ser removido depois |
| Planos de ação/tarefas | Geração, CRUD, responsáveis, filtros e status | Adequada |
| Dashboards | Três perfis com dados reais | Adequada |
| Relatórios/PDF | ADMIN/OWNER completos; backend suporta relatório próprio do EMPLOYEE | Adequada ao escopo atual |
| Configurações da empresa | OWNER edita dados básicos | Adequada para MVP |
| Starter/Growth | Assinatura interna, limites, uso, troca e histórico | Adequada para beta manual; sem cobrança |
| Limites/permissões | Backend aplica assentos, pesquisas, PDFs, tarefas e IA | Adequada; formalizar permissão intraempresa do EMPLOYEE |
| Onboarding | ADMIN cria empresa + OWNER | Parcial no pós-login |
| Segurança | JWT, bcrypt, rate limits, headers, CORS configurável, auditoria e reset | Boa base; faltam refresh/revogação, aceite UI e troca autenticada |
| Recuperação de senha | API e Flutter completos | Depende da configuração real do e-mail |
| Notificações | Apenas dependência/flag | Ausente |
| Cobrança | Sem implementação | Fora do beta manual |

## 9. Backlog priorizado

### P0 — bloqueia uso/demonstração segura

Não há P0 de código confirmado no núcleo. Permanecem gates P0 antes de colocar uma empresa real:

1. Configurar e provar entrega de e-mail de recuperação de senha, especialmente para o primeiro ADMIN.
2. Integrar ou decidir formalmente o aceite jurídico no primeiro login; o backend já está pronto.
3. Executar checklist assistido ponta a ponta com dados autorizados: onboarding → login OWNER → pesquisa → plano → dashboard → relatório/PDF.
4. Configurar `API_BASE_URL` correta no alvo usado na demonstração e confirmar conectividade antes da sessão.
5. Confirmar disponibilidade/limites da OpenAI ou comunicar claramente que a pesquisa pode ser concluída sem próxima pergunta de IA.

### P1 — necessário para MVP operacional

1. Criar troca de senha autenticada para reduzir dependência do reset por e-mail.
2. Decidir e implementar gestão de equipe pelo OWNER ou documentar o processo ADMIN-only.
3. Criar onboarding guiado pós-login para completar empresa, equipe e primeira pesquisa.
4. Formalizar e ajustar a permissão de EMPLOYEE sobre criação/edição de tarefas.
5. Implementar convite/ativação por e-mail, evitando distribuição manual de senhas.
6. Validar o detalhe de empresa por endpoint próprio ou remover o endpoint não utilizado.
7. Documentar a matriz final de permissões e dados visíveis por perfil.

### P2 — importante, mas pode vir depois

1. Criar consulta administrativa de auditoria e observabilidade.
2. Implementar notificações/lembretes de prazo ou remover dependência/flag até haver escopo.
3. Decidir se EMPLOYEE pode abrir relatório próprio no Flutter.
4. Consolidar/remover código de clientes, formulários, workspace e serviços legados.
5. Melhorar sessão com refresh/revogação de token.
6. Tornar semântica de suspensão empresarial mais rica que `INACTIVE`, se exigida comercialmente.
7. Separar a grande tela administrativa em fluxos menores para manutenção e UX.

### P3 — futuro

1. Pagamento recorrente, checkout, webhooks, faturas, trial e inadimplência.
2. Configurações administrativas globais e integrações self-service.
3. Registro público, caso o modelo deixe de ser onboarding assistido.
4. Definir destino do frontend React/Vite secundário.
5. Avaliar transparência do plano para EMPLOYEE.
6. Canais avançados de notificação e central de preferências.

## 10. Próximas sprints sugeridas

### Sprint 3.13 — Primeiro cliente real e recuperação segura

- validar o fluxo real completo com dados autorizados;
- configurar e testar e-mail de recuperação;
- integrar aceite jurídico no Flutter ou registrar decisão explícita;
- adicionar troca de senha autenticada;
- fechar checklist operacional de primeiro login.

### Sprint 3.14 — OWNER, equipe e onboarding

- decidir gestão de equipe OWNER versus ADMIN-only;
- implementar convite/ativação ou fluxo equivalente;
- criar onboarding guiado pós-login;
- revisar mensagens de plano/limite e empresa incompleta.

### Sprint 3.15 — Permissões e acabamento multiempresa

- formalizar matriz de permissões;
- restringir ou confirmar mutações de tarefas por EMPLOYEE;
- decidir acesso de EMPLOYEE ao próprio relatório;
- ampliar testes de autorização para as decisões finais.

### Sprint 3.16 — Higiene de produto e observabilidade

- remover/congelar clientes, formulários, chat e diagnóstico legados;
- eliminar endpoints/aliases sem uso ou documentá-los;
- criar consulta administrativa de auditoria;
- decidir estratégia de notificações.

### Sprint 3.17 — Comercialização

- somente após validar o beta: pricing, trial, checkout, cobrança, webhooks e estados de assinatura.

## 11. Situação PostgreSQL e SQLite

### 11.1 PostgreSQL operacional

- A seleção do provider ocorre por `DATABASE_URL`; com ela definida, `dataSource.provider` é `postgres`.
- Repositories centrais usam o adaptador assíncrono compartilhado, que traduz parâmetros e algumas expressões SQLite para PostgreSQL.
- O startup importa `database/init.ts` dinamicamente somente quando o provider é SQLite; PostgreSQL não carrega o módulo SQLite com efeito colateral.
- Migrations PostgreSQL cobrem companies, users, submissions/answers, tarefas, planos, assinaturas, uso, reset de senha, aceite legal, auditoria e hardening.

### 11.2 Código SQLite ainda presente

Código de runtime compatível/condicional:

- `src/database/data-source.ts`: adapter dual; importa SQLite apenas sob demanda.
- `src/server.ts`: inicialização SQLite condicional.
- `src/health/health.service.ts` e `src/database/validate.ts`: branches por provider.
- `src/db/database.ts` e `src/database/init.ts`: abertura/schema inicial SQLite.

Código operacional/legado específico:

- backup/restore SQLite (`backup-sqlite.ts`, `backup-external-sqlite.ts`, `restore-sqlite.ts`, `external-backup.ts`);
- staging/demo em SQLite (`staging-data.ts`, `demo-data.ts`, `sqlite-operations.ts`);
- migrador único `migrate-sqlite-to-postgres.ts`.

### 11.3 Testes dependentes de SQLite

- `test:e2e:sqlite` / `test:e2e` e seu alias `test:smoke:sqlite`;
- partes de `test:operations` (operações SQLite, staging e demo);
- `multitenant.e2e.ts`, `security.e2e.ts`, `operations.e2e.ts` e `readiness-incomplete.e2e.ts` usam bases sintéticas SQLite;
- testes de adapter/runtime isolation verificam os dois providers;
- o teste do migrador cria origem SQLite sintética.

### 11.4 Dependência funcional atual

Nenhuma funcionalidade do produto precisa de SQLite quando a API é iniciada com PostgreSQL. SQLite permanece como provider alternativo, suporte a ambientes antigos, fonte de migração e base de várias suítes históricas.

### 11.5 Remoção futura possível

Depois de confirmar operação exclusivamente PostgreSQL e substituir a cobertura equivalente dos testes, poderão ser removidos em gate próprio:

1. `better-sqlite3` e tipos;
2. `src/db/database.ts`, `src/database/init.ts` e branch SQLite do adapter;
3. scripts de backup/restore/staging/demo exclusivos de SQLite;
4. migrador SQLite→PostgreSQL, após encerrar sua janela de uso e arquivar evidências;
5. testes exclusivamente SQLite ou, preferencialmente, reescrevê-los para PostgreSQL temporário antes da remoção;
6. documentação de rollback/operação SQLite já obsoleta.

Essa remoção não deve ocorrer antes de preservar testes de isolamento, segurança e operações hoje exercitados com SQLite.

## 12. Conclusão

O aplicativo já é mais do que uma interface demonstrativa: o núcleo de consultoria está integrado e persistente em PostgreSQL, com três perfis, isolamento multiempresa, pesquisa, plano de ação, dashboards, relatórios e limites comerciais internos. A principal diferença entre o estado atual e um MVP utilizável por cliente real está menos no domínio central e mais no acabamento operacional: recuperação de senha comprovada, aceite jurídico, onboarding dentro do produto, gestão de equipe, política final de permissões e remoção da ambiguidade causada por módulos legados/mock.

A próxima sprint recomendada é **Sprint 3.13 — Primeiro cliente real e recuperação segura**, porque reduz o maior risco de uso sem expandir prematuramente o escopo comercial. Pagamentos e recursos futuros devem esperar a validação assistida do fluxo completo por uma empresa autorizada.
