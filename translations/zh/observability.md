# 可观测性与运维

## 指标

`GET /metrics` 输出 Prometheus 文本格式。生产环境必须设置 `METRICS_TOKEN`；请求使用 `Authorization: Bearer <token>`，不接受 `?token=`（URL 会进入代理日志、浏览器历史与 `Referer`）。token 使用常量时间比较。

非生产环境且 token 为空时，`/metrics` 仅限回环访问；“回环”指经过 `TRUST_PROXY` 后看到的对端，客户端伪造 `X-Forwarded-For` 不能把公网请求伪装成本地。

核心指标：

- `fledge_http_requests_total{method,route,status}`、`fledge_http_request_seconds`
- `fledge_jobs_total{status,kind}`、`fledge_job_seconds`、`fledge_job_queue_seconds`
- `fledge_jobs_active`、`fledge_jobs_queued`、`fledge_queue_depth`
- `fledge_admission_rejected_total{reason}`、`fledge_retries_total{kind}`
- `fledge_merges_total{result}`、`fledge_path_guard_blocked_total`
- `fledge_github_requests_total{method,status}`、`fledge_bridge_requests_total{status}`

## SLO 建议

| SLO | 目标 |
| --- | --- |
| 任务成功率（7 天） | ≥ 90% |
| p95 队列等待 | < 10 分钟 |
| p95 任务时长 | < 30 分钟 |
| 绿灯后合并成功率 | ≥ 98% |
| bridge 可用性 | ≥ 95% |
| GitHub 429 速率 | ≤ 0.1 req/s |

告警规则位于 `deploy/prometheus/fledge-alerts.yml`，覆盖任务成功、队列等待、任务时长、bridge 失败、GitHub 429 与未处理运维告警。SLO 报告命令：

```sh
npm run build
PROMETHEUS_URL=http://127.0.0.1:9090 npm run slo:report
```

需要认证时设置 `PROMETHEUS_AUTH_HEADER`，不会把凭据放进 URL。

## 日志与排障

任务详情记录失败类别、错误码与下一步；控制面日志记录队列、租约、bridge 与 GitHub 请求。平台不记录 prompt/response 全文或密钥。排障时先看 `/healthz`、`/metrics`、任务时间线与 bridge 日志。
