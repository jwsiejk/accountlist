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
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
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

## Phase 5 local NVIDIA telemetry

Phase 5 adds an optional local NVIDIA telemetry snapshot panel to `/ai-factory-economics`. The panel calls the Partner Hub local API route `/api/ai-factory-economics/gpu`, which runs `nvidia-smi` server-side only and never calls cloud services.

Files added in Phase 5:

```text
ui/partner-hub/app/api/ai-factory-economics/gpu/route.ts
ui/partner-hub/components/ai-factory-economics/gpu-telemetry-panel.tsx
ui/partner-hub/lib/ai-factory-economics/gpu.ts
ui/partner-hub/lib/ai-factory-economics/gpu.test.ts
```

Files updated in Phase 5:

```text
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/lib/ai-factory-economics/ollama.ts
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/package.json
docs/AI_FACTORY_ECONOMICS_MODULE.md
ui/partner-hub/docs/ai-factory-economics.md
```

### What Phase 5 collects

The server-side helper runs:

```bash
nvidia-smi --query-gpu=index,utilization.gpu,memory.used,memory.total,power.draw,temperature.gpu --format=csv,noheader,nounits
```

It parses one or more NVIDIA GPU rows and displays GPU 0/the first row by default. The panel shows:

- NVIDIA telemetry availability (**Measured**)
- GPU index (**Measured** when returned; row position fallback if the index field is unavailable)
- GPU utilization percent (**Measured**)
- GPU memory used and total (**Measured**)
- GPU watts/power draw (**Measured**)
- GPU temperature (**Measured**)
- Sample timestamp

Missing or unsupported telemetry fields are shown as **Unavailable**, not zero.

### Graceful unavailable states

The GPU telemetry panel is optional. The prompt runner still works without it. The API and UI return safe unavailable states when:

- NVIDIA GPU/driver is not available.
- `nvidia-smi` is not installed or not in `PATH`.
- `nvidia-smi` times out.
- The requested telemetry fields are unsupported.
- `nvidia-smi` returns empty or unexpected output.

No stack traces are exposed to the browser.

### Phase 5 guardrails

Phase 5 does not create run history, does not persist prompt content, does not persist response content, does not add a database, does not add migrations, does not add new dependencies, and does not add background daemons or long-running collectors. GPU telemetry is a refresh-time snapshot only. It is not lab-grade wall-power measurement and it is not exact per-run or per-process attribution to Ollama. AMD, Apple Silicon, and CPU-only telemetry remain out of scope.

### Local testing steps

From `ui/partner-hub`:

```bash
nvidia-smi
ollama serve
ollama pull llama3.2:3b
npm run dev
```

Then open `http://localhost:3000/partner-hub/ai-factory-economics`, refresh GPU telemetry, and confirm utilization, memory, watts, temperature, GPU index, and sample timestamp appear when available.

Verification commands:

```bash
npm run typecheck
npm test
npm run lint
```

## Phase 6: in-memory run history and model comparison

Phase 6 adds sanitized browser-memory run history and a derived model comparison table to `/partner-hub/ai-factory-economics`.

### Files added

```text
ui/partner-hub/lib/ai-factory-economics/history.ts
ui/partner-hub/lib/ai-factory-economics/history.test.ts
ui/partner-hub/components/ai-factory-economics/run-history-panel.tsx
ui/partner-hub/components/ai-factory-economics/model-comparison-table.tsx
```

### Files updated

```text
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/components/ai-factory-economics/prompt-runner.tsx
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/package.json
docs/AI_FACTORY_ECONOMICS_MODULE.md
ui/partner-hub/docs/ai-factory-economics.md
```

### Runtime behavior

- Recent run history lives in React state in the AI Factory Economics page only.
- History is limited to the most recent 20 sanitized summaries.
- History disappears on page reload.
- A **Clear in-memory history** button clears the current page-session history.
- Partner Hub does not use localStorage, sessionStorage, IndexedDB, a database, migrations, backend storage, cloud services, or secrets for Phase 6 history.
- Prompt content is not stored in history.
- Response content is not stored in history.
- Raw stream chunks, raw request bodies, raw filesystem paths, and raw stack traces are not stored in history.

### Run history fields

Each sanitized summary may include safe metadata only:

- id
- started timestamp
- completed timestamp
- model
- run status
- measured TTFT
- measured total latency
- measured generation duration
- estimated prompt tokens
- estimated response tokens
- derived estimated tokens/sec
- metric classification labels
- a note that prompt and response content are excluded

GPU snapshot summary support remains a typed future extension in Phase 6. If a GPU snapshot is associated with a run in a future phase, it must be labeled as sampled snapshot telemetry and not exact per-run or per-process attribution.

### Model comparison

The model comparison table aggregates the in-memory sanitized history by model. It shows run count, completed count, failed/canceled/incomplete counts, average TTFT, average total latency, average estimated tokens/sec, best estimated tokens/sec, fastest TTFT, and most recent run time.

