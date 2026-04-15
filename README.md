# registrations-: Fivetran ELT Lab Foundation

This repository is the staged foundation for a **local Fivetran ELT lab**. Phase 01 intentionally focuses on structure, standards, and enforcement so future implementation phases can be built predictably.

## What this repository is for

The repo will host a local ELT lab workflow centered on:

- Local infrastructure bootstrap (Docker + PostgreSQL).
- Seeded source data for repeatable sync tests.
- dbt transformations for modeled analytics layers.
- Simulation and operator runbook workflows.

Implementation details beyond this scaffold are deferred to later phases by design.

## Planned future phases

- **Phase 01**: Foundation and standards (this phase).
- **Phase 02**: Docker + PostgreSQL local environment.
- **Phase 03**: Seed data setup.
- **Phase 04**: dbt project setup and transformations.
- **Phase 05**: Simulation workflows.
- **Phase 06**: Operator runbook and operationalization.

See phase trackers in [`docs/phases/`](docs/phases/) for phase-by-phase scope.

## Current status (after Phase 01)

✅ Repository scaffold exists with docs, standards, validation scripts, CI workflow, and contributor templates.

✅ Contract and standards are documented and enforceable with local checks.

🚫 No full ELT lab implementation is included yet.

## Standards enforcement

Standards are enforced using:

- Repository contract: [`docs/standards/repo-contract.md`](docs/standards/repo-contract.md)
- Documentation standard: [`docs/standards/documentation-standard.md`](docs/standards/documentation-standard.md)
- File size policy: [`docs/standards/file-size-policy.md`](docs/standards/file-size-policy.md)
- Testing standard: [`docs/standards/testing-standard.md`](docs/standards/testing-standard.md)
- Validation tooling: [`tools/validate/`](tools/validate/)
- CI workflow: [`.github/workflows/validate-foundation.yml`](.github/workflows/validate-foundation.yml)
- PR checklist template: [`.github/pull_request_template.md`](.github/pull_request_template.md)

## Quickstart checks

Run foundational checks locally:

```bash
python3 tools/validate/check_file_lengths.py
python3 tools/validate/check_required_docs.py
python3 tools/validate/check_required_top_level.py
```

Or run all checks:

```bash
make validate
```
