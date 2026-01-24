$composeFile = Join-Path $PSScriptRoot "..\dev\ai-interview\docker-compose.yml"

Write-Host "Starting AI interview services..."
docker compose -f $composeFile up -d --build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to start docker compose services."
  exit $LASTEXITCODE
}

function Test-Health {
  param (
    [string]$Name,
    [string]$Url
  )

  $supportsSkipHttpErrorCheck = (Get-Command Invoke-WebRequest).Parameters.ContainsKey('SkipHttpErrorCheck')
  $supportsUseBasicParsing = (Get-Command Invoke-WebRequest).Parameters.ContainsKey('UseBasicParsing')
  $requestParams = @{
    Uri = $Url
    Method = 'Get'
    TimeoutSec = 2
  }
  if ($supportsSkipHttpErrorCheck) {
    $requestParams.SkipHttpErrorCheck = $true
  }
  if ($supportsUseBasicParsing) {
    $requestParams.UseBasicParsing = $true
  }

  try {
    $response = Invoke-WebRequest @requestParams
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
      return ($statusCode -ge 200 -and $statusCode -lt 400)
    }
  }

  return $false
}

function Wait-ForHealth {
  param (
    [string]$Name,
    [string]$Url,
    [int]$Retries = 10,
    [int]$DelaySeconds = 2
  )

  for ($attempt = 1; $attempt -le $Retries; $attempt++) {
    if (Test-Health -Name $Name -Url $Url) {
      Write-Host "PASS: $Name ($Url)"
      return $true
    }

    Write-Host "Waiting for $Name ($Url)... attempt $attempt/$Retries"
    Start-Sleep -Seconds $DelaySeconds
  }

  Write-Host "FAIL: $Name ($Url)"
  return $false
}

$sttHealthy = Wait-ForHealth -Name "STT" -Url "http://127.0.0.1:9000/health"
$ttsHealthy = Wait-ForHealth -Name "TTS" -Url "http://127.0.0.1:8000/health"

if (-not $sttHealthy -or -not $ttsHealthy) {
  exit 1
}

Write-Host "Running AI interview checks..."
& (Join-Path $PSScriptRoot "ai-interview-check.ps1")
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

exit 0
