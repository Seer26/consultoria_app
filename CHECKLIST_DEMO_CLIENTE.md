# Checklist da Demonstração ao Cliente

**Produto:** Plataforma de Consultoria Empresarial
**Frontend da demonstração:** Flutter
**Posicionamento:** MVP de diagnóstico empresarial e acompanhamento de ações
**Última validação:** 11 de julho de 2026

## 1. Antes de apresentar

- [ ] Confirmar que a API inicia e responde em `http://127.0.0.1:3000/health`.
- [ ] Confirmar que `flutter analyze` retorna `No issues found`.
- [ ] Confirmar que a conta da OpenAI possui créditos de API disponíveis.
- [ ] Entrar previamente com as três contas de demonstração.
- [ ] Conferir a Pesquisa Empresarial concluída fornecida pelo seed.
- [ ] Conferir os cards do dashboard, tarefas e Relatório Executivo.
- [ ] Exportar um PDF antes da reunião e verificar sua abertura.
- [ ] Manter o React fora da apresentação.
- [ ] Não abrir rotas antigas ou módulos fora do escopo da demonstração.

## 2. Contas e dados da demonstração

O seed é executado automaticamente ao iniciar a API e pode ser executado novamente sem duplicar os registros fixos.

| Perfil | E-mail | Senha | Uso na demonstração |
|---|---|---|---|
| ADMIN | `admin@teste.com` | `123456` | Dashboard global, empresas, usuários, acompanhamento e relatórios. |
| OWNER | `owner@teste.com` | `123456` | Dashboard da empresa, resposta à pesquisa, Plano de Ação e relatórios. |
| EMPLOYEE | `employee@teste.com` | `123456` | Resposta à pesquisa e tarefas atribuídas. |

Dados automáticos:

- empresa `Empresa Demo`;
- uma Pesquisa Empresarial concluída;
- score geral de `57,7`;
- scores nos pilares Financeiro, Processos, Pessoas/RH, Marketing, Comercial e Estratégia;
- tarefas atrasada, em andamento e concluída;
- dados suficientes para dashboards e Relatório Executivo em PDF.

Não utilizar essas senhas em produção.

## 3. Módulos liberados para a demonstração

- [x] Login e controle por perfil.
- [x] Dashboard do ADMIN.
- [x] Dashboard do OWNER.
- [x] Dashboard do EMPLOYEE.
- [x] Administração de empresas pelo ADMIN.
- [x] Administração de usuários pelo ADMIN.
- [x] Pesquisa Empresarial para OWNER e EMPLOYEE.
- [x] Histórico e acompanhamento de pesquisas pelo ADMIN.
- [x] Diagnóstico Empresarial com score, pilares e recomendações.
- [x] Plano de Ação integrado à API.
- [x] Relatório Executivo detalhado.
- [x] Exportação do Relatório Executivo em PDF.

## 4. Não apresentar como pronto

- RH completo e tela antiga de Equipe;
- formulários demonstrativos;
- área antiga de clientes/consultoria;
- CRM, pipeline ou gestão comercial completa;
- financeiro operacional ou fluxo de caixa;
- marketing e campanhas;
- recrutamento e seleção;
- WhatsApp e integrações externas;
- treinamentos;
- IA preditiva, benchmarking ou previsões avançadas;
- frontend React, que ainda contém dados simulados.

Esses itens permanecem fora do menu principal da demo ou fora do posicionamento comercial atual.

## 5. Passo a passo recomendado

### Etapa A — Visão administrativa

1. Entrar com `admin@teste.com`.
2. Apresentar o dashboard global.
3. Abrir **Empresas** e mostrar cadastro, edição e status.
4. Abrir **Usuários** e mostrar os perfis vinculados.
5. Abrir **Pesquisa Empresarial** e explicar que o ADMIN acompanha o histórico, mas não responde.
6. Abrir **Relatórios Executivos** e consultar o relatório da Empresa Demo.

### Etapa B — Experiência do cliente

1. Sair e entrar com `owner@teste.com`.
2. Apresentar o dashboard da empresa.
3. Abrir **Pesquisa Empresarial**.
4. Informar função e setor e iniciar uma nova pesquisa.
5. Responder à primeira pergunta e aguardar a próxima pergunta gerada pela IA.
6. Finalizar a pesquisa e mostrar o Diagnóstico Empresarial.
7. Gerar o Plano de Ação.
8. Abrir **Plano de Ação** e alterar o status de uma tarefa.
9. Voltar ao dashboard e mostrar os indicadores atualizados.
10. Abrir o **Relatório Executivo** e exportar o PDF.

### Etapa C — Experiência do colaborador

