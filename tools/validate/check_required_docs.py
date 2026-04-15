#!/usr/bin/env python3
"""Verify required documentation files for the scaffold are present."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_DOCS = [
    "README.md",
    "docs/README.md",
    "docs/architecture/README.md",
    "docs/operations/README.md",
    "docs/standards/repo-contract.md",
    "docs/standards/documentation-standard.md",
    "docs/standards/file-size-policy.md",
    "docs/standards/testing-standard.md",
    "docs/phases/phase-01-foundation.md",
    "docs/phases/phase-02-docker-postgres.md",
    "docs/phases/phase-03-seed-data.md",
    "docs/phases/phase-04-dbt.md",
    "docs/phases/phase-05-simulation.md",
    "docs/phases/phase-06-operator-runbook.md",
    "tools/validate/README.md",
]


def main() -> int:
    missing = [path for path in REQUIRED_DOCS if not (ROOT / path).exists()]

    if missing:
        print("FAIL: missing required documentation files:")
        for path in missing:
            print(f" - {path}")
        return 1

    print(f"PASS: all {len(REQUIRED_DOCS)} required documentation file(s) exist.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
