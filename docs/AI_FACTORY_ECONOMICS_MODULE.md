# AI Factory Economics Module Plan

## Phase 1 status

Phase 1 is implemented as a local-only static/mock feature shell in Partner Hub. The route, mock dashboard UI, feature-scoped components, feature-scoped mock data/types, navigation links, and documentation updates have been added without API routes, Ollama calls, NVIDIA telemetry calls, dependencies, migrations, database changes, prompt execution, or persistent storage.

Phase 0 remains the source architecture plan for future phases. Phase 1 intentionally renders demo/mock values only, with visible metric classification labels on every dashboard metric.

## Repository discovery summary

- Partner Hub is a Next.js App Router application under `ui/partner-hub` with route groups in `app/(routes)` and API route handlers in `app/api`.
- Phase 1 adds the page at `ui/partner-hub/app/(routes)/ai-factory-economics/page.tsx` and delegates rendering to feature-scoped components under `ui/partner-hub/components/ai-factory-economics/`.
- The app is served under a configurable base path that defaults to `/partner-hub`, so user-facing links should be written as application-relative paths such as `/ai-factory-economics` and will render beneath the base path at runtime.
- Current pages use route-level `page.tsx` files that delegate most feature logic to feature folders under `components/<feature>` and `lib/<feature>`.
- Phase 1 mock data and types live under `ui/partner-hub/lib/ai-factory-economics/`.
- Styling uses Tailwind CSS utility classes, shared CSS variables in `styles/globals.css`, and reusable UI primitives in `components/ui`.
- Existing local-AI patterns already proxy to local Ollama from API routes and return graceful JSON errors when the local service is unavailable.
- Tests are currently package-script based: `npm run typecheck`, `npm run lint`, and a long `npm test` command that compiles selected TypeScript modules into `.tmp-tests` and runs Node's built-in test runner.
- Documentation conventions are Markdown files with practical sections in `ui/partner-hub/docs`; this canonical plan remains at `docs/AI_FACTORY_ECONOMICS_MODULE.md`, with a Partner Hub docs pointer maintained at `ui/partner-hub/docs/ai-factory-economics.md` so the module is discoverable from the existing app docs area.

## Phase 2 status

Phase 2 is implemented as local-only Ollama health and model discovery in Partner Hub. The Phase 1 demo/mock economics dashboard remains visible, while the page now calls feature-scoped API routes that check the configured local Ollama service and discover model names from `/api/tags`.

Phase 2 intentionally does **not** add prompt execution, streaming, TTFT calculation, real tokens/sec calculation, `nvidia-smi`, NVIDIA telemetry, run history, persistent storage, database migrations, dependencies, cloud services, secrets, or external APIs.

Phase 2 files added:

```text
ui/partner-hub/app/api/ai-factory-economics/health/route.ts
ui/partner-hub/app/api/ai-factory-economics/models/route.ts
ui/partner-hub/components/ai-factory-economics/ollama-status-card.tsx
ui/partner-hub/components/ai-factory-economics/model-discovery-panel.tsx
ui/partner-hub/lib/ai-factory-economics/ollama.ts
ui/partner-hub/lib/ai-factory-economics/ollama.test.ts
```

Phase 2 files updated:

```text
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/package.json (test/typecheck script maintenance and AI Factory helper test inclusion)
docs/AI_FACTORY_ECONOMICS_MODULE.md
ui/partner-hub/docs/ai-factory-economics.md
```

Phase 2 runtime behavior:

- `AI_FACTORY_OLLAMA_URL` configures the local Ollama base URL.
- The default local Ollama URL is `http://127.0.0.1:11434`.
- `/api/ai-factory-economics/health` performs a short-timeout local Ollama check and returns clean JSON with demo-mode availability and a Phase 2 NVIDIA telemetry `not_connected` status.
- `/api/ai-factory-economics/models` performs a short-timeout local Ollama `/api/tags` call and returns normalized model names.
- Both routes return graceful JSON errors without stack traces when Ollama is unavailable or returns unexpected data.
- Live Ollama health and discovered model names are labeled **Measured**.
- Demo dashboard values and fallback model names remain labeled **Demo/mock** or **Configured**.

Local Phase 2 test flow:

```bash
cd ui/partner-hub
ollama serve
ollama pull llama3.2:3b
npm run dev
```

Then open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

Use the refresh buttons on the Ollama status and model discovery cards after starting Ollama or pulling a model.

## Phase 3 status

Phase 3 is implemented as a local-only Ollama prompt runner and streaming proxy in Partner Hub. The Phase 1 demo/mock economics dashboard remains visible, while users can now select or manually enter a local Ollama model, enter a prompt, submit it to the local Ollama `/api/generate` endpoint through the Partner Hub proxy, and see streamed response content in the UI.

