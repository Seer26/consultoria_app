# Relatório da Sprint 3.10 — Hardening do Repositório

Data: 19/07/2026.

## 1. Objetivo

Corrigir as vulnerabilidades conhecidas nas dependências Node.js, estabilizar
as quebras de linha entre Windows, Linux e CI e revisar a branch publicada
antes de qualquer pull request ou futura migração para PostgreSQL.

O escopo foi exclusivamente de dependências, Git e documentação. Não houve
funcionalidade nova, deploy, pagamento, migration, alteração de regra
multiempresa ou uso do banco operacional.

## 2. Estado alcançado

- branch `codex/dependency-hardening` criada a partir da baseline publicada;
- audit npm reduzido de 6 para 0 vulnerabilidades;
- nenhuma atualização forçada ou de major;
- manifests preservados; somente `saas/package-lock.json` mudou;
- `.gitattributes` ampliado com política explícita de texto e binários;
- sete registradores desktop gerados pelo Flutter preservados e estáveis;
- `flutter pub get` e `npm install` sem novas mudanças rastreadas;
- testes Flutter, API, smoke e build raiz aprovados;
- SQLite operacional, WAL e SHM preservados byte a byte;
- documentação de revisão e novo dispositivo atualizada;
- relatório 3.9 consolidado e removido explicitamente;
- `main`, tag local, deploy e pull requests não alterados.

## 3. Histórico consolidado das sprints anteriores

O produto evoluiu de um MVP Flutter + API Node/TypeScript para um SaaS
multiempresa com empresa como tenant central. ADMIN administra e consulta;
OWNER e EMPLOYEE operam somente dentro da própria empresa. Pesquisa,
diagnóstico, plano de ação, dashboard, relatório executivo e PDF estão
validados.

As Sprints 1 a 2.5 acrescentaram onboarding de empresa e primeiro OWNER,
isolamento multiempresa, planos Starter/Growth, limites internos, troca manual
de plano, histórico, configurações da empresa e onboarding beta.

As Sprints 3.0 a 3.5 reforçaram autenticação, recuperação de senha, JWT
revogável, rate limits, logs sanitizados, health/readiness, métricas, alertas,
aceite legal, backup/restore SQLite, Docker, staging e dados sintéticos
isolados.

As Sprints 3.6 a 3.9 consolidaram a baseline Git, removeram banco,
dependências e builds do índice, auditaram secrets, criaram backup consistente,
publicaram `codex/release-baseline` no GitHub privado e validaram um clone
limpo. Ficaram abertas duas pendências: 6 vulnerabilidades npm e instabilidade
LF/CRLF em sete arquivos Flutter gerados no Windows.

## 4. Estado inicial do Git

- branch: `codex/release-baseline`;
- HEAD inicial: `668ac3c0c512a1e804b3d72d565660558cbf67f1`;
- upstream: `origin/codex/release-baseline`;
- worktree: limpo;
- `main` local e remota: `e039fc6`;
- tag local `baseline-pre-cloud-2026-07-19`: apontando para `0c0e032`;
- tag remota: inexistente;
- banco, WAL, SHM, backup, `.env.local`, secrets e artefatos: sem pendências
  rastreadas.

A branch `codex/dependency-hardening` foi criada diretamente desse estado, sem
alterar `main` e sem reescrever histórico.

## 5. Auditoria npm inicial

Comandos executados em `saas`:

```powershell
npm.cmd audit
npm.cmd audit --json
npm.cmd outdated
npm.cmd audit fix --dry-run
npm.cmd explain @babel/core
npm.cmd explain esbuild
npm.cmd explain qs
npm.cmd explain body-parser
npm.cmd explain express
npm.cmd explain vite
```

Resultado inicial:

- críticas: 0;
- altas: 1;
- moderadas: 3;
- baixas: 2;
- total: 6.

O `outdated` também mostrou atualizações principais de vários pacotes. Elas
foram deliberadamente excluídas desta sprint por não serem necessárias para
corrigir as vulnerabilidades.

## 6. Vulnerabilidades identificadas

