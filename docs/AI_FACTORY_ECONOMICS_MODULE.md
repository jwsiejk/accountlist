# AI Factory Economics Module

## Final Phase 8 status

Phase 8 is implemented as the final hardening, validation, cleanup, and documentation pass for the local-only AI Factory Economics module in Partner Hub. The module remains a local education/demo experience: it can show the original demo/mock dashboard, check a local Ollama service, discover local models, stream local prompt runs, measure runtime timing, estimate token counts, derive throughput and model comparison summaries, take optional NVIDIA `nvidia-smi` snapshots, and present executive scorecards/recommendations with explicit caveats.

Phase 8 does **not** add major features, run persistence, storage, migrations, cloud services, secrets, new dependencies, background collectors, non-NVIDIA telemetry, exact tokenizer counts, lab-grade power measurement, exact per-run GPU attribution, or production benchmark claims.

## Feature summary

- Route: `/partner-hub/ai-factory-economics` with the default Partner Hub base path.
- Static demo/mock dashboard remains available when local services are unavailable.
- Local Ollama health and model discovery call only the configured local Ollama URL.
- Prompt runner streams through the local Partner Hub API route to Ollama `/api/generate`.
- Runtime metrics include measured TTFT/latency, estimated prompt/response tokens, and derived estimated tokens/sec.
- Optional NVIDIA GPU telemetry reads a point-in-time `nvidia-smi` snapshot server-side.
- Browser-memory run history stores sanitized summaries only; prompt and response content are excluded.
- Model comparison, scorecards, and recommendations are derived from current in-memory summaries and labeled as local demo guidance.

## Local-only architecture

```text
Browser UI
  -> /api/ai-factory-economics/health  -> local Ollama /api/tags
  -> /api/ai-factory-economics/models  -> local Ollama /api/tags
  -> /api/ai-factory-economics/run     -> local Ollama /api/generate streaming
  -> /api/ai-factory-economics/gpu     -> server-side nvidia-smi snapshot
```

The API routes run in the Next.js Node.js runtime, use `no-store`/stream-safe cache headers, and return sanitized errors without stack traces. The GPU route uses `execFile` with a fixed argument array instead of shell-string execution. The module has no database, no migrations, no backend storage, no browser storage, and no cloud endpoints.

## Setup and local run instructions

From `ui/partner-hub`:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/partner-hub/ai-factory-economics`.

Optional local environment variables:

```text
AI_FACTORY_OLLAMA_URL=http://127.0.0.1:11434
NEXT_PUBLIC_BASE_PATH=/partner-hub
```

### Ollama setup

1. Install Ollama from the official Ollama distribution for your workstation.
2. Start Ollama:

   ```bash
   ollama serve
   ```

3. Pull a local model:

   ```bash
   ollama pull llama3.2:3b
   ```

4. Verify model discovery directly:

   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```

5. Refresh the Partner Hub Ollama status/model cards.

### NVIDIA telemetry setup

GPU telemetry is optional. Verify NVIDIA tooling first:

```bash
nvidia-smi
```

When available, Partner Hub samples:

```bash
nvidia-smi --query-gpu=index,utilization.gpu,memory.used,memory.total,power.draw,temperature.gpu --format=csv,noheader,nounits
```

Unavailable states are expected on machines without an NVIDIA GPU, missing drivers, unsupported fields, timeout, empty output, or missing `nvidia-smi`. The prompt runner and demo dashboard continue to work when GPU telemetry is unavailable. Missing GPU values display as **Unavailable**, not zero.

## How to run a prompt

1. Start Partner Hub and Ollama.
2. Pull at least one local model.
3. Open the AI Factory Economics page.
4. Choose a discovered model or enter a local model name manually.
5. Enter a prompt within the local demo character limit.
6. Click **Run local prompt**.
7. Read the streamed response and metrics panel.
8. Use **Cancel** to abort an in-flight browser request, or **Reset / clear** to clear active prompt/output UI state.

The app does not persist prompt text or response text. Sanitized run summaries may be added to browser memory after terminal run states, but they contain model/status/metric metadata only.

## How to compare models safely

Run the same or similar prompt against two or more local models in the same browser session. The comparison table and executive recommendations are **Derived** from the current sanitized in-memory summaries. Treat results as directional local demo evidence only, not a production benchmark, procurement result, or business proof.

## Metric definitions and labels

