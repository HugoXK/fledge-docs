# 深入实现

这一页是概览背后的地图：job 如何流转、单个仓库靠什么隔离、控制平面的边界在哪，以及合并由哪些门禁决定。它指向代码，不是第二份 README。

## Job 生命周期

仓库向 Fledge 提出一个目标时，job 开始。Fledge 把它排队、派发到该仓库自己的 FlyBot，然后记录终态，或者暂停等待决定。

| 状态 | 含义 |
|---|---|
| `queued` | 等待该仓库的槽位。 |
| `running` | worker 持有派发租约，bridge 正在执行。 |
| `succeeded` / `failed` | 终态。超时或停滞会变成 `failed`。 |
| `quota_exhausted` | 剩余预算不足以启动这个排队中的 job。 |
| `paused` / `cancelled` | 等待决定，或被操作者停止。 |

真正重要的是这些不变量：

- **一个仓库同时只有一个活动 job。** `jobs_one_active_per_repo` 这个部分唯一索引最多允许一个 queued 或 running 的 job；队列可以跨仓库派发，但不会在一个仓库里并行两个。
- **终态转换是事务性的。** 只有 `BEGIN IMMEDIATE` 中条件更新的赢家才记录结果指纹并触发副作用。重复回调是 no-op，矛盾回调是冲突。
- **靠租约，不只靠超时。** worker 续租派发租约；tick reaper 会让停止续租的 job 失败，而不是一直等到硬超时。
- **计划只是提醒，不会绕过门禁。** 未完成的工作项会影响计划运行继续做什么；活动 job 守卫、凭据失败和重复 issue 才是阻塞项。

## 单仓库隔离

每个托管仓库都有自己的 FlyBot 容器与团队、私有数据卷和网络、bridge token 和模型代理。共享的运营 FlyBot 不用于用户 job。

边界由 `src/flybot/isolation.ts` 的 `flybotContainerArgs` 统一构造：只读根文件系统、只把该仓库受检的数据目录作为宿主 bind、丢弃 capabilities、非 root 用户、不挂 Docker socket，并启用 seccomp。控制平面从不克隆或执行用户仓库。bridge 发送 job 描述；agent 获取按仓库收紧的 GitHub 凭据和按 job 发放的模型 token，然后带签名回调。

## 控制平面地图

| 区域 | 位置 | 负责什么 |
|---|---|---|
| HTTP 与启动 | `src/app.ts`、`src/index.ts` | Fastify 路由与进程生命周期。 |
| 配置 | `src/config.ts` | 环境加载、`BASE_URL`、docs URL、密钥、runner 与 gateway 设置。 |
| 数据库 | `src/db.ts` | SQLite schema、事务、job、仓库、用户、配额与账本。 |
| 身份 | `src/auth/`、`src/users/` | GitHub OAuth、session、审批与角色。 |
| GitHub | `src/repos/` | API 客户端、仓库校验与收紧凭据。 |
| Job | `src/jobs/` | 队列、runner、计划、工作项与 bridge。 |
| Gateway 与配额 | `src/gateway/` | OpenAI 兼容代理、模型回退、计量与账本。 |
| 邮件 | `src/email/` | 审批与配额邮件，共用一个 shell。 |
| 界面 | `src/views/`、`public/` | 服务端页面、表格、设计 token 与 mock。 |
| Bridge | `bridge/` | FlyBot 侧契约与 job runner。 |

## 风险等级与 review gate

风险由改动路径和 diff 内容计算，不看标签。`scripts/risk-gate.mjs` 与 `scripts/lib/risk.mjs` 的 `tierForChanges` 给出等级；未知路径默认 T2。

| 等级 | 范围 | 门禁 |
|---|---|---|
| T0 | docs、README、changelog 片段 | `ci-ok` 绿 |
| T1 | 测试、`public/` 资源、小型 UI | `ci-ok` 绿 |
| T2 | 一般应用代码 | tip 上的 PASS + `ci-ok` 绿 |
| T3 | auth、gateway、jobs、repos、config、DB、bridge、scripts、deploy、CI | tip 上的 PASS + `ci-ok` 绿 |

T1 变化在删除断言、加入恒真断言或在 `public/` 下加入内联脚本时会升级为 T2。`review-gate` 要求策略指定的 reviewer 在同一个 tip 上给出 PASS，tip 作者永远不能 PASS 自己；新提交会让 PASS 失效。必需检查是 `ci-ok`、`review-gate`、`pr-lint`（适用时还有 `codeql-required`）。Auto-merge 是显式开启的，而且仍会检查 PR 状态、检查项、审查结论和其他保护。

## Gateway、配额与成本

Gateway 是 OpenAI 兼容代理：带模型回退地选模型、计量请求，并把花费写进按用户、仓库和 job 的配额账本。前 `INITIAL_QUOTA_CNY` 由平台承担；之后用户自带模型 key。装不进剩余预算的 job 以 `quota_exhausted` 结束，账本是可审计的轨迹。

## 运维

服务是 nginx 后面的单个 Node 进程；SQLite 单写。生产环境缺少 session/加密密钥、OAuth 应用、SMTP 密码或 `METRICS_TOKEN` 时拒绝启动。备份使用在线 SQLite 备份；restore drill 验证最新备份。`/healthz` 会报告构建（`version`、`commit`、`builtAt`），`/metrics` 需要 `Authorization: Bearer <token>`。

## 测试

测试套件是 `node:test` 加 fake：内存 SQLite store、fake GitHub 客户端和 fake mailer。UI 测试钉住渲染出的 HTML 与布局契约；脚本测试钉住 workflow 和 changelog 结构。目标和门禁一样：证据应当可复现，而不是一张只走通顺路径的截图。

## 术语

- **Job**：一个仓库的一个目标。
- **Runner**：持有租约、驱动 bridge 的 worker。
- **Bridge**：FlyBot 侧运行 agent 并流出事件的契约。
- **Instance**：一个仓库的容器、卷、网络与 bridge。
- **Tip**：正在审查的提交；PASS 绑定在它上面。
- **Quota ledger**：按用户、仓库和 job 记录的花费账本。
