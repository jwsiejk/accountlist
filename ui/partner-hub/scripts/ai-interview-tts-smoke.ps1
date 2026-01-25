$TtsUrl = if ($env:AI_INTERVIEW_TTS_URL) { $env:AI_INTERVIEW_TTS_URL } else { "http://127.0.0.1:8000" }

$scriptRoot = $PSScriptRoot
$tmpDir = Join-Path $scriptRoot ".." "tmp"
$null = New-Item -ItemType Directory -Path $tmpDir -Force

$outputPath = Join-Path $tmpDir "tts-smoke.mp3"
$payload = @{
  input = "hello from tts"
  response_format = "mp3"
} | ConvertTo-Json

Invoke-WebRequest -Uri ($TtsUrl.TrimEnd('/') + "/v1/audio/speech") -Method Post -ContentType "application/json" -Body $payload -OutFile $outputPath

Write-Host "Saved TTS output to $outputPath"
