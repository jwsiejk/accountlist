# HPC / AI Infrastructure Learning Lab

## Purpose
The HPC Lab introduces a dedicated workspace for exploring how infrastructure configuration choices may influence cluster behavior in HPC and AI-oriented environments.

## Route
- `/hpc-lab`

## Phase 3 scope
Phase 3 wires the controls panel to the deterministic simulation engine under `lib/hpc-lab`.

Included in Phase 3:
- Real local control state for infrastructure and workload parameters.
- Preset-aware defaults for both infrastructure config and simulation options.
- Explicit **Run simulation** and **Reset to preset defaults** actions.
- Inline validation for all required positive numeric fields before execution.
- Local execution via `simulateHpcLab(config, options)` and compact run summary rendering.
- Simulation duration controls (`totalTicks`, `tickDurationSeconds`) exposed in the UI so users can extend run horizon without code edits.

Preset simulation defaults now intentionally use longer horizons than the engine baseline for better out-of-the-box behavior exploration:
- `classic-hpc`: 180 ticks
- `ai-training`: 360 ticks (helps checkpoint effects appear naturally)
- `small-file`: 240 ticks

## What remains out of scope after Phase 3
- Visualization layer (charts/topology rendering) and panel population (Phase 4, still deferred).
- User-facing bottleneck attribution labels (planned later).
- API routes, persistence, workers/background processing.

## Feature flag
Set the following in `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_HPC_LAB=true
```

When the flag is not set to `"true"`, `/hpc-lab` renders a disabled message card with enablement instructions.

## Current architecture
- **`app/(routes)/hpc-lab/page.tsx`**: route-level feature gate and top-level rendering.
- **`components/hpc-lab/hpc-lab-tool.tsx`**: client-side controls, preset switching, validation UX, and local run summary.
- **`lib/hpc-lab/types.ts`**: stable type boundary for preset/config types plus simulation engine domain types.
- **`lib/hpc-lab/presets.ts`**: centrally defined preset catalog and preset-aware simulation defaults.
- **`lib/hpc-lab/form.ts`**: pure helpers for preset-to-form hydration, validation, parsing, reset behavior, and dirty comparison.
- **`lib/hpc-lab/config.ts`**: config and option normalization / validation.
- **`lib/hpc-lab/workloads.ts`**: deterministic workload plan generation.
- **`lib/hpc-lab/scheduler.ts`**: deterministic FIFO scheduling and resource accounting.
- **`lib/hpc-lab/storage.ts`**: storage + metadata pressure modeling with OST load distribution.
- **`lib/hpc-lab/network.ts`**: network throughput cap and utilization modeling.
- **`lib/hpc-lab/engine.ts`**: deterministic tick loop combining scheduler, storage, and network per tick.

## Modeling assumptions
- This is a deterministic behavior simulator, not a vendor-certified benchmark.
- No randomness is used; identical config/options produce identical outputs.
- Tick-based simulation defaults from the base engine remain `tickDurationSeconds=1`, `totalTicks=120`; presets may override UI defaults for better learning flows.
- Checkpoint bursts for distributed AI training are deterministic interval events that increase write pressure and pause ratio.
- Storage service is influenced by OST capacity, stripe spread, and metadata service limits.

## Main engine API
`simulateHpcLab(config, options?)` returns:
- `normalizedConfig`
- `options`
- `timeline` (per-tick queue/running/completed, utilization, requested vs delivered throughput, metadata service, OST load, wait-on-data, checkpoint, and raw constraint signals)
- `jobs` (final job states)
- `summary` (aggregated utilization and throughput metrics)
- `assumptions` (documented model caveats)
