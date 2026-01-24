$composeFile = Join-Path $PSScriptRoot "..\dev\ai-interview\docker-compose.yml"

Write-Host "Stopping AI interview services..."
docker compose -f $composeFile down
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

exit 0
