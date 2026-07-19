# E-mail em staging

## Objetivo

Validar o fluxo real de recuperação de senha e comunicações transacionais sem usar o provider de console, sem expor tokens e sem afetar a reputação do domínio de produção.

## Estado atual

O adapter HTTP e o tratamento de erro estão implementados e cobertos com receptor falso local. Nenhum provider real, remetente, domínio autenticado ou caixa externa foi configurado nesta sprint.

## Configuração obrigatória

- `EMAIL_PROVIDER=http`
- `EMAIL_ALLOW_TEST_PROVIDER=false`
- `EMAIL_API_URL` HTTPS do provider
- `EMAIL_API_KEY` armazenada no cofre
- `EMAIL_FROM` pertencente a domínio aprovado
- `APP_PUBLIC_URL` HTTPS correto para o link de redefinição

A API não deve registrar chave, token de redefinição, senha nem conteúdo sensível da mensagem.

## Checklist do provider real

- [ ] Selecionar e contratar provider transacional.
- [ ] Criar projeto/subconta exclusiva de staging.
- [ ] Configurar remetente que não possa ser confundido com produção.
- [ ] Publicar e validar SPF.
- [ ] Publicar e validar DKIM.
- [ ] Definir DMARC inicialmente com política monitorada.
- [ ] Confirmar limites do sandbox e destinatários autorizados.
- [ ] Configurar bounce, complaint e suppression list.
- [ ] Definir retenção dos logs no provider.
- [ ] Restringir e rotacionar a chave de API.
- [ ] Testar entrega em provedores de caixa distintos.
- [ ] Verificar pasta de spam e reputação do domínio.
- [ ] Confirmar que o link abre a rota Flutter HTTPS correta.
- [ ] Confirmar token de uso único, expiração e invalidação de sessões.

## Teste controlado

Use apenas contas sintéticas aprovadas. Solicite a recuperação pela tela pública, registre o request ID, confirme a entrega sem copiar o token para logs/chamados e conclua a redefinição uma vez. Uma segunda tentativa com o mesmo link deve falhar de forma amigável.

## Falhas e resposta operacional

Quando houver falha, correlacione pelo request ID e verifique readiness, status do provider, domínio do destinatário, bounce e suppression list. Não envie o token manualmente por chat ou e-mail alternativo. Se houver envio para destinatário incorreto, suspenda o beta e siga o runbook de incidente.
