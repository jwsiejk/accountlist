# Validation Tools

These scripts enforce the Phase 01 foundation contract.

## Scripts

- `check_file_lengths.py`
  - Enforces a 500-line maximum per tracked text file.
  - Exits non-zero when violations are found.

- `check_required_docs.py`
  - Validates presence of required documentation files for the scaffold.
  - Exits non-zero when required docs are missing.

- `check_required_top_level.py`
  - Validates required top-level repository files exist.
  - Exits non-zero when required files are missing.

## Usage

```bash
python3 tools/validate/check_file_lengths.py
python3 tools/validate/check_required_docs.py
python3 tools/validate/check_required_top_level.py
```
