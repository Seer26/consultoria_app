# Pacote de staging

Este diretório contém somente descritores e documentação de implantação. Não contém código duplicado, banco, backup ou segredo.

## Estrutura

- `docker-compose.yml`: referência local/provedor para API com uma réplica e dois mounts;
- `config/staging.env.example`: inventário sem valores reais;
- `api/README.md`: contrato de publicação da API;
- `flutter-web/`: Nginx SPA e instruções do bundle;
- `scripts/validate-docker.ps1`: validação manual da imagem quando Docker estiver disponível.

O Compose é uma referência operacional, não prova de deploy externo. Para beta real, o diretório de backup deve ser sincronizado ou montado em destino externo, pois dois volumes no mesmo provedor não garantem recuperação de desastre.

## Ordem

1. contratar/configurar infraestrutura conforme `docs/OPCOES_INFRAESTRUTURA_STAGING.md`;
2. cadastrar secrets conforme `docs/SECRETS_STAGING.md`;
3. anexar volume persistente e destino externo de backup;
4. validar imagem com o script;
5. publicar API e testar `/health` e `/ready`;
6. executar `staging:seed` somente com confirmação;
7. buildar e publicar Flutter Web;
8. executar smoke externo e checklist beta;
9. registrar decisão em `GO_NO_GO_BETA.md`.

## Seed e limpeza sintéticos

Defina as variáveis temporárias no ambiente seguro da API, sem gravá-las em arquivo:

```text
NODE_ENV=production
APP_ENV=staging
ENABLE_DEMO_SEED=false
DATABASE_PATH=<caminho-absoluto-do-volume>
STAGING_SEED_CONFIRMATION=create-consultoria-staging-synthetic-data
STAGING_SEED_ADMIN_EMAIL=<email-sintetico>
STAGING_SEED_ADMIN_PASSWORD=<senha-temporaria-segura>
STAGING_SEED_OWNER_EMAIL=<email-sintetico>
STAGING_SEED_OWNER_PASSWORD=<senha-temporaria-segura>
STAGING_SEED_EMPLOYEE_EMAIL=<email-sintetico>
STAGING_SEED_EMPLOYEE_PASSWORD=<senha-temporaria-segura>
```

Execute `npm.cmd --prefix saas run staging:seed`. Remova as variáveis de senha após o uso.

Para limpeza, mantenha o perfil e o mesmo `DATABASE_PATH`, defina:

```text
STAGING_CLEANUP_CONFIRMATION=delete-only-consultoria-staging-synthetic-data
```

Execute `npm.cmd --prefix saas run staging:cleanup`. O comando remove somente IDs fixos `staging-synthetic-*` e recusa qualquer `APP_ENV` diferente de `staging`.
