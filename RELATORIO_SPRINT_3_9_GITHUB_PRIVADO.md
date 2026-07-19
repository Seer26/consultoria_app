# Relatório da Sprint 3.9 — GitHub Privado

Data: 19/07/2026.

## 1. Objetivo

Publicar com segurança a baseline validada do Consultoria SaaS em um
repositório GitHub privado, permitindo clonagem e desenvolvimento em outro
dispositivo sem versionar banco, secrets, backups, dependências ou artefatos
compilados.

Esta sprint não inclui deploy, alteração de `main`, publicação de tag,
PostgreSQL, pagamentos ou abertura automática de pull request.

## 2. Estado alcançado

Estado concluído:

- baseline local preservada na branch `codex/release-baseline`;
- histórico anterior consolidado neste relatório;
- relatório 3.6 substituído pelo relatório 3.9;
- remoto e privacidade verificados;
- auditorias de arquivos proibidos e secrets aprovadas;
- documentação de revisão e de novo dispositivo preparada;
- validação obrigatória concluída com sucesso;
- banco operacional, WAL e SHM preservados byte a byte;
- branch publicada no GitHub privado;
- clonagem limpa validada e diretório temporário removido;
- `main`, tag, deploy e pull requests não alterados.

## 3. Histórico consolidado das sprints anteriores

O produto começou como MVP de demonstração com Flutter, API Node/TypeScript,
pesquisa, diagnóstico, plano de ação, dashboard, relatório executivo e PDF.
Empresa tornou-se o tenant central, e a API permaneceu como única fronteira de
acesso aos dados.

As Sprints 1 a 2.5 consolidaram cadastro administrativo de empresa, primeiro
OWNER, EMPLOYEE, isolamento multiempresa, planos Starter/Growth, limites,
alteração manual de plano, histórico, configurações da empresa, sessão e
onboarding beta.

As Sprints 3.0 a 3.2 reforçaram autenticação e autorização, recuperação de
senha, rate limits, JWT revogável, logs sanitizados, request ID, health,
readiness, métricas, alertas, aceite legal e backup/restore SQLite.

As Sprints 3.3 a 3.5 prepararam Docker, Flutter Web/Nginx, staging, seed
sintético isolado, runbooks e documentação operacional, sem publicar um
ambiente externo.

As Sprints 3.7 e 3.8 estabilizaram a apresentação local, removeram fallback
demonstrativo do dashboard, permitiram retomada de pesquisa parcial, alinharam
a senha mínima e impediram bancos demo/E2E/teste/staging no perfil local.

A Sprint 3.6 criou a baseline Git segura: backup consistente, remoção de
dependências, builds e SQLite do índice, auditoria de secrets, branch
`codex/release-baseline`, commit funcional `327fce5`, commit documental
`0c0e032` e tag anotada local `baseline-pre-cloud-2026-07-19`.

## 4. Estado inicial

- branch: `codex/release-baseline`;
- HEAD: `0c0e0325dbd1dc951ce1c3c1b5014bc2510032a8`;
- commit funcional: `327fce5`;
- base remota: `origin/main` em `e039fc6`;
- tag local: `baseline-pre-cloud-2026-07-19`, apontando para `0c0e032`;
- worktree e índice: limpos;
- upstream da branch: inexistente;
- branch remota de baseline: inexistente;
- `main` remota: única branch encontrada no início;
- push anterior: nenhum.

## 5. Remoto Git

- nome: `origin`;
- repositório: `Seer26/consultoria_app`;
- protocolo: HTTPS;
- URL sem credencial embutida;
- Git Credential Manager configurado;
- acesso autenticado somente leitura confirmado por `git ls-remote`;
- remoto contém `main` em `e039fc6`.

Nenhuma URL com token foi exibida ou registrada.

## 6. Privacidade do repositório

A privacidade foi comprovada por verificação cruzada:

