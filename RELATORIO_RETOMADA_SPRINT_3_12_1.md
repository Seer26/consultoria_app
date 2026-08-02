# Relatório técnico final — Sprint 3.12.1

Data de conclusão: 02/08/2026.

Branch validada: `codex/postgres-migration`.

Checkpoint validado antes desta atualização documental:
`c0c2eac472baa880e14fe024e3f807d1e314425f`.

## 1. Resumo executivo

A Sprint 3.12.1 concluiu a validação técnica local da migração de SQLite para
PostgreSQL 16. Foram aprovados migrations, validação de schema, runtime da API,
isolamento multiempresa, migrador sintético, rollback transacional, backup e
restore, regressões SQLite/PostgreSQL, build e auditoria da API, além dos gates
Flutter, Web e Android.

A arquitetura reversível foi preservada: a API seleciona PostgreSQL quando há
uma `DATABASE_URL` válida e mantém SQLite como alternativa local quando essa
variável não está presente. Nenhum dado empresarial real participou dos testes.

Conclusão: `codex/postgres-migration` está tecnicamente pronta para revisão final
e integração em `codex/release-baseline`, condicionada à revisão explícita do
diff completo. Nenhum merge, tag ou deploy foi realizado.

## 2. Escopo concluído

- PostgreSQL 16 local operacional em container saudável;
- migrations `001`–`005` aplicadas, validadas e idempotentes;
- runtime PostgreSQL validado por smoke, E2E e cenário de indisponibilidade;
- isolamento multiempresa validado em SQLite e PostgreSQL;
- migrador SQLite → PostgreSQL validado com fixture exclusivamente sintética;
- falhas controladas comprovando rollback antes do commit PostgreSQL;
- backup custom e restore isolado validados;
- regressões SQLite, PostgreSQL e API aprovadas;
- Flutter, testes e builds Web/APK aprovados;
- configuração Android de core library desugaring corrigida e publicada;
- auditoria final sem segredo ou artefato proibido rastreado.

Ficaram deliberadamente fora do escopo: merge, tag, staging, produção, deploy,
dados reais, atualização de dependências e atualização do SDK Flutter.

## 3. Arquitetura validada

Fluxo preservado:

```text
Flutter → API Node/TypeScript → services/repositories → data-source → SQLite ou PostgreSQL
```

Características confirmadas:

- nenhum acesso direto do Flutter ao banco;
- nenhum ORM novo;
- seleção do provider centralizada pela configuração da API;
- pool e client PostgreSQL encapsulados na camada de dados;
- placeholders e diferenças de dialeto tratados pelo adapter;
- transações PostgreSQL com `BEGIN`, `COMMIT` e `ROLLBACK`;
- health e readiness sensíveis ao provider, sem exposição de credenciais;
- IDs textuais, relacionamentos e filtros por `company_id` preservados;
- SQLite mantido como fallback controlado.

Ambiente PostgreSQL local validado:

- Docker Desktop e WSL2 operacionais;
- container `consultoria-postgres` usando PostgreSQL 16;
- estado final do container: `running/healthy`;
- banco técnico local preservado: `consultoria_dev`;
- `pg_dump 16.14` e `pg_restore 16.14` disponíveis no host.

## 4. Matriz de testes

| Área | Comando ou gate | Resultado |
|---|---|---|
| SQLite | `test:unit` | Aprovado |
| SQLite | `test:operations` | Aprovado |
| SQLite | `test:e2e:sqlite` | Aprovado |
| SQLite | `test:smoke:sqlite` | Não repetido; alias da mesma cadeia E2E |
| PostgreSQL | primeira `db:migrate` | Aprovada; migrations `001`–`005` |
| PostgreSQL | `db:validate` | Aprovado |
| PostgreSQL | segunda `db:migrate` | Aprovada; idempotente |
| PostgreSQL | `test:smoke:postgres` | Aprovado |
| PostgreSQL | `test:e2e:postgres` | Aprovado |
| PostgreSQL | `test:postgres:unavailable` | Aprovado; health/readiness `503` |
| Migrador | dry-run sintético | Aprovado; sem persistência |
| Migrador | migração sintética | Aprovada; 12 tabelas |
| Migrador | falhas transacionais | Aprovadas; rollback confirmado |
| Backup/restore | backup custom e checksum | Aprovados |
| Backup/restore | restore isolado e comparação | Aprovados |
| API | `tsc -p tsconfig.json` | Build e tipos aprovados |
| API | `npm audit --omit=dev` | Zero vulnerabilidades |
| Flutter | `flutter pub get` | Aprovado |
| Flutter | `flutter analyze` | Aprovado; nenhum problema |
| Flutter | `flutter test` | Aprovado; 19 testes |
| Flutter Web | build release | Aprovado |
| Android | build APK debug | Aprovado |

