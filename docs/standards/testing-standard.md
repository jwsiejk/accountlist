# Testing Standard

## Purpose

Provide predictable validation quality across phases.

## Phase 01 baseline

At minimum, each pull request must run:

- File length validation.
- Required documentation presence validation.
- Required top-level file presence validation.

## Expectations for later phases

- Add component-level tests as functionality is introduced.
- Keep test commands deterministic and documented.
- Avoid hidden test dependencies; document required tooling and versions.

## CI policy

Validation tooling under `tools/validate/` must run in CI for pull requests and main branch pushes.