Phase 3 intentionally does **not** add official TTFT calculation, official tokens/sec calculation, real cost-per-run calculation, GPU telemetry, `nvidia-smi` calls, run history, persistent storage, database migrations, dependencies, cloud services, secrets, prompt persistence, or response persistence. Prompt and response content remain in request/browser memory for the active run only.

Phase 3 files added:

```text
ui/partner-hub/app/api/ai-factory-economics/run/route.ts
ui/partner-hub/components/ai-factory-economics/prompt-runner.tsx
```

Phase 3 files updated:

```text
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/components/ai-factory-economics/model-discovery-panel.tsx
ui/partner-hub/components/ai-factory-economics/ollama-status-card.tsx
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/lib/ai-factory-economics/ollama.ts
ui/partner-hub/lib/ai-factory-economics/ollama.test.ts
ui/partner-hub/lib/ai-factory-economics/types.ts
docs/AI_FACTORY_ECONOMICS_MODULE.md
ui/partner-hub/docs/ai-factory-economics.md
```

Phase 3 runtime behavior:

- `AI_FACTORY_OLLAMA_URL` configures the local Ollama base URL and still defaults to `http://127.0.0.1:11434`.
- `/api/ai-factory-economics/run` accepts `POST` JSON with `model` and `prompt`, validates both fields, rejects empty prompts, rejects missing model names, enforces a prompt length limit, and calls local Ollama only.
- The run route requests Ollama streaming with `stream: true` and relays response chunks as server-sent events to the browser.
- Validation and pre-stream Ollama failures return graceful JSON errors without stack traces. Streaming-time failures emit safe stream error events.
- The prompt runner supports discovered models from Phase 2, manual model entry when discovery is unavailable, idle/running/completed/failed/canceled state, reset/clear, and cancel through `AbortController`.
- Streamed response content is labeled **Measured** for local runtime availability, not as measured economics.
- Existing TTFT, tokens/sec, cost/run, and GPU dashboard cards remain **Demo/mock** and are not updated from live prompt runs in Phase 3.

Local Phase 3 test flow:

```bash
cd ui/partner-hub
ollama serve
ollama pull llama3.2:3b
npm run dev
```

Then open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

Select a discovered model or enter one manually, enter a prompt, click **Run local prompt**, and verify the response streams into the prompt runner.

## Purpose

The AI Factory Economics module should demonstrate the economics and operational signals of local AI inference using a laptop or workstation as the demo environment. It will combine local Ollama inference timing with local NVIDIA GPU telemetry to help users explain:

- How model choice affects latency, throughput, power, and estimated per-run cost.
- How GPU utilization, memory pressure, watts, and temperature move during prompt execution.
- Which values are directly measured on the local machine versus estimated for demonstration.
- How AI Factory concepts can be taught in Partner Hub without relying on cloud services or stored secrets.

The module is not intended to become a cloud SaaS metering product. It is a local demo and education asset.

## Why this belongs in Partner Hub

Partner Hub already contains practical enablement tools, local demo utilities, and infrastructure-oriented explainers. AI Factory Economics fits because it can:

- Turn abstract AI infrastructure economics into a runnable local demonstration.
- Support partner conversations about latency, throughput, power, utilization, and cost tradeoffs.
- Reuse existing Partner Hub patterns: App Router pages, local API proxy routes, feature-scoped components, feature-scoped libraries, Tailwind styling, and Markdown docs.
- Complement existing infrastructure learning modules by showing inference economics from the application, model, and workstation telemetry layers.

## Local-only architecture

The smallest safe architecture is:

```text
Browser UI
  -> Next.js page at /ai-factory-economics
  -> Next.js local API routes under /api/ai-factory-economics/*
  -> Local Ollama HTTP API at http://127.0.0.1:11434 by default
  -> Local nvidia-smi child process when available
  -> In-memory browser state for initial history and comparisons
```

Design rules:

- Default to local endpoints only.
- Do not require cloud APIs, accounts, credentials, or secrets.
- Keep all telemetry collection server-side in Next.js API routes.
- Do not persist prompt content permanently.
- Do not add a database until a future phase explicitly opts in.
- Treat mock/demo mode as a first-class path so the module works without Ollama or NVIDIA hardware.
- Clearly label every metric as **Measured**, **Estimated**, **Configured**, **Derived**, or **Demo/mock**.

## Proposed route

Use `/ai-factory-economics`.

Rationale:

- It is descriptive and executive-friendly.
- It matches the requested module name.
- It follows current top-level feature-route patterns such as `/hpc-lab` and `/skin-review`.
- It can later be optionally gated by `NEXT_PUBLIC_ENABLE_AI_FACTORY_ECONOMICS=true`, following the existing feature-flag pattern used by larger local demo modules.

## Proposed folder and module structure

Planned files for future phases:

