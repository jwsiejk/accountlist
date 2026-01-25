$composeFile = Join-Path $PSScriptRoot "..\dev\ai-interview\docker-compose.yml"

Write-Host "Stopping AI interview services..."
docker compose -f $composeFile down
if ($LASTEXITCODE -ne 0) {
  $runningServices = docker compose -f $composeFile ps -q
  if ([string]::IsNullOrWhiteSpace($runningServices)) {
    Write-Host "No AI interview services are running."
    exit 0
  }

  exit $LASTEXITCODE
}

exit 0
