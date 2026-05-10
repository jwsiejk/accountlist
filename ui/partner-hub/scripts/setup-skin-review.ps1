$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$VenvPath = Join-Path $ProjectRoot ".venv-skin-review"
$PythonPath = Join-Path $VenvPath "Scripts\python.exe"

Write-Host "Setting up Skin Image Review Python environment in $VenvPath"

if (-not (Test-Path $PythonPath)) {
  python -m venv .venv-skin-review
}

& $PythonPath -m pip install --upgrade pip
& $PythonPath -m pip install --upgrade --index-url https://download.pytorch.org/whl/cu124 "torch>=2.6" torchvision
& $PythonPath -m pip install --upgrade open_clip_torch pillow huggingface_hub safetensors

Write-Host "Skin Image Review setup complete. Next steps:"
Write-Host ".\.venv-skin-review\Scripts\Activate.ps1"
Write-Host "npm run dev"
Write-Host "Open /skin-review and upload a JPG, PNG, or WebP image."