```text
ui/partner-hub/app/(routes)/ai-factory-economics/page.tsx
ui/partner-hub/app/api/ai-factory-economics/health/route.ts
ui/partner-hub/app/api/ai-factory-economics/models/route.ts
ui/partner-hub/app/api/ai-factory-economics/run/route.ts
ui/partner-hub/app/api/ai-factory-economics/gpu/route.ts
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/components/ai-factory-economics/executive-summary-cards.tsx
ui/partner-hub/components/ai-factory-economics/model-selector.tsx
ui/partner-hub/components/ai-factory-economics/prompt-runner.tsx
ui/partner-hub/components/ai-factory-economics/run-status-panel.tsx
ui/partner-hub/components/ai-factory-economics/gpu-telemetry-panel.tsx
ui/partner-hub/components/ai-factory-economics/model-comparison-table.tsx
ui/partner-hub/components/ai-factory-economics/run-history-panel.tsx
ui/partner-hub/components/ai-factory-economics/metric-label.tsx
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/lib/ai-factory-economics/ollama.ts
ui/partner-hub/lib/ai-factory-economics/gpu.ts
ui/partner-hub/lib/ai-factory-economics/metrics.ts
ui/partner-hub/lib/ai-factory-economics/mockData.ts
ui/partner-hub/lib/ai-factory-economics/format.ts
ui/partner-hub/lib/ai-factory-economics/*.test.ts
```

Keep the first implementation small. Avoid cross-feature coupling except for shared UI primitives.

## Planned API endpoints

All endpoints should be local-only and should fail closed with clear JSON messages.

| Endpoint                           | Method | Purpose                                                                                                    | External dependency                    |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `/api/ai-factory-economics/health` | `GET`  | Report module readiness, Ollama reachability, mock-mode status, and optional GPU telemetry availability.   | Ollama and `nvidia-smi`, both optional |
| `/api/ai-factory-economics/models` | `GET`  | Return locally available Ollama models.                                                                    | Ollama `/api/tags`                     |
| `/api/ai-factory-economics/run`    | `POST` | Run one prompt against selected local model, optionally streaming, and return timing plus token estimates. | Ollama `/api/generate` or `/api/chat`  |
| `/api/ai-factory-economics/gpu`    | `GET`  | Return current NVIDIA telemetry snapshot.                                                                  | `nvidia-smi`                           |

Future endpoint candidates:

- `/api/ai-factory-economics/mock-run` only if separating demo mode from real runs improves clarity.
- `/api/ai-factory-economics/export` only after run history exists and excludes prompt content by default.

## Planned UI components

- **Feature shell:** Page header, local-only notice, setup checklist, and status summary.
- **Executive summary cards:** Selected model, run status, TTFT, total latency, tokens/sec, GPU watts, estimated tokens per watt, estimated cost per run.
- **Ollama status card:** Reachability, configured base URL, model count, selected model, last error.
- **Model selector:** Local model list, refresh button, disabled state when Ollama is unavailable, demo model fallback.
- **Prompt runner:** Prompt input for active session only, run button, stop/cancel option if supported, streaming output view.
- **Metric label/chip:** Reusable label that marks values as Measured, Estimated, Derived, Configured, or Demo/mock.
- **GPU telemetry panel:** Utilization, memory used/total, watts, temperature, availability state, and last sample time.
- **Run status panel:** Idle, checking, running, streaming, completed, canceled, failed, or demo mode.
- **Run history panel:** In-memory list of recent runs without saved prompt content.
- **Model comparison table:** Side-by-side comparison of recent runs by model and prompt class.
- **Recommendation card:** Human-readable interpretation for executive demos, clearly labeled as generated from local measurements and estimates.

## Planned metric definitions

| Metric                    | Definition                                                                   | Source label                                             |
| ------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| Ollama health             | Whether the configured local Ollama base URL responds within timeout.        | Measured                                                 |
| Available models          | Models returned by local Ollama model listing.                               | Measured                                                 |
| Selected model            | Model chosen by the user or demo fallback.                                   | Configured                                               |
| Prompt run status         | Current state of the run lifecycle.                                          | Measured/Derived                                         |
| TTFT                      | Time from request start to first streamed response token/chunk.              | Measured when streaming; Estimated/Unavailable otherwise |
| Total latency             | Time from request start to completed response or error.                      | Measured                                                 |
| Estimated prompt tokens   | Approximation of prompt token count when exact tokenizer is not available.   | Estimated                                                |
| Estimated response tokens | Approximation of response token count when exact tokenizer is not available. | Estimated                                                |
| Estimated tokens/sec      | Estimated response tokens divided by generation duration.                    | Derived from estimated and measured values               |
| GPU utilization           | Percent utilization from `nvidia-smi`.                                       | Measured                                                 |
| GPU memory usage          | Used and total framebuffer memory from `nvidia-smi`.                         | Measured                                                 |
| GPU watts                 | Current power draw from `nvidia-smi`.                                        | Measured                                                 |
| GPU temperature           | Current GPU temperature from `nvidia-smi`.                                   | Measured                                                 |
| Estimated tokens per watt | Estimated response tokens per measured average watts during the run.         | Derived/Estimated                                        |
| Estimated cost per run    | Configurable local estimate based on energy usage and optional cost rate.    | Estimated                                                |
| Run history               | Recent in-memory run summaries excluding prompt content.                     | Derived                                                  |
| Model comparison          | Aggregation of recent run summaries by model.                                | Derived                                                  |

