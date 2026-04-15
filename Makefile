# Foundation Makefile for registrations- local ELT lab

.PHONY: validate check-file-lengths check-required-docs check-required-top-level

# Run all phase-01 validation checks.
validate:
	python3 tools/validate/check_file_lengths.py
	python3 tools/validate/check_required_docs.py
	python3 tools/validate/check_required_top_level.py

# Enforce the 500-line file-size policy.
check-file-lengths:
	python3 tools/validate/check_file_lengths.py

# Verify required docs are present.
check-required-docs:
	python3 tools/validate/check_required_docs.py

# Verify required top-level files are present.
check-required-top-level:
	python3 tools/validate/check_required_top_level.py

# Future phase placeholder targets:
# phase-02-up:      Start Docker + PostgreSQL stack.
# phase-02-down:    Stop local runtime services.
# phase-03-seed:    Load seed datasets.
# phase-04-dbt:     Run dbt models and tests.
# phase-05-sim:     Execute simulation workflows.
# phase-06-runbook: Run operator runbook checks.