1. Entrar com `employee@teste.com`.
2. Mostrar o dashboard individual.
3. Mostrar Pesquisa Empresarial e tarefas atribuídas.

## 6. Regra de segurança da pesquisa

- OWNER responde somente pela própria empresa.
- EMPLOYEE responde somente pela própria empresa e consulta suas próprias pesquisas.
- ADMIN consulta histórico e relatórios, mas não cria, responde, conclui ou gera plano a partir de uma pesquisa.
- A API devolve `403 ADMIN_RESEARCH_READ_ONLY` se o ADMIN tentar executar uma ação de respondente.

## 7. Dependência da IA

A chave é lida de `saas/apps/api/.env.local` pela variável `OPENAI_API_KEY`. Esse arquivo está ignorado pelo Git e não deve ser enviado ao cliente.

No momento da última validação, a chamada chegou à OpenAI, mas a conta retornou `429` por indisponibilidade de cota/créditos. ChatGPT e API possuem cobranças separadas. Antes da reunião, regularizar os créditos em [OpenAI Platform Billing](https://platform.openai.com/settings/organization/billing) e testar novamente.

Se a IA estiver indisponível, a resposta continua salva e a interface permite finalizar a pesquisa, exibindo uma mensagem amigável. Para a narrativa completa da demo, os créditos devem estar ativos.

## 8. Comandos para executar

### API

```powershell
cd C:\Users\Pichau\consultoria_app\saas
npm.cmd install
npm.cmd --workspace @consultoria/api run build
npm.cmd --workspace @consultoria/api start
```

Teste de saúde:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
```

### Flutter

Em outro terminal:

```powershell
cd C:\Users\Pichau\consultoria_app
flutter pub get
flutter analyze
flutter run
```

Se a API estiver em outro endereço, ajustar a configuração em `lib/core/config/app_config.dart`.

## 9. Mapa do fluxo principal

| Etapa | Flutter | API |
|---|---|---|
| Login | `login_page.dart`, `auth_controller.dart`, `auth_service.dart` | `POST /auth/login` |
| Empresas | `companies_management_page.dart`, `admin_management_service.dart` | `GET/POST/PUT/PATCH /companies` |
| Usuários | `companies_management_page.dart`, `admin_management_service.dart` | `GET/POST /companies/:companyId/users`, `PUT/PATCH /users/:id` |
| Início da pesquisa | `diagnosis_page.dart`, `research_start_page.dart`, `research_service.dart` | `POST /research/submissions` |
| Perguntas e respostas | `chat_diagnosis_page.dart`, `ai_question_service.dart`, `research_service.dart` | `POST /research/submissions/:id/answers`, `POST /ai/next-question` |
| Diagnóstico Empresarial | `chat_diagnosis_page.dart`, `research_service.dart` | `POST /research/submissions/:id/complete` |
| Plano de Ação | `action_plan_page.dart`, `action_plan_service.dart` | `/action-plan/tasks`, `POST /research/submissions/:id/generate-action-plan` |
| Dashboards | páginas e widgets em `features/dashboard` | `GET /dashboard/admin`, `/dashboard/company`, `/dashboard/employee` |
| Relatório Executivo | `reports_page.dart`, `reports_service.dart`, `report_pdf_exporter.dart` | `GET /reports/research`, `/executive`, `/executive/pdf` |

A navegação e o RBAC do Flutter ficam centralizados em `lib/core/router/app_router.dart` e `lib/core/auth/role_guard.dart`.

## 10. Pendências pós-demo

- adicionar créditos à conta da API e repetir o teste da IA;
- criar testes automatizados de integração para os três perfis;
- validar o Flutter visualmente em dispositivo ou navegador alvo;
- revisar LGPD, auditoria e isolamento multiempresa antes do piloto real;
- substituir o banco SQLite local por infraestrutura adequada antes da produção;
- definir recuperação de senha, refresh token e política de sessão;
- organizar artefatos compilados e dependências antes de empacotar a entrega.

## 11. Resultado da validação técnica

- API TypeScript: build concluído com sucesso.
- Flutter: `No issues found` no analisador.
- Empresa e usuário: criação validada em banco temporário.
- Regra do ADMIN: bloqueio `403` validado.
- OWNER: criação e conclusão de pesquisa validadas.
- Resposta: persistência validada.
- Diagnóstico: score gerado e validado.
- Plano de Ação: quatro tarefas geradas no teste.
- Dashboard OWNER: carregamento validado.
- Relatório Executivo: endpoint validado.
- PDF: arquivo válido gerado com 5.141 bytes.
- IA: integração e autenticação validadas até a OpenAI; execução bloqueada por falta de cota/créditos.