- o acesso Git autenticado encontrou o repositório e a branch `main`;
- uma consulta anônima à API pública do GitHub retornou HTTP 404;
- o conector GitHub sem acesso a esse repositório também retornou 404.

O conjunto de evidências confirma que o remoto existe para a credencial local,
mas não é publicamente visível.

## 7. Auditoria pré-publicação

O diff entre `origin/main` e a baseline foi revisado por `--stat`,
`--name-status` e por arquivos adicionados/modificados. Conteúdo classificado:

- Flutter: 98 caminhos;
- API: 95 caminhos;
- migrations: 4;
- testes: 14;
- CI: 1;
- deploy/configuração: 10;
- documentação: 38;
- scripts: 2.

As exclusões volumosas no diff correspondem à retirada intencional de
`node_modules`, `dist` e do SQLite que estavam no commit inicial. Nenhum
histórico foi reescrito.

## 8. Secrets

Auditoria por nomes e formatos, sem imprimir valores:

- chaves privadas: zero;
- tokens com formato OpenAI/GitHub: zero;
- `.env` real: zero;
- `.secrets*`: zero;
- quatro arquivos com URLs contendo usuário/senha são exclusivamente exemplos
  locais/placeholders em documentação, `.env.example` e Compose;
- referências a nomes como `JWT_SECRET`, `OPENAI_API_KEY`, `DATABASE_URL`,
  `PASSWORD`, `TOKEN` e `SECRET` são contratos de configuração, testes ou
  documentação, não valores reais.

Não foi identificada necessidade de rotação automática.

## 9. Arquivos proibidos

No estado rastreado:

- `node_modules`: zero;
- `dist`: zero;
- `build`: zero;
- `.dart_tool`: zero;
- `coverage`: zero;
- SQLite, WAL, SHM ou `.db`: zero;
- backup/dump como artefato: zero;
- `.env` real: zero;
- `.secrets*`: zero;
- logs: zero;
- PDFs: zero.

`saas/apps/api/.env.example` permanece versionado por conter apenas contrato e
placeholders. Documentos e código com “backup” no nome são fontes e
documentação operacional, não arquivos de backup.

## 10. Testes executados

Validação final aprovada:

- `flutter pub get`: aprovado;
- `flutter analyze`: aprovado, sem issues;
- `flutter test --reporter expanded`: 19/19 aprovados;
- build da API: aprovado;
- suíte agregada da API: aprovada, incluindo unitários, operações e E2E;
- smoke da API: aprovado;
- build raiz: domínio, API e frontend Vite aprovados.

A primeira execução de `flutter test` ficou sem saída até o timeout de 180
segundos no sandbox. Não restou processo de teste. A repetição autorizada,
isolada e fora dessa restrição passou em 7,5 segundos.

Os testes da API utilizaram bancos temporários e os removeram. O banco
operacional permaneceu com 131.072 bytes e SHA-256
`8F914633CB20580C9FD51B15AE938155AF99B48A78F5BED3E7B0847922A6A021`.
O WAL permaneceu com 226.632 bytes e SHA-256
`6EFB2EA82DD12CB63746D324B8192DB27713EE87923105DF1F28528D3F60FF4F`.
O SHM permaneceu com 32.768 bytes e SHA-256
`089354E6C7B52B5868794FB729C50AB9A05B49C0FF4DD9580F7249420FB83F9A`.

## 11. Branch publicada

A branch foi publicada com sucesso:

```powershell
git push -u origin codex/release-baseline
```

- commit publicado inicialmente: `459015076cf2f1873236d1273b8128bd4a05ab11`;
- upstream: `origin/codex/release-baseline`;
- branch remota criada sem force push;
- `main` permaneceu em `e039fc6`;
- nenhum merge foi executado.

O commit documental final deste relatório é posterior ao primeiro push e pode
ser confirmado no topo de `git log`.

## 12. Tag local

Tag anotada:

```text
baseline-pre-cloud-2026-07-19
```

