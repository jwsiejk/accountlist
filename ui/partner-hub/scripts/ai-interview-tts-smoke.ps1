$TtsUrl = if ($env:AI_INTERVIEW_TTS_URL) { $env:AI_INTERVIEW_TTS_URL } else { "http://127.0.0.1:8000" }

$scriptRoot = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $scriptRoot "..")
$tmpDir = Join-Path $repoRoot "tmp"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$outputPath = Join-Path $tmpDir "tts-smoke.mp3"
$headersPath = Join-Path $tmpDir "tts-smoke.headers.txt"
$payload = @{
  input = "hello from tts"
  response_format = "mp3"
} | ConvertTo-Json

$ttsEndpoint = $TtsUrl.TrimEnd('/') + "/v1/audio/speech"

try {
  $curlArgs = @(
    "-sS",
    "-D", $headersPath,
    "-o", $outputPath,
    "-H", "Content-Type: application/json",
    "-X", "POST",
    $ttsEndpoint,
    "-d", $payload
  )
  & curl.exe @curlArgs | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "curl.exe failed with exit code $LASTEXITCODE"
  }
} catch {
  Write-Host "TTS request failed."
  Write-Host "URL called: $ttsEndpoint"

  $statusCode = $null
  $responseBody = $null
  $exception = $_.Exception
  if ($exception -and $exception.Response) {
    if ($exception.Response -is [System.Net.Http.HttpResponseMessage]) {
      $statusCode = [int]$exception.Response.StatusCode
      $responseBody = $exception.Response.Content.ReadAsStringAsync().Result
    } elseif ($exception.Response -is [System.Net.HttpWebResponse]) {
      $statusCode = [int]$exception.Response.StatusCode
      $stream = $exception.Response.GetResponseStream()
      if ($stream) {
        $reader = [System.IO.StreamReader]::new($stream)
        try {
          $responseBody = $reader.ReadToEnd()
        } finally {
          $reader.Dispose()
          $stream.Dispose()
        }
      }
    }
  }

  if ($null -ne $statusCode) {
    Write-Host "HTTP status code: $statusCode"
  }
  if ($null -ne $responseBody) {
    if ($responseBody.Length -gt 500) {
      $responseBody = $responseBody.Substring(0, 500) + "..."
    }
    Write-Host "Response body: $responseBody"
  }
  exit 1
}

if (-not (Test-Path $outputPath)) {
  Write-Host "TTS request succeeded but output file is missing at $outputPath"
  exit 1
}

$fileInfo = Get-Item $outputPath
if ($fileInfo.Length -lt 3072) {
  Write-Host "TTS request succeeded but output file is too small ($($fileInfo.Length) bytes) at $outputPath"
  exit 1
}

if (Test-Path $headersPath) {
  $headers = Get-Content $headersPath
  $statusLine = $headers | Select-Object -First 1
  if ($null -eq $statusLine -or $statusLine -notmatch "\s200\s") {
    Write-Host "Unexpected HTTP status line: $statusLine"
    exit 1
  }
  $contentTypeLine = $headers | Where-Object { $_ -match "^(?i)Content-Type:" } | Select-Object -First 1
  if ($null -eq $contentTypeLine -or $contentTypeLine -notmatch "(?i)audio/mpeg") {
    Write-Host "Unexpected content-type header: $contentTypeLine"
    exit 1
  }
  Write-Host "Response headers:"
  $headers | ForEach-Object { Write-Host $_ }
}

Write-Host ("Saved TTS output ({0} bytes) to {1}" -f $fileInfo.Length, $outputPath)
exit 0