| Pacote | Severidade | Relação e caminho | Antes → correção | Superfície | Impacto e risco de quebra |
| --- | --- | --- | --- | --- | --- |
| `@babel/core` | baixa | transitiva: `@vitejs/plugin-react` → Babel | 7.29.0 → 7.29.7 | build/desenvolvimento | leitura arbitrária por `sourceMappingURL`; sem runtime da API; patch compatível |
| `esbuild` | baixa | transitiva de `tsx` direto | 0.27.7 → 0.28.1, via `tsx` 4.21.0 → 4.23.1 | ferramenta do runtime local/desenvolvimento | leitura arbitrária ao servir arquivos no Windows; sem servidor esbuild exposto; atualização dentro de `^4.19.3` |
| `qs` | moderada | transitiva: `express`/`body-parser` → `qs` | 6.14.2 → 6.15.3 | runtime da API | negação de serviço em serialização específica; patch compatível |
| `body-parser` | moderada | transitiva de `express` | 1.20.4 → 1.20.6 | runtime da API | herdava a vulnerabilidade de `qs`; patch compatível |
| `express` | moderada | dependência direta da API | 4.22.1 → 4.22.2 | runtime da API | caminho HTTP/parsing afetado via `qs`; patch dentro da major 4 |
| `vite` | alta agregada | dependência direta de desenvolvimento do web | 6.4.2 → 6.4.3 | desenvolvimento/build | bypass de `server.fs.deny` e problema Windows no servidor de desenvolvimento; não usado como servidor de produção, mas corrigido por patch |

## 7. Classificação de risco

- crítica para runtime: nenhuma;
- alta para runtime da API: nenhuma;
- runtime HTTP/parsing: `express`, `body-parser` e `qs`, todos corrigidos;
- apenas desenvolvimento/build: Babel e Vite;
- ferramenta do runtime local: `tsx`/`esbuild`, sem servidor esbuild
  publicamente exposto, mas corrigido;
- falso positivo contextual: nenhum foi descartado apenas por ser transitivo;
- requer atualização direta: `tsx`, dentro da faixa já declarada;
- requer substituição de dependência: nenhuma;
- sem correção disponível: nenhuma;
- breaking change necessário: nenhum.

A vulnerabilidade alta do Vite não fazia parte do runtime de produção da API,
mas foi tratada como prioridade por afetar o ambiente Windows e possuir patch
compatível.

## 8. Correções aplicadas

Foi executado `npm.cmd audit fix` sem `--force`. O comando atualizou somente o
lockfile, incluindo Babel 7.29.7, Express 4.22.2, body-parser 1.20.6, qs 6.15.3
e Vite 6.4.3.

Restou uma vulnerabilidade baixa em `esbuild` 0.27.7. Os metadados oficiais do
`tsx` 4.23.1 confirmaram Node `>=18` e dependência `esbuild ~0.28.0`. Como o
manifest já permitia `tsx ^4.19.3`, foi executado:

```powershell
npm.cmd update tsx --workspace @consultoria/api
```

O resultado foi `tsx` 4.23.1 e `esbuild` 0.28.1. Nenhum `package.json` mudou,
nenhuma dependência funcional foi removida e nenhuma major foi adotada.

Uma instalação limpa por `npm.cmd ci` também eliminou um `node_modules` local
obsoleto que ainda continha Vite 6.4.2. Depois dela, o binário executado,
`npm ls` e o lockfile ficaram alinhados em Vite 6.4.3.

## 9. Auditoria npm final

Resultado final de `npm.cmd audit` e `npm.cmd audit --json`:

- críticas: 0;
- altas: 0;
- moderadas: 0;
- baixas: 0;
- total: 0.

`npm install` passou com 261 pacotes auditados e não alterou arquivos
rastreados. O aviso de descontinuação de `prebuild-install@7.1.3` é uma
pendência de manutenção transitiva, não uma vulnerabilidade registrada.

## 10. Política LF/CRLF

O `.gitattributes` passou a definir:

- `* text=auto` como base;
- LF para Dart, TypeScript, JavaScript, JSON, YAML, Markdown, shell, C/C++,
  CMake, Swift, SQL e demais fontes portáveis;
- CRLF para `.ps1`, `.bat` e `.cmd`;
- tratamento binário para imagens, fontes, PDF, arquivos compactados e bancos.

Em Windows, a recomendação local é:

```powershell
git config core.autocrlf false
git config core.eol lf
```

As regras do repositório permanecem autoritativas.

## 11. Arquivos Flutter gerados

Os sete arquivos são gerados oficialmente pelo Flutter, trazem a marca
“Generated file. Do not edit.” e são necessários aos builds desktop:

