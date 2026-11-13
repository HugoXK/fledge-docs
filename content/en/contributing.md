# Contributing

This page is the operating contract for every change to Fledge, whether it comes from a person or an automation.

## Roles

| Role | May do | Must not do |
| --- | --- | --- |
| Owner | Everything; deploy; rotate keys; change policy | — |
| Maintainer | Triage, claim, implement, open PRs, run gates, merge within the gates | Deploy, change quotas on live users, rotate keys |
| Reviewer | Read the diff at a tip, re-run the gates, post PASS / INC / REQUEST_CHANGES | Push code, edit the implementer's PR body |
| Release manager | Assemble fragments, bump the version, tag, publish | Change product code |
| Contributor | Pick an `agent-ready` issue, write a test, open one PR | Push to `main`, merge their own PR |

The author of the tip never PASSes it. A PASS never replaces green CI.

## The loop

```
issue → claim → branch/worktree → red test → fix → gates → PR
      → review at the tip → risk tier → merge queue → release
```

1. **Issue.** Start from a reproducible defect or a concrete maintenance need. Search open and closed issues first. Include expected behaviour, actual behaviour, a minimal reproduction, `file:line` where possible, and the environment.
2. **Claim.** Skip an issue with a human assignee or a live claim. Assign the maintainer account, add `agent-working`, and comment with the branch name and a one-line plan. Heartbeat every 2 hours for long work; release the claim if you stop.
3. **Branch.** Branch from the latest `main`; use a separate worktree when the local tree is dirty. One issue, one branch, one PR. If a PR already exists, push to that branch.
4. **Red test.** Write the smallest test that fails on the unbroken tip. Keep the red output and the green output; a reviewer re-verifies both. Test the class, not one sample.
5. **Gates.** At the exact tip you will link:

```sh
npm ci
npm run check
node scripts/risk-gate.mjs --base origin/main
node scripts/changelog.mjs check
```

Add a changelog fragment for a user-visible change. Update the owned subsystem doc or add `Docs-not-needed:` to the PR body and a branch commit.

## Pull requests

The body states what changed, why, the tip SHA, `Ran:` and `Not run:`. A PASS needs at least one real `Ran:` command. The risk tier comes from the diff; T0/T1 merge on green checks, T2/T3 need a PASS at the same tip. A new commit voids the PASS.

## Release

A release manager assembles changelog fragments, bumps the version, creates the tag and publishes. The tag points at the reviewed commit; the release notes list the real changes from the commit range. Never move or delete a tag.

## Security and evidence

Never commit or log a token, model key, SMTP password, session cookie, approval token or a full `.env`. Test evidence must be real: a claimed green test with a failing check is contradicted and blocks auto-merge. Report what you ran, at which commit, and what you did not run.