| Label | Meaning |
| --- | --- |
| **Measured** | Directly observed from local service responses, server-side timing, browser run state, or `nvidia-smi` snapshot output. |
| **Estimated** | Rough approximation, currently used for prompt/response token counts. |
| **Derived** | Calculated from measured and/or estimated values, such as estimated tokens/sec, model comparisons, scorecards, and recommendations. |
| **Configured** | Static local assumptions, setup values, or caveats. |
| **Demo/mock** | Non-live dashboard economics retained for demonstration/future-work context. |

| Metric | Definition | Label |
| --- | --- | --- |
| TTFT | Time from server-side run start to the first streamed Ollama response chunk. | Measured when a first chunk is received; otherwise unavailable. |
| Total latency | Time from server-side run start to Ollama completion when a done signal is received. | Measured; unavailable for incomplete streams. |
| Generation duration | Time from first streamed response chunk to Ollama completion. | Measured; unavailable without both timestamps. |
| Estimated prompt tokens | Rough four-normalized-characters-per-token prompt approximation. | Estimated, not exact tokenizer output. |
| Estimated response tokens | Rough four-normalized-characters-per-token response approximation. | Estimated, not exact tokenizer output. |
| Estimated tokens/sec | Estimated response tokens divided by measured generation duration. | Derived; unavailable without generation duration. |
| GPU utilization | Current utilization from `nvidia-smi`. | Measured snapshot; unavailable if missing/unsupported. |
| GPU memory | Current used and total framebuffer memory from `nvidia-smi`. | Measured snapshot; unavailable if missing/unsupported. |
| GPU watts | Current power draw from `nvidia-smi`. | Measured snapshot, not lab-grade wall power. |
| GPU temperature | Current GPU temperature from `nvidia-smi`. | Measured snapshot. |
| Tokens/watt | Not a real measured Phase 8 metric. | Demo/mock or unavailable until explicitly approved future instrumentation. |
| Cost/run | Not a real measured Phase 8 metric. | Demo/mock/future work unless safe assumptions are explicitly added later. |

## Privacy and storage statement

- Prompt content is not stored in run history.
- Response content is not stored in run history.
- Prompt/response text exists only in request/browser memory for the active run UI.
- Run summaries are browser-memory only and disappear on reload or clear-history.
- No `localStorage`, `sessionStorage`, or IndexedDB is used by this module.
- No database tables, migrations, backend persistence, exports, or cloud storage are added.

## Troubleshooting

| Symptom | Safe interpretation and action |
| --- | --- |
| Ollama not running | Start `ollama serve`, confirm `AI_FACTORY_OLLAMA_URL`, then refresh status. |
| No models discovered | Run `ollama pull <model>` and verify `curl http://127.0.0.1:11434/api/tags`. Manual model entry remains available. |
| Model not found | Pull the model locally or correct the manual model name. Validation rejects empty, overlong, or control-character model names. |
| Stream ends without done signal | The UI marks the run incomplete; partial output remains visible but should not be treated as a complete benchmark. |
| `nvidia-smi` not found | GPU telemetry shows unavailable. Install NVIDIA drivers/tooling or continue without GPU telemetry. |
| GPU fields unavailable | Unsupported or blank fields display as unavailable, not zero. |
| Type/test/lint failures | Run the verification commands below from `ui/partner-hub` and inspect the exact error output. |

Verification commands:

```bash
npm run typecheck
npm test
npm run lint
```

## Phase 8 guardrail audit

- No AI Factory file exceeds 800 lines.
- No storage was added.
- No prompt/response persistence was added.
- No `localStorage`, `sessionStorage`, or IndexedDB was added.
- No database code or migrations were added for this module.
- No cloud calls, secrets, API keys, or new dependencies were added.
- GPU telemetry remains optional NVIDIA `nvidia-smi` snapshot-only data.
- Token counts remain rough estimates.
- Scorecards and recommendations remain derived local demo guidance.
- The module does not claim production benchmark validity, exact token counts, lab-grade power measurement, or exact per-run GPU attribution.

## Remaining future work

Only if explicitly approved later:

- Optional export of sanitized summaries that still excludes prompt/response content.
- Optional exact tokenizer support without cloud calls or content persistence.
- Optional configurable electricity rate.
- Optional baseline idle power subtraction.
- Optional non-NVIDIA telemetry.
- Optional persistence with explicit privacy, storage, and migration approval.
