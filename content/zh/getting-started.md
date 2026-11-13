# 快速开始

本教程从空目录开始，直到一个经过审查的 Pull Request。Fledge 是一个 Node 服务，外加一个可选的 FlyBot bridge；首次本地运行可以用 `RUNNER_MODE=mock` 不需要 bridge。

## 前置条件

- Node.js 22.9 或更新版本（Fledge 使用内置 `node:sqlite`）。
- 一个公网 HTTPS 地址，用于 GitHub OAuth、Cookie 与邮件链接。
- 一个 GitHub OAuth App。
- 一个 SMTP 账号；本地演示可用 `MAIL_TRANSPORT=console`。
- 一个兼容 OpenAI 的模型端点与平台 Key。
- 可选：运行 FlyBot 的机器上的 FlyBot bridge。

## 1. 安装

```sh
git clone https://github.com/HugoXK/fledge.git
cd fledge
npm ci
npm run build
```

## 2. 配置环境

```sh
cp .env.example .env
chmod 600 .env
```

生成两个服务端密钥并写入 `.env`：

```sh
node -e "console.log('SESSION_SECRET='+require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('TOKEN_ENCRYPTION_KEY='+require('crypto').randomBytes(32).toString('base64'))"
```

至少设置：

| 变量 | 值 |
| --- | --- |
| `BASE_URL` | `https://fledge.example.com`（结尾不带斜杠） |
| `SESSION_SECRET` | 生成的值 |
| `TOKEN_ENCRYPTION_KEY` | 生成的值 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | OAuth App 凭据 |
| `ADMIN_GITHUB_LOGIN` | 你的 GitHub 登录名，引导管理员 |
| `MAIL_TRANSPORT` | `smtp` 或 `console` |
| `PLATFORM_LLM_BASE_URL` / `PLATFORM_LLM_KEY` | 模型端点与 Key |
| `RUNNER_MODE` | 本地演示用 `mock`，真实任务用 `flybot` |
| `FLYBOT_BRIDGE_URL` / `FLYBOT_BRIDGE_TOKEN` | `RUNNER_MODE=flybot` 时必填 |

`INITIAL_QUOTA_CNY` 默认 `1`。生产启动在缺少会话密钥、加密密钥、OAuth 凭据、SMTP 密码或 `METRICS_TOKEN` 时会失败关闭。

## 3. 创建 GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App：

- Homepage URL：`${BASE_URL}`
- Authorization callback URL：`${BASE_URL}/auth/github/callback`
- Scope：`read:user user:email`

用户仍需提供细粒度仓库 token；Fledge 会校验 token 的 GitHub 登录名与当前用户一致。

## 4. SMTP 与模型

本地演示设置 `MAIL_TRANSPORT=console`，审批链接会打印到服务日志。生产环境设置 SMTP 主机、端口、secure、用户名与密码。

模型端点填兼容 OpenAI 的 `/v1` 基址、Key，以及可选的每 token 价格。平台承担前 `INITIAL_QUOTA_CNY`；之后用户配置自己的模型。

## 5. 启动 Fledge

```sh
npm start
```

打开 `${BASE_URL}`，用 GitHub 登录，确认 `ADMIN_GITHUB_LOGIN` 指定的账号是引导管理员。检查：

```sh
curl -sS ${BASE_URL}/healthz
curl -sS -H "Authorization: Bearer $METRICS_TOKEN" ${BASE_URL}/metrics | head
```

生产环境公网主机上 `/metrics` 不需要 token 就能访问时，立即停止：缺少 `METRICS_TOKEN` 时进程应拒绝启动。

## 6. 连接仓库

1. 登录并打开 **Repositories → Add repository**。
2. 填入仓库与细粒度 token；Fledge 会校验 token 的登录名。
3. 等待隔离环境就绪。
4. 启用仓库。从未启用的仓库不会运行任务。

## 7. 运行第一个任务

1. 打开仓库并创建任务：带复现的缺陷、能力请求或文档变更。
2. 审查计划：失败测试、最小修复与将要运行的检查。
3. 计划正确时批准。
4. 跟踪任务：复现、修复、检查、Pull Request。
5. 打开 PR，审查 diff 与测试证据，然后由你合并。

## 8. 排障

| 现象 | 检查 |
| --- | --- |
| 登录回调失败 | `BASE_URL` 与 OAuth 回调地址必须完全一致 |
| 收不到邮件链接 | `MAIL_TRANSPORT`、SMTP 凭据与服务日志 |
| 任务一直等待 | bridge（`RUNNER_MODE=flybot`）、环境状态与任务失败原因 |
| 模型请求 402 | 配额已用完；配置用户自己的模型 |
| `/metrics` 返回 401 | 使用 `Authorization: Bearer $METRICS_TOKEN` |

## 下一步

阅读[架构](architecture.md)了解组件，[安全](security.md)了解凭据模型，[配额](quota.md)了解成本。
