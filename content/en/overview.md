# Fledge

Fledge is a hosted repository iteration service. Connect a GitHub repository, describe one goal, and Fledge returns a reviewable pull request with the evidence needed to decide whether to merge it. A person always merges.

## Why Fledge

- **Per-repository isolation.** Every hosted repository runs in its own container with a private data volume, network, bridge token and model proxy.
- **Evidence, not a demo.** A job starts with a failing test, records the fix, runs the project checks and opens one focused pull request.
- **Human control.** Fledge never pushes the default branch, never merges and never bypasses review. The repository owner decides.
- **Cost you can audit.** Model spend is metered per user, repository and job; the first 1 CNY is platform-funded, then the user brings a model key.

## How it works

1. **Connect a repository.** Sign in with GitHub and submit an application. After administrator approval, connect one or more repositories.
2. **Describe one goal.** Create a job for a defect, a feature or a documentation change. The job is one work item, not an open-ended agent session.
3. **Review the plan.** Fledge plans the failing test, the smallest fix and the checks it will run. Risky actions wait for approval.
4. **Execute in isolation.** A FlyBot agent works in the repository's own container. The model proxy meters usage; GitHub credentials never enter the workspace.
5. **Review the pull request.** Fledge opens one PR with the diff, test evidence and CI status. A maintainer reviews and merges.

## What it is not

- Not a code runner: Fledge orchestrates an agent; it does not execute the user repository itself.
- Not an auto-merge bot: the pull request is the deliverable.
- Not a replacement for GitHub permissions: repository access still comes from GitHub.
- Not a public playground: the hosted service is open to applications and administrator approval.

## Next

- [Getting started](getting-started.md): deploy Fledge, connect a repository and run the first job.
- [Architecture](architecture.md): components, job lifecycle and trust boundaries.
- [Security](security.md): credentials, tokens, isolation and audit.
- [Quota](quota.md): the 1 CNY platform quota and per-repository budgets.
