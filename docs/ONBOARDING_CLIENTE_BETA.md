# Onboarding de Cliente Beta

Objetivo: padronizar a ativacao manual de uma empresa beta antes de pagamento automatizado, Postgres e deploy final.

## Premissas

- Pagamento ainda e manual/operacional fora do sistema.
- ADMIN cria empresa, OWNER e usuarios.
- ADMIN escolhe ou troca o plano da empresa.
- OWNER executa o fluxo principal dentro da propria empresa.
- O app segue com Flutter + API Node/TypeScript.

## Checklist operacional

### 1. Preparar ambiente

- [ ] Confirmar API ativa.
- [ ] Confirmar Flutter apontando para a API correta.
- [ ] Confirmar `ENABLE_DEMO_SEED=false` para validacao real.
- [ ] Confirmar acesso ADMIN operacional.
- [ ] Confirmar creditos OpenAI se IA estiver ativa.

### 2. Criar empresa

- [ ] Entrar como ADMIN.
- [ ] Abrir Empresas.
- [ ] Criar empresa pelo onboarding administrativo.
- [ ] Informar nome da empresa.
- [ ] Informar slug adequado.
- [ ] Criar primeiro OWNER.
- [ ] Validar que a empresa foi criada no plano Starter.

### 3. Escolher plano

- [ ] Abrir empresa no painel ADMIN.
- [ ] Conferir plano atual.
- [ ] Escolher Starter ou Growth conforme proposta comercial.
- [ ] Registrar motivo da troca, se houver.
- [ ] Confirmar troca manual de plano.
- [ ] Validar historico de plano na tela da empresa.

## Limites atuais

| Plano | Usuarios ativos | Pesquisas/mes | PDFs/mes | Tarefas ativas | IA/mes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter | 5 | 20 | 30 | 100 | 100 |
| Growth | 20 | 100 | 150 | 500 | 500 |

### 4. Registrar pagamento manual

- [ ] Registrar no controle financeiro externo o plano contratado.
- [ ] Registrar valor, vencimento e forma de pagamento.
- [ ] Registrar responsavel comercial.
- [ ] Anotar que o sistema ainda nao gera fatura, checkout ou webhook.

### 5. Validar login

- [ ] Fazer login como OWNER.
- [ ] Confirmar redirecionamento para dashboard correto.
- [ ] Abrir Plano atual.
- [ ] Abrir Configuracoes da empresa.
- [ ] Atualizar dados basicos da empresa.
- [ ] Confirmar que OWNER nao altera plano.

### 6. Executar primeira pesquisa

- [ ] Abrir Pesquisa Empresarial.
- [ ] Informar cargo/responsavel.
- [ ] Informar setor/departamento.
- [ ] Responder primeira rodada de perguntas.
- [ ] Salvar respostas.
- [ ] Finalizar pesquisa.

### 7. Gerar diagnostico

- [ ] Conferir score geral.
- [ ] Conferir pilares.
- [ ] Conferir pontos criticos.
- [ ] Conferir oportunidades.
- [ ] Conferir recomendacoes.

### 8. Gerar plano de acao

- [ ] Gerar plano de acao a partir da pesquisa concluida.
- [ ] Conferir tarefas criadas.
- [ ] Criar uma tarefa manual.
- [ ] Alterar status de uma tarefa.
- [ ] Validar que tarefas aparecem no painel.

### 9. Abrir dashboard

- [ ] Abrir dashboard OWNER.
- [ ] Conferir metricas da empresa.
- [ ] Conferir pesquisas recentes.
- [ ] Conferir tarefas.
- [ ] Confirmar que nao aparecem dados de outra empresa.

### 10. Exportar PDF

- [ ] Abrir Relatorio Executivo.
- [ ] Conferir resumo e plano de acao.
- [ ] Exportar PDF.
- [ ] Abrir o arquivo exportado.
- [ ] Registrar primeiro PDF gerado para o cliente.

## Validacao final

- [ ] Cliente conseguiu login.
- [ ] Empresa configurada.
- [ ] Plano correto aplicado.
- [ ] Primeira pesquisa concluida.
- [ ] Diagnostico gerado.
- [ ] Plano de acao gerado.
- [ ] Dashboard validado.
- [ ] PDF exportado.
- [ ] Pendencias registradas.

## Pendencias conhecidas

- Checkout e pagamento automatico ainda nao implementados.
- Webhooks e faturas ainda nao implementados.
- Historico financeiro ainda fica fora do sistema.
- Banco de producao/Postgres ainda pertence a Fase 3.
- Emails transacionais e convites ainda precisam ser implementados.