## Measured vs estimated rules

Measured values are values directly observed from local services or process timers. Estimated values are approximations used for demo economics when exact instrumentation is unavailable.

Rules for future implementation:

- Show a visible label next to every metric.
- Never imply estimated token counts are exact tokenizer counts unless a model-specific tokenizer is added later.
- Keep latency measurements based on monotonic server-side timers where possible.
- Use browser-side timing only for UI responsiveness metrics, not authoritative run economics.
- If GPU telemetry is sampled before and after a run rather than continuously during the run, label averages as estimated or sampled.
- Cost per run must display the configured assumptions, such as energy rate and whether idle baseline was subtracted.

## Ollama connectivity plan

Default local configuration:

```text
AI_FACTORY_OLLAMA_URL=http://127.0.0.1:11434
AI_FACTORY_DEFAULT_MODEL=<optional local model name>
NEXT_PUBLIC_ENABLE_AI_FACTORY_ECONOMICS=false
NEXT_PUBLIC_AI_FACTORY_DEMO_MODE=true
```

Implementation plan:

1. Health route performs a short-timeout request to Ollama.
2. Models route calls Ollama `/api/tags` and normalizes model names.
3. Run route sends the prompt to Ollama with the selected model.
4. Prefer streaming for TTFT measurement because the first chunk can mark first-token timing.
5. If streaming is not enabled in an early phase, total latency can still be measured and TTFT should be labeled unavailable.
6. Handle malformed Ollama responses as local service errors, not application crashes.
7. Keep prompt text in request memory only; do not log or persist it.

## NVIDIA telemetry plan

Use `nvidia-smi` because it is already present on many NVIDIA developer workstations and avoids new dependencies.

Planned command shape:

```bash
nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,power.draw,temperature.gpu --format=csv,noheader,nounits
```

Implementation plan:

1. API route runs `nvidia-smi` server-side with a short timeout.
2. Parse CSV output into typed telemetry snapshots.
3. Support multiple GPUs by returning an array, with the UI defaulting to GPU 0 and later allowing selection.
4. Sample telemetry immediately before, during, and after a prompt run when Phase 5 introduces collection.
5. Avoid long-running background collectors in the first implementation.
6. If power draw is unavailable on a GPU, show utilization, memory, and temperature while marking power-derived metrics unavailable.
7. Do not require admin permissions.

## Graceful failure: Ollama not running

When Ollama is unavailable:

- The page should still render.
- Status should show `Ollama unavailable` with the configured local URL.
- Model selector should be disabled or populated with demo models only when demo mode is enabled.
- Prompt runner should disable real runs and offer mock/demo run if enabled.
- API routes should return clear JSON errors and appropriate `4xx`/`5xx` statuses without stack traces.
- The UI should include setup guidance: install/start Ollama, pull a model, refresh status.
- Metrics from demo mode must be labeled `Demo/mock`, never `Measured`.

## Graceful failure: `nvidia-smi` unavailable

When `nvidia-smi` is missing, fails, times out, or returns unsupported fields:

- The page should still render.
- GPU panel should show `NVIDIA telemetry unavailable` with a concise reason.
- Inference runs should still work if Ollama is available.
- GPU-specific metrics should show unavailable states, not zeroes.
- Tokens per watt and cost estimates that require watts should be unavailable unless demo/mock mode is active.
- Mock telemetry can be shown only when demo mode is enabled and must be clearly labeled `Demo/mock`.

## Guardrails

- Local-only by default; no cloud dependency.
- No secrets, API keys, or external account requirements.
- No dependency additions in early phases unless explicitly justified later.
- No persistent prompt storage by default.
- Run history should initially live in browser memory only.
- Never store prompt content permanently unless a future opt-in setting is explicitly added.
- Do not add database migrations until a persistence phase is approved.
- Do not over-engineer background workers or queues for the local demo.
- Every generated metric must carry a measured/estimated/configured/derived/demo label.
- Mock/demo mode must be available for machines without Ollama or NVIDIA GPUs.
- API routes should sanitize errors and avoid exposing local filesystem paths or stack traces.
- Keep files under 800 lines.

## Phase roadmap

### Phase 1: Feature shell with static/mock dashboard only

Status: **implemented**.

