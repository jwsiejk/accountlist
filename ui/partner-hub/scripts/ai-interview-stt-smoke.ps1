$SttUrl = if ($env:AI_INTERVIEW_STT_URL) { $env:AI_INTERVIEW_STT_URL } else { "http://127.0.0.1:9000" }

$scriptRoot = $PSScriptRoot
$tmpDir = Join-Path $scriptRoot ".." "tmp"
$null = New-Item -ItemType Directory -Path $tmpDir -Force

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

$client = [System.Net.Http.HttpClient]::new()
$form = [System.Net.Http.MultipartFormDataContent]::new()
$fileContent = $null

$sttEndpoint = $SttUrl.TrimEnd('/') + "/v1/audio/transcriptions"

try {
  $fileBytes = [System.IO.File]::ReadAllBytes($wavPath)
  $fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("audio/wav")
  $form.Add($fileContent, "file", "stt-smoke.wav")

  $response = $client.PostAsync($sttEndpoint, $form).Result
  $responseBody = $response.Content.ReadAsStringAsync().Result

  if (-not $response.IsSuccessStatusCode) {
    throw "STT request failed with status $($response.StatusCode)"
  }

  Write-Host $responseBody
  Write-Host "Silence sample may return empty text; success is HTTP 200."
  exit 0
} catch {
  Write-Host "STT request failed."
  Write-Host "URL called: $sttEndpoint"

  $statusCode = $null
  $responseBody = $null
  if ($null -ne $response) {
    $statusCode = [int]$response.StatusCode
    $responseBody = $response.Content.ReadAsStringAsync().Result
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
} finally {
  if ($null -ne $fileContent) {
    $fileContent.Dispose()
  }
  $form.Dispose()
  $client.Dispose()
}
