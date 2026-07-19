# Opções de infraestrutura para staging

Pesquisa atualizada em 18/07/2026, somente em documentação oficial. Nenhuma plataforma foi contratada ou configurada nesta sprint.

## Requisitos inegociáveis

- API Node em imagem Docker, uma única réplica;
- volume persistente gravável para o SQLite;
- volume ou destino externo distinto para backups;
- domínio HTTPS para API e Flutter Web;
- secret manager;
- logs consultáveis;
- e-mail transacional real;
- possibilidade de rollback de versão sem apagar volumes.

## Inventário externo encontrado

| Item | Classificação em 18/07/2026 |
|---|---|
| Hospedagem da API | ausente; depende de escolha, contratação e autorização |
| Hospedagem Flutter Web | ausente; depende de escolha e configuração manual |
| Domínio e DNS | ausente; depende de contratação/configuração manual |
| Registry | ausente; depende da plataforma escolhida |
| Secret manager | ausente; depende da plataforma escolhida |
| Volume persistente | ausente; depende de contratação e prova de permissões |
| Storage externo de backup | ausente; depende de contratação/configuração |
| Provider de e-mail | ausente; depende de contratação, domínio e credenciais |
| Central de logs | ausente; depende de plataforma/configuração |
| Canal de alertas | ausente; depende de receptor e autorização |

Nenhuma variável de ambiente do processo indicou credencial ou projeto desses provedores. O `.env.local` existente foi preservado e não foi aberto.

## Comparação curta

| Opção | Pontos favoráveis | Restrições relevantes para SQLite | Situação |
|---|---|---|---|
| Render | Docker, serviços estáticos com CDN/TLS, discos persistentes e variáveis secretas | Disco é pago, vinculado a uma instância; impede múltiplas réplicas e pode causar indisponibilidade breve no deploy | candidata preferencial pela simplicidade |
| Railway | Dockerfile, domínio público, variáveis seladas e volumes persistentes | um volume por serviço; réplica não compartilha volume; deploy com volume pode ter pequena indisponibilidade; permissões exigem atenção com usuário não-root | alternativa válida após prova do volume |
| Fly.io | Docker, secrets, domínio/TLS, volumes e métricas | volume é local a uma Machine, não é replicado e snapshots não substituem backup; alertas exigem integração externa | válida, porém mais operacional |

## Opção recomendada para avaliação

Avaliar primeiro Render: Web Service Docker com uma réplica e disco persistente para `/var/lib/consultoria`, Static Site para Flutter Web, domínio HTTPS separado e secret manager. O backup deve sair para armazenamento externo; o segundo volume local do Compose não atende sozinho ao requisito de desastre.

A recomendação não autoriza contratação. Antes do GO:

1. confirmar preço vigente do serviço, disco, tráfego e retenção;
2. confirmar localização/região e requisitos contratuais;
3. validar comportamento do volume em deploy e rollback;
4. contratar domínio/subdomínios;
5. escolher e configurar e-mail transacional;
6. escolher destino externo de backup e webhook de alertas.

## Custos e contratação

Os preços mudam. A decisão deve usar o simulador/página oficial no dia da contratação. Railway documenta cobrança mínima por plano e uso de CPU, memória, egress e volume. Fly.io cobra recursos e volume por uso. Render informa planos e disco persistente pago. Nenhum custo foi aprovado ou incorrido.

## Fontes oficiais

- Render: [Docker](https://render.com/docs/docker), [persistent disks](https://render.com/docs/disks), [static sites](https://render.com/docs/static-sites), [environment variables and secrets](https://render.com/docs/configure-environment-variables), [pricing](https://render.com/pricing).
- Railway: [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [volumes](https://docs.railway.com/volumes/reference), [public networking](https://docs.railway.com/networking/public-networking), [domains](https://docs.railway.com/networking/domains/working-with-domains), [variables](https://docs.railway.com/variables), [pricing](https://docs.railway.com/pricing).
- Fly.io: [Dockerfile](https://fly.io/docs/languages-and-frameworks/dockerfile/), [secrets](https://fly.io/docs/apps/secrets/), [custom domains](https://fly.io/docs/networking/custom-domain/), [volumes](https://fly.io/docs/volumes/overview/), [metrics](https://fly.io/docs/monitoring/metrics/), [pricing](https://fly.io/docs/about/pricing/).
