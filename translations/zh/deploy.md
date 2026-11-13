# 部署

## 前置条件

- Node 22.9+（使用内置 `node:sqlite`）。
- 公网 HTTPS 地址（GitHub OAuth 回调、Cookie、邮件链接）。
- 一个 GitHub OAuth App。
- 一个操作者 SMTP 账号（本地演示可用 `MAIL_TRANSPORT=console`）。
- 一个兼容 OpenAI 的模型端点与平台 Key。
- 可选：运行 FlyBot 的机器上的 FlyBot bridge。

## 环境变量

复制 `.env.example` 为 `.env`，权限设为 `600`，并生成两个密钥：

```sh
node -e "console.log('SESSION_SECRET='+require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('TOKEN_ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('base64'))"
```

关键配置：

| 变量 | 含义 |
| --- | --- |
| `BASE_URL` | 公网源，结尾不带斜杠 |
| `SESSION_SECRET` | ≥ 32 字符，签名 CSRF 与会话派生值 |
| `TOKEN_ENCRYPTION_KEY` | 32 字节 base64，加密 GitHub 与模型 Key |
| `GITHUB_CLIENT_ID` / `SECRET` | OAuth App 凭据 |
| `ADMIN_GITHUB_LOGIN` | 自动批准的引导管理员 GitHub 登录名 |
| `MAIL_TRANSPORT` | 生产用 `smtp`，本地演示用 `console` |
| `PLATFORM_LLM_BASE_URL` / `KEY` | 平台模型端点与 Key |
| `INITIAL_QUOTA_CNY` | 默认 `1` |
| `RUNNER_MODE` | `mock` 或 `flybot` |
| `FLYBOT_BRIDGE_URL` / `TOKEN` | bridge 地址与共享密钥 |
| `METRICS_TOKEN` | 生产必填；`/metrics` 与 `/healthz` 的提交信息需要 Bearer |
| `DATA_DIR` / `DB_PATH` | 默认 `./data` / `./data/fledge.db` |

生产启动会在缺少会话/加密密钥、OAuth、SMTP 密码或 `METRICS_TOKEN` 时失败关闭；`NOTIFY_WEBHOOK_URL` 必须是绝对 `https:` 地址。

## GitHub OAuth

在 GitHub 开发者设置中新建 OAuth App：

- Homepage URL：`${BASE_URL}`
- Callback URL：`${BASE_URL}/auth/github/callback`
- Scope：`read:user user:email`

用户仍需提供细粒度的仓库 token，Fledge 会校验 token 的登录名与当前用户一致。

## 启动与验证

```sh
npm ci
npm run build
npm start
```

首次登录后进入设置，配置模型、SMTP 和仓库。检查 `/healthz`、`/metrics`（需要 `METRICS_TOKEN`）与任务详情中的失败原因。生产部署前请阅读[安全](/zh/docs/security/)与[可观测性](/zh/docs/observability/)。
