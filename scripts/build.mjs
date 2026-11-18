import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.OUT_DIR || join(ROOT, 'site');
const APP = 'https://fledge.hugoxk.online';
const GH = 'https://github.com/HugoXK/fledge';
const DOCS_GH = 'https://github.com/HugoXK/fledge-docs';
const EN_DIR = join(ROOT, 'content', 'en');
const ZH_DIR = join(ROOT, 'content', 'zh');

const PAGES = [
  { slug: 'overview', groupEn: 'Overview', groupZh: '概览' },
  { slug: 'demo', groupEn: 'Interactive demo', groupZh: '交互演示' },
  { slug: 'getting-started', groupEn: 'Getting started', groupZh: '快速开始' },
  { slug: 'architecture', groupEn: 'Concepts', groupZh: '概念' },
  { slug: 'security', groupEn: 'Concepts', groupZh: '概念' },
  { slug: 'quota', groupEn: 'Operations', groupZh: '运维' },
  { slug: 'operations', groupEn: 'Operations', groupZh: '运维' },
  { slug: 'contributing', groupEn: 'Development', groupZh: '开发' },
  { slug: 'deep-dive', groupEn: 'Internals', groupZh: '内部实现' },
  { slug: 'deepwiki', groupEn: 'Reference', groupZh: '参考' },
];
const GROUPS_EN = ['Overview', 'Interactive demo', 'Getting started', 'Concepts', 'Operations', 'Development', 'Internals', 'Reference'];
const GROUPS_ZH = ['概览', '交互演示', '快速开始', '概念', '运维', '开发', '内部实现', '参考'];
const HOME_START = [
  ['getting-started', 'Connect a repository and run one job.', '连接仓库并跑一个 job。'],
  ['architecture', 'The control plane, isolation and the bridge.', '控制平面、隔离与 bridge。'],
  ['security', 'Credentials, containers and the review gate.', '凭据、容器与 review gate。'],
  ['quota', 'Metering, cost and the quota ledger.', '计量、成本与配额账本。'],
  ['operations', 'Deploy, backup and observability.', '部署、备份与可观测性。'],
  ['deep-dive', 'The DeepWiki map in one page.', '一页看懂 DeepWiki 地图。'],
  ['deepwiki', 'Ask the codebase.', '向代码库提问。'],
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (p) => readFileSync(p, 'utf8');
const titleOf = (md, fallback) => (md.match(/^#\s+(.+)$/m)?.[1] || fallback).replace(/[*_`]/g, '').trim();
const zhFile = (slug) => join(ZH_DIR, `${slug}.md`);
const enFile = (slug) => join(EN_DIR, `${slug}.md`);

function rewrite(md, lang) {
  let s = md;
  s = s.replace(/\]\((?:\.\/)?([a-z0-9-]+)\.md(#[^)]*)?\)/g, (_m, slug, hash = '') => {
    if (!PAGES.some((p) => p.slug === slug)) return _m;
    return `](${lang === 'zh' ? `/zh/docs/${slug}/` : `/docs/${slug}/`}${hash})`;
  });
  s = s.replace(/(href|src)="(?:\.\/)?([a-z0-9-]+)\.md(#[^"]*)?"/g, (_m, attr, slug, hash = '') => {
    if (!PAGES.some((p) => p.slug === slug)) return _m;
    return `${attr}="${lang === 'zh' ? `/zh/docs/${slug}/` : `/docs/${slug}/`}${hash}"`;
  });
  return s;
}

function urls(lang, slug) {
  if (lang === 'zh') return slug === 'overview' ? '/zh/' : `/zh/docs/${slug}/`;
  return slug === 'overview' ? '/' : `/docs/${slug}/`;
}

