# Organização segura do repositório

## Baseline consolidada

O estado acumulado das sprints foi consolidado localmente na branch
`codex/release-baseline`. A estratégia usa um único commit revisado porque o
histórico anterior continha apenas o commit inicial e não permitia uma
separação retrospectiva confiável.

## O que fica fora do Git

- dependências e builds: `node_modules/`, `dist/`, `build/`, `.dart_tool/`;
- cobertura e cache: `coverage/`, `*.tsbuildinfo`;
- JavaScript emitido junto às fontes TypeScript do frontend Vite;
- bancos e auxiliares: `*.sqlite`, `*.sqlite3`, `*.db`, WAL e SHM;
- backups locais: `backups/`, `*.backup`, `*.dump`;
- configurações com segredos: `.env`, `.env.*` e `.secrets*`;
- logs e arquivos específicos do sistema operacional.

O `.gitignore` não apaga arquivos locais. Dependências, builds e o banco
operacional continuam disponíveis no dispositivo, mas deixam de compor a fonte
de verdade do repositório.

## O que continua versionado

- código-fonte Flutter e TypeScript;
- migrations e scripts;
- testes e workflow de CI;
- `package-lock.json` e `pubspec.lock`;
- `.env.example`;
- Dockerfiles e Compose sem secrets;
- documentação permanente e checklists;
- rascunhos jurídicos.

## Banco operacional

`saas/apps/api/data/consultoria.sqlite` é dado local, não código. Antes de sua
retirada do índice foi criado um backup consistente fora do repositório, com
WAL incorporado, SHA-256 e `quick_check=ok`.

Testes não podem usar esse arquivo. Cada suíte da API cria bancos temporários e
descartáveis.

## Fluxo de trabalho recomendado

1. criar branch `codex/` por sprint;
2. revisar mudanças por categoria;
3. executar testes com dados temporários;
4. auditar secrets sem imprimir valores;
5. adicionar arquivos por caminhos explícitos;
6. revisar o diff staged;
7. criar commit pequeno quando houver separação segura;
8. fazer push somente após autorização.

## Verificações antes de commit

```powershell
git status --short --branch
git diff --stat
git diff --name-status
git diff --cached --stat
git diff --cached --name-status
git ls-files --others --exclude-standard
```

Confirme que bancos, backups, `.env`, dependências e builds não estão staged.

## Rollback

Não use `git reset --hard`, `git clean -fd`, `git restore .` ou
`git checkout .`. Para código compartilhado, prefira `git revert`. Para
investigar uma baseline, crie uma branch a partir da tag local. Restore de
banco exige a rotina oficial, confirmação explícita e cópia pré-restore.
