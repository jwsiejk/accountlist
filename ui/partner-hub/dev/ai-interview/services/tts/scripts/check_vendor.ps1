$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vendorDir = Join-Path $scriptDir "..\vendor"

$requiredFiles = @(
  "piper_linux_x86_64.tar.gz",
  "en_US-amy-medium.onnx",
  "en_US-amy-medium.onnx.json"
)

$missing = @()

foreach ($file in $requiredFiles) {
  $path = Join-Path $vendorDir $file
  if (-not (Test-Path -LiteralPath $path)) {
    $missing += $file
    continue
  }

  $item = Get-Item -LiteralPath $path
  Write-Host ("Found {0} ({1} bytes)" -f $file, $item.Length)
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing required vendor files in {0}:{1}{2}" -f $vendorDir, [Environment]::NewLine, ($missing | ForEach-Object { " - $_" } | Out-String))
  exit 1
}

Write-Host "All required vendor files are present."