function nav(lang, current) {
  const groups = lang === 'zh' ? GROUPS_ZH : GROUPS_EN;
  return groups.map((group) => {
    const items = PAGES.filter((p) => (lang === 'zh' ? p.groupZh === group : p.groupEn === group)).map((p) => {
      const title = p.slug === 'demo' ? (lang === 'zh' ? '交互演示' : 'Interactive demo') : titleOf(lang === 'zh' ? read(zhFile(p.slug)) : read(enFile(p.slug)), p.slug);
      const href = lang === 'zh' ? (p.slug === 'overview' ? '/zh/' : `/zh/docs/${p.slug}/`) : (p.slug === 'overview' ? '/' : `/docs/${p.slug}/`);
      return `<a class="${href === current ? 'on' : ''}" href="${href}">${esc(title)}</a>`;
    }).join('');
    return `<h2>${esc(group)}</h2>${items}`;
  }).join('');
}

function appDemoHtml(lang) {
  const zh = lang === 'zh';
  const jobs = zh ? {
    app: { repo: 'acme/app', branch: 'fledge/parser-empty', kind: '缺陷修复', title: '修复 parser 空输入失败', risk: 'T1', quota: '1 元', cost: '0.08 元', plan: ['复现空输入失败', '添加回归测试', '修改 src/parser.ts', '运行 test、lint 与 build', '创建一个 Pull Request'], fail: 'FAIL  parser.test.ts > rejects empty input\n  Expected: ParseError\n  Received: undefined', pass: 'PASS  parser.test.ts > rejects empty input\n\nTests: 12 passed', checks: ['test', 'lint', 'build'], files: [{ path: 'src/parser.ts', change: '+8 −3' }, { path: 'parser.test.ts', change: '+18' }], pr: { title: 'fix(parser): reject empty input', body: 'Closes #41。添加回归测试，并在 tokenize 前拒绝空输入。', commit: 'a1b2c3d' } },
    docs: { repo: 'acme/docs', branch: 'fledge/metrics-token', kind: '文档更新', title: '补充 METRICS_TOKEN 生产要求', risk: 'T0', quota: '1 元', cost: '0.03 元', plan: ['核对 deploy.md 与配置代码', '补充生产启动条件与回滚说明', '检查链接与构建', '创建一个 Pull Request'], fail: 'FAIL  docs-check > deploy.md mentions METRICS_TOKEN', pass: 'PASS  docs-check > deploy.md mentions METRICS_TOKEN\n\nLinks: 42 checked, 0 broken', checks: ['links', 'lint', 'build'], files: [{ path: 'docs/deploy.md', change: '+18 −2' }], pr: { title: 'docs: document the METRICS_TOKEN requirement', body: 'Closes #43。说明生产启动条件，并补充密钥缺失时的回滚步骤。', commit: 'b2c3d4e' } },
    ui: { repo: 'acme/ui', branch: 'fledge/repo-list-390', kind: '界面改动', title: '仓库列表在 390px 下改为单列', risk: 'T1', quota: '1 元', cost: '0.06 元', plan: ['复现 390px 布局问题', '调整仓库列表样式', '生成 390/768/1440 截图', '运行 Playwright', '创建一个 Pull Request'], fail: 'FAIL  e2e/repo-list.spec.ts > 390px layout\n  Expected: single column\n  Received: overflow', pass: 'PASS  e2e/repo-list.spec.ts > 390px layout\n\nScreenshots: 390 / 768 / 1440', checks: ['playwright', 'lint', 'build'], files: [{ path: 'src/client/repo-list.css', change: '+12 −4' }, { path: 'docs/verification/390.png', change: 'new' }], pr: { title: 'fix(ui): stack the repository list at 390px', body: 'Closes #44。窄屏改为单列，并附 390/768/1440 截图。', commit: 'c3d4e5f' } },
  } : {
    app: { repo: 'acme/app', branch: 'fledge/parser-empty', kind: 'Bug fix', title: 'Fix parser empty input', risk: 'T1', quota: '1 CNY', cost: '0.08 CNY', plan: ['Reproduce the empty-input failure', 'Add a regression test', 'Patch src/parser.ts', 'Run test, lint and build', 'Open one pull request'], fail: 'FAIL  parser.test.ts > rejects empty input\n  Expected: ParseError\n  Received: undefined', pass: 'PASS  parser.test.ts > rejects empty input\n\nTests: 12 passed', checks: ['test', 'lint', 'build'], files: [{ path: 'src/parser.ts', change: '+8 −3' }, { path: 'parser.test.ts', change: '+18' }], pr: { title: 'fix(parser): reject empty input', body: 'Closes #41. Adds a regression test and rejects empty input before tokenizing.', commit: 'a1b2c3d' } },
    docs: { repo: 'acme/docs', branch: 'fledge/metrics-token', kind: 'Documentation', title: 'Document the METRICS_TOKEN requirement', risk: 'T0', quota: '1 CNY', cost: '0.03 CNY', plan: ['Compare deploy.md with the configuration code', 'Add the production startup condition and rollback note', 'Check links and build', 'Open one pull request'], fail: 'FAIL  docs-check > deploy.md mentions METRICS_TOKEN', pass: 'PASS  docs-check > deploy.md mentions METRICS_TOKEN\n\nLinks: 42 checked, 0 broken', checks: ['links', 'lint', 'build'], files: [{ path: 'docs/deploy.md', change: '+18 −2' }], pr: { title: 'docs: document the METRICS_TOKEN requirement', body: 'Closes #43. Explains the production startup condition and the rollback step when the secret is missing.', commit: 'b2c3d4e' } },
    ui: { repo: 'acme/ui', branch: 'fledge/repo-list-390', kind: 'UI change', title: 'Stack the repository list at 390px', risk: 'T1', quota: '1 CNY', cost: '0.06 CNY', plan: ['Reproduce the 390px layout', 'Adjust the repository list styles', 'Capture 390/768/1440 screenshots', 'Run Playwright', 'Open one pull request'], fail: 'FAIL  e2e/repo-list.spec.ts > 390px layout\n  Expected: single column\n  Received: overflow', pass: 'PASS  e2e/repo-list.spec.ts > 390px layout\n\nScreenshots: 390 / 768 / 1440', checks: ['playwright', 'lint', 'build'], files: [{ path: 'src/client/repo-list.css', change: '+12 −4' }, { path: 'docs/verification/390.png', change: 'new' }], pr: { title: 'fix(ui): stack the repository list at 390px', body: 'Closes #44. Single column on narrow screens, with 390/768/1440 screenshots.', commit: 'c3d4e5f' } },
  };
  return `<div class="fd" data-fd><aside class="fd-side"><div class="fd-brand">F <span>Fledge</span></div><div class="fd-label">${zh ? '仓库' : 'Repositories'}</div><div class="fd-repos" data-fd-repos></div><div class="fd-label">${zh ? '账本' : 'Ledger'}</div><ul class="fd-ledger" data-fd-ledger></ul></aside><main class="fd-main"><header class="fd-head"><div><span class="fd-kicker">JOB</span><h3 data-fd-title></h3><p data-fd-sub></p></div><div class="fd-head-right"><span class="fd-risk"><b data-fd-kind></b> · <b data-fd-risk></b></span><span class="fd-status" data-fd-status></span></div></header><nav class="fd-tabs" data-fd-tabs></nav><section class="fd-panel" data-fd-panel></section><footer class="fd-actions" data-fd-actions></footer></main></div><script>window.FLEDGE_APP=${JSON.stringify({ lang: zh ? 'zh' : 'en', jobs })};</script>`;
}

