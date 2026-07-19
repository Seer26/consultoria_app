# GO / NO-GO do beta controlado

Data: 19/07/2026. Decisão: **NO-GO**.

Estado após a Sprint 3.6: **BASELINE LOCAL CONSOLIDADA; PUBLICAÇÃO NÃO
INICIADA**. A higiene do Git está **APROVADA** para a baseline local: banco e
artefatos gerados estão fora do versionamento, o backup foi validado, a suíte
foi revisada e branch/commits/tag locais foram criados sem push. Isso não
comprova staging ou beta externo.

| Área | Estado | Evidência / restrição |
|---|---|---|
| Higiene do Git | APROVADO | baseline local revisada; dependências, builds, banco e secrets fora do versionamento; nenhum push |
| Infraestrutura | REPROVADO | nenhum provedor escolhido, autorizado ou configurado |
| Docker | NÃO VALIDADO | Docker e Compose indisponíveis; somente validação estática |
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

## Decisão da Sprint 3.6

- apresentação local assistida: permitida com as restrições do
  `CHECKLIST_APRESENTACAO_MVP.md`;
- baseline Git local: `APROVADO`;
- beta externo: `NO-GO`;
- push, deploy, PostgreSQL e pagamentos: não executados.
