# Configuração em um novo dispositivo

## 1. Pré-requisitos

Instale:

- Git para Windows;
- Flutter estável compatível com `pubspec.yaml`;
- Node.js 22 e npm;
- ferramentas de compilação exigidas pelo `better-sqlite3`;
- um navegador ou dispositivo compatível com Flutter;
- acesso autorizado ao repositório privado `Seer26/consultoria_app`.

Docker é opcional. O perfil local desta baseline usa SQLite e não exige
PostgreSQL.

Confirme as instalações:

```powershell
git --version
flutter --version
node --version
npm.cmd --version
```

## 2. Autenticação no GitHub

Autentique o Git Credential Manager pelo fluxo oficial do GitHub ao primeiro
clone ou push. Quando o GitHub solicitar autorização no navegador, use somente
uma conta que tenha acesso ao repositório privado.

Não salve token em URL, arquivo do projeto, histórico do terminal ou
documentação.

## 3. Clonar a baseline endurecida publicada

```powershell
git clone https://github.com/Seer26/consultoria_app.git
Set-Location consultoria_app
git switch codex/release-baseline
git pull --ff-only origin codex/release-baseline
git status --short --branch
```

O clone deve mostrar a branch `codex/release-baseline` acompanhando
`origin/codex/release-baseline`. O hardening foi integrado por merge commit
`63b0c0e758fa63fc65590b5d8648c3b2cf0cea11`. A tag anotada
`baseline-hardened-pre-postgres-2026-07-19` identifica o commit documental
publicado que encerra essa integração.

No Windows, mantenha o `.gitattributes` do projeto como regra autoritativa:

```powershell
git config core.autocrlf false
git config core.eol lf
git ls-files --eol
```

Fontes portáveis permanecem em LF; `.ps1`, `.bat` e `.cmd` permanecem em CRLF.
Não altere globalmente essas regras sem avaliar outros repositórios.

## 4. Preparar o Flutter

Na raiz:

```powershell
flutter pub get
flutter analyze
flutter test --reporter expanded
```

Para iniciar apontando à API local:

```powershell
flutter run --dart-define=APP_ENV=local --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=SHOW_DEMO_CREDENTIALS=false
```

## 5. Preparar Node.js

```powershell
Set-Location saas
npm.cmd ci
npm.cmd audit
npm.cmd run build
```

O `package-lock.json` deve ser preservado. Nunca copie `node_modules` de outro
dispositivo. A baseline integrada possui audit npm com zero
vulnerabilidades. Se `npm.cmd audit` reportar um resultado diferente, não use
`npm audit fix --force`; registre o resultado e revise o lockfile.

## 6. Criar a configuração local

Copie:

```text
saas/apps/api/.env.example
```

para:

```text
saas/apps/api/.env.local
```

Preencha o arquivo somente no novo dispositivo. Ele é ignorado pelo Git.

Para o perfil local:

- `APP_ENV=local`;
- `NODE_ENV=development`;
- `ENABLE_DEMO_SEED=false`;
- `DATABASE_URL` vazio;
- `DATABASE_PATH` absoluto para um SQLite local próprio;
- `SHOW_DEMO_CREDENTIALS=false` no Flutter;
- secrets somente em `.env.local` ou em gerenciador seguro.

Nunca reutilize secrets de staging ou produção.

## 7. Banco local

O GitHub não transfere o banco operacional. Escolha:

1. criar um banco local vazio pelo startup/migrations; ou
2. receber um backup autorizado por canal seguro e usar o restore oficial.

Não copie o SQLite operacional pelo GitHub. Não copie apenas o arquivo
principal enquanto a API estiver escrevendo ou houver WAL pendente. Valide a
integridade de qualquer backup antes do uso.

## 8. Iniciar a API

No diretório `saas`:

```powershell
npm.cmd --workspace @consultoria/api start
```

Valide:

```text
http://127.0.0.1:3000/health
http://127.0.0.1:3000/ready
```

O runtime local suportado usa `tsx`. O build valida TypeScript, mas
`node dist/server.js` não é o comando operacional desta baseline.

## 9. Iniciar o Flutter

Com a API online, volte à raiz e execute:

```powershell
flutter run --dart-define=APP_ENV=local --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=SHOW_DEMO_CREDENTIALS=false
```

## 10. Executar os testes

Flutter, na raiz:

```powershell
flutter analyze
flutter test --reporter expanded
```

API, no diretório `saas`:

```powershell
npm.cmd --workspace @consultoria/api run build
npm.cmd --workspace @consultoria/api run test
npm.cmd --workspace @consultoria/api run test:smoke
npm.cmd run build
```

Os testes usam bancos temporários. Nunca configure testes para o SQLite
operacional.

Ao terminar a preparação, confirme que os geradores e instaladores não
alteraram arquivos rastreados:

```powershell
Set-Location ..
flutter pub get
git status --short
Set-Location saas
npm.cmd install
Set-Location ..
git status --short
```

O status deve permanecer limpo. Os registradores de plugins de Windows, Linux
e macOS são gerados pelo Flutter, mas continuam versionados com LF estável.

## 11. Atualizar a branch

Antes de um pull:

```powershell
git status --short --branch
git fetch origin
git pull --ff-only
```

Não execute pull com mudanças locais não revisadas. Faça backup consistente do
banco antes de atualizar código que possa alterar migrations.

## 12. Criar commit e publicar alterações

Revise antes de adicionar:

```powershell
git status --short
git diff
git diff --cached
```

Adicione somente os arquivos intencionais, execute os testes e então:

```powershell
git commit -m "descrição objetiva da alteração"
git push
```

Nunca use `git add .` sem uma revisão imediatamente anterior. Nunca faça force
push na baseline compartilhada.

O branch `main` não é a baseline de trabalho deste ciclo e permanece no commit
inicial. Não publique alterações nele sem uma decisão separada.

## 13. Tratar conflitos

Se `git pull --ff-only` recusar a atualização:

1. não use `git reset --hard`;
2. confirme branch, status e commits locais;
3. faça backup dos dados locais;
4. busque o remoto com `git fetch origin`;
5. compare os commits;
6. resolva cada arquivo de código conscientemente;
7. execute novamente toda a validação;
8. solicite revisão antes de publicar.

Dados e `.env.local` não devem participar de conflitos porque não são
versionados.

## 14. Arquivos que nunca devem ser enviados

- `.env`, `.env.local` ou `.env.*` com valores reais;
- `.secrets*`;
- `*.sqlite`, `*.sqlite3`, `*.db`, WAL ou SHM;
- backups e dumps;
- `node_modules/`;
- `dist/`, `build/`, `.dart_tool/`, `coverage/`;
- tokens, chaves privadas ou URLs com credenciais;
- PDFs, logs e exportações com dados empresariais.