- `linux/flutter/generated_plugin_registrant.cc`;
- `linux/flutter/generated_plugin_registrant.h`;
- `linux/flutter/generated_plugins.cmake`;
- `macos/Flutter/GeneratedPluginRegistrant.swift`;
- `windows/flutter/generated_plugin_registrant.cc`;
- `windows/flutter/generated_plugin_registrant.h`;
- `windows/flutter/generated_plugins.cmake`.

Eles já possuíam conteúdo lógico e blobs LF estáveis no índice. Foram
preservados, não ignorados nem removidos. Após a política explícita, todos
aparecem como `i/lf`, `w/lf`, `eol=lf`; seus hashes permaneceram iguais antes e
depois de `flutter pub get`.

## 12. Renormalização

Foi executado `git add --renormalize .` após a atualização do
`.gitattributes`. A revisão do índice mostrou somente:

- `.gitattributes`, alteração intencional;
- `saas/package-lock.json`, já alterado pela correção de dependências.

Nenhum dos demais arquivos foi regravado. O lockfile foi retirado somente do
staging, sem alterar o worktree, para separar os commits temáticos. Não foram
usados reset destrutivo, `git clean`, restauração ampla ou adição irrestrita.

## 13. Testes Flutter

- `flutter pub get`: aprovado;
- verificação do status após `pub get`: limpa;
- hashes dos sete registradores: inalterados;
- `flutter analyze`: aprovado, sem issues;
- `flutter test --reporter expanded`: 19/19 testes aprovados.

A primeira tentativa de `flutter pub get` e a primeira de `flutter test`
ficaram sem saída até o timeout no sandbox. Não restaram processos órfãos nem
mudanças rastreadas. As repetições autorizadas fora dessa restrição passaram em
2,7 e 7 segundos, respectivamente.

## 14. Testes da API

Todos os comandos obrigatórios passaram:

- `npm.cmd install`;
- build isolado da API;
- `test:unit`;
- `test:operations`;
- `test:e2e`;
- agregador `test`;
- `test:smoke`;
- build raiz, na ordem domínio → API → web.

Depois de `npm ci`, o agregador, o smoke e o build raiz foram repetidos sobre
as dependências exatas do lockfile e passaram. O build final confirmou Vite
6.4.3.

As suítes comprovaram política de senha, sanitização de logs, isolamento
multiempresa, permissões, rate limits, recuperação de senha, revogação de
sessão, health/readiness, aceite legal, backup/restore temporário, relatório e
PDF. Os bancos temporários foram removidos.

O banco operacional permaneceu com:

- SQLite: 131.072 bytes; SHA-256
  `8F914633CB20580C9FD51B15AE938155AF99B48A78F5BED3E7B0847922A6A021`;
- WAL: 226.632 bytes; SHA-256
  `6EFB2EA82DD12CB63746D324B8192DB27713EE87923105DF1F28528D3F60FF4F`;
- SHM: 32.768 bytes; SHA-256
  `089354E6C7B52B5868794FB729C50AB9A05B49C0FF4DD9580F7249420FB83F9A`.

## 15. Clonagem limpa

A clonagem local temporária da branch será registrada nesta seção após o
commit documental. O roteiro inclui `flutter pub get`, status, analyze,
instalação npm, audit, build raiz, busca de arquivos proibidos e remoção
explícita da cópia.

## 16. Branch e commits

Branch:

```text
codex/dependency-hardening
```

Commits temáticos já criados:

```text
23feb6e chore: normalize repository line endings
fc29f7b chore: remediate dependency vulnerabilities
```

O commit documental será criado somente com os documentos consolidados e a
remoção explícita do relatório anterior.

## 17. Publicação da branch

A branch ainda não foi publicada nesta etapa do relatório. O push ocorrerá
somente após commit documental, clone limpo, auditoria final do diff e
confirmação de worktree limpo.

Não haverá force push, tag, PR, merge ou alteração de `main`.

## 18. Estado final do Git

Estado esperado ao encerrar:

- branch `codex/dependency-hardening`;
- upstream `origin/codex/dependency-hardening`;
- worktree limpo;
- `main` em `e039fc6`;
- tag `baseline-pre-cloud-2026-07-19` somente local;
- nenhum arquivo proibido ou secret rastreado;
- três grupos temáticos de commits;
- nenhuma mudança funcional.

## 19. Falhas encontradas

- operações Flutter ficaram sem saída no sandbox e passaram ao serem repetidas
  no ambiente autorizado;
- o `node_modules` local manteve Vite 6.4.2 após a primeira atualização do
  lockfile; `npm ci` alinhou a instalação para 6.4.3;
