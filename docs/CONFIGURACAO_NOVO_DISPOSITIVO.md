# Configuração em um novo dispositivo

## Pré-requisitos

- Git;
- Flutter estável compatível com `pubspec.yaml`;
- Node.js 22;
- npm;
- ferramentas de compilação exigidas pelo `better-sqlite3`;
- acesso autorizado ao repositório.

Opcionalmente, Docker pode ser usado para os cenários documentados, mas não é
necessário para o perfil local SQLite.

## Clonar o repositório

```powershell
git clone https://github.com/Seer26/consultoria_app.git
Set-Location consultoria_app
git switch codex/release-baseline
```

Se a branch ainda não tiver sido publicada, ela só estará disponível no
dispositivo onde foi criada.

## Flutter

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

## Node.js

No diretório `saas`:

```powershell
npm.cmd ci
npm.cmd run build
```

O lockfile deve ser preservado. Não copie `node_modules` de outro dispositivo.

## Variáveis locais

Copie `saas/apps/api/.env.example` para
`saas/apps/api/.env.local` e preencha localmente. O arquivo `.env.local` nunca
deve ser enviado ao Git.

Para o perfil operacional local:

- `APP_ENV=local`;
- `NODE_ENV=development`;
- `ENABLE_DEMO_SEED=false`;
- `DATABASE_URL` vazio;
- `DATABASE_PATH` absoluto e apontando a um SQLite não demonstrativo;
- `SHOW_DEMO_CREDENTIALS=false` no Flutter;
- secrets reais somente no arquivo local ou no gerenciador do ambiente.

Não reutilize secrets de staging ou produção.

## Banco local

O Git não distribui o banco operacional. Escolha uma das opções:

1. criar um banco novo pelo startup/migrations do aplicativo; ou
2. receber um backup autorizado por canal seguro e executar o procedimento
   oficial de restore.

Nunca copie apenas o arquivo principal enquanto houver escrita ativa ou WAL sem
incorporação. Antes de usar um banco recebido, execute a validação de
integridade documentada.

## Testes

Os testes usam bancos temporários. Nunca configure uma suíte para
`saas/apps/api/data/consultoria.sqlite`.

```powershell
Set-Location saas
npm.cmd --workspace @consultoria/api run test
npm.cmd --workspace @consultoria/api run test:smoke
npm.cmd --workspace @consultoria/api run test:load:lite
```

## Como iniciar a API

No diretório `saas`:

```powershell
npm.cmd --workspace @consultoria/api start
```

Valide:

```text
http://127.0.0.1:3000/health
http://127.0.0.1:3000/ready
```

O runtime local suportado usa `tsx`. O build TypeScript valida a compilação,
mas `node dist/server.js` não é o comando operacional desta baseline.

## Como iniciar o Flutter

Com a API online, execute na raiz:

```powershell
flutter run --dart-define=APP_ENV=local --dart-define=API_BASE_URL=http://127.0.0.1:3000 --dart-define=SHOW_DEMO_CREDENTIALS=false
```

## Como sincronizar alterações

Antes de atualizar:

1. confirme que não existem mudanças locais sem commit;
2. faça backup consistente do banco;
3. busque a branch autorizada;
4. execute `npm.cmd ci` e `flutter pub get`;
5. execute build e testes;
6. nunca resolva conflitos apagando o worktree.

## Arquivos que nunca devem ser enviados

- `.env`, `.env.local` ou outro `.env.*` com valores reais;
- `.secrets*`;
- `*.sqlite`, `*.sqlite3`, `*.db`, WAL ou SHM;
- backups e dumps;
- `node_modules/`;
- `dist/`, `build/`, `.dart_tool/`, `coverage/`;
- tokens, chaves privadas ou URLs com credenciais reais;
- PDFs, logs e exportações contendo dados empresariais.
