# Recursos externos do staging

Auditoria realizada em 18/07/2026. Este inventário registra disponibilidade e autorização sem armazenar nomes de conta, credenciais ou valores secretos.

## Estado da Sprint 3.5

**ESTADO C — Publicação não iniciada.**

Não há provedor, acesso ou autorização específica suficiente para criar recursos externos. O pedido da sprint autoriza a preparação e a verificação, mas não identifica plataforma, conta, domínio, orçamento ou credenciais e proíbe escolher silenciosamente uma plataforma paga.

## Inventário

| Recurso | Classificação | Evidência segura | Próxima ação |
|---|---|---|---|
| Provedor de hospedagem | NÃO CONFIRMADO | nenhum provedor definido no projeto ou ambiente | proprietário escolher e autorizar |
| Autorização para provisionar/deploy | NÃO CONFIRMADO | nenhuma conta, plataforma ou escopo explicitamente autorizado | registrar autorização específica |
| Credenciais de acesso | AUSENTE | nenhum nome de variável de provedor detectado | cadastrar somente no canal/CLI autorizado |
| Hospedagem da API | DEPENDE DE CONTRATAÇÃO | pacote Docker genérico existe, serviço externo não | contratar/criar Web Service |
| Hospedagem Flutter Web | DEPENDE DE CONTRATAÇÃO | bundle pode ser gerado, host externo não existe | contratar/criar host estático |
| Domínio ou subdomínio | AUSENTE | nenhum domínio real informado | definir domínio de staging |
| Acesso ao DNS | NÃO CONFIRMADO | conta/zona/responsável não informados | autorizar responsável e alteração |
| Registry de imagens | AUSENTE | nenhum registry configurado | usar registry aprovado pelo provedor |
| Secret manager | AUSENTE | nenhum cofre configurado | provisionar e separar de produção |
| Volume persistente | DEPENDE DE CONTRATAÇÃO | Compose apenas descreve mounts | contratar e testar volume compatível |
| Storage externo | DEPENDE DE CONTRATAÇÃO | adapter local existe; destino remoto não | provisionar destino fora do volume |
| Provider de e-mail | DEPENDE DE CONTRATAÇÃO | adapter HTTP local existe; conta/remetente não | contratar, autenticar domínio e testar |
| Central de logs | DEPENDE DE AÇÃO MANUAL | stdout/stderr JSON local existe | ativar coleta/retenção do provedor |
| Canal de alertas | AUSENTE | webhook autorizado não existe | definir receptor, responsáveis e limiares |
| Chave OpenAI de staging | NÃO CONFIRMADO | nenhuma variável no processo; `.env.local` não foi aberto | criar/reutilizar somente com autorização |
| Responsável técnico | NÃO CONFIRMADO | placeholder no runbook | designar pessoa |
| Responsável de produto | NÃO CONFIRMADO | placeholder no runbook | designar pessoa |
| Suporte e incidentes | AUSENTE | canal, horário e SLA não definidos | definir antes do beta |
| Responsável por backup/DNS/e-mail/OpenAI | NÃO CONFIRMADO | placeholders operacionais | designar responsáveis |

## Ferramentas locais encontradas

- remoto Git `origin` configurado no GitHub; não autoriza push nem deploy;
- Docker e Docker Compose: indisponíveis;
- CLIs Railway, Fly.io, Render, Vercel e Netlify: ausentes;
- descritores locais: `saas/apps/api/Dockerfile` e `deploy/staging/docker-compose.yml`;
- nenhum `render.yaml`, `railway.json`, `fly.toml`, `vercel.json`, `netlify.toml`, Terraform ou `.openai/hosting.json`.

## Gate para iniciar provisionamento

O responsável deve fornecer, por canal seguro:

1. provedor escolhido e conta/projeto;
2. autorização explícita para criar recursos e custos;
3. domínio/subdomínios e autorização de DNS;
4. região e política de dados;
5. provider de e-mail e endereço sintético autorizado;
6. storage de backup e canal de alertas;
7. responsáveis operacionais;
8. decisão sobre OpenAI no readiness;
9. autorização para executar deploy, seed e smoke.

Secrets não devem ser enviados em documentação ou chat; devem ser inseridos diretamente no secret manager ou fluxo seguro do provedor.
