param(
  [Parameter(Mandatory = $true)]
  [string]$InputFile,

  [Parameter(Mandatory = $true)]
  [string]$TargetDatabaseUrl,

  [Parameter(Mandatory = $true)]
  [ValidateSet('restore-into-isolated-database')]
  [string]$Confirm
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
  throw 'PG_RESTORE_NOT_INSTALLED'
}

$resolvedInput = [System.IO.Path]::GetFullPath($InputFile)
if (-not (Test-Path -LiteralPath $resolvedInput -PathType Leaf)) {
  throw 'POSTGRES_BACKUP_FILE_NOT_FOUND'
}

if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
  throw 'TARGET_DATABASE_URL_REQUIRED'
}

& pg_restore --exit-on-error --no-owner --no-privileges --dbname=$TargetDatabaseUrl $resolvedInput
if ($LASTEXITCODE -ne 0) {
  throw 'POSTGRES_RESTORE_FAILED'
}

[pscustomobject]@{
  ok = $true
  restoredFrom = $resolvedInput
  target = 'sanitized'
} | ConvertTo-Json -Compress
