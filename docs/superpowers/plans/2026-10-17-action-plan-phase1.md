# Action Plan Phase 1 Implementation Plan

> Execution: inline nesta sessão. Sem commits, push, PR ou deploy, conforme instrução explícita do usuário.

**Goal:** Entregar monitoramento operacional real do plano de ação.
**Architecture:** Estender módulo existente, SQLite transacional e frontend React autenticado.
**Tech Stack:** TypeScript, Express, better-sqlite3, React, Vite, node:test, Playwright.
**Spec:** docs/superpowers/specs/2026-10-17-action-plan-phase1.md

## Global constraints

Somente Fase 1. Preservar dados antigos e isolamento por tenant. Não duplicar fluxo Flutter de demonstração. Usar roles existentes. Não usar mocks no módulo entregue. Não cometer/publicar alterações.

## Review focus

- Claims e IDs manipulados: reconsultar identidade no banco e testar tenant B contra A.
- Dados legados: migrar status/prioridade/plano sem perder tarefas; aplicar migração duas vezes.
- Conclusão/reabertura: progresso, completedAt e histórico atômicos; funcionário não valida a própria tarefa.
- Datas e valores inválidos: rejeitar NaN, strings, frações inválidas, <0/>100 e URLs inseguras.
- Telas estreitas/ações assíncronas: não perder input, bloquear envio duplicado e validar overflow nos quatro tamanhos.

## 1. Contrato e banco
- [x] Criar testes HTTP de criação de plano e retorno autenticado; executar e observar endpoint ausente.
- [x] Criar migrations/011_action_plan_monitoring_phase1.sql e runner em src/database; registrar execução transacional.
- [x] Atualizar schema.ts, init.ts e action-plan.types.ts; preservar tarefas antigas em planos migrados.
- [x] Testar esquema limpo, legado e aplicação repetida.

## 2. Backend e segurança
- [x] Testar endpoints /action-plan/plans, /tasks, /dashboard, /employees, /members, /tasks/:id/evidence e /history.
- [x] Implementar repository com consultas por tenant e gravação + histórico em transação; service valida domínio e permissões; controller converte erros em HTTP.
- [x] Preservar generateFromResearch e vínculo com diagnóstico.
- [x] Restringir cadastro privilegiado e atualizar identidade a partir do banco na autenticação.
- [x] Executar testes de atribuição, progresso, atraso, evidências, conclusão/reabertura, IDs e claims manipulados, cross-tenant e acessos por funcionário.

## 3. React
- [x] Implementar cliente API, tipos, sessão/login e página de planos com formulários e detalhe.
- [x] Acrescentar dashboard, filtros e visão por funcionário, sem mocks.
- [x] Integrar navegação e CSS responsivo, usando proxy Vite para API local.
- [x] Testar em navegador real o fluxo de gestão e funcionário com API/SQLite reais.

## 4. Validação e entrega
- [x] Adicionar comandos lint/typecheck/test e configuração de lint; executar todos com build completo.
- [x] Validar 1440, 1024, 768 e 390px, incluindo formulários, detalhe e botões.
- [x] Revisar segurança e diff; corrigir falhas e repetir verificações afetadas.
- [x] Documentar endpoints, migração, frontend escolhido, resultados e pendências reais.
