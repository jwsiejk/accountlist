#!/usr/bin/env python3
"""Enforce the phase-01 500-line file-size policy for foundation-managed files."""

from pathlib import Path
import sys

MAX_LINES = 500
ROOT = Path(__file__).resolve().parents[2]

SCOPED_PATHS = [
    ROOT / "README.md",
    ROOT / "Makefile",
    ROOT / ".editorconfig",
    ROOT / ".gitignore",
    ROOT / "docs",
    ROOT / "tools",
    ROOT / ".github",
]

SKIP_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".pdf",
    ".mp3",
    ".wav",
    ".pptx",
    ".zip",
    ".tar",
    ".gz",
    ".db",
}


def iter_scoped_files() -> list[Path]:
    files: list[Path] = []
    for item in SCOPED_PATHS:
        if not item.exists():
            continue
        if item.is_file():
            files.append(item)
            continue
        for path in item.rglob("*"):
            if path.is_file() and path.suffix.lower() not in SKIP_EXTENSIONS:
                files.append(path)
    return sorted(set(files))


def line_count(path: Path) -> int | None:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return sum(1 for _ in handle)
    except UnicodeDecodeError:
        return None


def main() -> int:
    violations: list[tuple[Path, int]] = []
    checked = 0

    for file_path in iter_scoped_files():
        count = line_count(file_path)
        if count is None:
            continue
        checked += 1
        if count > MAX_LINES:
            violations.append((file_path, count))

    print(f"Checked {checked} file(s) against {MAX_LINES}-line limit.")

    if violations:
        print("\nFile length violations found:")
        for path, count in violations:
            rel = path.relative_to(ROOT)
            print(f" - {rel}: {count} lines")
        return 1

    print("PASS: no file length violations in validation scope.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
