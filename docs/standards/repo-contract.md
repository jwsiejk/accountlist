# Repository Contract

This contract is mandatory for all contributors and all phases.

## Non-negotiable rules

1. **File length cap**
   - Source and documentation files must remain at or below **500 lines**.
   - Exceptions must be explicitly documented in the pull request and in a standards doc update.

2. **Documentation parity**
   - Any new functionality must include documentation updates in the relevant docs folder.
   - If setup steps or user-facing behavior changes, update both `README.md` and the relevant phase doc.

3. **Phase accountability**
   - Every phase must update its own phase tracker under `docs/phases/`.
   - Phase docs must list what was added, what remains, and what validation was run.

4. **No hidden fallbacks**
   - Do not add silent fallback paths, magic defaults, or undocumented bypass behavior.
   - Any fallback behavior must be explicit, documented, and test-covered.

5. **Separation of responsibilities**
   - `docs/` for documentation.
   - `tools/` for automation and validation scripts.
   - `.github/` for CI and contribution workflows.
   - Keep folder purpose clear; avoid mixing concerns.

6. **Script documentation is required**
   - Every script must have clear purpose, input/output expectations, and run instructions documented.

7. **Explicit, readable naming**
   - File, folder, script, and variable names must be descriptive.
   - Avoid ambiguous abbreviations unless industry-standard and documented.

## Enforcement

- Local checks in `tools/validate/` enforce baseline compliance.
- CI workflow `.github/workflows/validate-foundation.yml` runs these checks on pull requests.
- PR template requires explicit confirmation of contract adherence.
