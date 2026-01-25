$SttUrl = if ($env:AI_INTERVIEW_STT_URL) { $env:AI_INTERVIEW_STT_URL } else { "http://127.0.0.1:9000" }

$scriptRoot = $PSScriptRoot
$repoRoot = Resolve-Path (Join-Path $scriptRoot "..")
$tmpDir = Join-Path $repoRoot "tmp"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$wavPath = Join-Path $tmpDir "stt-smoke.wav"

$sampleRate = 16000
$channels = 1
$bitsPerSample = 16
$durationSeconds = 0.25

$sampleCount = [int]($sampleRate * $durationSeconds)
$dataSize = $sampleCount * $channels * ($bitsPerSample / 8)
$riffSize = 36 + $dataSize
$byteRate = $sampleRate * $channels * ($bitsPerSample / 8)
$blockAlign = $channels * ($bitsPerSample / 8)

$stream = [System.IO.File]::Open($wavPath, [System.IO.FileMode]::Create)
$writer = [System.IO.BinaryWriter]::new($stream)

try {
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes("RIFF"))
  $writer.Write([int]$riffSize)
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes("WAVE"))
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes("fmt "))
  $writer.Write([int]16)
  $writer.Write([int16]1)
  $writer.Write([int16]$channels)
  $writer.Write([int]$sampleRate)
  $writer.Write([int]$byteRate)
  $writer.Write([int16]$blockAlign)
  $writer.Write([int16]$bitsPerSample)
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes("data"))
  $writer.Write([int]$dataSize)

  $writer.Write((New-Object byte[] $dataSize))
} finally {
  $writer.Dispose()
  $stream.Dispose()
}

$response = $null
$responseBody = $null

$sttEndpoint = $SttUrl.TrimEnd('/') + "/v1/audio/transcriptions"

try {
  $fileBytes = [System.IO.File]::ReadAllBytes($wavPath)
  $boundary = [System.Guid]::NewGuid().ToString()
  $header = "--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"stt-smoke.wav`"`r`nContent-Type: audio/wav`r`n`r`n"
  $footer = "`r`n--$boundary--`r`n"
  $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
  $footerBytes = [System.Text.Encoding]::UTF8.GetBytes($footer)
  $bodyBytes = New-Object byte[] ($headerBytes.Length + $fileBytes.Length + $footerBytes.Length)
  [System.Array]::Copy($headerBytes, 0, $bodyBytes, 0, $headerBytes.Length)
  [System.Array]::Copy($fileBytes, 0, $bodyBytes, $headerBytes.Length, $fileBytes.Length)
  [System.Array]::Copy($footerBytes, 0, $bodyBytes, $headerBytes.Length + $fileBytes.Length, $footerBytes.Length)

  $iwrParams = @{
    Method = "Post"
    Uri = $sttEndpoint
    ContentType = "multipart/form-data; boundary=$boundary"
    Body = $bodyBytes
    ErrorAction = "Stop"
    TimeoutSec = 60
  }
  if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey("UseBasicParsing")) {
    $iwrParams.UseBasicParsing = $true
  }

  $response = Invoke-WebRequest @iwrParams
  $responseBody = $response.Content

  Write-Host $responseBody
  Write-Host "Silence sample may return empty text; success is HTTP 200."
  exit 0
} catch {
  Write-Host "STT request failed."
  Write-Host "URL called: $sttEndpoint"

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
