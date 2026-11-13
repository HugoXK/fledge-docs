# Getting started

This tutorial takes Fledge from an empty checkout to a reviewed pull request. It uses a single Node service and a FlyBot bridge; the bridge is optional for a first local run with `RUNNER_MODE=mock`.

## Requirements

- Node.js 22.9 or newer (Fledge uses the built-in `node:sqlite`).
- A public HTTPS URL for GitHub OAuth, cookies and email links.
- A GitHub OAuth App.
- An SMTP account, or `MAIL_TRANSPORT=console` for a local demo.
- An OpenAI-compatible model endpoint and a platform key.
- Optional: a FlyBot bridge on a machine that runs FlyBot.

## 1. Install

```sh
git clone https://github.com/HugoXK/fledge.git
cd fledge
npm ci
npm run build
```

## 2. Configure the environment

```sh
cp .env.example .env
chmod 600 .env
```

Generate the two server secrets and put them in `.env`:

```sh
node -e "console.log('SESSION_SECRET='+require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('TOKEN_ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('base64'))"
```

At minimum set:

| Variable | Value |
| --- | --- |
| `BASE_URL` | `https://fledge.example.com` (no trailing slash) |
| `SESSION_SECRET` | the generated value |
| `TOKEN_ENCRYPTION_KEY` | the generated value |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | the OAuth App credentials |
| `ADMIN_GITHUB_LOGIN` | your GitHub login, the bootstrap administrator |
| `MAIL_TRANSPORT` | `smtp` or `console` |
| `PLATFORM_LLM_BASE_URL` / `PLATFORM_LLM_KEY` | your model endpoint and key |
| `RUNNER_MODE` | `mock` for a local demo, `flybot` for real jobs |
| `FLYBOT_BRIDGE_URL` / `FLYBOT_BRIDGE_TOKEN` | required when `RUNNER_MODE=flybot` |

`INITIAL_QUOTA_CNY` defaults to `1`. Production startup fails closed if the session key, encryption key, OAuth credentials, SMTP password or `METRICS_TOKEN` is missing.

## 3. Create the GitHub OAuth App

In GitHub → Settings → Developer settings → OAuth Apps → New OAuth App:

- Homepage URL: `${BASE_URL}`
- Authorization callback URL: `${BASE_URL}/auth/github/callback`
- Scopes: `read:user user:email`

Users still need a fine-grained repository token; Fledge checks that the token's GitHub login matches the signed-in user.

## 4. SMTP and model

For a local demo set `MAIL_TRANSPORT=console`; approval links are printed to the server log. For production set the SMTP host, port, secure flag, user and password.

Set the model endpoint to an OpenAI-compatible `/v1` base URL, its key and, optionally, the price per token. The platform pays for the first `INITIAL_QUOTA_CNY`; after that a user configures their own model.

## 5. Start Fledge

```sh
npm start
```

Open `${BASE_URL}`, sign in with GitHub, and confirm that the account named by `ADMIN_GITHUB_LOGIN` is the bootstrap administrator. Check:

```sh
curl -sS ${BASE_URL}/healthz
curl -sS -H "Authorization: Bearer $METRICS_TOKEN" ${BASE_URL}/metrics | head
```

If `/metrics` answers on a public host without a token in production, stop: the process should refuse to start without `METRICS_TOKEN`.

## 6. Connect a repository

1. Sign in and open **Repositories → Add repository**.
2. Provide the repository and the fine-grained token. Fledge verifies the token's login.
3. Wait for the isolated environment to become ready.
4. Enable the repository. A repository that has never been enabled does not run jobs.

## 7. Run the first job

1. Open the repository and create a job: a bug report with a reproduction, a feature request, or a documentation change.
2. Review the plan. It names the failing test, the smallest fix and the checks to run.
3. Approve the plan if it is correct.
4. Follow the job: reproduction, fix, checks, pull request.
5. Open the PR, review the diff and the test evidence, then merge it yourself.

## 8. Troubleshoot

| Symptom | Check |
| --- | --- |
| The login callback fails | `BASE_URL` and the OAuth callback URL must match exactly |
| Email links do not arrive | `MAIL_TRANSPORT`, SMTP credentials, and the server log |
| A job waits forever | The bridge (`RUNNER_MODE=flybot`), the environment status, and the job's failure reason |
| Model requests fail with 402 | The quota is exhausted; configure a user model |
| `/metrics` returns 401 | Send `Authorization: Bearer $METRICS_TOKEN` |

## Next

Read [Architecture](architecture.md) for the components, [Security](security.md) for the credential model, and [Quota](quota.md) for costs.
