# Checklist de Demonstração Segura

## 1. Preparação do ambiente

- [ ] Confirmar que a API está apontando para o banco de demonstração correto.
- [ ] Confirmar `ENABLE_DEMO_SEED=true` apenas no ambiente de demo.
- [ ] Confirmar `SHOW_DEMO_CREDENTIALS=true` apenas se a apresentação exigir credenciais visíveis.
- [ ] Confirmar `API_BASE_URL` apontando para a API correta.
- [ ] Confirmar `CORS_ORIGINS` restrito ao app usado na apresentação.
- [ ] Confirmar `JWT_SECRET` configurado no ambiente, sem expor o valor.
- [ ] Confirmar `OPENAI_API_KEY` configurada ou preparar fallback sem IA.
- [ ] Rodar `flutter analyze`.
- [ ] Rodar `flutter test --reporter expanded`.
- [ ] Rodar `npm.cmd --workspace @consultoria/api run build`.
- [ ] Rodar `npm.cmd --workspace @consultoria/api run test:e2e`.

## 2. Usuários de demonstração

- [ ] ADMIN com acesso ao painel administrativo.
- [ ] OWNER vinculado a empresa de demonstração.
- [ ] EMPLOYEE vinculado à mesma empresa.
- [ ] Não usar senhas reais no roteiro.
- [ ] Não exibir segredos ou variáveis privadas durante a reunião.

## 3. Roteiro ADMIN

- [ ] Login como ADMIN.
- [ ] Abrir dashboard administrativo.
- [ ] Abrir Empresas.
- [ ] Ver detalhes de uma empresa.
- [ ] Consultar usuários da empresa.
- [ ] Consultar plano atual da empresa.
- [ ] Alterar plano manualmente, se fizer parte do roteiro.
- [ ] Conferir histórico de alteração de plano.
- [ ] Não apresentar resposta de pesquisa como função principal do ADMIN.

## 4. Roteiro OWNER

- [ ] Login como OWNER.
- [ ] Abrir dashboard da empresa.
- [ ] Abrir Configurações da empresa.
- [ ] Abrir Pesquisa Empresarial.
- [ ] Iniciar pesquisa.
- [ ] Responder perguntas.
- [ ] Finalizar pesquisa.
- [ ] Gerar plano de ação.
- [ ] Abrir Plano de Ação.
- [ ] Abrir Relatório Executivo.
- [ ] Exportar PDF.
- [ ] Abrir Plano atual.
- [ ] Conferir limites e uso.

## 5. Roteiro EMPLOYEE

- [ ] Login como EMPLOYEE.
- [ ] Abrir dashboard do funcionário.
- [ ] Participar da Pesquisa Empresarial permitida.
- [ ] Abrir Plano de Ação.
- [ ] Confirmar que não acessa Empresas.
- [ ] Confirmar que não acessa Configurações da empresa.
- [ ] Confirmar que não acessa Plano atual.
- [ ] Confirmar que não acessa troca de plano.

## 6. Funcionalidades que não devem ser apresentadas

- [ ] Clientes.
- [ ] Formulários.
- [ ] Chat antigo.
- [ ] Diagnóstico antigo baseado em `DiagnosisRemoteDataSource`.
- [ ] Catálogo demonstrativo de diagnóstico.
- [ ] Frontend React/Vite antigo.
- [ ] Rota legada `/ai-diagnosis`.
- [ ] Configurações antigas de URL.
- [ ] Pagamento, checkout, faturas ou webhooks.
- [ ] PostgreSQL runtime.
- [ ] Supabase.

## 7. Validações antes da reunião

- [ ] Login dos três perfis.
- [ ] Dashboard carrega sem erro técnico.
- [ ] Pesquisa cria submissão real.
- [ ] Respostas são salvas.
- [ ] Pesquisa é concluída.
- [ ] Plano de ação é gerado.
- [ ] Tarefas aparecem.
- [ ] Relatório executivo abre.
- [ ] PDF é gerado.
- [ ] Plano atual abre para OWNER.
- [ ] Configurações da empresa salvam para OWNER.
- [ ] ADMIN altera plano e vê histórico.
- [ ] Módulos fora da versão atual redirecionam para mensagem amigável.

## 8. Plano de contingência

API indisponível:

- Verificar se a API está rodando.
- Abrir `/health`.
- Se não recuperar rapidamente, usar prints ou vídeo curto do fluxo já validado.

OpenAI indisponível:

- Explicar que a próxima pergunta por IA depende da disponibilidade/crédito da OpenAI.
- Seguir com perguntas e fluxo já persistido, se disponível.

PDF falhar:

- Mostrar o relatório executivo em tela.
- Registrar a falha para correção pós-reunião.

Sessão expirar:

- Fazer login novamente.
- Repetir a última etapa do roteiro.

Internet cair:

- Usar ambiente local se já estiver preparado.
- Caso contrário, pausar a demonstração e retomar com o fluxo validado.

Banco demo sem dados:

- Rodar seed demo explicitamente no ambiente local.
- Criar empresa + OWNER pelo ADMIN.
- Executar uma pesquisa curta antes da reunião.

## 9. Limitações que podem ser informadas ao cliente

- Pagamento ainda será operacional/manual nesta etapa.
- Clientes e Formulários não fazem parte da versão atual apresentada.
- PostgreSQL runtime está planejado para a fase de produção.
- Recuperação de senha e e-mails transacionais entram antes do beta.
- A IA depende de créditos e disponibilidade da OpenAI.

## 10. Checklist final

- [ ] Ambiente aberto.
- [ ] API validada.
- [ ] Usuários testados.
- [ ] Fluxo ADMIN testado.
- [ ] Fluxo OWNER testado.
- [ ] Fluxo EMPLOYEE testado.
- [ ] PDF testado.
- [ ] Módulos fora de escopo ocultos.
- [ ] Plano de contingência pronto.
- [ ] Nenhum segredo visível.
