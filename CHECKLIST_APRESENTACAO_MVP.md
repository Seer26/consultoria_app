# Checklist de apresentação com dados autorizados

Não registre senhas, tokens, chaves ou respostas empresariais confidenciais neste arquivo.

## Ambiente

- [x] Perfil definido como `APP_ENV=local`.
- [x] `NODE_ENV=development`.
- [x] `ENABLE_DEMO_SEED=false`.
- [x] Credenciais demo ocultas com `SHOW_DEMO_CREDENTIALS=false`.
- [x] Startup local rejeita banco com nome de demo, E2E, teste ou staging.
- [ ] API iniciada para a reunião.
- [ ] `/health` retorna 200.
- [ ] `/ready` retorna 200.
- [ ] Flutter aponta para `http://127.0.0.1:3000`.

## Banco

- [x] Banco operacional identificado por caminho absoluto.
- [x] Banco confirmado como diferente do banco demo e dos bancos E2E.
- [x] `PRAGMA quick_check` retornou `ok`.
- [x] Backup consistente criado fora do Git.
- [x] Tamanho e SHA-256 registrados na evidência da Sprint 3.8.
- [x] Dataset oficial “Empresa Horizonte Consultoria Demo” ausente do banco operacional.
- [x] Nenhum banco demo está ativo no perfil local.
- [ ] Persistência validada depois do cadastro e da reinicialização da API.
- [ ] Restore não foi executado.

## Autorização dos dados

- [ ] Empresa autorizou o uso das informações.
- [ ] Campos necessários foram definidos sem dados sensíveis desnecessários.
- [ ] Responsável pela autorização foi registrado fora deste repositório.
- [ ] Nenhuma empresa fictícia foi criada.

## Empresa e usuários

- [ ] Empresa cadastrada pelo ADMIN ou já existente sem duplicação.
- [ ] Primeiro OWNER criado pelo onboarding oficial.
- [ ] EMPLOYEE criado pelo endpoint/tela oficial.
- [ ] Política de senha de no mínimo 8 caracteres respeitada.
- [ ] Perfis e empresa conferidos.
- [ ] Usuários ativos.
- [ ] Plano atual conferido.
- [ ] Histórico de plano conferido.
- [ ] Configurações básicas da empresa conferidas pelo OWNER.

## Login e sessão

- [ ] Login e logout ADMIN.
- [ ] Login e logout OWNER.
- [ ] Login e logout EMPLOYEE.
- [ ] Redirecionamento correto por perfil.
- [ ] Sessão persiste apenas conforme a autenticação normal.
- [ ] Nenhuma credencial foi exibida ou incorporada ao código.

## Pesquisa

- [ ] Pesquisa criada pelo aplicativo.
- [ ] Função e setor verdadeiros informados.
- [ ] Respostas autorizadas enviadas pela interface.
- [ ] Respostas parciais aparecem após sair e retornar.
- [ ] “Continuar pesquisa” retoma a submissão correta.
- [ ] Resultado calculado pelo backend.
- [ ] Score geral e pilares conferidos.
- [ ] Pontos críticos, oportunidades, recomendações e próximos passos conferidos.
- [ ] Resultado permanece após recarregar.

## Plano e tarefas

- [ ] Plano de ação gerado a partir da pesquisa finalizada.
- [ ] Tarefas persistem após recarregar.
- [ ] Origem, pilar, prioridade, prazo e status conferidos.
- [ ] Tarefa manual criada pela tela.
- [ ] Responsável ativo e da mesma empresa.
- [ ] Edição completa validada.
- [ ] Atraso configurado pela tela, quando necessário.
- [ ] Badge, dias de atraso e filtros conferidos.

## Dashboards

- [ ] Dashboard OWNER corresponde aos dados cadastrados.
- [ ] Dashboard EMPLOYEE corresponde às tarefas atribuídas.
- [ ] Contadores e listas atualizam após edição.
- [ ] Nenhum fallback ou conteúdo demo aparece.

## Relatório e PDF

- [ ] Relatório corresponde à empresa e à pesquisa cadastradas.
- [ ] Scores, narrativas e tarefas conferidos.
- [ ] Página recarregada sem perda de conteúdo.
- [ ] PDF retorna HTTP 200 e `application/pdf`.
- [ ] Nome, empresa, pilares, recomendações e tarefas conferidos.
- [ ] Acentuação e quebra de página inspecionadas visualmente.
- [ ] Nenhum conteúdo demo aparece.
- [ ] PDF não foi versionado.

## Segurança

- [ ] ADMIN não responde pesquisa.
- [ ] OWNER acessa apenas a própria empresa.
- [ ] EMPLOYEE acessa apenas dados permitidos.
- [ ] Usuário de outra empresa é recusado.
- [ ] Usuário inativo é recusado como responsável.
- [ ] Tenant arbitrário é recusado.
- [ ] Logout elimina o acesso autenticado.

## Encerramento

- [ ] API reiniciada de forma segura.
- [ ] Empresa, usuários, pesquisa, respostas, resultado, tarefas e relatório continuam disponíveis.
- [ ] Evidência atualizada sem conteúdo confidencial.
- [ ] Decisão de apresentação revisada.
- [ ] Nuvem e pagamento automático descritos como pendências.
