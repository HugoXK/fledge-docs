# Operations

## Metrics

`GET /metrics` exposes Prometheus text format. In production the process refuses to start without `METRICS_TOKEN`; send `Authorization: Bearer <token>`. The token is read from that header only, never from a query parameter, because URLs end up in proxy logs, browser history and `Referer` headers. It is compared in constant time.

Outside production an empty `METRICS_TOKEN` leaves `/metrics` loopback-only. "Loopback" means the peer the configured `TRUST_PROXY` hop saw, so a client-supplied `X-Forwarded-For` cannot make a public request look local.

Core series:

- `fledge_http_requests_total{method,route,status}`, `fledge_http_request_seconds`
- `fledge_jobs_total{status,kind}`, `fledge_job_seconds`, `fledge_job_queue_seconds`
- `fledge_jobs_active`, `fledge_jobs_queued`, `fledge_queue_depth`
- `fledge_admission_rejected_total{reason}`, `fledge_retries_total{kind}`
- `fledge_merges_total{result}`, `fledge_path_guard_blocked_total`
- `fledge_github_requests_total{method,status}`, `fledge_bridge_requests_total{status}`

## SLOs

| SLO | Target |
| --- | --- |
| Job success rate (7 days) | ≥ 90% |
| p95 queue wait | < 10 minutes |
| p95 job duration | < 30 minutes |
| Merge success after green checks | ≥ 98% |
| Bridge availability | ≥ 95% |
| GitHub 429 rate | ≤ 0.1 req/s |

Alert rules live in `deploy/prometheus/fledge-alerts.yml` and cover job success, queue wait, job duration, bridge failures, GitHub 429s and open operational alerts. The SLO report:

```sh
npm run build
PROMETHEUS_URL=http://127.0.0.1:9090 npm run slo:report
```

Set `PROMETHEUS_AUTH_HEADER` when Prometheus needs authentication; it is sent as the request header and never in the URL.

## Logs and failure handling

A job detail records the failure class, error code and next step. Control-plane logs cover the queue, leases, the bridge and GitHub requests. The platform never stores prompt/response bodies or secrets. Failures are classified as external fluctuation, GitHub permission or rejection, model, project environment, repository content, condition change, unknown write result or Fledge itself, so retry and hand-off decisions are explicit.

## Backups

Back up the database and `TOKEN_ENCRYPTION_KEY` separately. A database backup without the key cannot decrypt repository tokens or user model keys. Test a restore on a separate instance; do not point a restore at the live database. Keep the deployment `.env` (or the secret manager entries) with the same retention as the key.
