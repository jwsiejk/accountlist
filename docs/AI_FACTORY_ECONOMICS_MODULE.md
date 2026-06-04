# AI Factory Economics Module Plan

## Phase 0 status
This document is the Phase 0 architecture plan for a future local-only AI FinOps / AI Factory Economics module in Partner Hub. No UI, API routes, dependencies, migrations, or persistent storage are added in this phase.

## Repository discovery summary
- Partner Hub is a Next.js App Router application under `ui/partner-hub` with route groups in `app/(routes)` and API route handlers in `app/api`.
- The app is served under a configurable base path that defaults to `/partner-hub`, so user-facing links should be written as application-relative paths such as `/ai-factory-economics` and will render beneath the base path at runtime.
- Current pages use route-level `page.tsx` files that delegate most feature logic to feature folders under `components/<feature>` and `lib/<feature>`.
- Styling uses Tailwind CSS utility classes, shared CSS variables in `styles/globals.css`, and reusable UI primitives in `components/ui`.
- Existing local-AI patterns already proxy to local Ollama from API routes and return graceful JSON errors when the local service is unavailable.
- Tests are currently package-script based: `npm run typecheck`, `npm run lint`, and a long `npm test` command that compiles selected TypeScript modules into `.tmp-tests` and runs Node's built-in test runner.
- Documentation conventions are Markdown files with practical sections in `ui/partner-hub/docs`; this canonical plan remains at `docs/AI_FACTORY_ECONOMICS_MODULE.md`, with a Partner Hub docs pointer maintained at `ui/partner-hub/docs/ai-factory-economics.md` so the module is discoverable from the existing app docs area.

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
- Add `/ai-factory-economics` route behind an optional feature flag.
- Build static dashboard cards with mock values.
- Add local-only and measured-vs-estimated education copy.
- No real Ollama or GPU calls yet.

### Phase 2: Ollama health and model discovery
- Add health and model API routes.
- Detect local Ollama availability.
- Populate model selector from `/api/tags`.
- Keep demo mode fallback.

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
- Should the route be visible by default or gated behind `NEXT_PUBLIC_ENABLE_AI_FACTORY_ECONOMICS` initially?
- Should Phase 1 put the card on the home page immediately or keep the route unlinked until Phase 2?
- Which default demo models should mock mode show?
- What default electricity rate should be used for estimated cost per run, if any?
- Should prompt history remain completely absent, or should users get an opt-in local-only browser setting later?
