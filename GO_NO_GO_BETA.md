# GO / NO-GO do beta controlado

Data: 19/07/2026. Decisão: **NO-GO**.

Estado durante a Sprint 3.12: **MIGRAÇÃO POSTGRESQL IMPLEMENTADA, MAS
VALIDAÇÃO OPERACIONAL PARCIAL**. A higiene da baseline anterior permanece
**APROVADA**: banco e artefatos
gerados estão fora do versionamento, o backup foi validado, a suíte pré e
pós-merge passou, o audit npm está zerado e a tag
`baseline-hardened-pre-postgres-2026-07-19` foi publicada. A integração usou
merge commit auditado porque o GitHub CLI não estava disponível; `main`
permaneceu inalterada. Isso não comprova staging ou beta externo.

| Área | Estado | Evidência / restrição |
|---|---|---|
| Higiene do Git | APROVADO | hardening integrado à baseline privada; dependências, builds, banco e secrets fora do versionamento; clone limpo validado |
| Infraestrutura | REPROVADO | nenhum provedor escolhido, autorizado ou configurado |
| Docker | NÃO VALIDADO | Docker e Compose indisponíveis nesta máquina; Compose preparado e somente validação estática |
| PostgreSQL | NÃO VALIDADO | adapter, migrations, migrador, testes e CI preparados; E2E/smoke/migração local não executados por falta do servidor |
| HTTPS | NÃO VALIDADO | frontend/API não publicados e certificado inexistente |
| DNS | NÃO VALIDADO | domínio, zona e autorização não informados |
| Banco SQLite | APROVADO COM RESTRIÇÃO | operação local e guardas aprovadas; staging externo ausente |
| Persistência | NÃO VALIDADO | volume real e redeploy não testados |
| Backup | REPROVADO | rotina local aprovada; storage remoto ausente |
| Restore | APROVADO COM RESTRIÇÃO | restore temporário local aprovado; remoto não executado |
| E-mail | REPROVADO | provider real, remetente e autenticação de domínio ausentes |
| Autenticação | APROVADO COM RESTRIÇÃO | suíte local verde; HTTPS externo não validado |
| Recuperação | APROVADO COM RESTRIÇÃO | fluxo local/falso verde; recebimento real não testado |
| Multiempresa | APROVADO COM RESTRIÇÃO | E2E local verde; smoke externo ausente |
| OpenAI | NÃO VALIDADO | chave/projeto/orçamento de staging não confirmados |
| PDF | APROVADO COM RESTRIÇÃO | E2E local verde; download externo não validado |
| Logs | APROVADO COM RESTRIÇÃO | JSON/request ID local; coleta e retenção externas ausentes |
| Alertas | NÃO VALIDADO | apenas receptor falso; canal externo ausente |
| Jurídico | REPROVADO | três documentos permanecem rascunhos |
| Suporte | REPROVADO | responsáveis, contato, horário, canal e SLA indefinidos |
| Smoke | NÃO VALIDADO | não há URL HTTPS autorizada |
| Carga | NÃO VALIDADO | carga externa depende de smoke aprovado |
| Rollback | APROVADO COM RESTRIÇÃO | procedimento documentado; não existe ambiente para ensaio |

## Decisão PostgreSQL da Sprint 3.12

**POSTGRESQL REPROVADO para promoção nesta máquina**, no sentido de que não
foi possível produzir evidência de execução. O código pode ser revisado na
branch `codex/postgres-migration`, mas não deve ser integrado à baseline nem
receber a tag `postgres-ready-pre-staging-2026-07-19` antes de:

- migrations passarem duas vezes em banco vazio;
- E2E e smoke PostgreSQL passarem;
- migrador e comparação passarem com dados sintéticos;
- backup e restore em banco separado passarem;
- readiness indisponível/disponível passar;
- clone limpo com PostgreSQL passar.

## Condições mínimas para mudar para GO

- provedor e custos aprovados;
- API e Flutter publicados em domínios HTTPS;
- uma réplica e volume persistente comprovados;
- backup externo automático e restore ensaiado;
- e-mail transacional e recuperação de senha validados;
- secrets separados e rotação documentada;
- smoke externo, logs e alerta testados;
- termos/políticas aprovados;
- suporte beta definido;
- fluxo ADMIN, OWNER e EMPLOYEE executado somente com dados sintéticos;
- decisão assinada pelo responsável.

Consulte `docs/RECURSOS_EXTERNOS_STAGING.md` e `docs/STATUS_JURIDICO_BETA.md`.

## Decisão da Sprint 3.11

- apresentação local assistida: permitida com as restrições do
  `CHECKLIST_APRESENTACAO_MVP.md`;
- baseline Git privada: `HARDENING INTEGRADO E SINCRONIZADO`;
- beta externo: `NO-GO`;
- branches hardening e baseline: publicadas e sincronizadas;
- PR: não criado porque a ferramenta não estava disponível;
- merge commit auditado e nova tag específica: publicados;
- `main`, deploy, PostgreSQL e pagamentos: não alterados/não executados.
