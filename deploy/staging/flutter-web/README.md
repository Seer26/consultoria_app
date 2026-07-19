# Flutter Web em staging

Gerar o bundle com a URL HTTPS pública da API:

```powershell
flutter build web --release --dart-define=API_BASE_URL=https://api-staging.exemplo.com
```

Publicar o conteúdo de `build/web` no serviço estático. Usar `nginx.conf` quando a plataforma aceitar Nginx ou reproduzir o fallback SPA equivalente. Validar:

- nenhuma ocorrência de `localhost`, credencial demo ou chave;
- rota direta funciona após refresh;
- TLS válido;
- headers de segurança;
- `index.html` e service worker sem cache imutável;
- assets com cache versionado.

O bundle não deve receber secrets.
