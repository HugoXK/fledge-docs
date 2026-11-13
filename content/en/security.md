# Security

Fledge is designed around one rule: credentials stay in the control plane; execution runs without them.

## Assets

- The GitHub OAuth client secret and user OAuth tokens.
- Per-repository fine-grained GitHub tokens.
- User model keys and the platform model key.
- SMTP credentials, session tokens and approval tokens.
- The audit trail.

## Secrets at rest

GitHub tokens and user model keys are encrypted with AES-256-GCM using `TOKEN_ENCRYPTION_KEY` (32 bytes, base64). The ciphertext format is `v1:<iv>:<tag>:<ciphertext>`; the key is never written to the database. A lost key means tokens must be re-entered, so back it up separately from the database.

## Repository token scope

A repository token must read the upstream repository, create a fork when the user is not the upstream owner, push to the fork, and create issues and pull requests on the upstream. Fledge refuses a token whose GitHub login differs from the signed-in user. The token is never sent to the bridge; the agent fetches it from the job-scoped credential URL.

## Per-repository isolation

Each hosted repository runs in its own container with a private data volume, network, bridge token and model proxy. The model proxy injects a user-scoped `flg_` token, so the instance cannot use the operator's model key. The shared operator FlyBot is not used for user jobs. Container CPU, memory, PID and filesystem mounts are limited; stopping or deleting a repository affects only that container.

## Sessions and API tokens

- A session uses a 32-byte random id; only its SHA-256 hash is stored. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` when `BASE_URL` is HTTPS.
- A personal `flg_` token has a `scope` and an `expires_at`. The default lifetime is 90 days; a token without an expiry is an operator decision and only an admin may create one.
- The gateway refuses an expired or revoked token with `401 invalid_api_key` and a wrong scope with `403 insufficient_scope`. A refusal never echoes the secret.
- Revocation is one click in Settings and writes `token.revoked` to the audit log.

## SSRF and egress

- User model URLs must be `https://` for public hosts; `http://` is allowed only for loopback with `ALLOW_PRIVATE_MODEL_URLS=true`.
- Private, loopback, link-local addresses, IP literals and URLs with credentials are rejected.
- GitHub API calls use the fixed `GITHUB_API_BASE`; a user-supplied host is never used to build the URL.

## Audit

Sign-in, approvals, tokens, jobs, merges and quota events are written to the audit trail. Audit records never store secrets or full request bodies; failures are recorded by class so an incident can be reconstructed.
