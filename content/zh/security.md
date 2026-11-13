# 安全

Fledge 围绕一条规则设计：凭据留在控制面，执行环境不持有凭据。

## 资产

- GitHub OAuth client secret 与用户 OAuth token。
- 每仓库细粒度 GitHub token。
- 用户模型 Key 与平台模型 Key。
- SMTP 凭据、会话 token 与审批 token。
- 审计记录。

## 静态加密

GitHub token 与用户模型 Key 使用 AES-256-GCM 加密，密钥来自 `TOKEN_ENCRYPTION_KEY`（32 字节 base64）。密文格式为 `v1:<iv>:<tag>:<ciphertext>`；密钥不写入数据库。密钥丢失后 token 必须重新录入，因此要与数据库分开备份。

## 仓库 token 范围

仓库 token 需要读取上游仓库、在非上游所有者时创建 fork、推送到 fork，并在上游创建 Issue 与 Pull Request。Fledge 拒绝 GitHub 登录名与当前用户不一致的 token。token 不会发送给 bridge；agent 通过任务范围的凭据 URL 获取。

## 每仓库隔离

每个托管仓库在独立容器中运行，拥有私有数据卷、网络、bridge token 与模型代理。模型代理注入用户范围的 `flg_` token，实例不能使用操作者模型 Key。共享的操作者 FlyBot 不用于用户任务。容器的 CPU、内存、PID 与文件系统挂载均受限；停止或删除一个仓库只影响该容器。

## 会话与 API token

- 会话使用 32 字节随机 id，数据库只存 SHA-256；Cookie 为 `HttpOnly`、`SameSite=Lax`，`BASE_URL` 为 HTTPS 时加 `Secure`。
- 个人 `flg_` token 有 `scope` 与 `expires_at`；默认有效期 90 天。无过期时间的 token 是操作者决定，只有管理员可以创建。
- 过期或撤销的 token 返回 `401 invalid_api_key`；scope 不符返回 `403 insufficient_scope`。拒绝不会回显密钥。
- 撤销在设置页一键完成，并写入 `token.revoked` 审计。

## SSRF 与出站

- 用户模型 URL 对公网主机必须为 `https://`；`http://` 仅限回环且 `ALLOW_PRIVATE_MODEL_URLS=true`。
- 拒绝私有、回环、链路本地地址、IP 字面量与带凭据的 URL。
- GitHub API 使用固定 `GITHUB_API_BASE`；不使用用户输入拼接主机。

## 审计

登录、审批、token、任务、合并与配额事件写入审计。审计记录不保存密钥或完整请求正文；失败按类别记录，便于事故还原。
