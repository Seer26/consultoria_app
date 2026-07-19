# Runbook do Beta Controlado

## 1. Objetivo

Orientar diagnóstico, contenção, recuperação e comunicação do beta sem expor segredos ou dados pessoais.

## 2. Arquitetura do beta

Flutter → HTTPS → API Node/TypeScript → SQLite exclusivo de instância única. E-mail e OpenAI são dependências externas opcionais/configuráveis.

## 3. Contatos responsáveis

- Responsável técnico: `[DEFINIR]`
- Responsável de produto: `[DEFINIR]`
- Contato de suporte: `[DEFINIR]`
- Horário de atendimento: `[DEFINIR]`
- Canal de incidentes: `[DEFINIR]`
- Canal de segurança/privacidade: `[DEFINIR]`
- Responsável por backups e restore: `[DEFINIR]`
- Responsável por domínio e DNS: `[DEFINIR]`
- Responsável pelo provider de e-mail: `[DEFINIR]`
- Responsável pela OpenAI e orçamento: `[DEFINIR]`
- SLA do beta: `[DEFINIR]`

Enquanto esses campos não estiverem definidos, o beta externo permanece em NO-GO.

## 4. Verificação diária

Consultar `/health`, `/ready`, logs por request ID, espaço do volume, último backup válido, erros 5xx, rate limits, falhas de e-mail, IA e PDF. Não copiar payloads sensíveis para chamados.

## 5. Health e readiness

`Invoke-WebRequest https://API/health` confirma processo. `Invoke-WebRequest https://API/ready` confirma prontidão. `degraded` permite operação parcial; `not_ready` deve retirar a instância do tráfego e abrir incidente.

## 6. Login e recuperação de senha

Confirmar status de usuário/empresa, horário e request ID. Solicitar novo link sem revelar existência da conta. Nunca pedir senha ou token ao cliente.

## 7. E-mail não recebido

Validar provider/readiness, domínio do destinatário, logs por request ID e status do fornecedor. Não reenviar token por chat. Verificar SPF/DKIM/DMARC quando contratados.

## 8. Usuário bloqueado

ADMIN confirma status e vínculo da conta. Reativação exige solicitação autorizada e registro; redefinição de senha invalida sessões anteriores.

## 9. Empresa bloqueada

Confirmar motivo administrativo antes de reativar. Não alterar plano ou estado financeiro como solução de incidente técnico.

## 10. API indisponível

Verificar processo, `/health`, logs e última implantação. Se necessário, reimplantar a última imagem validada; não mudar banco durante o diagnóstico.

## 11. Banco indisponível

Retirar instância do tráfego, suspender escrita e preservar arquivos `sqlite`, `-wal` e `-shm`. Não copiar apenas o arquivo principal durante escrita. Validar espaço/permissões e acionar restauração somente com autorização.

## 12. OpenAI indisponível

Confirmar readiness/configuração, cota e logs `ai_error`. Comunicar indisponibilidade do recurso; pesquisa e relatórios determinísticos devem permanecer disponíveis quando possível.

## 13. PDF com falha

Buscar request ID e `report_pdf_failed`, verificar dados da submissão, memória e limite do plano. Não aumentar limite sem autorização comercial.

## 14. Rate limit excessivo

Identificar rota e padrão agregado. Não desabilitar globalmente. Validar proxy/IP e ajustar somente após distinguir uso legítimo de abuso.

## 15. Suspeita de vazamento multiempresa

Suspender imediatamente o beta, preservar logs e evidências, revogar acessos afetados e acionar segurança/privacidade. Não tentar reproduzir com dados reais nem comunicar causa sem investigação.

## 16. Exposição de segredo

Revogar e rotacionar a credencial no provedor, interromper instâncias antigas, procurar uso indevido e preservar evidências. Remover do histórico exige procedimento específico; não usar reset/clean destrutivo.

## 17. Backup e restauração

Executar backup com `npm.cmd --workspace @consultoria/api run db:backup:sqlite`. Restore é operação crítica: parar escrita, validar origem e executar `db:restore:sqlite -- --source=C:\caminho\backup.sqlite --confirm-restore`; em produção exige ainda `--allow-production` e autorização formal. O script cria cópia pré-restore.

## 18. Suspensão do beta

Suspender em vazamento multiempresa, perda de dados, segredo exposto, envio incorreto de e-mail ou falha não diagnosticada recorrente. Registrar hora, escopo e decisão.

Também suspender em readiness persistente, backup/restore não confiável, volume próximo do limite, erros 5xx recorrentes, locking/corrupção SQLite, uso/custo inesperado da OpenAI, documento jurídico revogado ou ausência dos responsáveis operacionais durante a janela acordada.

## 19. Comunicação com clientes

Usar canal `[DEFINIR]`, mensagem factual, impacto, contenção e próxima atualização. Não incluir detalhes exploráveis, dados de outros clientes ou estimativa sem evidência.

## 20. Pós-incidente

Documentar linha do tempo, causa, impacto, evidências, correções, dono e prazo. Testar correção/restore, atualizar runbook e só reabrir o beta após aceite técnico e de produto.

## Regras de alertas

No staging, `ENABLE_EXTERNAL_ALERTS=true` exige webhook HTTPS. O dispatcher envia somente código, severidade, horário, ambiente, request ID, método, rota e status. Falha do receptor é registrada localmente e não bloqueia a requisição nem dispara um novo alerta em loop.

Gerar alerta estruturado para readiness falha, erro 5xx e falha de dependência. Na plataforma futura, alertar por janela: sequência de 5xx, rate limit excessivo, e-mail/banco/OpenAI/PDF recorrentes e crescimento inesperado de IA. Definir limiares após baseline; alertas não devem transportar e-mail, token ou payload.

## Publicação e validação de staging

Antes de publicar, concluir `CHECKLIST_PUBLICACAO_STAGING.md`. O perfil obrigatório é `APP_ENV=staging` com `NODE_ENV=production`, uma única instância ativa, volume SQLite persistente e seed demo desligado. Após cada implantação, executar `/health`, `/ready` e o smoke externo somente com host e usuários sintéticos aprovados.

Se o smoke falhar, não promover a versão. Preserve request IDs e logs, compare com a última imagem validada e faça rollback sem apagar ou substituir o volume. Falha de readiness, backup, isolamento multiempresa, e-mail incorreto ou exposição de segredo exige suspensão imediata.
