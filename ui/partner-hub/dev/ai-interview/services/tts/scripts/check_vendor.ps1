Param()

$shareCache = "/root/.local/share/tts"
$runtimeCache = "/root/.cache/tts"

Write-Host "Coqui cache locations:" -ForegroundColor Cyan
Write-Host "- $shareCache"
Write-Host "- $runtimeCache"

Write-Host "No vendor artifacts are required for TTS startup." -ForegroundColor Green
exit 0
