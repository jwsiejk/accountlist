# AI Interview TTS (Dev)

## Vendored Piper artifacts
To keep Docker builds deterministic, place the Piper release tarball and default model files in the vendor folder before building:

```
ui/partner-hub/dev/ai-interview/services/tts/vendor/piper_linux_x86_64.tar.gz
ui/partner-hub/dev/ai-interview/services/tts/vendor/en_US-amy-medium.onnx
ui/partner-hub/dev/ai-interview/services/tts/vendor/en_US-amy-medium.onnx.json
```

The Dockerfile copies these files during build and does **not** download Piper or models from the network.

## Rebuild

```
docker compose -f ui/partner-hub/dev/ai-interview/docker-compose.yml up -d --build ai-interview-tts
```
