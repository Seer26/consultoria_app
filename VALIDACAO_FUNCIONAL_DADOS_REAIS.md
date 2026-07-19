# Validação Funcional com Dados Reais

Data da auditoria técnica: 19/07/2026.

## Ambiente utilizado

Perfil local operacional:

```text
APP_ENV=local
NODE_ENV=development
ENABLE_DEMO_SEED=false
SHOW_DEMO_CREDENTIALS=false
```

A API iniciou com esse perfil e respondeu `200` em `/health` e `/ready`. O Flutter permanece configurável por `APP_ENV` e `API_BASE_URL`; credenciais demo não são exibidas em `local`.

## Banco utilizado

Banco operacional: `C:\Users\Pichau\consultoria_app\saas\apps\api\data\consultoria.sqlite`.

O arquivo é persistente, não é temporário e não possui nome de demo, E2E, teste ou staging. Uma consulta somente leitura confirmou ausência dos IDs fixos e da empresa do dataset oficial de apresentação.

## Backup realizado

Backup consistente criado antes da validação em:

`C:\tmp\consultoria-sprint-3-8-backups\consultoria-2026-07-19T17-42-26-051Z.backup.sqlite`

- origem: 131.072 bytes;
- SHA-256 da origem antes do startup: `8F914633CB20580C9FD51B15AE938155AF99B48A78F5BED3E7B0847922A6A021`;
- backup consistente: 176.128 bytes;
- SHA-256 do backup: `71B613848C071B601E689F41153E8D1C5270B8B77FC517F00B296C5BDE2BDB33`;
- `PRAGMA quick_check`: `ok` na origem e no backup;
- restore: não executado.

O tamanho do backup difere porque a rotina oficial incorpora o WAL em uma cópia consistente.

## Empresa cadastrada

Não executado. Nenhuma informação empresarial real/autorizada foi fornecida nesta tarefa. Nenhuma empresa fictícia foi criada e nenhuma duplicação foi introduzida.

## Usuários cadastrados

Não executado pela mesma dependência de autorização. O fluxo ADMIN de onboarding e criação de usuários permanece disponível. A validação do Flutter foi alinhada à política do backend: senha mínima de 8 caracteres, inclusive em alteração opcional.

## Login por perfil

Não foram usadas credenciais existentes nem criadas credenciais artificiais no banco operacional. Os testes automatizados isolados continuam cobrindo ADMIN, OWNER e EMPLOYEE, mas não são tratados como evidência de login com dados reais.

## Pesquisa criada

Não executado sem função, setor e empresa autorizados. O fluxo oficial continua sendo `POST /research/submissions` por OWNER ou EMPLOYEE.

## Respostas persistidas

Não foram inseridas respostas. A interface foi corrigida para recuperar respostas existentes pela API e permitir que o próprio respondente retome uma pesquisa em andamento pelo botão “Continuar pesquisa”.

## Resultado calculado

Não executado com dados reais. O resultado continua calculado no backend por regras determinísticas a partir das respostas persistidas. A integração OpenAI é usada para geração da próxima pergunta e mantém tratamento explícito de indisponibilidade; não há substituição por resposta empresarial fabricada.

## Plano de ação gerado

Não executado sem pesquisa real concluída. A geração oficial permanece vinculada à submissão e cria tarefas persistidas pela API.

## Tarefas criadas e editadas

Não executado no banco operacional. Criação, edição, responsável, prioridade, vencimento e status permanecem disponíveis pelos endpoints e telas oficiais.

## Dashboard atualizado

O fallback com conteúdo demonstrativo foi removido. Em ausência de resposta válida da API, a tela exibe estado de erro/ausência de dados e oferece nova tentativa.

Não foi possível comprovar atualização com dados reais porque nenhuma entrada autorizada foi fornecida.

## Relatório validado

Não executado com pesquisa real. O relatório continua derivado da submissão, resultado e tarefas persistidos no backend.

## PDF validado

Não foi gerado PDF do banco operacional, pois isso exigiria uma pesquisa real concluída. A geração automatizada isolada permanece coberta por E2E, sem ser apresentada como evidência real.

## Persistência após reinicialização

O banco operacional foi aberto pelo startup oficial, e `/health` e `/ready` retornaram 200 no perfil local. A persistência do conjunto empresa → usuários → pesquisa → resultado → tarefas → relatório ainda precisa ser comprovada depois que dados autorizados forem cadastrados.

## Isolamento multiempresa

A suíte E2E usa bancos temporários e valida isolamento de empresas, pesquisas, tarefas, responsáveis, dashboards, relatórios e PDFs. Não havia duas empresas reais autorizadas para repetir esse ensaio no banco operacional.

## Falhas encontradas

- perfil local não diferenciava obrigatoriamente banco operacional de nomes de banco demo/E2E;
- dashboard ainda continha fallback com frases de demonstração;
- pesquisa parcial não possuía retomada funcional pela interface;
- Flutter aceitava senha mínima de 6 caracteres enquanto o backend exige 8;
- execução direta de `node dist/server.js` falha devido a imports ESM sem extensão; o comando suportado `npm run start` usa `tsx` e funciona;
- não há dados empresariais reais autorizados para concluir as etapas funcionais.

## Correções realizadas

- guarda de startup para `APP_ENV=local`, `NODE_ENV=development`, seed explicitamente desligado, SQLite com caminho absoluto e nome não demonstrativo;
- teste unitário da guarda local;
- remoção do fallback do dashboard;
- retomada de pesquisa parcial usando apenas dados carregados pela API;
- senha mínima do Flutter alinhada para 8 caracteres;
- `.env.example`, roteiro e checklist atualizados para o perfil operacional.

## Limitações atuais

- validação funcional real depende de dados e credenciais autorizados;
- infraestrutura permanece local, sem publicação em nuvem;
- pagamento continua manual;
- SQLite exige operação cuidadosa e backup;
- geração de próxima pergunta por IA depende de chave, crédito e disponibilidade;
- o build TypeScript valida compilação, mas o runtime suportado continua sendo `npm run start`/`tsx`, não `node dist/server.js`.

## Decisão para apresentação

**APROVADO COM RESTRIÇÕES**

O aplicativo está tecnicamente preparado para uma sessão assistida em ambiente local e o banco operacional está protegido. Antes de apresentar resultados como validados, o cliente ou a empresa responsável deve fornecer dados autorizados e concluir pela interface o checklist funcional pendente. Sem isso, não se deve afirmar que pesquisa, resultado, plano, dashboards, relatório e PDF foram validados com dados reais.
