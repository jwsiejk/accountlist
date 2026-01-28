# AI Interview (Dev) Diagnostics & TTS Ops

## Diagnostics-first workflow

### TTS debug info
The TTS service exposes a lightweight diagnostic endpoint:

```
GET http://localhost:8000/debug/info
```

The response includes the Piper version, configured model path/basename, effective prosody values, MP3 bitrate, ffmpeg version, and the most recent synth timing metrics.

### A/B output verification (WAV vs MP3)
Use PowerShell to fetch deterministic outputs for comparison:

```powershell
# WAV
Invoke-WebRequest -Uri "http://localhost:8000/v1/audio/speech" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"input":"Diagnostic sentence for TTS testing.","response_format":"wav"}' `
  -OutFile "tts_test.wav"

# MP3
Invoke-WebRequest -Uri "http://localhost:8000/v1/audio/speech" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"input":"Diagnostic sentence for TTS testing.","response_format":"mp3"}' `
  -OutFile "tts_test.mp3"
```

View service logs:

```bash
docker compose -f ui/partner-hub/dev/ai-interview/docker-compose.yml logs -f ai-interview-tts
```

## Configuration

### Prosody tuning
Tuning is fully configurable via env vars (validated in-app with sane bounds):

```
PIPER_LENGTH_SCALE=1.10
PIPER_NOISE_SCALE=0.60
PIPER_NOISE_W=0.80
```

### Model selection
The default model is still `/models/en_US-amy-medium.onnx`. You can swap models without editing the Dockerfile by supplying URLs and (optionally) a matching model path:

```
PIPER_MODEL_URL=https://<your-host>/models/en_US-<voice>.onnx
PIPER_MODEL_JSON_URL=https://<your-host>/models/en_US-<voice>.onnx.json
PIPER_MODEL_PATH=/models/en_US-<voice>.onnx
```

If only the URLs are set, the entrypoint downloads to `/models/<basename>`. Keep `PIPER_MODEL_PATH` aligned with the downloaded filename.

**Recommended (better) voices**
- Replace `<voice>` above with an alternate Piper voice you want to test.
- Keep the `.onnx` and `.onnx.json` pair in sync.
- Use `PIPER_MODEL_PATH` to switch the active model without rebuilding.

### MP3 output
MP3 bitrate is configurable:

```
TTS_MP3_BITRATE=192k
```

## WSL2 troubleshooting (do not auto-edit the system)
WSL2 backend uses `.wslconfig` at `C:\Users\<user>\.wslconfig`.

Suggested settings for a 16GB RAM / 6C/12T laptop:

```
[wsl2]
memory=10GB
processors=8
swap=4GB
```

After changes, run:

```
wsl --shutdown
```

Then restart Docker Desktop.
