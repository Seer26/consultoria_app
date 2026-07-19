# Checklist de Publicação do Staging

Legenda: `[x]` comprovado localmente; `[ ]` depende de infraestrutura externa, credencial, aprovação ou execução real.

## Infraestrutura

- [x] Perfil `APP_ENV=staging` separado de `NODE_ENV=production`.
- [x] Dockerfile multi-stage, usuário não root, healthcheck e shutdown preparados.
- [x] Compose genérico de staging preparado com uma réplica.
- [x] CI cobre API, Flutter, carga leve e build web.
- [ ] Provedor de API e host estático/CDN escolhidos.
- [ ] Registry, cofre de segredos e responsáveis operacionais configurados.

## Domínio e HTTPS

- [x] Perfil de staging recusa URL local ou HTTP.
- [x] Smoke externo exige HTTPS e host esperado.
- [ ] Domínios exclusivos de API e app provisionados.
- [ ] DNS e certificados TLS válidos, com renovação automática.
- [ ] `CORS_ORIGINS` e `TRUST_PROXY_HOPS` validados no provedor.
- [ ] Headers de segurança validados externamente.

## API

- [x] Build TypeScript aprovado.
- [x] Inicialização sintética validou health/readiness e seed desligado.
- [x] Configuração crítica ausente causa falha de startup ou `not_ready`.
- [x] Porta e variáveis são externas; imagem não inclui banco ou `.env`.
- [ ] Imagem Docker construída/inspecionada — Docker não está instalado nesta máquina.
- [ ] Container implantado e reinício controlado testado no provedor.

## Flutter Web

- [x] Build release reproduzível com `APP_ENV` e `API_BASE_URL`.
- [x] Script de staging recusa URL local ou HTTP.
- [x] Credenciais demo ocultas e URL local ausente do artefato.
- [x] Fallback SPA, refresh de rota e cache documentados/configurados.
- [x] Assets e metadata web incluídos no build.
- [ ] Artefato publicado em host estático/CDN.
- [ ] Rotas diretas, refresh e cache validados no domínio externo.
- [ ] Política externa de source maps decidida.

## Banco SQLite

- [x] Restrição de uma instância ativa imposta por configuração.
- [x] WAL, foreign keys e busy timeout configurados.
- [x] Banco e backups exigem diretórios absolutos e distintos.
- [x] Banco e `.env` excluídos do contexto Docker.
- [ ] Volume persistente exclusivo provisionado e com permissão não root.
- [ ] Reinício/redeploy comprovado sem perda.
- [ ] Monitoramento de espaço configurado.

## Backup

- [x] Backup SQLite consistente e restore com confirmação explícita.
- [x] Adapter externo, manifesto, tamanho e SHA-256 testados em destino falso.
- [x] Checksum da cópia externa é conferido.
- [x] Retenção configurável e alerta sanitizado em falha.
- [ ] Storage externo real, credencial mínima e agendamento provisionados.
- [ ] Restore real ensaiado em staging isolado.
- [ ] RPO/RTO e responsáveis definidos.

## E-mail

- [x] Provider HTTP e timeout preparados.
- [x] Receptor falso validou envio e falha controlada.
- [x] Console/provider de teste proibido em staging.
- [ ] Provider transacional real contratado e configurado.
- [ ] Remetente, SPF, DKIM e DMARC validados.
- [ ] Entrega, spam, bounce, suppression list e rotação testados.
- [ ] Recuperação por e-mail concluída ponta a ponta no HTTPS externo.

## OpenAI

- [x] Chave pode permanecer opcional com readiness degradada pela política explícita.
- [x] Quando `REQUIRE_AI_IN_READINESS=true`, chave ausente impede readiness pronta.
- [x] Falhas de IA são registradas/alertadas sem expor chave ou payload.
- [ ] Projeto/chave exclusiva e orçamento de staging definidos se IA for habilitada.
- [ ] Cota, modelo disponível e comportamento 429 validados no staging.

## Segurança

- [x] JWT forte, CORS explícito, URLs HTTPS, flags explícitas e logs JSON obrigatórios.
- [x] Seed demo desligado e credenciais demo ocultas.
- [x] Logs, alertas e rotas operacionais não revelam senha, JWT, token, chave ou caminho do banco.
- [x] Isolamento multiempresa, roles, rate limits e reset de senha seguem verdes no E2E.
- [ ] Cofre, rotação de segredos e revisão externa de segurança concluídos.
- [ ] Política de dados sintéticos e acesso ao staging aprovada.

## Aceites legais

- [x] `REQUIRE_LEGAL_ACCEPTANCE=true` validado.
- [x] OWNER e EMPLOYEE bloqueados antes do aceite e liberados depois.
- [x] ADMIN segue sem pendência empresarial, conforme regra documentada.
- [x] Versão, nova pendência, hash de IP e request ID cobertos por E2E.
- [ ] Termos, privacidade e política de IA aprovados juridicamente.
- [ ] Documentos aprovados publicados no frontend.

## Logs e alertas

- [x] stdout/stderr e logs JSON permanecem como fonte principal.
- [x] Request ID e sanitização central preservados.
- [x] Webhook externo testado com receptor falso, timeout e falha não bloqueante.
- [x] Payload externo usa campos permitidos e evita loop de alerta.
- [x] `/health`, `/ready` e métricas ADMIN validados.
- [ ] Central externo de logs/alertas e limiares após baseline configurados.
- [ ] Canal de incidente, plantão e contatos definidos.

