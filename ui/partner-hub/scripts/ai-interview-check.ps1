$OllamaUrl = if ($env:AI_INTERVIEW_OLLAMA_URL) { $env:AI_INTERVIEW_OLLAMA_URL } else { "http://127.0.0.1:11434" }
$SttUrl = if ($env:AI_INTERVIEW_STT_URL) { $env:AI_INTERVIEW_STT_URL } else { "http://127.0.0.1:9000" }
$TtsUrl = if ($env:AI_INTERVIEW_TTS_URL) { $env:AI_INTERVIEW_TTS_URL } else { "http://127.0.0.1:8000" }

function Test-Url {
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
    if ($response.StatusCode -gt 0) {
      Write-Host "PASS: $Name ($Url) [HTTP $($response.StatusCode)]"
      return $true
    }
  } catch {
    $statusCode = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    } elseif ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__) {
      $statusCode = $_.Exception.Response.StatusCode.value__
    }

    if ($null -ne $statusCode) {
      Write-Host "PASS: $Name ($Url) [HTTP $statusCode]"
      return $true
    }

    Write-Host "FAIL: $Name ($Url)"
    return $false
  }

  Write-Host "FAIL: $Name ($Url)"
  return $false
}

$results = @()
$results += Test-Url -Name "Ollama" -Url ($OllamaUrl.TrimEnd('/') + "/api/tags")
$results += Test-Url -Name "STT" -Url ($SttUrl.TrimEnd('/') + "/")
$results += Test-Url -Name "TTS" -Url ($TtsUrl.TrimEnd('/') + "/")

if ($results -contains $false) {
  exit 1
}

exit 0
