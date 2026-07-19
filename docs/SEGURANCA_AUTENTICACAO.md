# Segurança e Autenticação

## Arquitetura de autenticação

O Flutter autentica exclusivamente pela API Node/Express. A API valida credenciais com bcrypt, emite JWT e aplica autenticação e autorização no backend. O Flutter melhora a navegação, mas não é uma barreira de segurança e não acessa o banco diretamente.

Rotas públicas relevantes:

- `GET /health` (liveness) e `GET /ready` (dependências/configuração);
- `POST /auth/login`;
- `POST /auth/password/forgot`;
- `POST /auth/password/reset`;
- `POST /auth/register`, mantida desabilitada com HTTP 403;
- `POST /ai-diagnosis`, legado desabilitado com HTTP 410.

Rotas autenticadas abrangem pesquisa, tarefas, relatórios, PDF, dashboards, plano atual e configurações. Rotas administrativas de empresas, usuários e troca de plano exigem `ADMIN`. O middleware do backend consulta o usuário e a empresa no banco em toda requisição protegida.

## JWT atual

O JWT contém `userId`, `role`, `companyId` e `authVersion`. A validade é configurada por `JWT_EXPIRES_IN`, com padrão local de 7 dias. A cada requisição protegida, a API:

1. valida assinatura e expiração;
2. consulta o usuário atual;
3. confirma status, função e vínculo atuais;
4. consulta a empresa para OWNER/EMPLOYEE;
5. compara `authVersion` do token e do banco.

A redefinição de senha incrementa `authVersion`, invalidando JWTs anteriores sem blacklist. Refresh token permanece fora do escopo.

## Rate limiting

Há limites independentes em memória:

| Fluxo | Chave | Padrão | Variáveis |
| --- | --- | --- | --- |
| Login | IP | 10 em 15 minutos | `LOGIN_RATE_LIMIT_WINDOW_MS`, `LOGIN_RATE_LIMIT_MAX` |
| Recuperação | IP | 5 em 15 minutos | `PASSWORD_FORGOT_RATE_LIMIT_WINDOW_MS`, `PASSWORD_FORGOT_RATE_LIMIT_MAX` |
| IA | usuário autenticado | 12 por minuto | `AI_RATE_LIMIT_WINDOW_MS`, `AI_RATE_LIMIT_MAX` |
| PDF | usuário autenticado | 10 por minuto | `PDF_RATE_LIMIT_WINDOW_MS`, `PDF_RATE_LIMIT_MAX` |

O bloqueio retorna HTTP 429, `RATE_LIMIT_EXCEEDED`, mensagem amigável e `Retry-After`. Rate limit de IA/PDF não substitui limites comerciais do plano. A chamada bloqueada por rajada não chega ao entitlement nem ao processamento.

Limitação: o armazenamento em memória é adequado apenas ao beta de uma instância. Produção com múltiplas instâncias deverá usar armazenamento compartilhado, como Redis.

## Headers de segurança

