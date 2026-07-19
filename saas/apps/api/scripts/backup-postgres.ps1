param(
  [Parameter(Mandatory = $true)]
  [string]$OutputFile,

  [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw 'DATABASE_URL_REQUIRED'
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw 'PG_DUMP_NOT_INSTALLED'
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputFile)
$parent = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
  New-Item -ItemType Directory -Path $parent | Out-Null
}

& pg_dump --format=custom --no-owner --no-privileges --file=$resolvedOutput $DatabaseUrl
if ($LASTEXITCODE -ne 0) {
  throw 'POSTGRES_BACKUP_FAILED'
}

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedOutput).Hash
[pscustomobject]@{
  ok = $true
  file = $resolvedOutput
  sha256 = $hash
} | ConvertTo-Json -Compress
