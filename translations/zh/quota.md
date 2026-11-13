# 配额

## 规则

每个用户初始获得 **1 元**平台模型额度（`INITIAL_QUOTA_CNY`）。额度用完后，平台停止代付，提示用户配置自己的 OpenAI 兼容模型服务；之后任务使用用户自己的 Key，不再由平台计量。

## 单位

- 账本与服务商成本：**USD**。
- 用户可见配额：**CNY**。
- `remaining_cny = quota_cny - quota_used_usd * USD_CNY_RATE`。
- `USD_CNY_RATE` 默认 `7.2`，可在 `.env` 修改。

## 成本来源

1. 响应头 `x-litellm-response-cost`（USD），存在时优先使用；它包含重试与折扣。
2. 否则使用 `usage.total_tokens`（或 prompt + completion）× `PLATFORM_LLM_PRICE_PER_TOKEN`（默认 `0.0000002` USD/token）。

流式请求会设置 `stream_options.include_usage = true`，解析 SSE 的 `usage`，在流结束后计量。已经发出的请求允许完成；下一个请求看到更新后的余额。

## 执行

- 平台代付请求前：余额 ≤ 0 时立即返回 HTTP 402，并把该用户的活动任务标记为 `quota_exhausted`（撤销任务 token），避免等待任务超时。
- 平台代付请求后：写入 `quota_ledger` 并累加 `users.quota_used_usd`；任务内请求携带 `job_id`，网关同时累加 `jobs.cost_usd`。
- 余额跨零时：创建一条站内通知，每个用户每天最多一封邮件。
- 未开始即失败的任务记为 `quota_exhausted`，不调用模型。

402 响应包含 `FLEDGE_QUOTA_EXHAUSTED`、当前配额与设置链接。

## 仓库与任务预算

维护者可为每个仓库设置可选的月度预算（CNY，滚动 30 天）与任务预算；达到上限时新任务以 `REPO_BUDGET_EXHAUSTED` 拒绝。完整字段与行为见英文 [quota](/docs/quota/)。
