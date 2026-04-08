# HPC / AI Infrastructure Learning Lab

## Purpose
The HPC Lab introduces a dedicated workspace for exploring how infrastructure configuration choices may influence cluster behavior in HPC and AI-oriented environments.

## Route
- `/hpc-lab`

## Phase 1 scope
Phase 1 is a production-safe scaffold only.

Included in Phase 1:
- Route and feature flag gate.
- Typed preset/config boundary.
- Three baseline presets (`classic-hpc`, `ai-training`, and `small-file`).
- UI scaffolding for controls and observability panels.

Explicitly not implemented in Phase 1:
- Simulation engine logic.
- Throughput/latency/job-state outputs.
- APIs, workers, persistence, or chart integrations.

Every observability panel must remain in an explicit empty state until simulation output is implemented.

## Feature flag
Set the following in `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_HPC_LAB=true
```

When the flag is not set to `"true"`, `/hpc-lab` renders a disabled message card with enablement instructions.

## Intended architecture
- **`app/(routes)/hpc-lab/page.tsx`**: route-level feature gate and top-level rendering.
- **`components/hpc-lab/hpc-lab-tool.tsx`**: client-side scaffold UI, preset selection, and read-only configuration display.
- **`lib/hpc-lab/types.ts`**: stable type boundary for preset IDs, config structure, and observability panel keys.
- **`lib/hpc-lab/presets.ts`**: centrally defined preset catalog.

This separation keeps simulation concerns independent from UI presentation and is designed for a later engine module.

## Planned later phases
- Phase 2: implement simulation engine and connect outputs to observability panels.
- Phase 3: add richer interaction controls, parameter validation, and scenario comparison workflows.
- Phase 4: introduce persisted scenarios and optional export/reporting capabilities.