- Added `/ai-factory-economics` route as an active Phase 1 shell. It is not feature-flag gated because this phase is static/mock only and needs to be directly accessible for local review.
- Built static dashboard cards with mock values for selected model, time to first token, total latency, estimated tokens/sec, GPU utilization, GPU memory, GPU watts, GPU temperature, estimated tokens per watt, and estimated cost per run.
- Added local-only notice explaining that no cloud services are required, Phase 1 uses mock data only, and Ollama plus NVIDIA telemetry arrive later.
- Added setup/readiness and phase-status panels showing Ollama, NVIDIA telemetry, run history, Phase 1, Phase 2, Phase 3, and Phase 5 status.
- Added a home-page card and left-nav link because existing Partner Hub conventions expose local demo modules from those surfaces when the route is active.
- No real Ollama calls, `nvidia-smi` calls, API routes, telemetry collectors, prompt execution, persistent storage, database migrations, new frameworks, cloud dependencies, or package dependencies were added.

Phase 1 files added:

```text
ui/partner-hub/app/(routes)/ai-factory-economics/page.tsx
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/components/ai-factory-economics/executive-summary-cards.tsx
ui/partner-hub/components/ai-factory-economics/metric-card.tsx
ui/partner-hub/components/ai-factory-economics/metric-label.tsx
ui/partner-hub/components/ai-factory-economics/readiness-panel.tsx
ui/partner-hub/components/ai-factory-economics/phase-status-panel.tsx
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
```

Phase 1 files updated:

```text
docs/AI_FACTORY_ECONOMICS_MODULE.md
ui/partner-hub/docs/ai-factory-economics.md
ui/partner-hub/app/page.tsx
ui/partner-hub/components/left-nav.tsx
```

Open locally from `ui/partner-hub`:

```bash
npm run dev
```

Then visit `http://localhost:3000/partner-hub/ai-factory-economics` when using the default Partner Hub base path.

### Phase 2: Ollama health and model discovery

Status: **implemented**.

- Added local-only health and model API routes.
- Detects configured local Ollama availability with `AI_FACTORY_OLLAMA_URL` defaulting to `http://127.0.0.1:11434`.
- Discovers local model names from Ollama `/api/tags` and displays them as read-only measured values.
- Keeps demo mode fallback and all Phase 1 demo/mock dashboard values visible.
- Does not execute prompts, stream responses, calculate TTFT, calculate real tokens/sec, call `nvidia-smi`, collect GPU telemetry, persist data, add dependencies, or call cloud services.

### Phase 3: Prompt runner and streaming proxy

Status: **implemented**.

- Added a prompt runner UI that uses discovered local models when available and supports manual model entry when discovery is unavailable.
- Added a server-side run proxy to local Ollama at `/api/ai-factory-economics/run`.
- Streams Ollama response chunks to the browser as server-sent events.
- Supports cancel/stop through `AbortController` without adding persistence or run history.
- Keeps official TTFT, tokens/sec, real cost/run, and GPU telemetry out of scope until later phases.

### Phase 4: TTFT, latency, token estimate, tokens/sec calculations

Status: **implemented**.

- Added server-side run timing.
- Computes TTFT from the first streamed Ollama response chunk.
- Estimates prompt and response tokens with a documented rough local approximation.
- Derives estimated tokens/sec from estimated response tokens and measured generation duration.
- Added tests for metric calculations and incomplete/missing-duration behavior.

### Phase 5: NVIDIA telemetry collector using `nvidia-smi`

- Add GPU telemetry API route.
- Parse `nvidia-smi` CSV output.
- Display utilization, memory, watts, and temperature.
- Sample around prompt runs and calculate sampled/estimated power economics.

### Phase 6: Run history and model comparison

- Add in-memory browser run history.
- Exclude prompt content from stored summaries by default.
- Compare recent runs by model, latency, throughput, watts, and estimated cost.
- Add export only if it excludes prompt content by default.

### Phase 7: Executive dashboard polish and recommendations

- Improve summary cards and explanations for executive demos.
- Add recommendations based on local run patterns.
- Make assumptions visible and editable where safe.
- Keep recommendation copy clearly tied to local measurements and estimates.

### Phase 8: Documentation, hardening, validation, and test cleanup

- Update docs with setup and troubleshooting.
- Harden error handling and timeouts.
- Add/clean tests for metric math, parsers, and API behavior.
- Validate no prompt content is persisted by default.

## Known limitations

- Ollama token counts may not match model-specific tokenizer counts unless future phases add exact tokenizer support.
- `nvidia-smi` availability and fields vary by GPU, driver, operating system, and permissions.
- GPU telemetry sampling is not equivalent to lab-grade power measurement.
- Local workstation results should not be presented as production benchmark claims.
- Browser and server timing can be affected by local system load.
- Cost estimates depend on configurable assumptions and should be treated as directional.
- Multi-GPU attribution to a specific Ollama process may be approximate unless future phases add process-level correlation.
- Apple Silicon, AMD, and CPU-only telemetry are out of the smallest safe initial scope.

## Future enhancement ideas

