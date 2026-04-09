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
2. Review the environment explainer to understand which parts are modeled directly versus taught conceptually.
3. Adjust infrastructure/workload/simulation controls.
4. Run simulation.
5. Review outputs:
   - Run summary metrics.
   - Bottleneck summary attribution and suggestions.
   - Guided walkthrough explaining what happened, why, what to learn, what to change next, and how to interpret the result in the environment model.
   - Cluster topology panel.
   - Evidence charts (throughput, metadata, OST distribution, queue/activity, utilization, wait-on-data, checkpoint impact, raw constraint signals).
6. Change one variable at a time and compare runs.

Preset switching, reset behavior, stale-result messaging, and deterministic chart downsampling are part of the intended workflow.

## Contextual help surfaces (teaching layer)
HPC Lab includes contextual explanations that map controls, topology labels, walkthrough terms, and key result metrics to real higher-ed HPC concepts.

- The teaching copy is centralized in a typed concept glossary (`lib/hpc-lab/concepts.ts`) so explanatory text stays out of JSX and remains testable.
- The UI now uses two help patterns for readability in dense layouts:
  - **Short tooltip (hover/focus):** compact one-sentence clarifications for concise controls/metrics (for example metadata latency, wait on data, queue burden, stripe width).
  - **Explainer popover (click/keyboard activation):** longer architectural teaching content (for example higher-ed environment framing, local scratch vs shared scratch, Lustre/DDN concept mapping, and extended topology guidance).
- Tooltip triggers support pointer hover + keyboard focus; explainer popovers support click/keyboard activation, Escape, and outside-click dismissal.
- Explanations are directional and educational, not a claim of exact 1:1 platform parity.

### Storage-tier distinctions shown in the UI
- **Local scratch**: per-node temporary storage, not shared across nodes (conceptual here; not separately modeled as its own I/O path).
- **Shared scratch / parallel filesystem**: shared cluster-visible workspace (primary modeled storage path in this simulator).
- **Home/lab/project storage**: longer-lived storage tier separate from shared scratch semantics (conceptual in this simulator).

### Real-world concept mapping
- Compute and GPU nodes are treated as compute clients of a shared filesystem.
- Metadata latency is the closest simulator analogue to metadata-service pressure (MDS/MDT side).
- OSS + OST inventory represent shared data-path width in a Lustre-style parallel filesystem model.
- Stripe width represents file striping width across OSTs.
- Network bandwidth represents aggregate client-to-storage fabric limits.
- DDN EXAScaler / managed Lustre style platforms are referenced as production packaging of Lustre-like concepts, not as vendor-specific benchmark equivalence.

## Higher-ed storage environment framing (explicit)
HPC Lab now teaches a higher-ed hybrid shared-cluster framing with distinct storage tiers:

- **Node-local scratch**: temporary, per-node, fast, and **not shared** across compute nodes.
- **Shared scratch / parallel filesystem**: active shared workspace visible to many compute nodes; includes metadata and striped data paths.
- **Home/lab/project storage**: longer-lived collaborative storage, typically separate from short-lived shared scratch semantics.
- **Archive/cold storage (optional concept)**: future/external retention tier, not modeled in current runs.

### Architecture modes (conceptual teaching modes)
The docs and UI recognize these conceptual architectures:

1. **Hybrid shared cluster** (default profile in this lab): local scratch on compute nodes + shared parallel scratch + separate longer-lived storage.
2. **Converged storage services**: storage services may co-exist with other cluster roles; metadata and data service concepts still apply.
3. **Dedicated storage layer**: compute nodes act as clients of a dedicated shared storage tier running metadata/data services.

These are explanatory lenses, not an engine-mode switch.

## What the current simulator models versus teaches conceptually
### Actively modeled today (deterministic)
- Scheduler/resource-allocation pressure and queue behavior.
- Compute nodes as clients.
- Shared filesystem metadata behavior.
- Shared striped data-path behavior.
- Aggregate network delivery limits.

### Conceptual in teaching, not separately simulated as independent I/O paths
- A dedicated node-local scratch performance path.
- A distinct home/lab/project performance path.
- Archive/cold storage movement and retrieval behavior.

## Current architecture
- **`app/(routes)/hpc-lab/page.tsx`**: route-level feature gate and top-level rendering.
- **`components/hpc-lab/hpc-lab-tool.tsx`**: client-side controls, preset switching, validation UX, run summary, environment explainer integration, bottleneck summary card, and chart panel rendering.
- **`components/hpc-lab/environment-explainer.tsx`**: educational panel for storage tiers, stack layers, architecture mode framing, and simulator honesty.
- **`components/hpc-lab/bottleneck-summary.tsx`**: presentational run-level bottleneck explanation, confidence, suggestions, and derived metrics.
- **`components/hpc-lab/guided-walkthrough.tsx`**: presentational educational walkthrough card built from deterministic run evidence plus environment-aware context.
- **`components/hpc-lab/topology-diagram.tsx`**: normalized-inventory topology presentation.
- **`components/hpc-lab/charts/*`**: chart frame + deterministic SVG chart presentation.
- **`lib/hpc-lab/types.ts`**: stable type boundary for presets/config/domain outputs, chart models, bottleneck analysis, and environment profile modeling.
- **`lib/hpc-lab/environment.ts`**: pure higher-ed environment profile model and environment-context helpers.
- **`lib/hpc-lab/presets.ts`**: preset catalog, simulation defaults, and learning/environment guidance metadata.
- **`lib/hpc-lab/form.ts`**: pure preset hydration, numeric validation, parse, reset, and dirty comparison helpers.
- **`lib/hpc-lab/config.ts`**: deterministic config/options normalization and validation.
- **`lib/hpc-lab/workloads.ts`**: deterministic workload plan generation.
- **`lib/hpc-lab/scheduler.ts`**: deterministic FIFO scheduling/resource accounting.
- **`lib/hpc-lab/storage.ts`**: deterministic storage + metadata pressure modeling and OST load distribution.
- **`lib/hpc-lab/network.ts`**: deterministic network throughput cap and utilization modeling.
- **`lib/hpc-lab/engine.ts`**: deterministic tick loop combining scheduler, storage, and network.
- **`lib/hpc-lab/visualization.ts`**: pure chart/topology/stat model builders and deterministic downsampling.
- **`lib/hpc-lab/bottlenecks.ts`**: pure deterministic run-level bottleneck attribution.
- **`lib/hpc-lab/walkthrough.ts`**: pure deterministic educational walkthrough synthesis using preset guidance + run outputs + bottleneck attribution.

## Modeling assumptions and caveats
- This is a deterministic behavior simulator, not a vendor-certified benchmark.
- Guided walkthrough output is educational and evidence-based; it is not benchmark certification or a capacity-sizing engine.
- No randomness is used; identical config/options produce identical outputs.
- Engine defaults remain `tickDurationSeconds=1`, `totalTicks=120`; presets intentionally use longer defaults for learning flows.
- Checkpoint bursts for distributed AI training are deterministic interval events.
- Storage behavior is influenced by OST inventory, effective stripe width, metadata service limits, and aggregate network cap.
- Environment teaching does not claim institution-specific or vendor-specific topology details.

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
- Environment guidance for how that workload tends to stress the shared stack in this model.

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
