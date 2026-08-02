# Relatório da Sprint 3.12 — Migração PostgreSQL

Data original: 19/07/2026.

Atualização de encerramento: 02/08/2026.

## 1. Finalidade deste documento

Este relatório preserva a síntese de implementação da Sprint 3.12. O estado
executável, os gates e as evidências finais foram consolidados em
`RELATORIO_RETOMADA_SPRINT_3_12_1.md`, que passa a ser o relatório técnico
canônico para decisão de integração.

A classificação histórica **PARCIAL**, causada pela ausência inicial de Docker,
PostgreSQL e ferramentas host, foi superada pela Sprint 3.12.1. Não permanecem
pendências técnicas locais nos gates definidos para a branch.

## 2. Implementação entregue na Sprint 3.12

- adapter assíncrono para SQLite/PostgreSQL;
- pool PostgreSQL e tradução central de placeholders/dialeto;
- services e repositories compatíveis com operações assíncronas;
- migrations PostgreSQL `001`–`005` e tabela `schema_migrations`;
- seed idempotente dos planos Starter e Growth;
- health/readiness sensíveis ao provider;
- E2E, smoke e cenário de indisponibilidade PostgreSQL;
- migrador SQLite → PostgreSQL com proteções e modo dry-run;
- scripts de backup/restore PostgreSQL;
- Compose PostgreSQL 16, Dockerfile, CI e runbooks;
- fallback SQLite preservado.

A arquitetura permaneceu:

```text
Flutter → API Node/TypeScript → repositories → adapter → SQLite/PostgreSQL
```

## 3. Validação concluída pela Sprint 3.12.1

Em 02/08/2026 foram concluídos os gates antes pendentes:

- PostgreSQL 16 local `running/healthy`;
- migrations `001`–`005`, `db:validate` e idempotência;
- smoke/E2E PostgreSQL, health/readiness e isolamento multiempresa;
- indisponibilidade com health/readiness `503` e resposta sanitizada;
- migrador com duas empresas sintéticas, 12 tabelas, equivalência de contagens,
  IDs e relacionamentos, zero órfãos e zero cruzamento entre empresas;
- rollback provocado por falha de importação, contagem e órfãos;
- backup custom, SHA-256, restore isolado e comparação de 14 tabelas;
- regressões SQLite e PostgreSQL;
- build/tipos da API e audit de produção com zero vulnerabilidades;
- Flutter analyze, 19 testes, build Web release e APK debug;
- correção Android de core library desugaring.

As evidências detalhadas, hashes, matriz de testes e riscos estão no relatório
final da Sprint 3.12.1.

## 4. Commits conclusivos relevantes

- segurança transacional do migrador:
  `d6631a4e718fd429bb2f4169ba92debe61314870`;
- core library desugaring e builds Android/Web:
  `c0c2eac472baa880e14fe024e3f807d1e314425f`.

Os commits anteriores de adapter, migrations, testes e documentação permanecem
no histórico da branch `codex/postgres-migration`.

## 5. Estado de integração

`codex/postgres-migration` está tecnicamente pronta para revisão final e
integração em `codex/release-baseline`, mediante revisão explícita do diff
completo.

Não foram realizados:

- merge;
- alteração de `main`;
- criação de tag;
- deploy;
- promoção para staging ou produção.

## 6. Continuidade

Após aprovação e merge, devem ser repetidos os gates críticos no hash exato da
baseline. Tag, staging e produção exigem autorizações e validações próprias. O
beta externo continua condicionado aos gates operacionais, jurídicos e de
infraestrutura já documentados no projeto.

