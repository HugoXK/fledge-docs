# 维护与发布流程

本页是 Fledge 所有变更的操作契约，适用于人和自动化。目标是保持流程小而明确：一个 Node 服务、一个必需检查、一个审查门。

## 角色

| 角色 | 可以做 | 不可以做 |
| --- | --- | --- |
| Owner | 全部；部署；轮换密钥；修改策略 | — |
| Maintainer | 分诊、认领、实现、开 PR、跑门禁、在门禁内合并 | 部署、修改线上用户配额、轮换密钥 |
| Reviewer | 在 tip 阅读 diff、重跑门禁、给出 PASS/INC/REQUEST_CHANGES | 推送代码、修改实现者的 PR 正文 |
| Release manager | 汇总 fragment、升版本、打 tag、发布 | 修改产品代码 |
| Contributor | 领取 `agent-ready` issue、写测试、开一个 PR | 推送 `main`、合并自己的 PR |

作者不能 PASS 自己的 tip；PASS 不能替代绿色 CI。T2/T3 的 PASS 必须由策略允许的 reviewer 在确切 tip 发出。

## 循环

```
issue → claim → branch/worktree → red test → fix → gates → PR
      → review at the tip → risk tier → merge queue → release
```

### 1. Issue

变更从可复现缺陷或明确维护需求开始。先搜索开放与已关闭 issue，避免重复。报告包含预期行为、实际行为、最小复现、`file:line` 与环境。

### 2. 认领

跳过已有 assignee 或活跃 claim 的 issue。分配维护者账号，添加 `agent-working`，评论分支名与一行计划；长任务每 2 小时心跳。停止时释放 claim。

### 3. 分支

从最新 `main` 开分支；本地树脏时使用独立 worktree。一个 issue、一个分支、一个 PR；已有 PR 时推送到该分支，不要另开一个再关闭旧的。

### 4. 失败测试

先写最小的失败测试，在未修复的 tip 上运行并保留红色输出；修复后在新 tip 运行绿色测试，两半证据都保留。测试类，而不是一个样本。

### 5. 门禁

在将要链接的确切 tip 运行：

```sh
npm ci
npm run check
node scripts/risk-gate.mjs --base origin/main
node scripts/changelog.mjs check
```

用户可见变更需要 changelog fragment；更新的子系统文档或 `Docs-not-needed:` 同时写在 PR 正文和分支提交中。

### 6. PR 与合并

PR 说明改了什么、为什么、tip SHA、`Ran:` 与 `Not run:`。风险等级由 diff 计算；T0/T1 在绿色检查后可合并，T2/T3 需要同一 tip 的 PASS。合并使用仓库配置的方式，不绕过门禁。