- Optional exact token accounting if Ollama or model metadata exposes reliable counts.
- Optional process-level GPU attribution when safe and portable.
- Optional baseline idle power subtraction.
- Optional configurable electricity-rate profiles.
- Optional side-by-side prompt templates for repeatable model comparisons.
- Optional local-only export of sanitized run summaries.
- Optional support for non-NVIDIA telemetry providers after the NVIDIA path is stable.
- Optional guided demo script for partner enablement workshops.
- Optional static screenshots or mock-data mode for presentations.

## Open questions

- Future phases can decide whether to add `NEXT_PUBLIC_ENABLE_AI_FACTORY_ECONOMICS`; Phase 1 is visible by default because it is static/mock only.
- Phase 1 includes home-page and left-nav entries because active Partner Hub tool routes are already discoverable through those surfaces.
- The current mock selected model is `llama3.1:8b-instruct`; discovered and manually entered Phase 3 runtime models are displayed separately from the demo/mock dashboard model.
- The current static energy-rate display assumption is `$0.16/kWh`; future phases should decide whether this becomes user-configurable.
- Prompt history remains absent in Phase 1; future phases should keep any run-history work in memory first and continue excluding prompt content from stored summaries by default.

## Phase 4 status

Phase 4 is implemented as measured local Ollama run timing plus estimated response-efficiency metrics. The prompt runner still sends prompts only to local Ollama through the Partner Hub server-side streaming proxy, keeps response content in memory only for the active browser session, and does not add run history or persistent storage.

Phase 4 adds measured TTFT, measured total latency, measured generation duration when Ollama sends `done`, estimated prompt tokens, estimated response tokens, and derived estimated tokens/sec. Token counts use a documented local approximation of roughly four normalized characters per token; they are not exact tokenizer counts.

Phase 4 intentionally does **not** add GPU telemetry, `nvidia-smi` calls, NVIDIA telemetry, watts, tokens/watt from real telemetry, real cost-per-run calculations, run history, persistent storage, prompt persistence, response persistence, database migrations, dependencies, cloud services, secrets, or external APIs.

Phase 4 files added:

```text
ui/partner-hub/components/ai-factory-economics/run-metrics-panel.tsx
ui/partner-hub/lib/ai-factory-economics/metrics.ts
ui/partner-hub/lib/ai-factory-economics/metrics.test.ts
```

Phase 4 files updated:

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

Phase 4 runtime behavior:

- `/api/ai-factory-economics/run` captures a server-side request start timestamp.
- The route captures TTFT from request start to the first streamed Ollama response chunk and labels TTFT **Measured**.
- The route captures completion when Ollama sends `done`; total latency and generation duration are labeled **Measured** when available.
- Prompt and response token counts are estimated locally and labeled **Estimated**.
- Tokens/sec is derived from estimated response tokens divided by measured generation duration and labeled **Derived**.
- The route emits SSE `meta`, `chunk`, `metrics`, `done`, and `error` events.
- If a stream ends without a `done` event, the route emits an incomplete metrics state and the UI keeps the partial response visible while refusing to mark the run completed.
- Existing GPU, watts, tokens/watt, and cost/run dashboard cards remain **Demo/mock** or unavailable for live runs.
- Prompt and response content are not persisted; response text is retained in request/browser memory only long enough to stream and estimate active-run tokens.

Local Phase 4 test flow:

```bash
cd ui/partner-hub
ollama serve
ollama pull llama3.2:3b
npm run dev
```

Then open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

Run a prompt and confirm:

- The response streams into the generated response panel.
- TTFT appears and is labeled **Measured**.
- Total latency and generation duration appear after completion and are labeled **Measured**.
- Prompt and response token counts appear and are labeled **Estimated**.
- Tokens/sec appears after completion and is labeled **Derived**.
- GPU telemetry, watts, tokens/watt, and real cost/run remain unavailable for live runs or **Demo/mock** in the dashboard.
- Prompt and response content are not saved by Partner Hub.

## Phase 5 status

Phase 5 is implemented as local-only NVIDIA GPU telemetry snapshots using `nvidia-smi`. The module now exposes a server-side API route that invokes `nvidia-smi` with safe argument passing, parses one or more GPU rows, and displays a manually refreshable snapshot panel in Partner Hub.

Phase 5 intentionally does **not** add run history, persistent storage, prompt persistence, response persistence, database migrations, dependencies, background daemons, long-running collectors, cloud services, secrets, non-NVIDIA telemetry, per-process GPU attribution, lab-grade power measurement claims, or real cost-per-run calculations from telemetry.

Phase 5 files added:

```text
ui/partner-hub/app/api/ai-factory-economics/gpu/route.ts
ui/partner-hub/components/ai-factory-economics/gpu-telemetry-panel.tsx
ui/partner-hub/lib/ai-factory-economics/gpu.ts
ui/partner-hub/lib/ai-factory-economics/gpu.test.ts
```

