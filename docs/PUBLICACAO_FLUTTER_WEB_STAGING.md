# Publicação do Flutter Web em staging

## Pré-condições

- origem HTTPS aprovada para o Flutter;
- API HTTPS separada e validada;
- `CORS_ORIGINS` da API contendo somente a origem exata do Flutter;
- nenhum dado real de cliente;
- `STAGING_API_URL` configurada sem barra final.

## Build reproduzível

No PowerShell:

```powershell
$env:STAGING_API_URL='https://api-staging.exemplo.invalid'
.\scripts\build-flutter-web-staging.ps1
```

O domínio `.invalid` é reservado e serve apenas para validar o build local. Para publicação, substitua pela URL HTTPS aprovada. O script recusa localhost e gera:

```text
build/web
```

Parâmetros aplicados:

```text
APP_ENV=staging
API_BASE_URL=<URL HTTPS informada>
SHOW_DEMO_CREDENTIALS=false
```

Não são gerados source maps nesta política de staging. Não acrescente `--source-maps` sem revisão de segurança.

## Publicação estática

Publique somente o conteúdo de `build/web` no host estático. Não publique a raiz do repositório, `.env`, banco, source maps ou arquivos de testes.

O servidor precisa aplicar fallback de SPA:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

O exemplo completo está em `deploy/staging/flutter-web/nginx.conf`. O fallback é obrigatório para abrir ou atualizar diretamente:

```text
/login
/forgot-password
/reset-password?token=...
```

## Cache

- `index.html`, service worker e rotas: sem cache duradouro;
- assets com hash: cache longo e `immutable`;
- após publicação, verificar se o HTML novo referencia assets existentes;
- em rollback, restaurar o pacote estático completo, não arquivos isolados.

## Validação

1. Abrir a raiz em janela anônima.
2. Confirmar ausência de credenciais demo.
3. Abrir diretamente `/reset-password` sem token e verificar mensagem amigável.
4. Atualizar a página nessa rota e confirmar que o host devolve `index.html`.
5. Confirmar no navegador que chamadas usam somente a API HTTPS de staging.
6. Confirmar que favicon, manifest e assets retornam HTTP 200.
7. Confirmar que nenhuma mensagem apresenta stack, localhost ou detalhe técnico.

Este documento não comprova domínio, certificado ou publicação real.
