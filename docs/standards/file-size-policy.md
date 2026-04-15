# File Size Policy

## Rule

- No file should exceed **500 lines**.

## Allowed exception process

If a file must exceed 500 lines:

1. Document the reason in the pull request.
2. Add or update a standards note capturing the exception scope.
3. Confirm why splitting by responsibility is not practical.

## Enforcement

- `tools/validate/check_file_lengths.py` enforces file size constraints.
- CI fails when violating files are detected.
