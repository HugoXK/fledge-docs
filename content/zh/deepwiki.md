# 问 DeepWiki

DeepWiki 索引 [Fledge 仓库](https://github.com/HugoXK/fledge)，回答时给出回到源码的链接。它是第三方、由模型生成的索引；本页文档与仓库才是准绳。

## 两种提问方式

- **用右下角的组件。** 点击右下角的 `问 DeepWiki` 打开面板。**对话**不离开当前页面；**打开页面**跳到 DeepWiki 页面。组件直接调用 DeepWiki 的公开 MCP 端点——不需要密钥、不需要后端，问题只会从浏览器发往 DeepWiki。
- **在你的 Agent 里问。** 把同一个 MCP 服务器接到 Claude Code、Codex、OpenCode 或 DeepSeek Harness，在你的 Agent 里直接提问。

## 在 Agent 里使用（MCP）

DeepWiki 在 `https://mcp.deepwiki.com/mcp` 提供免费、免认证的 MCP 服务器（streamable HTTP）。该端点开启了 CORS，所以静态页面里的右下角组件可以直接调用。

```sh
claude mcp add -s user -t http deepwiki https://mcp.deepwiki.com/mcp
```

读取 JSON 的客户端这样写：

```json
{
  "mcpServers": {
    "deepwiki": { "url": "https://mcp.deepwiki.com/mcp" }
  }
}
```

可用工具：`ask_wiki_question`、`read_wiki_structure`、`read_wiki_contents`。

## 适合先问的问题

- 一个 job 如何从失败测试走到一个 PR？
- 一个仓库的容器隔离了什么？
- 风险等级和 review gate 是怎么决定的？
- 配额和模型花费在哪里计量？

DeepWiki 最适合回答“这段代码在哪里”和“这个机制怎么工作”。要看 job 生命周期，见[快速开始](getting-started.md)；要看隔离边界，见[架构](architecture.md)；要看门禁，见[安全](security.md)；要看成本，见[配额与成本](quota.md)。

## 它也会答错

DeepWiki 是外部服务。关键结论请对照它返回的源码链接，或以本页文档为准。如果页面缺失或过期，打开一次 [DeepWiki 页面](https://deepwiki.com/HugoXK/fledge) 刷新索引。

## 索引状态

DeepWiki 索引 `HugoXK/fledge`。右下角组件直接向这个仓库提问。
