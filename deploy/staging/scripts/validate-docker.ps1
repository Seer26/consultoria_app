$ErrorActionPreference = 'Stop'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'DOCKER_NOT_AVAILABLE: install and start Docker manually before validation.'
}

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$imageName = 'consultoria-api:staging-validation'

docker build `
  -f (Join-Path $repositoryRoot 'saas\apps\api\Dockerfile') `
  -t $imageName `
  (Join-Path $repositoryRoot 'saas')

$imageUser = docker image inspect $imageName --format '{{.Config.User}}'
if ($imageUser -ne 'node') {
  throw "IMAGE_NON_ROOT_USER_INVALID: expected node, got '$imageUser'."
}

$history = docker history $imageName --no-trunc
if ($history -match 'JWT_SECRET=|OPENAI_API_KEY=|EMAIL_API_KEY=') {
  throw 'POTENTIAL_SECRET_FOUND_IN_IMAGE_HISTORY'
}

Write-Output 'Docker image built; non-root user and image history checks passed.'
Write-Output 'Runtime/volume/TLS tests still require the selected staging provider.'
