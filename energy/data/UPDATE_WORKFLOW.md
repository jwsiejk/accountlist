# Energy Tool dataset update workflow

This repository does **not** auto-discover new models. Use the steps below to refresh existing source links and explicitly add new models.

## Step 1: Check existing sources (local)
Run the local source checker to validate current `Source_URL` links and generate a freshness report:

```
node ui/partner-hub/scripts/check-vendor-sources.mjs
```

This writes `energy/data/vendor_update_report.json` without mutating any datasets.

## Step 2: Add new models (manual)
If vendors have released new hardware:

1. Add new rows to the appropriate CSV (`energy/data/pure_flashblade_e.csv` or `energy/data/netapp_e_series.csv`).
2. Add/verify `Source_URL` values for every new row.
3. Update `energy/data/vendor_sources.json` with any new vendor sources or model coverage notes.

## Step 3: Regenerate derived JSON (if applicable)
If you maintain compatibility or catalog JSON outputs, run the relevant generator scripts to rebuild them after the CSV changes.

## Step 4: Sync and commit
1. Run the data sync script used by the UI build:

```
node ui/partner-hub/scripts/sync-energy-data.mjs
```

2. Commit CSV changes, updated source manifests, and refreshed reports together.
