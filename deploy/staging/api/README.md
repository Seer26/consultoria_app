# API em staging

Build context: `saas/`. Dockerfile: `saas/apps/api/Dockerfile`.

Requisitos:

- uma réplica;
- usuário não-root `node`;
- porta fornecida por `PORT`;
- `/var/lib/consultoria` persistente;
- `/var/backups/consultoria` distinto e exportado para armazenamento externo;
- TLS terminado pelo provedor/proxy;
- secrets injetados em runtime;
- healthcheck `/health` e readiness `/ready`;
- encerramento gracioso por `SIGTERM`.

Comando local de build:

```powershell
docker build -f saas/apps/api/Dockerfile -t consultoria-api:staging-validation saas
```

Não copiar `.env`, SQLite, backups, `node_modules` local ou `dist` local para a imagem.
