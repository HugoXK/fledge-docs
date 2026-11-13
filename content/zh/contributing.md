# 参与贡献

本页是 Fledge 所有变更的操作契约，适用于人和自动化。

## 角色

| 角色 | 可以做 | 不可以做 |
| --- | --- | --- |
| Owner | 全部；部署；轮换密钥；修改策略 | — |
| Maintainer | 分诊、认领、实现、开 PR、跑门禁、在门禁内合并 | 部署、修改线上用户配额、轮换密钥 |
| Reviewer | 在 tip 阅读 diff、重跑门禁、给出 PASS / INC / REQUEST_CHANGES | 推送代码、修改实现者的 PR 正文 |
| Release manager | 汇总 fragment、升版本、打 tag、发布 | 修改产品代码 |
| Contributor | 领取 `agent-ready` issue、写测试、开一个 PR | 推送 `main`、合并自己的 PR |

tip 的作者不能 PASS 自己的变更；PASS 不能替代绿色 CI。

## 循环

```
issue → claim → branch/worktree → red test → fix → gates → PR
      → review at the tip → risk tier → merge queue → release
```

1. **Issue。** 从可复现缺陷或明确维护需求开始。先搜索开放与已关闭 issue。报告包含预期行为、实际行为、最小复现、`file:line` 与环境。
2. **认领。** 跳过已有 assignee 或活跃 claim 的 issue。分配维护者账号，添加 `agent-working`，评论分支名与一行计划。长任务每 2 小时心跳；停止时释放 claim。
3. **分支。** 从最新 `main` 开分支；本地树脏时使用独立 worktree。一个 issue、一个分支、一个 PR；已有 PR 时推送到该分支。
4. **失败测试。** 先写最小的失败测试，在未修复的 tip 上运行并保留红色输出；修复后在新 tip 运行绿色，两半证据都保留。测试类，而不是一个样本。
5. **门禁。** 在将要链接的确切 tip 运行：

```sh
npm ci
npm run check
node scripts/risk-gate.mjs --base origin/main
node scripts/changelog.mjs check
```

用户可见变更需要 changelog fragment；更新拥有的子系统文档，或把 `Docs-not-needed:` 同时写进 PR 正文和分支提交。

## Pull Request

PR 正文写明改了什么、为什么、tip SHA、`Ran:` 与 `Not run:`。PASS 至少需要一条真实的 `Ran:` 命令。风险等级由 diff 计算；T0/T1 在绿色检查后合并，T2/T3 需要同一 tip 的 PASS。新提交使 PASS 失效。

## 发布

Release manager 汇总 changelog fragment、升版本、创建 tag 并发布。tag 指向已审查的提交；发行说明列出真实提交范围内的变更。绝不移动或删除 tag。

## 安全与证据

不提交或记录 token、模型 Key、SMTP 密码、会话 Cookie、审批 token 或完整 `.env`。测试证据必须真实：声称绿色但检查失败会被反驳并阻止自动合并。报告你运行了什么、在哪个提交、以及没有运行什么。
