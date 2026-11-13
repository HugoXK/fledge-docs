# Quota and cost

## The rule

Every user starts with **1 CNY** of platform-funded model usage (`INITIAL_QUOTA_CNY`). When it is gone, the platform stops paying and tells the user to configure their own OpenAI-compatible model service. Their jobs then run on their key, with no platform metering.

## Units

- Ledger and provider cost: **USD**.
- User-facing quota: **CNY**.
- `remaining_cny = quota_cny - quota_used_usd * USD_CNY_RATE`.
- `USD_CNY_RATE` defaults to `7.2`; change it in `.env`.

## Cost source

1. The `x-litellm-response-cost` response header (USD), when present. This is the gateway's actual charge and includes retries and discounts.
2. Otherwise `usage.total_tokens` (or prompt + completion) × `PLATFORM_LLM_PRICE_PER_TOKEN` (default `0.0000002` USD/token).

For streaming requests Fledge sets `stream_options.include_usage = true` and parses each SSE `data:` line, keeping the last `usage` object. A request already in flight is allowed to finish; the **next** request sees the updated balance.

## Enforcement

- Before a platform-funded request: if `remaining_cny <= 0`, return HTTP 402 immediately and mark that user's active jobs `quota_exhausted` (their job tokens are revoked), so the UI does not wait for the job timeout.
- After a platform-funded request: write a `quota_ledger` row and increment `users.quota_used_usd`. Inside a job the row also carries `job_id`, and the gateway adds the same cost to `jobs.cost_usd` for per-job display. On job finish the bridge drops the job token immediately.
- When the balance crosses zero: one in-app notification and at most one email per user per day.
- A job that fails before it starts because the quota is zero is recorded as `quota_exhausted` and does not call the model.

The 402 body includes `FLEDGE_QUOTA_EXHAUSTED`, the current quota and a settings link.

## Repository and per-job budgets

A maintainer can set two optional caps per repository:

- **Monthly repository budget (CNY)**: a rolling 30-day cap on the repository's attributed platform spend. A new job is refused with `REPO_BUDGET_EXHAUSTED` when the cap is reached.
- **Per-job budget (CNY)**: a cap for one job. The job stops when its attributed spend reaches the cap.

Budgets apply to platform-funded usage. A user running on their own model key is not metered by the platform.
