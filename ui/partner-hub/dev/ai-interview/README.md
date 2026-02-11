# AI Interview (Dev) Diagnostics & TTS Ops

## Diagnostics-first workflow

### TTS debug info
The TTS service exposes a lightweight diagnostic endpoint:

```
GET http://localhost:8000/debug/info
```

The response includes the Coqui engine name/model, CUDA setting and availability, selected device, configured/effective speaker state, MP3 bitrate, ffmpeg version, last engine load error, and most recent synth timing metrics.

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

### Model + GPU

```
COQUI_MODEL_NAME=tts_models/en/vctk/vits
COQUI_USE_CUDA=true
COQUI_SPEAKER=
```

- `COQUI_MODEL_NAME` selects the Coqui model.
- `COQUI_USE_CUDA=true` runs inference on GPU by default.
- `COQUI_SPEAKER` is optional and only used if the model supports multi-speaker inference.
- Compose uses `gpus: all`; Docker Desktop users need NVIDIA drivers and WSL2 GPU support enabled.

First run downloads model files into compose-managed cache volumes mounted to:

- `/root/.local/share/tts`
- `/root/.cache/tts`

The first synthesis request may take longer while model assets download and initialize.

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
