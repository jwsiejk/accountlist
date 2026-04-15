# Phase 01 — Foundation

## Objective

Establish repository structure, standards, validation tooling, and CI enforcement without implementing the full ELT lab.

## Added in this phase

- Top-level repository README with scope, status, and enforcement model.
- Documentation hierarchy under `docs/` with architecture, operations, standards, and phases.
- Repository contract and standards docs:
  - Contract
  - Documentation standard
  - File size policy
  - Testing standard
- PR template enforcing docs and file-size compliance checks.
- `.editorconfig` and practical `.gitignore`.
- Placeholder `Makefile` for future phase commands.
- Validation scripts in `tools/validate/` for:
  - file length policy
  - required docs presence
  - required top-level files presence
- Minimal CI workflow running the validation scripts.

## Not included

- No Docker/PostgreSQL implementation.
- No seed data workflow implementation for this lab.
- No dbt project implementation.
- No simulation or operator runbook implementation.

## Validation executed

- `python3 tools/validate/check_file_lengths.py`
- `python3 tools/validate/check_required_docs.py`
- `python3 tools/validate/check_required_top_level.py`
- `make validate`

## Exit criteria status

- [x] Clean documented skeleton exists.
- [x] Contract exists and is actionable.
- [x] Validation tooling exists and runs.
- [x] CI runs validation tooling.
- [x] README/docs alignment established for current phase.