- o PowerShell 5 não converteu o `package-lock.json` em objeto por colisão
  case-insensitive de nomes; a conferência de versões foi feita diretamente no
  lockfile;
- nenhuma falha funcional ou regressão permaneceu.

## 20. Riscos restantes

- dependências continuam exigindo audit periódico;
- `prebuild-install@7.1.3` está descontinuado como transitiva do addon nativo,
  embora não possua vulnerabilidade no audit atual;
- Flutter possui muitas versões principais futuras disponíveis, não avaliadas
  nesta sprint;
- SQLite continua limitado a instância única;
- staging, produção, restore remoto e dados reais autorizados não foram
  comprovados;
- revisão humana antes de PR/merge continua obrigatória.

## 21. Pendências externas

- revisão humana da branch;
- decisão separada sobre pull request e merge;
- provedor, domínio, DNS e HTTPS;
- PostgreSQL e migração autorizada de dados;
- backup remoto;
- e-mail transacional;
- coleta externa de logs e alertas;
- revisão jurídica, suporte e SLA;
- chave e orçamento OpenAI para ambiente externo.

## 22. Critérios de aceite

- [x] relatório 3.9 lido e consolidado;
- [x] relatório 3.10 criado como principal;
- [x] documentos permanentes preservados;
- [x] referências verificadas e atualizadas;
- [x] vulnerabilidade alta analisada e corrigida;
- [x] zero vulnerabilidades críticas, altas, moderadas ou baixas;
- [x] nenhuma atualização forçada ou de major;
- [x] `.gitattributes` configurado;
- [x] LF/CRLF estabilizado;
- [x] `flutter pub get` não suja o Git;
- [x] `npm install` não suja o Git;
- [x] analyze, testes Flutter, API, smoke e build raiz aprovados;
- [x] banco operacional preservado;
- [x] nenhum secret ou artefato proibido incluído;
- [x] commits temáticos locais;
- [ ] clone limpo final;
- [ ] branch publicada sem force push;
- [x] `main` não alterada;
- [x] tag não publicada;
- [x] nenhum deploy, PostgreSQL ou pagamento.

## 23. Recomendação para próxima sprint

Após revisão humana, abrir um pull request de
`codex/dependency-hardening` para a branch de baseline e revisar somente
lockfile, `.gitattributes` e documentação. A migração para PostgreSQL deve ser
uma sprint separada, com backup, ensaio de restore e autorização explícita.

## Histórico consolidado das sprints anteriores

O histórico necessário das Sprints 1 a 3.9 está preservado nas seções 3, 19,
20 e 21: arquitetura Flutter + API Node/TypeScript, isolamento multiempresa,
planos internos, segurança, operação local, preparação de staging, baseline
Git, GitHub privado, testes, clone limpo anterior, riscos e decisão de não
realizar deploy.

## Limpeza de relatórios anteriores

### Relatório anterior lido

- `RELATORIO_SPRINT_3_9_GITHUB_PRIVADO.md`, lido integralmente.

### Informações consolidadas

Foram consolidados baseline Git, branch publicada, privacidade do repositório,
auditoria de arquivos proibidos, auditoria de secrets, testes, clonagem limpa,
6 vulnerabilidades npm, problema LF/CRLF, decisões arquiteturais, limitações,
riscos e pendências externas.

### Arquivo removido

- `RELATORIO_SPRINT_3_9_GITHUB_PRIVADO.md`, removido explicitamente após
  leitura, consolidação e verificação de referências.

### Documentos preservados

Foram preservados `GO_NO_GO_BETA.md`, `VALIDACAO_FUNCIONAL_DADOS_REAIS.md`,
`ROTEIRO_APRESENTACAO_CLIENTE.md`, checklists, todo o conteúdo técnico e
operacional de `docs/` e `deploy/`, código, testes, migrations, configurações,
rascunhos jurídicos e bancos locais ignorados.

`docs/RELATORIO_STATUS_CLIENTE.md` permanece por ser documentação permanente
de status do cliente, não um relatório duplicado de sprint.

### Referências atualizadas

`docs/REVISAO_BASELINE_GITHUB.md` passou a apontar para este relatório 3.10.
As menções históricas à Sprint 3.9 em `GO_NO_GO_BETA.md` e
`docs/PLANO_HIGIENE_GIT.md` foram preservadas porque não eram links para o
arquivo removido nem referências quebradas.
