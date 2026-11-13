# Architecture

Fledge is a single Node service that orchestrates isolated FlyBot agents. The service owns the console, the job queue, GitHub integration, the model proxy and the audit trail; it does not execute user repositories itself.

## Principles

- **Approval is scoped.** A Fledge approval grants Fledge only. The console never issues permissions or sessions for other products.
- **A human merges.** Fledge opens one focused pull request per job. It never pushes the default branch, force-pushes or merges.
- **The platform is not a code runner.** Fledge orchestrates an agent; the agent works in the repository's own container.
- **Isolation is per repository.** Container, data volume, network, bridge token and model proxy are scoped to one repository.

## Components

| Component | Responsibility |
| --- | --- |
| Web console | Users, repositories, jobs, plans, review, settings and audit |
| Job queue | Durable queue, leases, heartbeats, timeouts and recovery |
| FlyBot bridge | Hands a job to an isolated FlyBot instance and collects the result |
| Model proxy | Injects a user/job `flg_` token and meters platform quota |
| GitHub integration | OAuth, repository tokens, pull requests, checks and merge state |
| Audit and ledger | Jobs, cost, approvals, tokens and operator actions |

## Job lifecycle

```
create job → plan → human approval → isolated execution
           → failing test → fix → project checks → pull request
           → human review → merge (or close)
```

The plan is visible before execution; high-risk actions require approval. A failed job records its failure class, retry count and whether a human must act. Running jobs have a hard timeout and a no-heartbeat stall timeout.

## Isolation

Each repository gets its own container and private volume. The model proxy injects a job-scoped `flg_` token, so the instance cannot use the operator's platform key. The bridge token is scoped to the repository and is not sent to the agent. CPU, memory, PID and filesystem mounts are limited; stopping or deleting a repository affects only that container.

## Data

Core tables cover users, repositories, jobs, plans, runs, tokens, approvals, the quota ledger and audit records. SQLite uses WAL, foreign keys and transactional migrations. The control-plane database and `TOKEN_ENCRYPTION_KEY` must be backed up separately: a database without the key cannot decrypt repository tokens or user model keys.

## Trust boundaries

- GitHub tokens, user model keys, SMTP credentials and session secrets are encrypted in the control plane.
- A repository container receives no long-lived GitHub credential and no platform model key.
- User-supplied URLs, branch names, repository names and callback bodies are untrusted input and are validated before use.
- Merge authority always belongs to the repository maintainer; Fledge does not merge its own pull requests.