## 5. Evidências de migrations

O banco isolado recebeu exatamente cinco migrations:

1. `001_initial_postgres_schema`;
2. `002_seed_required_plans`;
3. `003_security_beta`;
4. `004_legal_acceptances`;
5. `005_postgres_runtime_hardening`.

Evidências registradas:

- primeira execução concluída sem erro;
- `schema_migrations` com exatamente cinco registros;
- IDs registrados iguais aos arquivos `001`–`005`;
- segunda execução sem nova migration;
- zero migrations pendentes;
- `db:validate` aprovado;
- planos Starter e Growth presentes e com status ativo.

## 6. Evidências do migrador SQLite → PostgreSQL

O ensaio utilizou fixture sintética com duas empresas e não acessou o SQLite
operacional. Foram migradas 12 tabelas, com:

- contagens SQLite e PostgreSQL equivalentes;
- IDs preservados;
- relacionamentos preservados;
- zero registros órfãos;
- zero associações cruzadas entre empresas;
- dry-run aprovado sem persistência;
- origem SQLite preservada.

Foram provocadas e verificadas três classes de falha:

- falha durante a importação;
- divergência de contagem;
- detecção de registro órfão.

Nos três casos, o destino sofreu rollback e não reteve importação parcial. O
fluxo transacional final validado é:

```text
BEGIN → importação → validações → COMMIT
```

O commit que corrigiu e validou essa segurança transacional é:
`d6631a4e718fd429bb2f4169ba92debe61314870`.

## 7. Evidências de backup e restore

Backup PostgreSQL aprovado e preservado fora do repositório:

`C:\Users\Pichau\consultoria-postgres-backups\gate-2026-08-02\consultoria_dev_gate_2026-08-02.dump`

Metadados:

- formato: PostgreSQL custom;
- tamanho: 41.033 bytes;
- SHA-256:
  `C7543A411BADC5F5C25FC6C2CF236ED8F65C63FA2B2AC1B6E42709C9C6CAD5CD`;
- dump e checksum fora do Git.

O restore foi executado em `consultoria_restore_test`, isolado de
`consultoria_dev`. Foram confirmados:

- migrations `001`–`005` preservadas;
- Starter e Growth preservados;
- contagens iguais em 14 tabelas;
- IDs preservados nas 14 tabelas com coluna `id`;
- 20 chaves estrangeiras válidas;
- zero órfãos;
- zero associações multiempresa cruzadas;
- `db:validate` aprovado no banco restaurado;
- banco temporário removido;
- `consultoria_dev` preservado.

## 8. Regressão SQLite

`test:unit`, `test:operations` e `test:e2e:sqlite` foram aprovados. A regressão
cobriu adapter, segurança, operações, backup/restore sintético, checksum,
health/readiness, autenticação e isolamento multiempresa.

`test:smoke:sqlite` não foi repetido porque encadeia `test:smoke`, que por sua
vez executa a mesma suíte `test:e2e`. Os testes usaram bancos sintéticos e
temporários, posteriormente removidos. Nenhum SQLite operacional participou da
regressão e nenhum arquivo SQLite foi incluído no Git.

## 9. Regressão PostgreSQL

O gate utilizou somente o banco temporário `consultoria_regression_test`.
Migrations, validação, idempotência, smoke, E2E, isolamento, health/readiness e
indisponibilidade foram aprovados.

No cenário indisponível, health e readiness retornaram `503` e não expuseram a
configuração de conexão. Ao final, o banco temporário foi removido; uma
comparação por fingerprint de contagens confirmou `consultoria_dev` preservado.

## 10. API e auditoria

- build e verificação de tipos: `tsc -p tsconfig.json`, aprovados;
- não existe script separado de lint ou typecheck na API;
- `npm audit --omit=dev`: zero vulnerabilidades;
- `package-lock.json`: inalterado;
- nenhum `npm audit fix`, update ou upgrade executado;
- nenhum arquivo versionado alterado pelos testes ou pelo build.

## 11. Flutter e builds

Ambiente confirmado:

