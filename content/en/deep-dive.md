# Deep dive

This page is the map behind the overview: how a job moves, what isolates one repository, where the control plane ends, and which gates decide a merge. It is a guide to the code, not a second README.

## The job lifecycle

A job starts when a repository asks Fledge for one goal. Fledge queues it, dispatches it to that repository's FlyBot, and records a terminal outcome or pauses it for a decision.

| State | Meaning |
|---|---|
| `queued` | Waiting for the repository's slot. |
| `running` | A worker holds a dispatch lease and the bridge is executing. |
| `succeeded` / `failed` | Terminal. A timeout or a stall becomes `failed`. |
| `quota_exhausted` | The queued job cannot start within the remaining budget. |
| `paused` / `cancelled` | A decision or an operator stopped the run. |

The invariants are the interesting part:

- **One active job per repository.** The `jobs_one_active_per_repo` partial unique index allows at most one queued or running job. The queue can dispatch across repositories, never two jobs in one repository.
- **Terminal transitions are transactional.** Only the winner of a conditional update inside `BEGIN IMMEDIATE` records the result fingerprint and triggers side effects. A replayed callback is a no-op; a contradictory callback is a conflict.
- **Leases, not just timeouts.** Workers renew dispatch leases; the tick reaper fails a job whose lease stops renewing instead of waiting for the hard timeout.
- **Schedules nudge, they do not bypass.** Open work items shape what a scheduled run continues; the active-job guard, credential failure and duplicate issue are the blockers.

## Per-repository isolation

A hosted repository gets its own FlyBot container and team, a private data volume and network, a bridge token and a model proxy. The shared operator FlyBot is not used for user jobs.

The boundary is built centrally by `flybotContainerArgs` in `src/flybot/isolation.ts`: a read-only root filesystem, only the repository's checked data directory as a host bind, dropped capabilities, a non-root user, no Docker socket and seccomp. The control plane never clones or executes a user repository. The bridge sends a job descriptor; the agent fetches a scoped GitHub credential and a job-scoped model token, then calls back with a signature.

## Control plane map

| Area | Where | What it owns |
|---|---|---|
| HTTP and bootstrap | `src/app.ts`, `src/index.ts` | Fastify routes and the process lifecycle. |
| Configuration | `src/config.ts` | Environment loading, `BASE_URL`, docs URL, secrets, runner and gateway settings. |
| Database | `src/db.ts` | SQLite schema, transactions, jobs, repositories, users, quotas and ledgers. |
| Identity | `src/auth/`, `src/users/` | GitHub OAuth, sessions, approvals and roles. |
| GitHub | `src/repos/` | The API client, repository validation and scoped credentials. |
| Jobs | `src/jobs/` | Queue, runners, schedules, work items and the bridge. |
| Gateway and quota | `src/gateway/` | OpenAI-compatible proxy, model fallback, metering and the ledger. |
| Email | `src/email/` | Approval and quota mail from one shared shell. |
| UI | `src/views/`, `public/` | Server-rendered pages, tables, design tokens and mocks. |
| Bridge | `bridge/` | The FlyBot-side contract and the job runner. |

## Risk tiers and the review gate

Risk is computed from changed paths and diff content, not from labels. `scripts/risk-gate.mjs` and `tierForChanges` in `scripts/lib/risk.mjs` produce the tier; unknown paths default to T2.

| Tier | Scope | Gate |
|---|---|---|
| T0 | docs, README, changelog fragments | green `ci-ok` |
| T1 | tests, `public/` assets, small UI | green `ci-ok` |
| T2 | general application code | PASS at the tip + green `ci-ok` |
| T3 | auth, gateway, jobs, repos, config, DB, bridge, scripts, deploy, CI | PASS at the tip + green `ci-ok` |

A T1 change escalates to T2 if it removes test assertions, adds always-true assertions, or adds inline scripts under `public/`. `review-gate` requires a PASS at the same tip from the policy-approved reviewer, never the tip author; a new commit voids the PASS. The required checks are `ci-ok`, `review-gate` and `pr-lint` (plus `codeql-required` where it applies). Auto-merge is opt-in and still checks the PR state, checks, review conclusions and the other safeguards.

## Gateway, quota and cost

The gateway is an OpenAI-compatible proxy. It selects a model with fallback, meters the request, and writes the spend to the quota ledger per user, repository and job. The first `INITIAL_QUOTA_CNY` is platform-funded; after that the user brings a model key. A job that cannot fit the remaining budget ends as `quota_exhausted`, and the ledger is the audit trail.

## Operations

The service is one Node process behind nginx; SQLite is single-writer. Production refuses to start without the session/encryption keys, OAuth app, SMTP password and `METRICS_TOKEN`. Backups use the online SQLite backup; the restore drill verifies the newest backup. `/healthz` names the build (`version`, `commit`, `builtAt`), and `/metrics` requires `Authorization: Bearer <token>`.

## Testing

The suite is `node:test` with fakes: an in-memory SQLite store, a fake GitHub client and a fake mailer. UI tests pin the rendered HTML and layout contracts; script tests pin the workflow and changelog structure. The point is the same as the gates: the evidence should be reproducible, not a screenshot of a happy path.

## Glossary

- **Job**: one goal for one repository.
- **Runner**: the worker that holds a lease and drives the bridge.
- **Bridge**: the FlyBot-side contract that runs the agent and streams events.
- **Instance**: one repository's container, volume, network and bridge.
- **Tip**: the commit under review; a PASS is tied to it.
- **Quota ledger**: the per-user, per-repository and per-job spend record.
