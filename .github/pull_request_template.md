## Summary

- Describe what changed.
- Describe why it changed.

## Contract & standards checklist

- [ ] I verified no modified/new file exceeds 500 lines, or I documented an approved exception.
- [ ] I updated relevant documentation for all new functionality.
- [ ] I updated `README.md` for user-facing setup changes.
- [ ] I updated the relevant phase document under `docs/phases/`.
- [ ] I avoided hidden fallbacks and documented any explicit fallback behavior.
- [ ] I kept responsibilities separated by folder.
- [ ] I documented any new or changed scripts.

## Validation

Paste command output for:

- `python3 tools/validate/check_file_lengths.py`
- `python3 tools/validate/check_required_docs.py`
- `python3 tools/validate/check_required_top_level.py`
- `make validate`