Ela aponta para `0c0e0325dbd1dc951ce1c3c1b5014bc2510032a8` e permanecerá
somente local, aguardando revisão humana da branch.

## 13. Revisão no GitHub

O procedimento está em `docs/REVISAO_BASELINE_GITHUB.md`. A branch apareceu no
remoto e o próprio GitHub ofereceu o link padrão para criar PR. Nenhum PR foi
aberto, nenhum merge ocorreu e `main` não foi alterada.

## 14. Validação por clonagem limpa

Clonagem executada fora do projeto em diretório temporário:

```text
C:\tmp\consultoria-sprint-3-9-clean-clone-20260719
```

Estado inicial da cópia:

- branch `codex/release-baseline`;
- commit `459015076cf2f1873236d1273b8128bd4a05ab11`;
- 457 arquivos rastreados;
- zero arquivos proibidos rastreados;
- `pubspec.lock` e `saas/package-lock.json` presentes;
- zero SQLite, backup, `.env.local`, `node_modules` ou `dist`;
- worktree limpo antes da geração local.

Validação na cópia:

- `flutter pub get`: aprovado;
- `flutter analyze`: aprovado, sem issues;
- `npm.cmd install`: aprovado, 259 pacotes instalados;
- `npm.cmd run build`: domínio, API e web aprovados;
- build isolado da API, após o domínio: aprovado.

O primeiro `npm.cmd install` e a primeira emissão de `dist` foram bloqueados
pelo sandbox. A repetição autorizada no diretório temporário passou.

O build isolado da API antes do domínio também acusou a dependência
`@consultoria/domain`; o fluxo documentado `npm.cmd run build` já usa a ordem
correta domínio → API → web. Depois desse build, a API isolada passou.

O `npm install` reportou 6 vulnerabilidades nas dependências: 2 baixas, 3
moderadas e 1 alta. Nenhum `npm audit fix` foi executado para não alterar
dependências ou lockfile sem análise específica.

No Windows, após `flutter pub get`, sete registradores gerados desktop ficaram
marcados no status por normalização LF/CRLF, embora `git diff` não exibisse
mudança lógica e os hashes de blob informados permanecessem iguais. O clone
inicial era limpo e o código compilou; a normalização deve ser tratada em uma
sprint de higiene multiplataforma.

O diretório temporário foi removido explicitamente após a validação.

## 15. Configuração em outro dispositivo

`docs/CONFIGURACAO_NOVO_DISPOSITIVO.md` foi atualizado com Git/GitHub, clone da
branch, Flutter, Node.js, `.env.local`, banco local próprio, inicialização,
testes, pull, commit, push e conflitos.

O banco operacional, `.env.local` e secrets não são transferidos pelo GitHub.

## 16. Estado final do Git

- branch `codex/release-baseline`;
- upstream `origin/codex/release-baseline`;
- commit de publicação inicial `4590150`;
- commit documental final posterior, sem mudança funcional;
- `main` local e remota em `e039fc6`;
- tag `baseline-pre-cloud-2026-07-19` somente local em `0c0e032`;
- nenhum force push, merge, PR ou deploy;
- worktree esperado limpo após o commit documental final.

## 17. Falhas encontradas

- GitHub CLI (`gh`) não está instalado;
- o conector GitHub não possui acesso ao repositório privado;
- a rede do sandbox bloqueou a primeira tentativa de consulta;
- a verificação somente leitura foi repetida com autorização e concluída.
- o primeiro `flutter test` ficou sem saída no sandbox e passou na repetição;
- instalação e build do clone exigiram execução fora do sandbox;
- build isolado da API exige que o domínio seja compilado antes;
- Flutter marcou sete arquivos gerados por LF/CRLF no clone Windows, sem diff
  lógico.

O Git Credential Manager local permite o acesso necessário sem expor
credenciais. A ausência do `gh` impede automações de PR, que não fazem parte
desta sprint.

## 18. Riscos restantes

