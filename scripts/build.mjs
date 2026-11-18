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
  { slug: 'deepwiki', groupEn: 'Reference', groupZh: '参考' },
];
const GROUPS_EN = ['Overview', 'Interactive demo', 'Getting started', 'Concepts', 'Operations', 'Development', 'Reference'];
const GROUPS_ZH = ['概览', '交互演示', '快速开始', '概念', '运维', '开发', '参考'];

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
    enBody = enEdit + marked.parse(enIntro) + (p.slug === 'overview' ? appDemoHtml('en') + deepwikiSection('en') : '') + marked.parse(enRest);
    const zhMd = rewrite(read(zhFile(p.slug)), 'zh');
    const zhCut = p.slug === 'overview' ? zhMd.indexOf('\n## ') : -1;
    const zhIntro = zhCut === -1 ? zhMd : zhMd.slice(0, zhCut);
    const zhRest = zhCut === -1 ? '' : zhMd.slice(zhCut + 1);
    zhBody = zhEdit + marked.parse(zhIntro) + (p.slug === 'overview' ? appDemoHtml('zh') + deepwikiSection('zh') : '') + marked.parse(zhRest);
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
