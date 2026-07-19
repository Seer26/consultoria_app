# Roteiro de apresentação ao cliente

## Condição desta apresentação

O aplicativo roda localmente com Flutter como frontend e API Node/TypeScript como única fronteira com o SQLite operacional. Os registros apresentados devem ser cadastrados pelos fluxos oficiais e persistem entre reinicializações.

A infraestrutura em nuvem ainda não está publicada e o pagamento automático ainda não foi implementado. Starter e Growth continuam com controle manual pelo ADMIN.

Use somente informações empresariais autorizadas. Se o cliente não tiver autorizado os dados antes da reunião, faça o preenchimento assistido durante a sessão e não antecipe resultados.

## Preparação segura

Na API, use explicitamente:

```powershell
$env:APP_ENV='local'
$env:NODE_ENV='development'
$env:ENABLE_DEMO_SEED='false'
$env:SHOW_DEMO_CREDENTIALS='false'
$env:DATABASE_PATH='C:\Users\Pichau\consultoria_app\saas\apps\api\data\consultoria.sqlite'
cd C:\Users\Pichau\consultoria_app\saas
npm.cmd --workspace @consultoria/api start
```

No Flutter:

```powershell
cd C:\Users\Pichau\consultoria_app
flutter run -d chrome --dart-define=APP_ENV=local --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=SHOW_DEMO_CREDENTIALS=false
```

Antes da reunião:

- confirme `/health` e `/ready`;
- confirme que o arquivo ativo é `consultoria.sqlite`;
- confirme `ENABLE_DEMO_SEED=false`;
- mantenha o backup operacional fora do Git;
- não abra nem utilize `consultoria-presentation-demo.sqlite`;
- não exiba senhas, tokens ou chaves;
- confirme que os dados a cadastrar foram autorizados.

## Sequência da apresentação

### 1. Login ADMIN

Apresente o login real, o dashboard administrativo e o escopo global de consulta. Explique que ADMIN administra empresas, usuários e planos, mas não responde pesquisas.

### 2. Empresa e usuários

Pela tela Empresas:

1. cadastre a empresa autorizada, se ainda não existir;
2. crie o primeiro OWNER pelo onboarding;
3. crie um EMPLOYEE;
4. consulte os usuários ativos;
5. consulte o plano Starter associado;
6. mostre o histórico de plano sem trocar o plano desnecessariamente.

Não crie duplicação caso a empresa já exista.

### 3. Login OWNER

Saia do ADMIN e entre com o OWNER criado. Mostre:

- dashboard da própria empresa;
- Configurações da empresa;
- Plano atual;
- Pesquisa;
- Plano de ação;
- Relatórios.

### 4. Pesquisa e persistência parcial

Crie a pesquisa informando função e setor verdadeiros. Responda uma ou mais perguntas com conteúdo autorizado, volte ao histórico e abra novamente a pesquisa em andamento.

Use “Continuar pesquisa” para comprovar que perguntas e respostas anteriores vieram da API. Não use resposta preparada, score manual ou acesso direto ao banco.

### 5. Resultado

Finalize a pesquisa e confira:

- empresa e respondente;
- função e setor;
- score geral e scores por pilar;
- respostas registradas;
- pontos críticos;
- oportunidades;
- recomendações;
- próximos passos.

Explique que o núcleo atual calcula o resultado no backend por regras determinísticas. A geração da próxima pergunta pode usar OpenAI; indisponibilidade da integração deve aparecer de forma transparente, sem conteúdo inventado.

### 6. Plano de ação e tarefas

Gere o plano a partir da pesquisa finalizada. Depois:

1. confira as tarefas criadas;
2. crie uma tarefa manual;
3. edite título, descrição, pilar, prioridade, prazo, status e responsável;
4. escolha apenas usuário ativo da mesma empresa;
5. recarregue a tela para confirmar persistência.

Para demonstrar atraso, configure pela interface um vencimento anterior à data atual. Não altere o SQLite.

### 7. Dashboards

Volte ao dashboard OWNER e confira contadores, atrasos e listas atualizados. Evite interpretar números antes de conferir que correspondem aos registros inseridos na sessão.

### 8. Relatório executivo e PDF

Abra o relatório da pesquisa e confronte empresa, scores, narrativas e tarefas com o que foi cadastrado. Exporte o PDF e faça inspeção visual sem versioná-lo.

### 9. Login EMPLOYEE

Saia do OWNER e entre com o EMPLOYEE. Mostre o dashboard operacional, a pesquisa própria e as tarefas permitidas. Confirme o bloqueio de administração, plano e configurações da empresa.

### 10. Encerramento

Explique com clareza:

- o fluxo executado é real e persiste no banco local;
- a API é a única camada que acessa os dados;
- o isolamento multiempresa é coberto por E2E;
- nuvem, operação externa e pagamento automático ainda são etapas futuras;
- a reunião não constitui validação de produção.

## Plano de contingência

Se os dados autorizados não estiverem disponíveis, não crie empresa fictícia e não use o banco demo. Apresente login e navegação sem conteúdo confidencial, faça o cadastro assistido quando houver autorização ou reagende a parte funcional dependente de dados.

Se OpenAI estiver indisponível, informe que a resposta foi salva e finalize a pesquisa apenas quando houver conteúdo suficiente. Não substitua a IA por resposta fixa.

Se API ou banco falharem, interrompa a inserção, preserve o banco e use o backup apenas como evidência operacional. Não execute restore durante a apresentação.
