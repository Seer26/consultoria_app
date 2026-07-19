param(
  [string]$ApiUrl = $env:STAGING_API_URL
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
  throw 'Defina STAGING_API_URL com a URL HTTPS da API de staging.'
}

$parsed = [Uri]$ApiUrl
if (
  $parsed.Scheme -ne 'https' -or
  $parsed.Host -in @('localhost', '127.0.0.1', '0.0.0.0')
) {
  throw 'STAGING_API_URL deve ser HTTPS e nao pode apontar para localhost.'
}

flutter build web --release `
  --dart-define=APP_ENV=staging `
  --dart-define=API_BASE_URL=$ApiUrl `
  --dart-define=SHOW_DEMO_CREDENTIALS=false

Write-Output "Build Flutter Web de staging criado em build/web."
