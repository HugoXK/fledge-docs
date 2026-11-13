# 配额与成本

## 规则

每个用户初始获得 **1 元**平台模型额度（`INITIAL_QUOTA_CNY`）。额度用完后，平台停止代付，提示用户配置自己的 OpenAI 兼容模型服务；之后任务使用用户自己的 Key，不再由平台计量。

## 单位

- 账本与服务商成本：**USD**。
- 用户可见配额：**CNY**。
- `remaining_cny = quota_cny - quota_used_usd * USD_CNY_RATE`。
- `USD_CNY_RATE` 默认 `7.2`，可在 `.env` 修改。

## 成本来源

1. 响应头 `x-litellm-response-cost`（USD），存在时优先使用；它是网关的实际扣费，包含重试与折扣。
2. 否则使用 `usage.total_tokens`（或 prompt + completion）× `PLATFORM_LLM_PRICE_PER_TOKEN`（默认 `0.0000002` USD/token）。

流式请求会设置 `stream_options.include_usage = true`，解析每个 SSE `data:` 行，保留最后一个 `usage` 对象。已经发出的请求允许完成；**下一个**请求看到更新后的余额。

## 执行

- 平台代付请求前：`remaining_cny <= 0` 时立即返回 HTTP 402，并把该用户的活动任务标记为 `quota_exhausted`（撤销任务 token），避免 UI 等待任务超时。
- 平台代付请求后：写入 `quota_ledger` 并累加 `users.quota_used_usd`。任务内请求还带 `job_id`，网关同时累加 `jobs.cost_usd` 用于单任务展示。任务结束时 bridge 立即丢弃任务 token。
- 余额跨零时：一条站内通知，每个用户每天最多一封邮件。
- 配额为零导致任务未开始即失败时，记为 `quota_exhausted`，不调用模型。

402 响应包含 `FLEDGE_QUOTA_EXHAUSTED`、当前配额与设置链接。

## 仓库与单任务预算

维护者可以为每个仓库设置两个可选上限：

- **仓库月度预算（CNY）**：滚动 30 天，限制该仓库归属的平台花费。达到上限时新任务以 `REPO_BUDGET_EXHAUSTED` 拒绝。
- **单任务预算（CNY）**：限制一个任务的归属花费；达到上限时任务停止。

预算只作用于平台代付；用户使用自己的模型 Key 时不由平台计量。