## Smoke test

- [x] Smoke local e E2E cobrem fluxo principal e isolamento.
- [x] Smoke externo aceita somente `STAGING_API_URL` HTTPS, host esperado e confirmação explícita.
- [x] Script não imprime senha, JWT ou token e usa credenciais sintéticas.
- [ ] Smoke executado contra staging publicado.
- [ ] Health, readiness, login, aceite, dashboard, pesquisa, plano, relatório, PDF, plano e configurações validados externamente.
- [ ] Recuperação de senha real validada quando houver provider autorizado.

## Teste de carga leve

- [x] Ambiente local temporário, concorrência 2 e 5 iterações.
- [x] 25 requisições com zero falhas.
- [x] Média 6,33 ms, p95 14,88 ms e máximo 14,98 ms nesta execução.
- [x] Nenhuma geração de IA, PDF, e-mail, usuário ou empresa em massa.
- [ ] Repetir de modo controlado no staging real após publicação.

## Critérios de publicação

- [x] Builds e testes locais aprovados.
- [x] Perfil seguro, volume planejado, backup/alerta preparados e documentação concluída.
- [ ] Docker real, domínio HTTPS, volume, provider de e-mail, storage e cofre disponíveis.
- [ ] Smoke externo, entrega de e-mail, persistência e rollback aprovados.
- [ ] Aceites técnico, produto, segurança e jurídico registrados.

Enquanto os itens críticos externos permanecerem abertos, o estado correto é “preparado localmente, não publicado”.

## Evidências da Sprint 3.4

- [x] Estado Git auditado sem reset, clean, exclusão ampla, commit ou push inseguro.
- [x] Plano de retirada controlada de `node_modules`, `dist` e SQLite do índice documentado.
- [x] Regras de ignore ampliadas para SQLite3, DB, WAL/SHM, dumps e arquivos de segredo.
- [x] Pacote único criado em `deploy/staging/`, sem código, banco, backup ou segredo duplicado.
- [x] Inventário de secrets e separação frontend/backend documentados.
- [x] Opções Render, Railway e Fly.io comparadas em fontes oficiais.
- [x] Seed sintético idempotente exige staging, confirmação e credenciais externas.
- [x] Cleanup recusa produção e remove somente IDs sintéticos fixos.
- [x] Procedimento de rollback preserva volumes e exige backup pré-deploy.
- [x] GO/NO-GO formal criado em `GO_NO_GO_BETA.md`.
- [ ] Docker disponível para construir e inspecionar a imagem.
- [ ] Provedor, custos, domínio, TLS, secret manager e volumes aprovados.
- [ ] Seed, smoke, persistência, backup/restore e rollback executados no staging externo.

## Evidências da Sprint 3.5

- [x] Autorizações e recursos externos classificados em `docs/RECURSOS_EXTERNOS_STAGING.md`.
- [x] Estado correto registrado como `ESTADO C — Publicação não iniciada`.
- [x] Docker/Compose e CLIs de provedores verificados como indisponíveis.
- [x] `.env.local` preservado e não aberto; nenhum secret exibido ou provisionado.
- [x] Higiene do índice reavaliada e mantida pendente por falta de checkpoint seguro.
- [x] Responsabilidades operacionais ampliadas no runbook com placeholders explícitos.
- [x] Status dos rascunhos jurídicos registrado sem inventar dados.
- [x] Matriz GO/NO-GO passou a usar somente estados permitidos.
- [x] Suíte local repetida: API, smoke isolado, carga leve, startup de staging, Flutter analyze e 15 testes Flutter aprovados.
- [x] Carga local da Sprint 3.5: concorrência 2, 25 requisições, zero falhas, média 4,29 ms, p95 7,83 ms e máximo 8,83 ms.
- [x] Build Flutter Web não foi repetido sem URL real e autorizada da API.
- [ ] Provedor e autorização específica disponibilizados.
- [ ] Docker/runtime, deploy, domínio, TLS, e-mail, volume e backup externo validados.
- [ ] Seed, aceite, smoke, recuperação, carga e rollback executados externamente.

## Critérios de rollback

- [ ] Última imagem validada identificada e disponível no registry.
- [ ] Responsável e janela de rollback definidos.
- [ ] Backup anterior à publicação confirmado e checksum validado.
- [ ] Procedimento ensaiado sem apagar ou substituir o volume.
- [ ] Health, readiness e smoke sintético executados após rollback.
- [ ] Rollback obrigatório em vazamento, perda de dados, segredo exposto, readiness persistente ou falha crítica do fluxo.

## Pendências externas

- [ ] Escolher/contratar hospedagem da API e Flutter Web.
- [ ] Provisionar domínio, DNS, TLS, registry, cofre e volume persistente.
- [ ] Contratar/configurar provider de e-mail e autenticação do domínio.
- [ ] Provisionar backup externo e central de logs/alertas.
- [ ] Aprovar documentos jurídicos e processo de titulares.
- [ ] Executar build Docker, publicação, smoke e carga leve no ambiente externo.
- [ ] Definir responsáveis, suporte, SLA, RPO/RTO e autorização formal do beta.
