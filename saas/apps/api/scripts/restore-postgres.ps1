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

function Get-PostgresDatabaseIdentity {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ConnectionString,

    [Parameter(Mandatory = $true)]
    [string]$InvalidError
  )

  try {
    $uri = [System.Uri]$ConnectionString
    if (
      -not $uri.IsAbsoluteUri -or
      $uri.Scheme -notin @('postgres', 'postgresql') -or
      [string]::IsNullOrWhiteSpace($uri.DnsSafeHost)
    ) {
      throw 'invalid'
    }

    $database = [System.Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($database) -or $database.Contains('/')) {
      throw 'invalid'
    }

    [pscustomobject]@{
      Host = $uri.DnsSafeHost
      Port = if ($uri.Port -lt 0) { 5432 } else { $uri.Port }
      Database = $database
    }
  } catch {
    throw $InvalidError
  }
}

$resolvedInput = [System.IO.Path]::GetFullPath($InputFile)
if (-not (Test-Path -LiteralPath $resolvedInput -PathType Leaf)) {
  throw 'POSTGRES_BACKUP_FILE_NOT_FOUND'
}

if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
  throw 'TARGET_DATABASE_URL_REQUIRED'
}

if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  throw 'PRIMARY_DATABASE_URL_REQUIRED_FOR_RESTORE_SAFETY_CHECK'
}

$primary = Get-PostgresDatabaseIdentity `
  -ConnectionString $env:DATABASE_URL `
  -InvalidError 'PRIMARY_DATABASE_URL_INVALID_FOR_RESTORE_SAFETY_CHECK'
$target = Get-PostgresDatabaseIdentity `
  -ConnectionString $TargetDatabaseUrl `
  -InvalidError 'TARGET_DATABASE_URL_INVALID'

$sameHost = [System.StringComparer]::OrdinalIgnoreCase.Equals($primary.Host, $target.Host)
$samePort = $primary.Port -eq $target.Port
$sameDatabase = [System.StringComparer]::Ordinal.Equals(
  $primary.Database,
  $target.Database
)
if ($sameHost -and $samePort -and $sameDatabase) {
  throw 'RESTORE_TARGET_MUST_DIFFER_FROM_PRIMARY_DATABASE'
}

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
  throw 'PG_RESTORE_NOT_INSTALLED'
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
