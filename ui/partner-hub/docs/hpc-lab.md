# HPC / AI Infrastructure Learning Lab

## Purpose
The HPC Lab introduces a dedicated workspace for exploring how infrastructure configuration choices may influence cluster behavior in HPC and AI-oriented environments.

## Route
- `/hpc-lab`

## Phase 5 scope
Phase 5 keeps the Phase 3 controls workflow and Phase 4 visualization panels intact, then adds user-facing bottleneck attribution, derived run metrics, and stronger preset learning guidance.

Included through Phase 5:
- Real local control state for infrastructure and workload parameters.
- Preset-aware defaults for both infrastructure config and simulation options.
- Explicit **Run simulation** and **Reset to preset defaults** actions.
- Inline validation for all required positive numeric fields before execution, shown during editing (blur/change) rather than only after submit attempts.
- Local execution via `simulateHpcLab(config, options)` and compact run summary rendering.
- Last run summary remains visible after control edits but is clearly marked stale until the next run.
- Simulation duration controls (`totalTicks`, `tickDurationSeconds`) exposed in the UI so users can extend run horizon without code edits.
- Raw pressure-signal evidence chart for compute/storage/metadata/network constraint signals.
- Deterministic run-level bottleneck attribution derived from raw per-tick pressure signals plus run metrics.
- Derived run metrics: throughput fulfillment ratio, metadata service ratio, queue burden ratio, checkpoint-active tick share, transition count, and longest dominant streak.
- Preset learning guidance (`learningFocus`, key knobs to watch, expected behavior tendencies).

Preset simulation defaults intentionally use longer horizons than the engine baseline for better out-of-the-box behavior exploration:
- `classic-hpc`: 180 ticks
- `ai-training`: 360 ticks (helps checkpoint effects appear naturally)
- `small-file`: 240 ticks

## Feature flag
Set the following in `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_HPC_LAB=true
```

When the flag is not set to `"true"`, `/hpc-lab` renders a disabled message card with enablement instructions.

## Current architecture
- **`app/(routes)/hpc-lab/page.tsx`**: route-level feature gate and top-level rendering.
- **`components/hpc-lab/hpc-lab-tool.tsx`**: client-side controls, preset switching, validation UX, run summary, and Phase 5 attribution rendering.
- **`components/hpc-lab/bottleneck-summary.tsx`**: presentational UI for run-level bottleneck explanation, confidence, suggestions, and derived metrics.
- **`lib/hpc-lab/types.ts`**: stable type boundary for preset/config types, simulation domain types, and bottleneck analysis types.
- **`lib/hpc-lab/presets.ts`**: centrally defined preset catalog, preset-aware simulation defaults, and learning guidance metadata.
- **`lib/hpc-lab/bottlenecks.ts`**: pure deterministic bottleneck analysis built from simulation outputs.
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

## Bottleneck meaning and attribution rules
Phase 5 attribution uses raw `constraintSignals` as the primary source of truth per tick:
- `computePressure`
- `storagePressure`
- `metadataPressure`
- `networkPressure`

Run-level labels are conservative and deterministic:
- **compute-bound**: compute pressure is clearly dominant over other pressures for a substantial share of ticks.
- **storage-bound**: storage pressure is clearly dominant.
- **metadata-bound**: metadata pressure is clearly dominant.
- **network-bound**: network pressure is clearly dominant.
- **mixed**: no single pressure is consistently dominant (close competition or frequent transitions).
- **balanced**: pressure signals remain broadly low, so no strong bottleneck is currently active.

Derived metrics are based on observed run data only:
- Throughput fulfillment ratio: delivered total throughput / requested total throughput.
- Metadata service ratio: served metadata ops / requested metadata ops.
- Queue burden ratio: fraction of ticks with queued jobs > 0.
- Checkpoint-active tick share: fraction of ticks with checkpoint-active jobs > 0.
- Bottleneck transition count: number of changes in per-tick dominant label.
- Longest dominant streak: longest consecutive run of one per-tick label.

## Preset learning guidance
Each preset now includes human-readable teaching metadata:
- **Learning focus**: what concept this preset is intended to teach.
- **Key knobs / watch items**: controls and outputs to focus on while tuning.
- **Expected behavior tendencies**: likely direction of pressure patterns, without guaranteeing a fixed outcome.

## What remains out of scope after Phase 5
- API routes, persistence, workers/background processing.
- Chart-library replacement or control-flow redesign.
- Phase 6 polish/hardening tasks (still not started).