function deepwikiSection(lang) {
  const zh = lang === 'zh';
  const guide = zh ? '/zh/docs/deepwiki/' : '/docs/deepwiki/';
  return `<section class="ask-dw" id="ask">
<span class="ask-dw-label">${zh ? '向代码库提问' : 'ASK THE CODEBASE'} <span>· DEEPWIKI</span></span>
<h2>${zh ? '有问题？<em>问 DeepWiki。</em>' : 'Questions?<br><em>Ask DeepWiki.</em>'}</h2>
<p>${zh ? 'DeepWiki 索引 Fledge 仓库，回答时给出源码链接。用右下角的 <strong>问 DeepWiki</strong> 按钮在这里对话，或打开页面浏览。同一个 MCP 服务器也能接进 Claude Code、Codex、OpenCode 或 DeepSeek Harness。' : 'DeepWiki indexes the Fledge repository and answers with links to the source. Use the <strong>Ask DeepWiki</strong> button in the bottom-right corner to chat here, or open the page to browse. The same MCP server works inside Claude Code, Codex, OpenCode or DeepSeek Harness.'}</p>
<div class="ask-dw-actions">
<a class="btn primary" href="https://deepwiki.com/HugoXK/fledge" target="_blank" rel="noopener" data-deepwiki-open>${zh ? '问 DeepWiki' : 'Ask DeepWiki'} <span>↗</span></a>
<code>claude mcp add -s user -t http deepwiki https://mcp.deepwiki.com/mcp</code>
<small>${zh ? '接入说明' : 'Setup guide'}: <a href="${guide}">${zh ? 'DeepWiki 指南' : 'the DeepWiki guide'} ↗</a></small>
</div>
</section>`;
}

