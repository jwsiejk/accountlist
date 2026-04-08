# HPC / AI Infrastructure Learning Lab

## Purpose
The HPC Lab introduces a dedicated workspace for exploring how infrastructure configuration choices may influence cluster behavior in HPC and AI-oriented environments.

## Route
- `/hpc-lab`

## Phase 2 scope
Phase 2 adds the deterministic simulation engine foundation under `lib/hpc-lab`.

Included in Phase 2:
- Engine-domain type system expansion for jobs, scheduler state, storage/network state, timeline snapshots, and simulation results.
- Config normalization and validation helpers with derived inventory (`totalOsts`, `effectiveStripeWidth`).
- Deterministic workload plan generation for `traditional-hpc`, `distributed-ai-training`, and `metadata-heavy` behaviors.
- FIFO scheduler core for queue/running/completed lifecycle and non-oversubscribed CPU/GPU node allocation.
- Storage model core for deterministic striping, OST load distribution, metadata service pressure, and checkpoint burst write impact.
- Network model core for throughput capping, utilization, and contention signals.
- Top-level pure API: `simulateHpcLab(config, options?)`.

## What remains out of scope after Phase 2
- Interactive controls wiring and stateful simulation execution in the UI (Phase 3).
- Visualization layer (charts/topology rendering) and panel population (Phase 4).
- User-facing bottleneck attribution labels (planned later).

## Feature flag
Set the following in `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_HPC_LAB=true
```

When the flag is not set to `"true"`, `/hpc-lab` renders a disabled message card with enablement instructions.

## Current architecture
- **`app/(routes)/hpc-lab/page.tsx`**: route-level feature gate and top-level rendering.
- **`components/hpc-lab/hpc-lab-tool.tsx`**: client-side scaffold UI, preset selection, and read-only configuration display.
- **`lib/hpc-lab/types.ts`**: stable type boundary for preset/config types plus simulation engine domain types.
- **`lib/hpc-lab/presets.ts`**: centrally defined preset catalog.
- **`lib/hpc-lab/config.ts`**: config and option normalization / validation.
- **`lib/hpc-lab/workloads.ts`**: deterministic workload plan generation.
- **`lib/hpc-lab/scheduler.ts`**: deterministic FIFO scheduling and resource accounting.
- **`lib/hpc-lab/storage.ts`**: storage + metadata pressure modeling with OST load distribution.
- **`lib/hpc-lab/network.ts`**: network throughput cap and utilization modeling.
- **`lib/hpc-lab/engine.ts`**: deterministic tick loop combining scheduler, storage, and network per tick.

## Modeling assumptions
- This is a deterministic behavior simulator, not a vendor-certified benchmark.
- No randomness is used; identical config/options produce identical outputs.
- Tick-based simulation defaults: `tickDurationSeconds=1`, `totalTicks=120`.
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
