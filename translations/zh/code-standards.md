# Fledge 代码规范

面向 agent 与维护者的简短验收规则。硬性规则见仓库 `AGENTS.md`；有日期的教训先写入 `LESSONS.md`，至少三天后再提升到本页。

## 验证者诚实

报告变更状态时必须：

1. **Tip SHA**：写明确切提交（`git rev-parse HEAD`）。
2. **Ran**：列出你在该 tip 亲自运行过的每条命令与结果。
3. **Not run**：列出未运行的重要检查（Docker、真实 SMTP、真实 GitHub OAuth、真实 bridge 任务）。缺少证据是缺口，不是 PASS。
4. **不借信用**：作者的声明与其他 SHA 的 CI 不是你的结果。
5. **PASS 措辞**：只写证据支持的内容，例如“unit + lint + build 在 `abc1234` 通过；Docker 与 SMTP 未运行”。

PASS 至少包含一条真实的 `Ran:` 命令；没有命令的报告不是结论。

## 先失败再修复

- 先加回归测试，在未修复的 tip 上运行并确认失败。
- 修复后在新 tip 运行绿色；保留红色与绿色两半证据。
- 测试类，而不是一个样本；共享 helper 与同类形状都要覆盖。
- 在未修复 tip 上就通过的测试不是回归测试，应如实说明。

## 修复类，而不是样本

审查发现一条逃逸路径时，修复共享 helper 并覆盖同类路径；同类问题写入本页或 `LESSONS.md`，不要用特例掩盖。

## 静默捕获

吞掉错误的 `catch` 必须在块内注释原因，或真正处理。被丢弃结果的 fire-and-forget promise 需要 `void` 或一行原因。测试 helper 同样要诚实，只是不受生产门禁约束。

## 安全

### 密钥

- 不提交或记录 GitHub token、模型 Key、SMTP 密码、会话 Cookie、审批 token、`flg_` token 或完整 `.env`。
- GitHub token 与用户模型 Key 使用 AES-256-GCM（`TOKEN_ENCRYPTION_KEY`）加密；密钥不写入数据库。
- 开发邮件 outbox 含审批链接，权限 `0600`，不提交。

### 不可信字符串

- 所有插入 HTML 的值都转义。
- GitHub 登录名、仓库名、分支、PR URL、模型名来自外部系统：存储或渲染前校验形状并限制长度。
- 回调正文在 bearer secret 匹配且字段类型检查通过前都不可信。

### SSRF 与出站

- 用户模型 URL 对公网主机必须为 `https://`；`http://` 仅限回环且显式允许。
- 拒绝私有/回环/链路本地地址、IP 字面量与带凭据 URL。
- GitHub API 使用固定 `GITHUB_API_BASE`，不根据用户输入拼接主机。

### 认证与授权

- 会话：32 字节随机值，数据库只存 SHA-256，`HttpOnly`/`SameSite` Cookie。
- 每个表单有 CSRF token；审批链接与任务端点使用独立 bearer secret。
- 审批 token 单次使用并在 7 天后过期；状态变更需要重新校验。
