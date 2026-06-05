# AI Factory Economics

The canonical architecture and roadmap plan for this local-only AI FinOps / AI Factory Economics module lives at:

```text
../../../docs/AI_FACTORY_ECONOMICS_MODULE.md
```

Use that root-level plan as the source of truth for the module purpose, guardrails, metric definitions, local-only architecture, and implementation phases.

This pointer exists so the module is discoverable from the existing Partner Hub docs area alongside the other local demo module documentation.

## Current status

- Phase 4 is implemented as local-only Ollama prompt streaming with measured run timing, estimated token counts, and derived throughput.
- The page is available at `/ai-factory-economics`; with the default Partner Hub base path, open `http://localhost:3000/partner-hub/ai-factory-economics`.
- The feature keeps the Phase 1 demo/mock dashboard economics visible.
- The page shows measured local Ollama readiness and measured discovered local model names when Ollama is available.
- The Phase 4 prompt runner lets a user choose a discovered model or enter a model manually, enter a prompt, submit it to local Ollama, stream the response into the browser, and see TTFT/latency/token-efficiency metrics.
- The page still renders gracefully when Ollama is not running, when `/api/tags` fails, or when the run endpoint cannot reach local Ollama.
- NVIDIA telemetry is explicitly shown as not connected in Phase 4.
- Phase 4 measures TTFT and latency, estimates prompt/response tokens, and derives tokens/sec, but still does not calculate real cost per run, call `nvidia-smi`, collect GPU telemetry, measure watts or tokens/watt, persist prompt content, persist response content, add run history, add dependencies, add database migrations, or call cloud services.

## Files added or updated in Phase 4

Added:

```text
ui/partner-hub/components/ai-factory-economics/run-metrics-panel.tsx
ui/partner-hub/lib/ai-factory-economics/metrics.ts
ui/partner-hub/lib/ai-factory-economics/metrics.test.ts
```

Updated:

```text
ui/partner-hub/app/api/ai-factory-economics/run/route.ts
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/components/ai-factory-economics/ollama-status-card.tsx
ui/partner-hub/components/ai-factory-economics/prompt-runner.tsx
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/lib/ai-factory-economics/ollama.ts
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/package.json
docs/AI_FACTORY_ECONOMICS_MODULE.md
ui/partner-hub/docs/ai-factory-economics.md
```

## Local Ollama configuration

The AI Factory Economics API routes are local-only and never call cloud services. Configure Ollama with:

```bash
AI_FACTORY_OLLAMA_URL=http://127.0.0.1:11434
```

If the variable is not set, the module defaults to:

```text
http://127.0.0.1:11434
```

## Local development and testing

From `ui/partner-hub`, run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

If `NEXT_PUBLIC_BASE_PATH` is changed, keep using the same internal route (`/ai-factory-economics`) under that configured base path.

To test Phase 4 with local Ollama:

```bash
ollama serve
ollama pull llama3.2:3b
npm run dev
```

Then:

1. Open `http://localhost:3000/partner-hub/ai-factory-economics`.
2. Verify the Ollama status card reports the configured local URL.
3. Select a discovered model in the Phase 4 prompt runner, or choose manual entry and enter a local model name such as `llama3.2:3b`.
4. Enter a prompt.
5. Click **Run local prompt**.
6. Verify the generated response streams into the response panel.
7. Confirm TTFT and total latency appear as **Measured**, prompt/response token counts appear as **Estimated**, and tokens/sec appears as **Derived**.
8. Confirm GPU telemetry, watts, tokens/watt, and real cost/run remain unavailable or demo/mock.
9. Optionally click **Cancel** during a run to abort the browser request with `AbortController`.
10. Click **Reset / clear** to clear in-memory prompt and response UI state.

Verification commands from `ui/partner-hub`:

```bash
npm run typecheck
npm test
npm run lint
```

## Graceful fallback behavior

If Ollama is not running, the page should show an “Ollama unavailable” state with the configured local URL and setup guidance:

- Start Ollama.
- Pull a model with `ollama pull <model>`.
- Refresh the page/status.

If `/api/tags` returns no models, the model discovery card and prompt runner show setup guidance while the demo/mock dashboard remains visible. The prompt runner still allows manual model entry so users can run a model immediately after pulling it.

If `/api/ai-factory-economics/run` receives invalid input, it returns graceful JSON validation errors without stack traces. If local Ollama is unavailable, the route returns a safe JSON error before streaming begins. If an upstream streaming error occurs after streaming begins, the route emits a safe stream error event.

## Metric labeling rules

- Live Ollama health is labeled **Measured**.
- Discovered local Ollama models are labeled **Measured**.
- Prompt run status and streamed response content are labeled **Measured** for runtime availability.
- TTFT is **Measured** from server-side request start to first streamed Ollama response chunk.
- Total latency is **Measured** from server-side request start to Ollama `done` when available.
- Generation duration is **Measured** from first streamed response chunk to Ollama `done` when available.
- Prompt tokens and response tokens are **Estimated** using a rough local approximation; they are not exact tokenizer counts.
- Tokens/sec is **Derived** from estimated response tokens and measured generation duration.
- Generated response content remains active-run content only and is not persisted.
- Demo dashboard economics remain labeled **Demo/mock**.
- Static assumptions such as demo mode and energy rate remain labeled **Configured**.

## Phase 4 guardrails

Phase 4 intentionally does **not** add:

- Exact tokenizer counts.
- Real cost-per-run calculation.
- `nvidia-smi` calls.
- GPU telemetry.
- Watts or tokens/watt from real power telemetry.
- Run history.
- Persistent storage.
- Prompt or response content persistence.
- Database migrations.
- New dependencies.
- Cloud services, secrets, or API keys.

Prompt and response content remain in request/browser memory for the active run only. Partner Hub does not save prompt content, response content, or run history in Phase 4.