Phase 5 files updated:

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

Phase 5 runtime behavior:

- `/api/ai-factory-economics/gpu` runs only in the Next.js Node.js runtime and never from client-side code.
- The GPU helper invokes `nvidia-smi` with `execFile`/argument-array semantics, not string-shell execution.
- The query is `index,utilization.gpu,memory.used,memory.total,power.draw,temperature.gpu` with `--format=csv,noheader,nounits`.
- A short timeout prevents long-running telemetry calls.
- One or more GPU rows are parsed into snapshots; the UI defaults to the first row/GPU 0 snapshot.
- Empty output, missing `nvidia-smi`, timeouts, unsupported queries, and unexpected command failures return clean UI-facing unavailable states without stack traces.
- Missing fields are represented as `null` and shown as **Unavailable**, never as zero.
- The health route remains high-level and points to the dedicated GPU snapshot endpoint instead of duplicating full telemetry logic.

Phase 5 metric labeling:

- GPU telemetry availability is **Measured** by the local snapshot endpoint.
- GPU utilization is **Measured** when returned by `nvidia-smi`.
- GPU memory used and total are **Measured** when returned by `nvidia-smi`.
- GPU watts/power draw is **Measured** when returned by `nvidia-smi`.
- GPU temperature is **Measured** when returned by `nvidia-smi`.
- Tokens/watt remains unavailable for active runs in Phase 5.
- Existing static dashboard economics can remain **Demo/mock** until later phases wire them to sampled live values.

Local Phase 5 test flow:

```bash
cd ui/partner-hub
nvidia-smi
ollama serve
ollama pull llama3.2:3b
npm run dev
```

Then open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

Confirm:

1. NVIDIA drivers are installed and `nvidia-smi` works manually.
2. The GPU telemetry panel can be refreshed.
3. Utilization, memory used/total, watts, temperature, GPU index, availability, and sample timestamp appear when available.
4. If `nvidia-smi` is missing, times out, is unsupported, or returns unexpected data, the panel shows a safe unavailable state.
5. Prompt runner behavior is unchanged and still works without GPU telemetry.
6. No run history is created.
7. Prompt and response content are not persisted.
8. No database migrations or persistent stores are added.
9. Telemetry is snapshot-based, not lab-grade power measurement.
10. Multi-GPU attribution to a specific Ollama process remains out of scope.

Verification commands from `ui/partner-hub`:

```bash
npm run typecheck
npm test
npm run lint
```

## Phase 6 in-memory run history and model comparison

Phase 6 is implemented as browser-memory-only sanitized run history and derived model comparison for `/ai-factory-economics`. It does not add persistent storage, localStorage, database migrations, backend storage, cloud services, new dependencies, background daemons, long-running collectors, exact tokenizers, exact per-process GPU attribution, or lab-grade power measurement.

Files added in Phase 6:

```text
ui/partner-hub/lib/ai-factory-economics/history.ts
ui/partner-hub/lib/ai-factory-economics/history.test.ts
ui/partner-hub/components/ai-factory-economics/run-history-panel.tsx
ui/partner-hub/components/ai-factory-economics/model-comparison-table.tsx
```

Files updated in Phase 6:

```text
ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx
ui/partner-hub/components/ai-factory-economics/prompt-runner.tsx
ui/partner-hub/lib/ai-factory-economics/types.ts
ui/partner-hub/lib/ai-factory-economics/mock-data.ts
ui/partner-hub/package.json
docs/AI_FACTORY_ECONOMICS_MODULE.md
ui/partner-hub/docs/ai-factory-economics.md
```

### What Phase 6 stores

Phase 6 stores only sanitized run summaries in React state owned by the AI Factory Economics tool. The history length is limited to the most recent 20 runs and is cleared by page reload or by the **Clear in-memory history** button.

Run summaries may include:

- Generated run summary id.
- Started and completed timestamps.
- Local model name.
- Terminal run status: completed, failed, canceled, or incomplete.
- TTFT, total latency, and generation duration when available (**Measured**).
- Estimated prompt tokens and estimated response tokens when supplied by the run metrics stream (**Estimated**).
- Estimated tokens/sec when available (**Derived**).
- Metric classification labels.
- A note that prompt and response content are excluded.
- Optional shape for sampled GPU snapshot summaries, labeled as measured snapshot telemetry only; Phase 6 does not wire GPU snapshots into run summaries yet to avoid unnecessary coupling.

Run summaries do **not** include prompt text, response text, generated answers, raw request bodies, raw stream chunks, raw local filesystem paths, raw stack traces, secrets, or API keys.

### Model comparison behavior

The model comparison table aggregates the current in-memory run history by model and shows:

- Run count.
- Completed count.
- Failed, canceled, and incomplete counts.
- Average TTFT.
- Average total latency.
- Average estimated tokens/sec.
- Best estimated tokens/sec.
- Fastest TTFT.
- Most recent run timestamp.