Todas as respostas incluem, quando aplicável:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: no-referrer`;
- `Content-Security-Policy` restritiva para respostas da API;
- `Permissions-Policy` sem câmera, microfone ou geolocalização;
- HSTS em produção.

`X-Powered-By` é removido. CORS continua configurável e expõe somente `X-Request-ID` e `Retry-After` além dos headers normais. A configuração foi validada com geração de PDF e E2E multiempresa.

## Correlation ID

O middleware aceita `X-Request-ID` somente quando o valor possui entre 8 e 128 caracteres seguros (`A-Z`, `a-z`, números, ponto, `_` e `-`). Caso contrário, gera UUID. O valor é retornado no mesmo header e incluído no log final de cada requisição, em auditorias de segurança e em erros internos.

Stacks nunca são retornadas ao cliente. Em produção, o logger também omite stack dos objetos `Error` serializados.

## Validação de usuário e empresa ativos

Tokens não são mais fonte definitiva de função ou empresa. O middleware recupera os dados atuais do banco:

- usuário inexistente/inativo: HTTP 401;
- senha redefinida e versão divergente: HTTP 401 `SESSION_REVOKED`;
- OWNER/EMPLOYEE sem vínculo válido: HTTP 401;
- empresa inexistente/inativa: HTTP 401;
- função alterada: a autorização passa a usar a função atual;
- ADMIN sem empresa continua válido.

## Política de senha

A política central fica em `modules/auth/password-policy.ts` e é aplicada ao primeiro OWNER, novos usuários, troca administrativa de senha e redefinição:

- mínimo de 8 caracteres;
- não pode conter somente números;
- não pode ser igual ao e-mail;
- bloqueia uma lista curta de senhas muito comuns;
- não exige combinação artificial de múltiplos símbolos.

O registro público está desabilitado e não há criação pública de ADMIN. Caso esse fluxo seja criado no futuro, deverá usar a mesma política.

## Recuperação de senha

`POST /auth/password/forgot` sempre retorna HTTP 202 e mensagem genérica, exista ou não a conta. Para conta ativa:

1. gera 32 bytes aleatórios com fonte criptográfica;
2. persiste somente SHA-256 do token;
3. revoga tokens pendentes anteriores;
4. define expiração configurável;
5. envia o token somente ao provider de e-mail;
6. registra auditoria sem token puro.

`POST /auth/password/reset` recebe `token` e `newPassword`, valida hash, status, expiração, uso único e política de senha, altera o hash bcrypt em transação, marca o token como usado, revoga outros tokens e incrementa `authVersion`.

O endpoint não recebe nem confia em `companyId`: o usuário é determinado exclusivamente pelo token de recuperação.

## Serviço de e-mail

A interface `EmailService` possui dois providers:

- `console`: somente desenvolvimento/teste; não registra token ou URL completa. Em E2E, uma captura em memória, acessível apenas com `NODE_ENV=test`, permite testar o fluxo.
- `http`: envia JSON por HTTPS para um provider transacional configurável, com autenticação e campos de payload configuráveis, timeout e template separado.

Staging/produção sem provider válido ficam `not_ready`; o console é proibido por padrão. O contrato HTTP permite mapear remetente, destinatário, assunto, texto, HTML e ID da mensagem. Credenciais nunca são registradas.

O link usa `APP_PUBLIC_URL/reset-password?token=...`. A rota pública Flutter Web recebe o token, remove-o da URL quando possível, mantém o valor somente em memória, valida senha/confirmação, bloqueia envio duplicado e redireciona ao login. Em staging, `APP_PUBLIC_URL` deve ser a origem HTTPS controlada do Flutter Web.

## Armazenamento seguro no Flutter

O JWT usa `flutter_secure_storage`. Ao ler uma sessão antiga:

1. procura no armazenamento seguro;
2. se ausente, lê o token legado no `SharedPreferences`;
3. grava no armazenamento seguro;
4. remove o token legado somente após sucesso.

Logout e respostas HTTP 401 limpam ambos os armazenamentos durante a transição. Dados não secretos da sessão continuam em `SharedPreferences`; senha e chave OpenAI nunca são armazenadas.

Em plataforma sem suporte, existe fallback controlado ao armazenamento legado para não quebrar a sessão. No Flutter Web, use HTTPS e origem estável; o armazenamento seguro web depende das proteções do navegador e não equivale ao Keychain/Keystore nativo. Para risco elevado, priorize apps nativos e políticas de sessão mais curtas.

## Variáveis de ambiente

Obrigatórias/relevantes:

| Variável | Uso |
| --- | --- |
| `NODE_ENV` | Ambiente |
| `JWT_SECRET` | Assinatura JWT; obrigatório em produção |
| `JWT_EXPIRES_IN` | Validade JWT |
| `CORS_ORIGINS` | Origens permitidas |
| `TRUST_PROXY_HOPS` | Quantidade de proxies confiáveis; necessário para IP correto atrás de proxy |
| `LOGIN_RATE_LIMIT_WINDOW_MS`, `LOGIN_RATE_LIMIT_MAX` | Login |
| `PASSWORD_FORGOT_RATE_LIMIT_WINDOW_MS`, `PASSWORD_FORGOT_RATE_LIMIT_MAX` | Recuperação |
| `AI_RATE_LIMIT_WINDOW_MS`, `AI_RATE_LIMIT_MAX` | IA |
| `PDF_RATE_LIMIT_WINDOW_MS`, `PDF_RATE_LIMIT_MAX` | PDF |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Expiração do token |
| `EMAIL_PROVIDER` | `console` ou `http` |
| `EMAIL_FROM` | Remetente |
| `APP_PUBLIC_URL` | Base do link de redefinição |
| `EMAIL_API_URL`, `EMAIL_API_KEY` | Provider HTTP |
| `EMAIL_TIMEOUT_MS` | Timeout do provider |

Consulte `saas/apps/api/.env.example`. Não versionar valores reais.

## Logs e auditoria

Eventos implementados:

- login bem-sucedido, recusado e bloqueado por rate limit;
- recuperação solicitada e falha de envio;
- token inválido/expirado;
- senha redefinida;
- usuário e empresa inativos bloqueados;
- rajadas de IA/PDF bloqueadas;
- log de término de cada requisição.

Campos incluem timestamp, action/auditEvent, request ID, resultado, IDs quando disponíveis e hash curto irreversível do IP. Senhas, JWT, token de recuperação, chaves e conteúdo integral da IA não são registrados.

## Testes

- `npm.cmd --workspace @consultoria/api run test:unit`: política de senha.
- `npm.cmd --workspace @consultoria/api run test:e2e`: multiempresa e segurança.
- E2E usa apenas `consultoria-e2e-multitenant.sqlite` e `consultoria-e2e-security.sqlite`, removidos ao final.
- `flutter test --reporter expanded`: recuperação, mensagens, loading, migração e limpeza do token.
- `flutter analyze`: análise estática.

## Limitações atuais

- rate limit em memória e não distribuído;
- sem refresh token, MFA, OAuth ou confirmação obrigatória de e-mail;
- publicação da rota Flutter em uma origem HTTPS real ainda depende do staging;
- provider HTTP está adaptável, mas precisa ser configurado e validado com o fornecedor escolhido;
- SQLite continua runtime e não é indicado para produção multi-instância;
- revogação de sessão ocorre na redefinição, mas não existe painel de sessões/dispositivos;
- rascunhos jurídicos e registro versionado de aceite existem, mas revisão jurídica e processos completos de LGPD permanecem pendentes.

## Próximos passos

1. Configurar provider transacional real em staging e testar entrega/reputação.
2. Publicar a rota Flutter Web de redefinição em HTTPS e testar o link ponta a ponta.
3. Levar rate limit para armazenamento compartilhado ao escalar.
4. Migrar runtime para Postgres preservando os E2E.
5. Adicionar termos, privacidade e processos LGPD mínimos.
6. Implantar monitoramento e alertas de segurança.
