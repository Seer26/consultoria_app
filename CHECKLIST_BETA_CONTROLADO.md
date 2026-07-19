# Checklist de Beta Controlado

Legenda: `[x]` concluído e comprovado; `[ ]` pendente ou dependência externa.

## Segurança e acesso

- [x] Rate limits separados para login, recuperação, IA e PDF.
- [x] Headers HTTP, request ID e revalidação de usuário/empresa em rotas protegidas.
- [x] Política central de senha e invalidação de JWT antigo após reset.
- [x] Token de reset aleatório, armazenado como hash, expirável e de uso único.
- [x] JWT do Flutter em armazenamento seguro com migração controlada.
- [ ] Rate limit distribuído; fora do escopo sem múltiplas instâncias/Redis.
- [ ] Revisão externa de segurança antes de ampliar o beta.

## Recuperação de senha e e-mail

- [x] Solicitação genérica sem enumeração de conta.
- [x] Página Flutter de redefinição com política, confirmação, loading e erros amigáveis.
- [x] Token removido da URL quando possível e mantido somente em memória.
- [x] Provider HTTP configurável e teste com provider falso local.
- [x] Console proibido por padrão em staging/produção; readiness acusa configuração ausente.
- [ ] Contratar/configurar provider real e testar entrega, bounce e spam.
- [ ] Publicar e validar a rota de redefinição em HTTPS no staging.
- [ ] Configurar SPF, DKIM e DMARC no domínio aprovado.

## Banco, backup e restore

- [x] E2E usa bancos SQLite temporários descartáveis.
- [x] `legal_acceptances` criada em SQLite e migration PostgreSQL versionada.
- [x] Backup SQLite consistente com destino e retenção configuráveis.
- [x] Restore valida backup, exige confirmação, cria cópia pré-restore e trava produção.
- [x] Backup/restore testados somente em banco temporário.
- [x] Processo futuro PostgreSQL documentado em `docs/BACKUP_RESTORE_POSTGRES.md`.
- [ ] Runtime PostgreSQL; explicitamente fora desta sprint.
- [ ] Backup automático do provedor e teste real de restore em staging.
- [ ] Definir RPO/RTO com operação/produto.

## Staging e repositório

- [x] Matriz de ambientes e procedimento em `docs/STAGING.md`.
- [x] `.env.example` canônico sem segredos reais.
- [x] Seed/credenciais demo ocultos em staging e produção.
- [x] `.gitignore` cobre artefatos, bancos e backups gerados.
- [x] Organização segura documentada em `docs/ORGANIZACAO_REPOSITORIO.md`.
- [ ] Provisionar staging isolado com domínio e certificado HTTPS.
- [ ] Validar `TRUST_PROXY_HOPS`, CORS e volume no provedor real.
- [ ] Rodar smoke no staging implantado com dados sintéticos.

## Observabilidade e operação

- [x] `/health` (liveness) separado de `/ready` (readiness).
- [x] Readiness verifica banco/schema, e-mail, URL pública e IA quando exigida.
- [x] Logs JSON têm request ID, rota, status, duração, ator/empresa/função quando aplicável.
- [x] Sanitização central testada para senha, token e chave.
- [x] Métricas agregadas de requests, erros, latência, login, rate limit, reset, e-mail, IA e PDF.
- [x] Endpoint de métricas protegido para ADMIN e desativável por ambiente.
- [x] Alertas estruturados básicos e regras documentadas.
- [x] Runbook criado em `docs/RUNBOOK_BETA.md`.
- [ ] Centralizar logs/alertas em plataforma externa e definir limiares após baseline.
- [ ] Definir contatos, canal de suporte, horário e SLA do beta.

## Jurídico e privacidade

- [x] Rascunho de termos do beta criado.
- [x] Rascunho de política de privacidade criado.
- [x] Rascunho de política de IA criado.
- [x] Aceite versionado registra usuário, empresa, data, hash de IP, request ID e origem.
- [x] Feature flag de aceite testada sem quebrar a demo quando desligada.
- [ ] Revisão e aprovação jurídica dos três rascunhos.
- [ ] Definir bases legais, retenção, titulares, exportação/exclusão e contatos.