All model comparison values are labeled **Derived**. Missing metric values are excluded from averages and are never substituted with zero. If no valid value exists, the UI shows **Unavailable**.

### Phase 6 metric labels

- TTFT remains **Measured**.
- Total latency remains **Measured**.
- Generation duration remains **Measured**.
- Prompt tokens remain **Estimated**.
- Response tokens remain **Estimated**.
- Tokens/sec remains **Derived**.
- Model comparison aggregates are **Derived**.
- GPU telemetry remains **Measured** only as refresh-time snapshot telemetry and is not exact per-run attribution.
- Demo/mock dashboard economics remain **Demo/mock**.

### Local Phase 6 test flow

From `ui/partner-hub`:

```bash
ollama serve
ollama pull llama3.2:3b
npm run dev
```

Then open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

Manual verification steps:

1. Start Ollama.
2. Pull at least one local model.
3. Run Partner Hub.
4. Open `/partner-hub/ai-factory-economics`.
5. Run several prompts across one or more local models.
6. Confirm recent sanitized run summaries appear.
7. Confirm model comparison aggregates appear and are labeled **Derived**.
8. Confirm prompt and response content remain visible only for the active run and are not stored in history.
9. Confirm **Clear in-memory history** clears only the browser-memory history.
10. Refresh the page and confirm history disappears.
11. Confirm Ollama unavailable and incomplete stream states remain graceful and do not expose stack traces.

Verification commands from `ui/partner-hub`:

```bash
npm run typecheck
npm test
npm run lint
```

## Phase 7: executive dashboard polish and safe recommendations

Phase 7 is implemented as a local-only UI/interpretation polish phase for `/partner-hub/ai-factory-economics`. It adds executive scorecards, safe recommendations, and clearer demo caveats without telemetry sources, background collection, persistence, backend storage, migrations, cloud services, secrets, dependencies, or cost-per-run calculations.

### Files added in Phase 7

- `ui/partner-hub/lib/ai-factory-economics/insights.ts`
- `ui/partner-hub/lib/ai-factory-economics/insights.test.ts`
- `ui/partner-hub/components/ai-factory-economics/executive-insights-panel.tsx`

### Files updated in Phase 7

- `ui/partner-hub/components/ai-factory-economics/ai-factory-economics-tool.tsx`
- `ui/partner-hub/lib/ai-factory-economics/types.ts`
- `ui/partner-hub/lib/ai-factory-economics/mock-data.ts`
- `ui/partner-hub/package.json`
- `ui/partner-hub/docs/ai-factory-economics.md`
- `docs/AI_FACTORY_ECONOMICS_MODULE.md`

### Runtime behavior and labels

- The header identifies **Local-only Phase 7** and explains measured local runtime, estimated token counts, derived model comparison/recommendations, and no persisted prompt or response content.
- A new executive insights panel appears after the existing demo/mock executive summary cards and explains what the local demo proves.
- Scorecards are **Derived** and transparent: runs compared, best average TTFT, best average estimated tokens/sec, completion rate, and telemetry coverage.
- Missing metrics display as unavailable and are never treated as zero.
- Recommendations are **Derived** from current sanitized in-memory history and can identify fastest average TTFT, highest average estimated throughput, highest completion rate, or a completion warning.
- Static caveats and demo narration guidance are **Configured**.
- Demo economics remain **Demo/mock**; direct Ollama/model/runtime observations remain **Measured**; token counts remain **Estimated**; tokens/sec remains **Derived**.
- GPU telemetry remains **Measured** only as a point-in-time NVIDIA `nvidia-smi` snapshot when available. It is not exact per-run attribution, per-process attribution, or lab-grade wall-power measurement.
- The page is grouped as executive view, local readiness, prompt running, learning from runs, and readiness/phase status without rebuilding unrelated components.

### Local manual test flow

1. Start Ollama: `ollama serve`.
2. Pull one or more local models, for example `ollama pull llama3.2:3b`.
3. Run Partner Hub from `ui/partner-hub`: `npm run dev`.
4. Open `http://localhost:3000/partner-hub/ai-factory-economics`.
5. Run several prompts, ideally with the same prompt across two local models.
6. Confirm executive insights appear, recommendations are labeled **Derived**, prompt/response content is not stored, history disappears on reload, GPU telemetry remains snapshot-only, and no production benchmark claims are made.

Verification commands from `ui/partner-hub`: `npm run typecheck`, `npm test`, and `npm run lint`.

### Phase 7 guardrails
Phase 7 keeps all prior local-only guardrails. It does not persist prompt content, persist response content, use localStorage/sessionStorage/IndexedDB, add database/backend storage, add migrations, add dependencies, add cloud services, add background collectors, add non-NVIDIA telemetry, claim exact tokenizer counts, claim lab-grade power measurement, claim exact per-run GPU attribution, or claim production benchmark validity.
