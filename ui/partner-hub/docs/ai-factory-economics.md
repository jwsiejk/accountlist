# AI Factory Economics

The canonical architecture and roadmap plan for this local-only AI FinOps / AI Factory Economics module lives at:

```text
../../../docs/AI_FACTORY_ECONOMICS_MODULE.md
```

Use that root-level plan as the source of truth for the module purpose, guardrails, metric definitions, local-only architecture, and implementation phases.

This pointer exists so the module is discoverable from the existing Partner Hub docs area alongside the other local demo module documentation.

## Current status

- Phase 2 is implemented as local-only Ollama health and model discovery.
- The page is available at `/ai-factory-economics`; with the default Partner Hub base path, open `http://localhost:3000/partner-hub/ai-factory-economics`.
- The feature keeps the Phase 1 demo/mock dashboard values visible.
- The page now shows measured local Ollama readiness and measured discovered local model names when Ollama is available.
- The page still renders gracefully when Ollama is not running or when `/api/tags` fails.
- NVIDIA telemetry is explicitly shown as not connected in Phase 2.
- Phase 2 still does not run prompts, stream responses, calculate TTFT, calculate tokens/sec from real runs, call `nvidia-smi`, collect GPU telemetry, persist prompt content, or store run history.

## Files added or updated in Phase 2

Added:

```text
ui/partner-hub/app/api/ai-factory-economics/health/route.ts
ui/partner-hub/app/api/ai-factory-economics/models/route.ts
ui/partner-hub/components/ai-factory-economics/ollama-status-card.tsx
ui/partner-hub/components/ai-factory-economics/model-discovery-panel.tsx
ui/partner-hub/lib/ai-factory-economics/ollama.ts
ui/partner-hub/lib/ai-factory-economics/ollama.test.ts
```

Updated:

```text
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/package.json (test/typecheck script maintenance and AI Factory helper test inclusion)
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

To test with local Ollama:

```bash
ollama serve
ollama pull llama3.2:3b
npm run dev
```

Then open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

Use the status refresh buttons after starting Ollama or pulling a model.

## Graceful fallback behavior

If Ollama is not running, the page should show an “Ollama unavailable” state with the configured local URL and setup guidance:

- Start Ollama.
- Pull a model with `ollama pull <model>`.
- Refresh the page/status.

If `/api/tags` returns no models, the model discovery card shows setup guidance while the demo/mock dashboard remains visible.

## Metric labeling rules

- Live Ollama health is labeled **Measured**.
- Discovered local Ollama models are labeled **Measured**.
- Demo dashboard economics remain labeled **Demo/mock**.
- Static assumptions such as demo mode and energy rate remain labeled **Configured**.

## Phase 2 guardrails

Phase 2 intentionally does **not** add:

- Prompt execution.
- Streaming.
- TTFT calculation.
- Real tokens/sec calculation.
- `nvidia-smi` calls.
- GPU telemetry.
- Run history.
- Persistent storage.
- Database migrations.
- New dependencies.
- Cloud services, secrets, or API keys.