function homeHero(lang, lead) {
  const zh = lang === 'zh';
  return `<section class="home-hero">
  <div class="home-hero-copy">
    <div class="home-eyebrow"><span class="home-dot"></span>${zh ? '托管仓库自迭代' : 'HOSTED REPOSITORY ITERATION'}</div>
    <h1>${zh ? '一个目标。<br><em>一个可审查的 PR。</em>' : 'One goal.<br><em>One reviewable PR.</em>'}</h1>
    <p>${marked.parseInline(lead)}</p>
    <div class="home-ctas"><a class="btn primary" href="${urls(lang, 'getting-started')}">${zh ? '从一个仓库开始' : 'Start with a repository'} <span>↗</span></a><a class="btn ghost" href="${urls(lang, 'architecture')}">${zh ? '看架构' : 'Explore the architecture'} <span>↓</span></a></div>
    <div class="home-command"><span>→</span><code>https://fledge.hugoxk.online/</code><a href="${APP}" target="_blank" rel="noopener">${zh ? '打开' : 'Open'} ↗</a></div>
  </div>
  <div class="home-orbit" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="orbit-center">F</div><div class="orbit-note note-one">${zh ? '连接' : 'connect'} <b>01</b></div><div class="orbit-note note-two">${zh ? '一个目标' : 'one goal'} <b>02</b></div><div class="orbit-note note-three">${zh ? '审查 PR' : 'review the PR'} <b>03</b></div></div>
</section>`;
}

function homeProof(lang) {
  const zh = lang === 'zh';
  const items = zh
    ? [['01', '每个仓库同时一个活动 job'], ['02', '每个 job 一个 PR'], ['03', 'T0–T3 门禁，人来合并']]
    : [['01', 'One active job per repository'], ['02', 'One PR per job'], ['03', 'T0–T3 gates, a person merges']];
  return `<section class="home-proof"><span>${zh ? 'FLEDGE 一览' : 'FLEDGE AT A GLANCE'}</span>${items.map(([n, text]) => `<div><b>${n}</b>${esc(text)}</div>`).join('')}</section>`;
}

function homeHow(lang) {
  const zh = lang === 'zh';
  const steps = zh
    ? [['01', '连接', '登录并连接一个仓库。'], ['02', '描述', '一个目标：缺陷、功能或文档改动。'], ['03', '计划', '失败测试、最小修复和要跑的检查。'], ['04', '隔离', '每仓库的容器、卷和 bridge token。'], ['05', '证据', '测试结果、diff 和 tip 上的 CI。'], ['06', '审查', '人来审查并合并 PR。']]
    : [['01', 'Connect', 'Sign in and connect one repository.'], ['02', 'Describe', 'One goal: a defect, a feature or a doc change.'], ['03', 'Plan', 'The failing test, the smallest fix and the checks.'], ['04', 'Isolate', 'A per-repository container, volume and bridge token.'], ['05', 'Evidence', 'Test results, the diff and CI at the tip.'], ['06', 'Review', 'A person reviews and merges the PR.']];
  return `<section class="home-section"><div class="section-label">${zh ? '它怎么工作' : 'HOW IT WORKS'} <span>01 / 03</span></div><h2>${zh ? '从连接仓库<br><em>到一个 PR。</em>' : 'From a repository<br><em>to one pull request.</em>'}</h2><p>${zh ? 'Fledge 把一个目标排队，在该仓库自己的容器里运行，并带着证据返回一个聚焦的 Pull Request。' : 'Fledge queues one goal, runs it in the repository\'s own container, and returns the evidence with one focused pull request.'}</p><div class="home-process">${steps.map(([n, title, text]) => `<div><span>${n}</span><strong>${esc(title)}</strong><small>${esc(text)}</small></div>`).join('')}</div></section>`;
}

