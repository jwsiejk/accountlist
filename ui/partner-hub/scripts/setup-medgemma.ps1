$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

$VenvPath = Join-Path $ProjectRoot ".venv-medgemma"
$VenvPython = Join-Path $VenvPath "Scripts\python.exe"
$VenvPip = Join-Path $VenvPath "Scripts\pip.exe"

Write-Host "Setting up MedGemma Python environment in $VenvPath"

if (-not (Test-Path $VenvPython)) {
  python -m venv .venv-medgemma
}

& $VenvPython -m pip install --upgrade pip
& $VenvPip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
& $VenvPip install transformers accelerate pillow huggingface_hub sentencepiece

Write-Host ""
Write-Host "MedGemma setup complete. Next steps:"
Write-Host ".\.venv-medgemma\Scripts\Activate.ps1"
Write-Host "hf auth login"
Write-Host "Accept Hugging Face model terms for google/medgemma-1.5-4b-it"
Write-Host "npm run dev"
