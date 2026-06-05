# Partner Hub AI Factory Economics

AI Factory Economics is a local-only Partner Hub demo module for explaining workstation AI economics safely. Phase 8 is the final hardening/documentation pass. The canonical project plan and guardrail audit live at [`../../../docs/AI_FACTORY_ECONOMICS_MODULE.md`](../../../docs/AI_FACTORY_ECONOMICS_MODULE.md).

## What the module does

- Keeps the original demo/mock economics dashboard available.
- Checks a local Ollama service and discovers models from `/api/tags`.
- Streams local prompt runs through Partner Hub to Ollama `/api/generate`.
- Measures TTFT, total latency, and generation duration when stream timing supports them.
- Estimates prompt/response token counts with a rough local approximation.
- Derives estimated tokens/sec, model comparison, executive scorecards, and recommendations from sanitized in-memory summaries.
- Optionally samples local NVIDIA GPU telemetry with server-side `nvidia-smi`.

## Architecture and guardrails

```text
Browser page
  -> /api/ai-factory-economics/health  -> http://127.0.0.1:11434/api/tags by default
  -> /api/ai-factory-economics/models  -> http://127.0.0.1:11434/api/tags by default
  -> /api/ai-factory-economics/run     -> http://127.0.0.1:11434/api/generate by default
  -> /api/ai-factory-economics/gpu     -> nvidia-smi via server-side execFile
```

The module has no cloud calls, no secrets, no database, no migrations, no backend storage, no `localStorage`, no `sessionStorage`, no IndexedDB, no new dependencies, no background collectors, and no prompt/response persistence.

## Quick setup

From `ui/partner-hub`:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

Optional local configuration:

```text
AI_FACTORY_OLLAMA_URL=http://127.0.0.1:11434
NEXT_PUBLIC_BASE_PATH=/partner-hub
```

## Ollama setup

```bash
ollama serve
ollama pull llama3.2:3b
curl http://127.0.0.1:11434/api/tags
```

If `/api/tags` returns models, refresh the Ollama status/model cards. If discovery is empty, pull a model or use manual local model entry after confirming the model exists.

## Optional NVIDIA telemetry

Verify local NVIDIA support with:

```bash
nvidia-smi
```

When available, the GPU route samples utilization, memory, watts, and temperature with `nvidia-smi`. This is snapshot-only telemetry. It is not exact per-run attribution, lab-grade wall-power measurement, or non-NVIDIA telemetry. Missing or unsupported values display as **Unavailable**, not zero.

## Running prompts and comparing models

1. Start Partner Hub and Ollama.
2. Pull a local model.
3. Choose a discovered model or enter one manually.
4. Enter a prompt within the local demo character limit.
5. Click **Run local prompt**.
6. Repeat with another model if you want a derived local comparison.

For safer comparisons, use the same or similar prompt across models and treat the output as directional local demo guidance only. Do not present it as a production benchmark or procurement-grade result.

## Metric labels

- **Measured:** Local service status, stream timing, run status, and `nvidia-smi` snapshot fields.
- **Estimated:** Prompt and response token counts from a rough local approximation.
- **Derived:** Estimated tokens/sec, model comparison, scorecards, and recommendations.
- **Configured:** Static assumptions, setup values, and caveats.
- **Demo/mock:** Non-live economics values retained for demo/future-work context.

Important metric caveats:

- TTFT is measured from server-side request start to first streamed Ollama response chunk.
- Total latency is measured from server-side request start to Ollama completion when a done signal is received.
- Generation duration is measured from first response chunk to Ollama completion.
- Estimated prompt/response tokens are not exact tokenizer counts.
- Estimated tokens/sec is derived from estimated response tokens and measured generation duration.
- GPU utilization, memory, watts, and temperature are `nvidia-smi` snapshots.
- Tokens/watt and cost/run are not real measured Phase 8 values; they remain demo/mock, unavailable, or future work.

## Privacy and storage

Prompt content is not stored. Response content is not stored. Sanitized run summaries are browser-memory only, exclude prompt/response content, and disappear on reload or clear-history. This module does not use `localStorage`, `sessionStorage`, IndexedDB, database storage, migrations, exports, backend persistence, or cloud storage.

## Troubleshooting

| Issue | Action |
| --- | --- |
| Ollama unavailable | Run `ollama serve`, check `AI_FACTORY_OLLAMA_URL`, and refresh status. |
| No models discovered | Run `ollama pull <model>` and verify `curl http://127.0.0.1:11434/api/tags`. |
| Model not found | Pull the model locally or fix the manual model name. Empty, overlong, and control-character names are rejected. |
| Stream ends without done signal | Treat the run as incomplete; partial output is visible but not complete benchmark data. |
| `nvidia-smi` missing | GPU telemetry is optional and will show unavailable. |
| GPU fields unavailable | Unsupported/blank fields display as unavailable rather than zero. |

## Verification commands

Run from `ui/partner-hub`:

```bash
npm run typecheck
npm test
npm run lint
```
