# Metrics Reporting

Weekly adoption reports are generated into `docs/metrics/weekly/`.

## Contents

- `week-of-YYYY-MM-DD.md`: immutable weekly report snapshots.
- `latest.md`: latest generated report.
- `metrics-history.json`: machine-readable weekly history for trend analysis.

## Generation

```bash
cd scripts
npm install
npm run report:weekly-status
```

## Automation

GitHub Actions workflow: `.github/workflows/weekly-report.yml`

- Runs every Monday at `09:00 UTC`
- Commits updated files in `docs/metrics/weekly/`
- Uploads report artifacts for retention
