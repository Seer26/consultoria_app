# Segredos e configuração de staging

Valores reais devem existir somente no secret manager da plataforma. Não usar `.env` versionado, argumento de build, `--dart-define` com segredo de backend, log, ticket ou captura de tela.

Situação da Sprint 3.5: nenhum secret manager ou provedor foi autorizado/configurado. Nenhum secret foi provisionado. O `.env.local` foi preservado e não foi aberto; ele não constitui configuração comprovada de staging.

## Inventário

| Variável | Secreta | Obrigatória | Dono | Observação |
|---|---:|---:|---|---|
| `NODE_ENV=production` | não | sim | API | runtime otimizado |
| `APP_ENV=staging` | não | sim | API | ativa guardas de staging |
| `DATABASE_PATH` | não | sim | API | caminho absoluto no volume |
| `SQLITE_BACKUP_DIR` | não | sim | API | diretório distinto do banco |
| `SQLITE_VOLUME_ACK` | não | sim | API | valor exato documentado |
| `API_REPLICA_COUNT=1` | não | sim | API | SQLite não aceita réplica concorrente |
| `JWT_SECRET` | sim | sim | API | mínimo 32 caracteres aleatórios |
| `APP_PUBLIC_URL` | não | sim | API | HTTPS do Flutter |
| `API_PUBLIC_URL` | não | sim | API | HTTPS da API |
| `CORS_ORIGINS` | não | sim | API | origem HTTPS exata |
| `EMAIL_API_KEY` | sim | sim | API | credencial do provedor |
| `EMAIL_API_URL` | não | sim | API | endpoint HTTPS |
| `EMAIL_FROM` | não | sim | API | remetente validado |
| `OPENAI_API_KEY` | sim | conforme política | API | nunca no Flutter |
| `ENABLE_EXTERNAL_ALERTS` | não | sim, explícita | API | canônico |
| `ALERT_WEBHOOK_URL` | sim | se alertas ativos | API | receptor HTTPS |
| `BACKUP_EXTERNAL_PROVIDER` | não | para beta real | API/job | `filesystem` quando volume externo montado |
| `BACKUP_EXTERNAL_DIRECTORY` | sensível | para beta real | API/job | caminho fora do volume primário |
| `REQUIRE_LEGAL_ACCEPTANCE` | não | sim | API | manter `true` no beta |
| `TERMS_VERSION`, `PRIVACY_VERSION` | não | sim | API | versões aprovadas |

Compatibilidade: `EXTERNAL_ALERTS_ENABLED` e `EXTERNAL_ALERTS_URL` são aliases aceitos. Os nomes canônicos são `ENABLE_EXTERNAL_ALERTS` e `ALERT_WEBHOOK_URL`. Para backup, usar os nomes reais `BACKUP_EXTERNAL_PROVIDER` e `BACKUP_EXTERNAL_DIRECTORY`.

## Flutter Web

Somente `API_BASE_URL` é injetada no build:

```powershell
flutter build web --release --dart-define=API_BASE_URL=https://api-staging.exemplo.com
```

URL pública não é segredo. Nunca colocar JWT, OpenAI, e-mail, webhook ou chave de banco no bundle Flutter.

## Rotação

1. criar nova credencial no provedor;
2. cadastrar nova versão no secret manager sem remover a antiga;
3. publicar a API e testar `/health`, `/ready` e login;
4. revogar a anterior;
5. para `JWT_SECRET`, planejar encerramento de sessões e comunicar usuários;
6. registrar responsável, data e motivo sem registrar o valor.

## Separação de ambientes

- staging e produção usam projetos, domínios, bancos, remetentes e chaves separados;
- credenciais de desenvolvimento não sobem para staging;
- seed sintético recebe senhas por variáveis temporárias e não as imprime;
- o arquivo `deploy/staging/config/staging.env.example` contém somente placeholders.
