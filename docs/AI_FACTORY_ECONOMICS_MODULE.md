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

| Endpoint | Method | Purpose | External dependency |
| --- | --- | --- | --- |
| `/api/ai-factory-economics/health` | `GET` | Report module readiness, Ollama reachability, mock-mode status, and optional GPU telemetry availability. | Ollama and `nvidia-smi`, both optional |
| `/api/ai-factory-economics/models` | `GET` | Return locally available Ollama models. | Ollama `/api/tags` |
| `/api/ai-factory-economics/run` | `POST` | Run one prompt against selected local model, optionally streaming, and return timing plus token estimates. | Ollama `/api/generate` or `/api/chat` |
| `/api/ai-factory-economics/gpu` | `GET` | Return current NVIDIA telemetry snapshot. | `nvidia-smi` |

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
| Metric | Definition | Source label |
| --- | --- | --- |
| Ollama health | Whether the configured local Ollama base URL responds within timeout. | Measured |
| Available models | Models returned by local Ollama model listing. | Measured |
| Selected model | Model chosen by the user or demo fallback. | Configured |
| Prompt run status | Current state of the run lifecycle. | Measured/Derived |
| TTFT | Time from request start to first streamed response token/chunk. | Measured when streaming; Estimated/Unavailable otherwise |
| Total latency | Time from request start to completed response or error. | Measured |
| Estimated prompt tokens | Approximation of prompt token count when exact tokenizer is not available. | Estimated |
| Estimated response tokens | Approximation of response token count when exact tokenizer is not available. | Estimated |
| Estimated tokens/sec | Estimated response tokens divided by generation duration. | Derived from estimated and measured values |
| GPU utilization | Percent utilization from `nvidia-smi`. | Measured |
| GPU memory usage | Used and total framebuffer memory from `nvidia-smi`. | Measured |
| GPU watts | Current power draw from `nvidia-smi`. | Measured |
| GPU temperature | Current GPU temperature from `nvidia-smi`. | Measured |
| Estimated tokens per watt | Estimated response tokens per measured average watts during the run. | Derived/Estimated |
| Estimated cost per run | Configurable local estimate based on energy usage and optional cost rate. | Estimated |
| Run history | Recent in-memory run summaries excluding prompt content. | Derived |
| Model comparison | Aggregation of recent run summaries by model. | Derived |

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
- Add prompt runner UI.
- Add server-side run proxy to Ollama.
- Stream response chunks where practical.
- Add cancel/stop only if it remains simple and reliable.

### Phase 4: TTFT, latency, token estimate, tokens/sec calculations
- Add server-side run timing.
- Compute TTFT from first streamed chunk.
- Estimate prompt and response tokens with documented approximation.
- Compute estimated tokens/sec.
- Add tests for metric calculations.

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
- The current mock selected model is `llama3.1:8b-instruct`; Phase 2 should replace or validate demo model choices through Ollama discovery when connected.
- The current static energy-rate display assumption is `$0.16/kWh`; future phases should decide whether this becomes user-configurable.
- Prompt history remains absent in Phase 1; future phases should keep any run-history work in memory first and continue excluding prompt content from stored summaries by default.
