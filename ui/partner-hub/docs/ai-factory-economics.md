# AI Factory Economics

The canonical architecture and roadmap plan for this local-only AI FinOps / AI Factory Economics module lives at:

```text
../../../docs/AI_FACTORY_ECONOMICS_MODULE.md
```

Use that root-level plan as the source of truth for the module purpose, guardrails, metric definitions, local-only architecture, and implementation phases.

This pointer exists so the module is discoverable from the existing Partner Hub docs area alongside the other local demo module documentation.

## Current status

- Phase 1 is implemented as a static/mock Partner Hub feature shell.
- The page is available at `/ai-factory-economics`; with the default Partner Hub base path, open `http://localhost:3000/partner-hub/ai-factory-economics`.
- Phase 1 uses feature-scoped components under `ui/partner-hub/components/ai-factory-economics/`.
- Phase 1 uses feature-scoped mock data and types under `ui/partner-hub/lib/ai-factory-economics/`.
- Phase 1 adds a home-page card and left-nav link because the route is active and matches existing Partner Hub tool discovery patterns.
- All dashboard values are static mock/configured display values with visible classification labels.

## Local development

From `ui/partner-hub`, run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000/partner-hub/ai-factory-economics
```

If `NEXT_PUBLIC_BASE_PATH` is changed, keep using the same internal route (`/ai-factory-economics`) under that configured base path.

## Phase 1 guardrails

Phase 1 intentionally does **not** add:

- Ollama connectivity.
- `nvidia-smi` calls.
- Real telemetry collectors.
- Real prompt execution.
- API routes.
- Persistent storage.
- Database migrations.
- New dependencies.
- Cloud services, secrets, or API keys.

Future phases should continue following the canonical plan before introducing local API routes or runtime integrations.
