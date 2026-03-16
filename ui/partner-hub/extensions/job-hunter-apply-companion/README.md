# Job Hunter Apply Companion extension

Shared ATS matching heuristics live in `lib/job-hunter/applyCompanion.ts`.

Build the extension runtime with:

```bash
npm run build:job-hunter-apply-companion
```

This bundles `extensions/job-hunter-apply-companion/content.ts` (which imports the shared helper) into Chrome-loadable `content.js`.

Load `extensions/job-hunter-apply-companion/` as an unpacked extension in Chrome.