function homeStart(lang) {
  const zh = lang === 'zh';
  const cards = HOME_START.map(([slug, en, zhText]) => {
    const title = titleOf(read(lang === 'zh' ? zhFile(slug) : enFile(slug)), slug);
    return `<a class="home-card" href="${urls(lang, slug)}"><b>${esc(title)}</b><span>${esc(zh ? zhText : en)}</span><em>${zh ? '阅读' : 'Read'} ↗</em></a>`;
  }).join('');
  return `<section class="home-section"><div class="section-label">${zh ? '从这里开始' : 'START HERE'} <span>02 / 03</span></div><h2>${zh ? '选一条<br><em>进入系统的路径。</em>' : 'Pick a path<br><em>into the system.</em>'}</h2><div class="home-cards">${cards}</div></section>`;
}

function homeCta(lang) {
  const zh = lang === 'zh';
  return `<section class="home-cta"><div><span class="section-label">${zh ? '准备好了就开始' : 'READY WHEN YOU ARE'}</span><h2>${zh ? '从一个仓库开始。' : 'Start with a repository.'}</h2><p>${zh ? '登录、申请、连接一个仓库，然后描述一个目标。' : 'Sign in, apply, connect one repository, then describe one goal.'}</p></div><a class="btn primary" href="${urls(lang, 'getting-started')}">${zh ? '打开快速开始' : 'Open the quickstart'} <span>↗</span></a></section>`;
}