- baseline ampla, acumulando várias sprints;
- SQLite limitado a instância única;
- banco operacional e backup dependem deste dispositivo;
- staging, produção e restore remoto não comprovados;
- runtime direto de `dist/server.js` não é o runtime operacional suportado;
- OpenAI depende de chave, crédito e disponibilidade;
- dados reais autorizados ainda não completaram a validação funcional;
- revisão humana da branch continua obrigatória.
- `npm install` reporta 6 vulnerabilidades, incluindo 1 alta;
- normalização LF/CRLF dos registradores Flutter pode sujar o status em um
  clone Windows após `flutter pub get`.

## 19. Pendências externas

- provedor, domínio, DNS e HTTPS;
- PostgreSQL e migração de dados;
- backup remoto;
- e-mail transacional;
- coleta externa de logs e alertas;
- revisão jurídica;
- suporte e SLA;
- chave/orçamento OpenAI de staging;
- autorização e dados para validação real.

## 20. Critérios de aceite

- [x] histórico do relatório 3.6 consolidado;
- [x] documentos permanentes preservados;
- [x] referências ao relatório removido verificadas;
- [x] remoto correto confirmado;
- [x] privacidade confirmada;
- [x] banco, backup, secrets e artefatos fora do estado rastreado;
- [x] testes finais aprovados;
- [x] branch publicada;
- [x] `main` não alterada;
- [x] nenhum force push;
- [x] tag não publicada;
- [x] clonagem limpa validada;
- [x] documentação de novo dispositivo atualizada;
- [x] nenhum deploy executado.

## 21. Recomendação para a próxima sprint

Revisar a branch no GitHub e somente então decidir sobre um pull request e a
futura publicação da tag. Antes disso, abrir uma sprint curta para analisar a
vulnerabilidade alta apontada pelo npm e padronizar LF/CRLF dos arquivos Flutter
gerados. O beta externo permanece NO-GO até que infraestrutura, persistência,
backup, e-mail, jurídico e suporte estejam aprovados.

## Histórico consolidado das sprints anteriores

O histórico necessário das Sprints 1 a 3.8 está preservado nas seções 3, 17,
18 e 19 deste relatório, incluindo:

- arquitetura Flutter + API Node/TypeScript;
- empresa como tenant;
- ADMIN administra e consulta, mas não responde pesquisas;
- OWNER e EMPLOYEE limitados à própria empresa;
- planos Starter/Growth com cobrança manual;
- seeds somente em bancos isolados;
- SQLite local nesta etapa;
- dados reais somente com autorização;
- testes acumulados e limitações operacionais;
- baseline, backup, commits, tag e decisão NO-GO.

## Limpeza de relatórios anteriores

### Relatório anterior lido

- `RELATORIO_SPRINT_3_6_BASELINE_GIT.md`, lido integralmente.

### Informações consolidadas

Foram consolidados decisões arquiteturais, funcionalidades concluídas,
pendências, riscos, limitações, banco operacional, backup, retirada de
artefatos do índice, auditoria de secrets, branch, commits, tag, testes,
reprodutibilidade e decisão GO/NO-GO.

### Arquivo removido

- `RELATORIO_SPRINT_3_6_BASELINE_GIT.md`.

### Documentos preservados

Foram preservados `VALIDACAO_FUNCIONAL_DADOS_REAIS.md`,
`ROTEIRO_APRESENTACAO_CLIENTE.md`, checklists, `GO_NO_GO_BETA.md`, todo o
conteúdo de `docs/` e `deploy/`, código, migrations, testes, configurações,
rascunhos jurídicos e bancos locais ignorados.

`docs/RELATORIO_STATUS_CLIENTE.md` foi preservado por ser documentação
permanente de status do cliente, não relatório de sprint duplicado.

### Referências atualizadas

Nenhum outro arquivo referenciava diretamente
`RELATORIO_SPRINT_3_6_BASELINE_GIT.md`. Não houve link quebrado a corrigir. O
histórico de sprints passa a ser concentrado neste relatório 3.9.
