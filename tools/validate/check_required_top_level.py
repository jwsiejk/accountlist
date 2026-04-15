#!/usr/bin/env python3
"""Verify required top-level repository files are present."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_TOP_LEVEL = [
    "README.md",
    "Makefile",
    ".editorconfig",
    ".gitignore",
    ".github/pull_request_template.md",
    ".github/workflows/validate-foundation.yml",
]


def main() -> int:
    missing = [path for path in REQUIRED_TOP_LEVEL if not (ROOT / path).exists()]

    if missing:
        print("FAIL: missing required top-level file(s):")
        for path in missing:
            print(f" - {path}")
        return 1

    print(f"PASS: all {len(REQUIRED_TOP_LEVEL)} required top-level file(s) exist.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
