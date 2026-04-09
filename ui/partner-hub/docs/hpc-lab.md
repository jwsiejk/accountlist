# HPC / AI Infrastructure Learning Lab

## Purpose
HPC Lab is a deterministic learning tool in Partner Hub for exploring how infrastructure and workload configuration choices affect HPC/AI cluster behavior.

## Route
- `/hpc-lab`

## Feature flag
Set the following in `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_HPC_LAB=true
```

When the flag is not set to `"true"`, `/hpc-lab` renders a disabled message card with enablement instructions.

## Current user workflow
1. Choose a preset profile.
2. Adjust infrastructure/workload/simulation controls.
3. Run simulation.
4. Review outputs:
   - Run summary metrics.
   - Bottleneck summary attribution and suggestions.
   - Cluster topology panel.
   - Evidence charts (throughput, metadata, OST distribution, queue/activity, utilization, wait-on-data, checkpoint impact, raw constraint signals).

Preset switching, reset behavior, stale-result messaging, and deterministic chart downsampling are part of the intended workflow.

## Current architecture
- **`app/(routes)/hpc-lab/page.tsx`**: route-level feature gate and top-level rendering.
- **`components/hpc-lab/hpc-lab-tool.tsx`**: client-side controls, preset switching, validation UX, run summary, bottleneck summary card, and chart panel rendering.
- **`components/hpc-lab/bottleneck-summary.tsx`**: presentational run-level bottleneck explanation, confidence, suggestions, and derived metrics.
- **`components/hpc-lab/topology-diagram.tsx`**: normalized-inventory topology presentation.
- **`components/hpc-lab/charts/*`**: chart frame + deterministic SVG chart presentation.
- **`lib/hpc-lab/types.ts`**: stable type boundary for presets/config/domain outputs, chart models, and bottleneck analysis.
- **`lib/hpc-lab/presets.ts`**: preset catalog, simulation defaults, and learning guidance metadata.
- **`lib/hpc-lab/form.ts`**: pure preset hydration, numeric validation, parse, reset, and dirty comparison helpers.
- **`lib/hpc-lab/config.ts`**: deterministic config/options normalization and validation.
- **`lib/hpc-lab/workloads.ts`**: deterministic workload plan generation.
- **`lib/hpc-lab/scheduler.ts`**: deterministic FIFO scheduling/resource accounting.
- **`lib/hpc-lab/storage.ts`**: deterministic storage + metadata pressure modeling and OST load distribution.
- **`lib/hpc-lab/network.ts`**: deterministic network throughput cap and utilization modeling.
- **`lib/hpc-lab/engine.ts`**: deterministic tick loop combining scheduler, storage, and network.
- **`lib/hpc-lab/visualization.ts`**: pure chart/topology/stat model builders and deterministic downsampling.
- **`lib/hpc-lab/bottlenecks.ts`**: pure deterministic run-level bottleneck attribution.

## Modeling assumptions and caveats
- This is a deterministic behavior simulator, not a vendor-certified benchmark.
- No randomness is used; identical config/options produce identical outputs.
- Engine defaults remain `tickDurationSeconds=1`, `totalTicks=120`; presets intentionally use longer defaults for learning flows.
- Checkpoint bursts for distributed AI training are deterministic interval events.
- Storage behavior is influenced by OST inventory, effective stripe width, metadata service limits, and aggregate network cap.

## Main engine API
`simulateHpcLab(config, options?)` returns:
- `normalizedConfig`
- `options`
- `timeline`
- `jobs`
- `summary`
- `assumptions`

## Bottleneck meaning definitions
Run-level attribution is derived from per-tick raw pressure signals:
- `computePressure`
- `storagePressure`
- `metadataPressure`
- `networkPressure`

Conservative labels:
- **Mostly compute-bound**
- **Mostly storage-bound**
- **Mostly metadata-bound**
- **Mostly network-bound**
- **Mixed bottlenecks**
- **No strong bottleneck detected**

Derived metrics include throughput fulfillment ratio, metadata service ratio, queue burden ratio, checkpoint-active tick share, transition count, and longest dominant streak.

## Preset learning guidance
Each preset includes:
- Learning focus.
- Key knobs/watch items.
- Expected behavior tendencies.

This guidance is directional and educational. It does not guarantee a fixed outcome for every parameter combination.

## Phase 6 polish and hardening notes (implemented)
- Removed residual phase-number language from end-user UI copy.
- Improved accessibility for validation messaging, stale notices, and chart labeling/legend readability.
- Centralized stale-run live announcements to the run summary and kept repeated stale badges in bottleneck/chart areas visual-only to reduce screen-reader announcement noise.
- Hardened empty/minimal rendering paths for charts and helper outputs without synthetic fallback data.
- Tightened responsive wrapping/overflow behavior for dense panels, guidance text, and long explanatory content.
- Kept deterministic simulation and attribution contracts intact.

## Future work (not implemented)
- Persistence, APIs, background workers, and non-local execution paths.
- Feature-scope expansion beyond deterministic learning and analysis workflows.
