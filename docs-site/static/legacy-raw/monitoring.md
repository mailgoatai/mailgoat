# Monitoring Guide

## Metrics Server

Start Prometheus endpoint and health endpoint:

```bash
mailgoat metrics serve --metrics-port 9090
```

Endpoints:

- `http://127.0.0.1:9090/metrics`
- `http://127.0.0.1:9090/health`

Run in background:

```bash
mailgoat metrics serve --metrics-port 9090 --daemon
```

## Pushgateway

Configure push gateway URL:

```bash
mailgoat config set metrics.pushgateway http://localhost:9091
mailgoat config get metrics.pushgateway
```

When configured, send operations push metrics automatically after success.

## Health Endpoint Response

`/health` returns:

```json
{
  "status": "healthy",
  "checks": {
    "config": { "ok": true, "message": "configuration valid" },
    "api": { "ok": true, "message": "postal API reachable" },
    "disk": { "ok": true, "message": "free bytes: ..." }
  }
}
```

## Prometheus Metrics

Included key metrics:

- `mailgoat_emails_sent_total{status="success|failed"}`
- `mailgoat_send_duration_seconds_bucket` (p50/p95/p99 via histogram quantiles)
- `mailgoat_retries_total`
- `mailgoat_api_errors_total{type="4xx|5xx|network|unknown"}`
- `mailgoat_batch_operations_total{status="started|completed|failed"}`
- `mailgoat_config_operations_total{operation="read|write"}`

## Grafana

- Dashboard JSON: `docs/monitoring/grafana-dashboard.json`
- Sample screenshot: `docs/monitoring/grafana-dashboard-screenshot.svg`
