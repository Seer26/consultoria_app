# Checklist de Lancamento SaaS

Use este checklist como trilha objetiva. A ordem sugerida evita quebrar a demo enquanto o produto ganha as camadas necessarias para uso real.

## Fase 1: Produto lancavel

- [x] Criar flag `ENABLE_DEMO_SEED` na API.
- [x] Impedir seed de demo em `production`.
- [x] Manter seed de demo funcionando em ambiente local/demo.
- [x] Remover preenchimento automatico `admin@teste.com` e `123456` em builds de producao.
- [x] Esconder bloco "Usuarios de teste" em builds de producao.
- [x] Trocar `AppConstants.baseUrl` hardcoded por configuracao de ambiente/flavor.
- [x] Documentar como rodar Flutter apontando para API local, staging e production.
- [x] Criar endpoint/fluxo de onboarding de empresa + primeiro OWNER.
- [x] Garantir criacao transacional de empresa e OWNER.
- [x] Validar email, senha, nome da empresa e slug no onboarding.
- [x] Bloquear criacao publica de ADMIN.
- [ ] Definir se OWNER pode ou nao gerenciar usuarios da propria empresa.
- [ ] Se OWNER puder gerenciar usuarios, criar endpoints com escopo da propria empresa.
- [x] Auditar rotas de pesquisa por `companyId`.
- [x] Auditar rotas de plano de acao por `companyId`.
- [x] Auditar rotas de dashboard por `companyId`.
- [x] Auditar rotas de relatorios/PDF por `companyId`.
- [x] Criar teste E2E com duas empresas e dois OWNERs.
- [x] Criar teste provando que OWNER A nao acessa dados da empresa B.
- [x] Criar teste provando que EMPLOYEE A nao acessa dados da empresa B.
- [x] Criar teste provando que ADMIN consulta globalmente sem responder pesquisa.
- [x] Remover ou esconder modulos mockados fora do escopo comercial.
- [x] Desativar rota `/team` ou implementar modulo real antes de liberar.
- [ ] Desativar clientes/formularios mockados do pacote comercial.
- [ ] Revisar mensagens de erro para usuario real.
- [x] Confirmar que pesquisa, diagnostico, plano, dashboard, relatorio e PDF funcionam sem seed.
- [x] Confirmar que a demo atual continua funcionando quando a flag de seed estiver ativa.

## Fase 2: SaaS com planos e assinatura

- [x] Definir planos comerciais iniciais.
- [x] Definir limites por plano.
- [x] Criar tabela/modelo de `plans`.
- [x] Criar tabela/modelo de `subscriptions`.
- [x] Modelar entitlements iniciais como limites por coluna no plano.
- [x] Criar tabela/modelo de `usage_counters`.
- [x] Criar service `canUseFeature(companyId, feature)`.
- [x] Bloquear recursos por plano no backend.
- [x] Adicionar mensagens de limite atingido no Flutter.
- [x] Criar tela de plano atual.
- [x] Criar endpoint ADMIN para listar planos.
- [x] Criar endpoint ADMIN para consultar plano atual de uma empresa.
- [x] Criar endpoint ADMIN para alterar plano de uma empresa.
- [x] Criar tela ADMIN para visualizar e trocar plano manualmente.
- [x] Exigir confirmacao antes de trocar plano manualmente.
- [x] Validar que OWNER e EMPLOYEE nao alteram plano.
- [x] Registrar data da alteracao em `company_subscriptions.updated_at`.
- [ ] Criar historico/auditoria detalhada de alteracoes de plano.
- [ ] Criar tela/acao de upgrade.
- [ ] Escolher provedor de pagamento.
- [ ] Criar checkout de assinatura.
- [ ] Criar webhooks idempotentes.
- [ ] Registrar faturas/eventos de pagamento.
- [ ] Atualizar assinatura quando pagamento for aprovado.
- [ ] Atualizar assinatura quando pagamento falhar/vencer.
- [ ] Definir regra de trial.
- [ ] Definir regra de suspensao por inadimplencia.
- [ ] Testar fluxo completo: trial -> ativo -> vencido -> reativado.
- [x] Testar limites por plano no E2E/API multiempresa.
- [x] Testar troca manual Starter -> Growth no E2E/API.
- [x] Documentar pagamento manual beta.
- [x] Criar configuracoes da empresa para OWNER.
- [x] Garantir que OWNER edita apenas dados basicos da propria empresa.
- [x] Garantir que EMPLOYEE nao altera configuracoes da empresa.
- [x] Criar `company_subscription_events`.
- [x] Registrar historico de troca manual de plano.
- [x] Exibir historico simples de plano na tela ADMIN da empresa.
- [x] Criar checklist de onboarding de cliente beta.
- [x] Melhorar mensagens de login/sessao.