- Flutter `3.38.1`;
- Dart `3.10.0`;
- `flutter doctor -v`: nenhum problema;
- `flutter pub get`: aprovado;
- `flutter analyze`: `No issues found`;
- `flutter test`: 19 testes aprovados;
- build Web release: aprovado;
- build APK debug: aprovado.

A falha Android de AAR metadata foi corrigida no módulo `app` com:

- `isCoreLibraryDesugaringEnabled = true`;
- `com.android.tools:desugar_jdk_libs:1.2.2`;
- compatibilidade Java/Kotlin 17 preservada;
- nenhuma dependência Flutter atualizada.

Commit da correção Android:
`c0c2eac472baa880e14fe024e3f807d1e314425f`.

## 12. Segurança e isolamento

- isolamento multiempresa aprovado em SQLite e PostgreSQL;
- tentativas de acesso entre empresas recusadas pelas suítes;
- IDs e vínculos de tenant preservados pelo migrador e pelo restore;
- zero órfãos e zero associações cruzadas nos gates de migração/restore;
- health/readiness sem URL, senha ou detalhes sensíveis;
- cenário indisponível com resposta sanitizada;
- nenhum `.env`, `.env.local`, banco, WAL/SHM, dump, backup, log,
  `node_modules`, build ou APK rastreado;
- referências do Compose permanecem parametrizadas;
- credenciais versionadas no workflow CI são exclusivamente sintéticas;
- nenhuma credencial real foi adicionada.

## 13. Artefatos externos preservados

- backup PostgreSQL e checksum permanecem fora do projeto;
- `.env.local` da API permanece local e ignorado;
- `consultoria_dev`, container e volume PostgreSQL foram preservados;
- seis arquivos SQLite locais ignorados, anteriores ao gate, permanecem no
  computador, incluindo banco local, demo e backups de julho;
- esses seis arquivos não foram abertos, modificados ou removidos e não
  participaram dos testes;
- todos continuam ignorados pelo Git.

## 14. Limitações e avisos não bloqueantes

- existem versões mais novas de dependências, deliberadamente não atualizadas;
- o build Web em JavaScript emitiu alertas de compatibilidade WebAssembly de
  dependências, sem impedir a geração do artefato;
- dependências Android emitiram avisos de compatibilidade Java 8, sem impedir o
  APK debug;
- o Flutter CLI travou no terminal do Codex App em algumas tentativas, mas os
  mesmos comandos foram aprovados no PowerShell externo;
- o SDK Flutter externo não foi atualizado, restaurado, limpo ou alterado;
- staging e produção não foram exercitados;
- a execução local não substitui a revisão do diff e os controles da integração.

## 15. Riscos residuais

- staging ainda precisa de provisionamento e validação próprios;
- produção exige secrets, observabilidade, backup, restore e rollback adequados
  ao provedor definitivo;
- e-mail, alertas externos, HTTPS, operação e suporte continuam em gates
  separados;
- migrations preservam escolhas históricas de tipos textuais que merecem
  monitoramento de longo prazo;
- futuras atualizações de Flutter, AGP, Gradle ou plugins podem exigir nova
  validação Android/Web;
- mudanças posteriores ao checkpoint invalidam parcialmente esta evidência e
  exigem reexecução proporcional dos gates.

## 16. Recomendação de integração

Recomenda-se revisar o diff completo de `codex/postgres-migration` contra
`codex/release-baseline`. Se a revisão confirmar escopo, segurança e ausência de
mudanças alheias, a branch está tecnicamente pronta para integração na baseline.

Esta conclusão não autoriza integração automática:

- nenhum merge foi realizado;
- nenhuma tag foi criada;
- nenhum deploy foi executado;
- `main` não foi alterada;
- staging e produção permanecem fora deste gate;
- o merge depende de aprovação explícita do diff completo.

## 17. Próximos passos pós-merge

1. Confirmar o hash exato do merge em `codex/release-baseline`.
2. Reexecutar no commit pós-merge os gates críticos de migrations,
   `db:validate`, smoke/E2E PostgreSQL, SQLite, build API e auditoria.
3. Reexecutar Flutter analyze/test e builds quando o ambiente externo estiver
   disponível.
4. Confirmar novamente ausência de secrets e artefatos rastreados.
5. Publicar a baseline somente após os resultados pós-merge estarem verdes.
6. Criar tag de aprovação apenas com autorização explícita e hash validado.
7. Tratar staging PostgreSQL, deploy e observabilidade em gate separado.
8. Manter rollback, backup e restore documentados e testáveis antes de produção.
