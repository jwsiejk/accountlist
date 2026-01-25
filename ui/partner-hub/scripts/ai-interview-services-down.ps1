$composeFile = Join-Path $PSScriptRoot "..\dev\ai-interview\docker-compose.yml"

Write-Host "Stopping AI interview services..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker not found. Nothing to stop."
  exit 0
}

docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Desktop not running (compose unavailable). Nothing to stop."
  exit 0
}

docker compose -f $composeFile down *> $null
if ($LASTEXITCODE -ne 0) {
  $runningServices = docker compose -f $composeFile ps -q
  if ([string]::IsNullOrWhiteSpace($runningServices)) {
    Write-Host "No AI interview services are running."
    exit 0
  }

  exit $LASTEXITCODE
}

exit 0
