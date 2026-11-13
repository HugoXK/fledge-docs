# 运维

## 指标

`GET /metrics` 输出 Prometheus 文本格式。生产环境缺少 `METRICS_TOKEN` 时进程拒绝启动；请求使用 `Authorization: Bearer <token>`。token 只从该 header 读取，绝不从查询参数读取，因为 URL 会进入代理日志、浏览器历史与 `Referer`。比较使用常量时间。

非生产环境且 token 为空时，`/metrics` 仅限回环访问。“回环”指经过 `TRUST_PROXY` 后看到的对端，客户端伪造 `X-Forwarded-For` 不能把公网请求伪装成本地。

核心指标：

- `fledge_http_requests_total{method,route,status}`、`fledge_http_request_seconds`
- `fledge_jobs_total{status,kind}`、`fledge_job_seconds`、`fledge_job_queue_seconds`
- `fledge_jobs_active`、`fledge_jobs_queued`、`fledge_queue_depth`
- `fledge_admission_rejected_total{reason}`、`fledge_retries_total{kind}`
- `fledge_merges_total{result}`、`fledge_path_guard_blocked_total`
- `fledge_github_requests_total{method,status}`、`fledge_bridge_requests_total{status}`

## SLO

| SLO | 目标 |
| --- | --- |
| 任务成功率（7 天） | ≥ 90% |
| p95 队列等待 | < 10 分钟 |
| p95 任务时长 | < 30 分钟 |
| 绿灯后合并成功率 | ≥ 98% |
| bridge 可用性 | ≥ 95% |
| GitHub 429 速率 | ≤ 0.1 req/s |

告警规则位于 `deploy/prometheus/fledge-alerts.yml`，覆盖任务成功、队列等待、任务时长、bridge 失败、GitHub 429 与未处理运维告警。SLO 报告：

```sh
npm run build
PROMETHEUS_URL=http://127.0.0.1:9090 npm run slo:report
```

需要认证时设置 `PROMETHEUS_AUTH_HEADER`；它作为请求 header 发送，绝不进入 URL。

## 日志与失败处理

任务详情记录失败类别、错误码与下一步。控制面日志覆盖队列、租约、bridge 与 GitHub 请求。平台不保存 prompt/response 正文或密钥。失败分为外部波动、GitHub 权限或拒绝、模型、项目环境、仓库内容、条件变化、写入结果未知或 Fledge 自身，便于明确重试与交接。

## 备份

数据库与 `TOKEN_ENCRYPTION_KEY` 分开备份。没有密钥，数据库备份无法解密仓库 token 或用户模型 Key。在独立实例上演练恢复；不要把恢复指向线上数据库。部署 `.env`（或密钥管理器条目）的保留期应与密钥一致。