All comparison values are labeled **Derived**. Missing metrics are excluded from averages and are never treated as zero; unavailable aggregate values display as **Unavailable**.

### Metric labels

- TTFT: **Measured**
- Total latency: **Measured**
- Generation duration: **Measured**
- Prompt tokens: **Estimated**
- Response tokens: **Estimated**
- Tokens/sec: **Derived**
- Model comparison aggregates: **Derived**
- GPU telemetry: **Measured** snapshot telemetry only, not exact per-run attribution
- Demo dashboard economics: **Demo/mock**

### Local manual test flow

1. Start Ollama: `ollama serve`.
2. Pull at least one local model: `ollama pull llama3.2:3b`.
3. Run Partner Hub from `ui/partner-hub`: `npm run dev`.
4. Open `http://localhost:3000/partner-hub/ai-factory-economics`.
5. Run several prompts across one or more models.
6. Confirm recent run summaries appear.
7. Confirm model comparison aggregates appear.
8. Confirm prompt and response content are not stored in history.
9. Confirm **Clear in-memory history** works.
10. Refresh the page and confirm the in-memory history disappears.

### Verification commands

Run from `ui/partner-hub`:

```bash
npm run typecheck
npm test
npm run lint
```

## Phase 7: executive insights and safe recommendations

Phase 7 is active on `/partner-hub/ai-factory-economics` as a UI/interpretation polish phase. It keeps the module local-only while adding a stronger executive summary, AI Factory Efficiency scorecards, safe recommendations, and clearer caveats for partner/customer demos.

### Files added

```text
ui/partner-hub/lib/ai-factory-economics/insights.ts
ui/partner-hub/lib/ai-factory-economics/insights.test.ts
ui/partner-hub/components/ai-factory-economics/executive-insights-panel.tsx
```

### Files updated

```text
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/package.json
docs/AI_FACTORY_ECONOMICS_MODULE.md
ui/partner-hub/docs/ai-factory-economics.md
```

### What changed in the UI

- The page header now states **Local-only Phase 7** and explains that the demo combines measured runtime, estimated tokens, derived comparison/recommendations, and no persisted prompt/response content.
- The new executive insights panel appears high on the page, below the existing demo/mock executive summary cards.
- The panel includes a plain-English description of what the local demo proves, scorecards, derived recommendations, and configured caveats.
- The page is visually grouped into:
  - Executive view: demo/mock summary cards plus the new insights/recommendations panel.
  - Local readiness: Ollama status, model discovery, and NVIDIA GPU snapshot.
  - Run a prompt: local prompt runner and measured runtime metrics.
  - Learn from runs: browser-memory history and derived model comparison.
  - Readiness/roadmap status: existing setup and phase panels.

### AI Factory Efficiency scorecards

Scorecards are deliberately simple and transparent:

- **Runs compared**: count of current sanitized in-memory run summaries.
- **Best avg TTFT**: fastest available average TTFT from current history.
- **Best avg throughput**: highest available average derived estimated tokens/sec from current history.
- **Completion rate**: completed runs divided by all current in-memory runs.
- **Telemetry coverage**: whether known local signals are available to the helper.

All Phase 7 scorecards are labeled **Derived**. Missing metrics display as unavailable and are not substituted with zero.

### Recommendations and caveats

Safe recommendations are labeled **Derived** and may identify the fastest average TTFT model, highest average estimated throughput model, highest completion-rate model, or warn when failed/canceled/incomplete runs outnumber completed runs. Each recommendation includes caveat text stating that it is based only on local workstation demo data and sanitized in-memory summaries.

Configured caveats explain that token counts are estimated, GPU telemetry is unavailable or snapshot-only, comparable prompts make demos easier to explain, no prompt/response content is stored, and no production benchmark claims should be made.

### Local testing steps

1. Start Ollama: `ollama serve`.
2. Pull one or more models: `ollama pull llama3.2:3b`.
3. Run Partner Hub from `ui/partner-hub`: `npm run dev`.
4. Open `http://localhost:3000/partner-hub/ai-factory-economics`.
5. Run several prompts.
6. Confirm executive insights appear.
7. Confirm model comparison recommendations are labeled **Derived**.
8. Confirm no prompt content is stored in run history, model comparison, or executive insights.
9. Confirm no response content is stored in run history, model comparison, or executive insights.
10. Refresh the page and confirm history disappears.
11. Confirm recommendations are framed as local demo guidance only, not production benchmark claims.
12. Confirm GPU telemetry remains snapshot-only and is not described as exact per-run attribution.

### Verification commands

```bash
npm run typecheck
npm test
npm run lint
```

Phase 7 adds no persistence, no localStorage, no backend storage, no database changes, no migrations, no cloud services, no secrets, no new dependencies, no background collectors, and no new telemetry source.