## Testes da Sprint 3.2

- [x] Build TypeScript e build do workspace.
- [x] Unitário de senha e sanitização de logs.
- [x] E2E multiempresa e segurança.
- [x] E2E operacional de health/readiness, aceite, métricas e e-mail falso.
- [x] Teste de backup/restore SQLite em banco temporário.
- [x] Testes Flutter da tela de reset.
- [x] `flutter analyze`.
- [ ] Teste de carga/concorrência e pentest antes de clientes pagantes.

## Critérios de entrada no beta real

- [x] Isolamento multiempresa e fluxo funcional cobertos por E2E.
- [x] Recuperação completa implementada no código.
- [x] Smoke local temporário disponível.
- [ ] Staging HTTPS implantado e smoke real aprovado.
- [ ] Provider real de e-mail validado.
- [ ] Backup externo e restore de staging comprovados.
- [ ] Termos e privacidade aprovados e publicados.
- [ ] Contatos operacionais definidos.

## Evidências da Sprint 3.3

- [x] Perfil seguro e validado de `APP_ENV=staging`.
- [x] Dockerfile, Compose de referência e shutdown controlado preparados.
- [x] Build Flutter Web de staging e fallback SPA preparados.
- [x] Backup externo validado com destino falso, manifesto e checksum.
- [x] Alertas externos validados com receptor HTTP falso e payload sanitizado.
- [x] Startup sintético de staging validou health, readiness e seed desligado.
- [x] Teste de carga leve aprovado sem IA, e-mail, PDF ou criação em massa.
- [x] Reaceite jurídico após mudança de versão coberto por E2E.
- [ ] Docker real, staging externo, domínio HTTPS, provider de e-mail e storage ainda não provisionados.
- [ ] Smoke externo não executado por ausência de URL/credenciais de staging.
- [ ] Evidências detalhadas de publicação estão em `CHECKLIST_PUBLICACAO_STAGING.md`.

## Evidências da Sprint 3.4

- [x] Higiene do repositório auditada e plano seguro documentado.
- [x] `deploy/staging/` concentra Compose, configuração modelo, API, Flutter Web e validação Docker.
- [x] Comandos `staging:seed` e `staging:cleanup` protegidos e testados localmente.
- [x] Dados de teste identificados como sintéticos e sem credenciais fixas.
- [x] Segredos, rotação e separação staging/produção documentados.
- [x] Rollback técnico e matriz GO/NO-GO documentados.
- [ ] O estado permanece NO-GO enquanto infraestrutura, e-mail, backup externo, alertas, jurídico e suporte não forem comprovados.

## Evidências da Sprint 3.5

- [x] A ausência de autorização/recursos foi registrada como Estado C, sem deploy fictício.
- [x] Nenhuma URL, certificado, e-mail, backup remoto, container ou resultado externo foi inventado.
- [x] Inventário externo e gate de provisionamento documentados.
- [x] Runbook contém placeholders para suporte, operação, backups, DNS, e-mail e OpenAI.
- [x] Três rascunhos jurídicos revisados apenas quanto à completude técnica.
- [x] Build e testes locais da API, E2E, operações, smoke, carga leve e startup de staging aprovados.
- [x] `flutter analyze` sem issues e 15 testes Flutter aprovados.
- [ ] Responsáveis e canais operacionais definidos.
- [ ] Revisão jurídica e autorização mínima concluídas.
- [ ] Infraestrutura real e validações externas concluídas.

## Suspender o beta se ocorrer

- [ ] Suspeita de vazamento multiempresa.
- [ ] Falha de backup/restore ou perda de dados.
- [ ] Exposição de chave, JWT, senha ou token.
- [ ] E-mail enviado ao destinatário incorreto.
- [ ] Indisponibilidade recorrente sem diagnóstico por request ID.
- [ ] Uso/custo de IA fora do esperado.
- [ ] Incidente jurídico ou solicitação de titular sem processo definido.
