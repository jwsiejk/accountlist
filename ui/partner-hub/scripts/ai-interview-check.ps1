$OllamaUrl = if ($env:AI_INTERVIEW_OLLAMA_URL) { $env:AI_INTERVIEW_OLLAMA_URL } else { "http://127.0.0.1:11434" }
$SttUrl = if ($env:AI_INTERVIEW_STT_URL) { $env:AI_INTERVIEW_STT_URL } else { "http://127.0.0.1:9000" }
$TtsUrl = if ($env:AI_INTERVIEW_TTS_URL) { $env:AI_INTERVIEW_TTS_URL } else { "http://127.0.0.1:8000" }

function Test-Url {
  param (
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 2 -UseBasicParsing
    if ($response.StatusCode -gt 0) {
      Write-Host "PASS: $Name ($Url) [HTTP $($response.StatusCode)]"
      return $true
    }
  } catch {
    Write-Host "FAIL: $Name ($Url)"
    return $false
  }
}

Test-Url -Name "Ollama" -Url ($OllamaUrl.TrimEnd('/') + "/api/tags")
Test-Url -Name "STT" -Url ($SttUrl.TrimEnd('/') + "/")
Test-Url -Name "TTS" -Url ($TtsUrl.TrimEnd('/') + "/")