function page({ lang, slug, title, body, home = false }) {
  const isZh = lang === 'zh';
  const current = home ? (isZh ? '/zh/' : '/') : (isZh ? `/zh/docs/${slug}/` : `/docs/${slug}/`);
  const other = home ? (isZh ? '/' : '/zh/') : (isZh ? `/docs/${slug}/` : `/zh/docs/${slug}/`);
  const brand = isZh ? '/zh/' : '/';
  const guide = isZh ? '/zh/docs/deepwiki/' : '/docs/deepwiki/';
  return `<!doctype html>
<html lang="${isZh ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Fledge Docs</title>
<meta name="description" content="${esc(title)} — Fledge documentation">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0d0c0b" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f6f1e7" media="(prefers-color-scheme: light)">
<link rel="icon" href="/assets/images/logo.svg">
<script>try{var t=localStorage.getItem('fledge-docs-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
<script>window.FLEDGE_DOCS={lang:"${isZh ? 'zh' : 'en'}",guide:"${guide}"};</script>
<link rel="stylesheet" href="/assets/docs.css">
<link rel="stylesheet" href="/assets/demo.css?v=3">
<link rel="stylesheet" href="/assets/app.css">
<link rel="stylesheet" href="/assets/deepwiki.css">
<script defer src="/assets/demo.js?v=3"></script>
<script defer src="/assets/app.js"></script>
<script defer src="/assets/docs.js"></script>
<script defer src="/assets/deepwiki.js"></script>
</head>
<body class="${home ? 'docs-home' : ''}">
<a class="skip-link" href="#main">${isZh ? '跳到主要内容' : 'Skip to main content'}</a>
<header class="site-header">
  <a class="brand" href="${brand}"><span class="brand-mark">F</span><span>Fledge <small>Docs</small></span></a>
  <div class="header-actions">
    <nav class="nav" aria-label="${isZh ? '文档导航' : 'Docs navigation'}">
      <a href="${brand}">${isZh ? '文档首页' : 'Docs home'}</a>
      <a href="${other}">${isZh ? 'English' : '中文'}</a>
      <a href="${APP}">${isZh ? '打开 Fledge' : 'Open Fledge'} ↗</a>
      <a class="nav-ask" href="https://deepwiki.com/HugoXK/fledge" target="_blank" rel="noopener">DeepWiki ↗</a>
      <a href="${GH}">GitHub ↗</a>
    </nav>
    <button class="theme-toggle" type="button" data-docs-theme aria-label="${isZh ? '切换主题' : 'Switch theme'}" title="${isZh ? '切换主题' : 'Switch theme'}">
      <svg class="icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 15.2A8.4 8.4 0 0 1 8.8 4a8.4 8.4 0 1 0 11.2 11.2Z"/></svg>
      <svg class="icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
  </div>
</header>
<div class="docs-shell">
  <aside class="docs-nav" aria-label="Fledge documentation"><h2>Fledge</h2>${nav(lang, current)}<div class="app"><a href="${APP}">${isZh ? '打开 Fledge' : 'Open Fledge'} ↗</a><a href="${GH}">${isZh ? '源仓库' : 'Source'} ↗</a><a href="https://deepwiki.com/HugoXK/fledge" target="_blank" rel="noopener">DeepWiki ↗</a></div></aside>
  <main class="docs-main" id="main">${body}</main>
</div>
<footer class="docs-footer"><span>© 2026 Fledge · docs</span><div><a href="${brand}">${isZh ? '首页' : 'Home'}</a><a href="${APP}">${isZh ? '应用' : 'App'}</a><a href="${GH}">GitHub</a><a href="https://deepwiki.com/HugoXK/fledge" target="_blank" rel="noopener">DeepWiki</a></div></footer>
</body>
</html>`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets', 'images'), { recursive: true });
mkdirSync(join(OUT, 'docs'), { recursive: true });
mkdirSync(join(OUT, 'zh', 'docs'), { recursive: true });

for (const p of PAGES) {
  const isDemo = p.slug === 'demo';
  const enTitle = isDemo ? 'Interactive demo' : titleOf(read(enFile(p.slug)), p.slug);
  const zhTitle = isDemo ? '交互演示' : titleOf(read(zhFile(p.slug)), enTitle);
  const enEdit = isDemo ? '' : `<p class="mut" style="margin-bottom:18px"><a href="${DOCS_GH}/blob/main/content/en/${p.slug}.md">Edit content/en/${p.slug}.md on GitHub ↗</a></p>`;
  const zhEdit = isDemo ? '' : `<p class="mut" style="margin-bottom:18px"><a href="${DOCS_GH}/blob/main/content/zh/${p.slug}.md">在 GitHub 上编辑 content/zh/${p.slug}.md ↗</a></p>`;
  let enBody, zhBody;
  if (isDemo) {
    enBody = appDemoHtml('en');
    zhBody = appDemoHtml('zh');
  } else {
    const enMd = rewrite(read(enFile(p.slug)), 'en');
    const enCut = p.slug === 'overview' ? enMd.indexOf('\n## ') : -1;
    const enIntro = enCut === -1 ? enMd : enMd.slice(0, enCut);
    const enRest = enCut === -1 ? '' : enMd.slice(enCut + 1);
    const zhMd = rewrite(read(zhFile(p.slug)), 'zh');
    const zhCut = p.slug === 'overview' ? zhMd.indexOf('\n## ') : -1;
    const zhIntro = zhCut === -1 ? zhMd : zhMd.slice(0, zhCut);
    const zhRest = zhCut === -1 ? '' : zhMd.slice(zhCut + 1);
    if (p.slug === 'overview') {
      const enLead = enIntro.replace(/^#\s+[^\n]*\n+/, '').trim();
      const zhLead = zhIntro.replace(/^#\s+[^\n]*\n+/, '').trim();
      enBody = `<div class="home">${homeHero('en', enLead)}${homeProof('en')}${homeHow('en')}<section class="home-demo">${appDemoHtml('en')}</section>${homeStart('en')}<section class="home-markdown">${enEdit}${marked.parse(enRest)}</section>${deepwikiSection('en')}${homeCta('en')}</div>`;
      zhBody = `<div class="home">${homeHero('zh', zhLead)}${homeProof('zh')}${homeHow('zh')}<section class="home-demo">${appDemoHtml('zh')}</section>${homeStart('zh')}<section class="home-markdown">${zhEdit}${marked.parse(zhRest)}</section>${deepwikiSection('zh')}${homeCta('zh')}</div>`;
    } else {
      enBody = enEdit + marked.parse(enIntro);
      zhBody = zhEdit + marked.parse(zhIntro);
    }
  }
  const enDir = p.slug === 'overview' ? OUT : join(OUT, 'docs', p.slug);
  const zhDir = p.slug === 'overview' ? join(OUT, 'zh') : join(OUT, 'zh', 'docs', p.slug);
  mkdirSync(enDir, { recursive: true }); mkdirSync(zhDir, { recursive: true });
  writeFileSync(join(enDir, 'index.html'), page({ lang: 'en', slug: p.slug, title: enTitle, body: enBody, home: p.slug === 'overview' }));
  writeFileSync(join(zhDir, 'index.html'), page({ lang: 'zh', slug: p.slug, title: zhTitle, body: zhBody, home: p.slug === 'overview' }));
}

function redirect(path, to) {
  const file = join(OUT, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"><title>Redirect</title></head><body><a href="${to}">Continue</a></body></html>`);
}
for (const [from, to] of [
  ['docs', '/'],
  ['zh/docs', '/zh/'],
  ['docs/readme.zh', '/zh/'],
  ['docs/deploy', '/docs/getting-started/'],
  ['docs/observability', '/docs/operations/'],
  ['docs/roadmap', '/docs/overview/'],
  ['docs/autonomous-dev', '/docs/contributing/'],
  ['docs/code-standards', '/docs/contributing/'],
  ['docs/secrets', '/docs/security/'],
  ['docs/handoff', '/docs/overview/'],
  ['docs/api', '/docs/overview/'],
  ['docs/ui', '/docs/overview/'],
  ['zh/docs/deploy', '/zh/docs/getting-started/'],
  ['zh/docs/observability', '/zh/docs/operations/'],
  ['zh/docs/roadmap', '/zh/docs/overview/'],
  ['zh/docs/autonomous-dev', '/zh/docs/contributing/'],
  ['zh/docs/code-standards', '/zh/docs/contributing/'],
]) redirect(from, to);

cpSync(join(ROOT, 'docs', 'assets', 'docs.css'), join(OUT, 'assets', 'docs.css'));
cpSync(join(ROOT, 'docs', 'assets', 'docs.js'), join(OUT, 'assets', 'docs.js'));
cpSync(join(ROOT, 'docs', 'assets', 'deepwiki.css'), join(OUT, 'assets', 'deepwiki.css'));
cpSync(join(ROOT, 'docs', 'assets', 'deepwiki.js'), join(OUT, 'assets', 'deepwiki.js'));
cpSync(join(ROOT, 'docs', 'assets', 'demo.css'), join(OUT, 'assets', 'demo.css'));
cpSync(join(ROOT, 'docs', 'assets', 'demo.js'), join(OUT, 'assets', 'demo.js'));
cpSync(join(ROOT, 'docs', 'assets', 'app.css'), join(OUT, 'assets', 'app.css'));
cpSync(join(ROOT, 'docs', 'assets', 'app.js'), join(OUT, 'assets', 'app.js'));
if (existsSync(join(ROOT, 'docs', 'assets', 'images'))) cpSync(join(ROOT, 'docs', 'assets', 'images'), join(OUT, 'assets', 'images'), { recursive: true });
console.log(`built ${PAGES.length * 2} pages into ${OUT}`);