## Fase 3: Producao/deploy

- [ ] Escolher infraestrutura de deploy.
- [ ] Escolher banco gerenciado.
- [x] Planejar migracao de SQLite para banco de producao.
- [x] Preparar `DATABASE_URL` para Postgres.
- [x] Implementar migracoes versionadas.
- [x] Criar seed idempotente dos planos Starter/Growth em migration.
- [x] Criar comando `db:migrate`.
- [x] Criar comando `db:validate`.
- [x] Criar Dockerfile da API.
- [x] Criar Docker Compose local com Postgres.
- [ ] Remover dependencia de `tsx` no `npm start` de producao ou documentar runtime com clareza.
- [ ] Criar build de API para producao.
- [ ] Exigir `JWT_SECRET` em producao.
- [ ] Exigir variaveis de OpenAI em producao quando IA estiver ativa.
- [ ] Configurar `CORS_ORIGINS` restrito.
- [ ] Configurar dominios de API e app.
- [ ] Configurar HTTPS.
- [x] Configurar logs estruturados.
- [ ] Configurar monitoramento.
- [ ] Configurar alertas.
- [x] Documentar backups automaticos.
- [ ] Testar restore de backup.
- [ ] Criar ambiente de staging separado.
- [x] Criar pipeline CI com build da API.
- [x] Criar pipeline CI com `flutter analyze`.
- [x] Criar pipeline CI com testes Flutter.
- [x] Criar healthcheck de producao.
- [x] Criar README de deploy.
- [ ] Criar runbook de incidente.
- [ ] Refatorar runtime dos repositórios de SQLite síncrono para Postgres async.
- [ ] Rodar fluxo completo da API persistindo em Postgres depois da refatoracao runtime.

## Fase 4: Cliente beta

- [ ] Selecionar empresa beta.
- [ ] Criar checklist de onboarding do cliente.
- [ ] Criar empresa real sem seed.
- [ ] Criar OWNER real.
- [ ] Criar usuarios reais.
- [ ] Validar login e permissoes com cliente.
- [ ] Executar primeira Pesquisa Empresarial real.
- [ ] Gerar primeiro plano de acao real.
- [ ] Gerar primeiro relatorio/PDF real.
- [ ] Coletar feedback de uso.
- [ ] Monitorar erros da API.
- [ ] Monitorar custo/uso da OpenAI.
- [ ] Monitorar tempo de resposta.
- [ ] Registrar bugs em backlog.
- [ ] Priorizar ajustes antes do lancamento comercial.
- [ ] Validar termos de uso e politica de privacidade.

## Fase 5: Lancamento comercial

- [ ] Fechar oferta comercial e precos.
- [ ] Definir processo de venda.
- [ ] Definir processo de suporte.
- [ ] Definir processo de cancelamento.
- [ ] Publicar documentacao de ajuda.
- [ ] Configurar analytics de ativacao.
- [ ] Medir uso por empresa.
- [ ] Medir conversao trial -> pago.
- [ ] Medir churn.
- [ ] Medir receita recorrente.
- [ ] Medir custo de IA por cliente.
- [ ] Revisar seguranca antes de liberar aquisicao aberta.
- [ ] Criar rotina de revisao semanal de incidentes e feedback.
- [ ] Liberar lancamento comercial.

## Itens que nao podem ir para producao sem revisao

- [ ] Seed automatico com `admin@teste.com`, `owner@teste.com`, `employee@teste.com`.
- [ ] Senha padrao `123456`.
- [ ] `JWT_SECRET` fallback local.
- [ ] CORS `origin: '*'`.
- [ ] SQLite local como banco principal de producao.
- [ ] URLs localhost no app final.
- [ ] Telas com mocks apresentadas como recurso real.
- [ ] Web secundaria React/Vite tratada como produto final sem revisao.
- [ ] OpenAI sem controle de custo, quota e rate limit.
- [ ] Pagamento sem webhook idempotente.
