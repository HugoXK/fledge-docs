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
  { slug: 'getting-started', groupEn: 'Getting started', groupZh: '快速开始' },
  { slug: 'architecture', groupEn: 'Concepts', groupZh: '概念' },
  { slug: 'security', groupEn: 'Concepts', groupZh: '概念' },
  { slug: 'quota', groupEn: 'Operations', groupZh: '运维' },
  { slug: 'operations', groupEn: 'Operations', groupZh: '运维' },
  { slug: 'contributing', groupEn: 'Development', groupZh: '开发' },
];
const GROUPS_EN = ['Overview', 'Getting started', 'Concepts', 'Operations', 'Development'];
const GROUPS_ZH = ['概览', '快速开始', '概念', '运维', '开发'];

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
      const md = lang === 'zh' ? read(zhFile(p.slug)) : read(enFile(p.slug));
      const title = titleOf(md, p.slug);
      const href = lang === 'zh' ? (p.slug === 'overview' ? '/zh/' : `/zh/docs/${p.slug}/`) : (p.slug === 'overview' ? '/' : `/docs/${p.slug}/`);
      return `<a class="${href === current ? 'on' : ''}" href="${href}">${esc(title)}</a>`;
    }).join('');
    return `<h2>${esc(group)}</h2>${items}`;
  }).join('');
}

function demoHtml(lang) {
  const zh = lang === 'zh';
  return `<section class="demo demo-job" data-demo data-lang="${zh ? 'zh' : 'en'}">
  <div class="demo-head"><div><span class="kicker">${zh ? '仓库任务模拟' : 'REPOSITORY JOB SIMULATION'}</span><h2>${zh ? '看一次 Fledge 任务如何完成' : 'See one Fledge job end to end'}</h2><p>${zh ? '选择一个场景，观察计划、失败测试、修复、检查、Pull Request 与人工审查。不会调用模型，也不会改动任何仓库。' : 'Pick a scenario and follow the plan, the failing test, the fix, the checks, the pull request and human review. No model calls or repositories are touched.'}</p></div><span class="demo-badge">${zh ? '仓库任务' : 'REPOSITORY JOB'}</span></div>
  <div class="demo-controls"><div class="demo-tabs" role="tablist"><button type="button" class="on" data-scenario="bug">${zh ? '修复缺陷' : 'Bug fix'}</button><button type="button" data-scenario="docs">${zh ? '更新文档' : 'Documentation'}</button><button type="button" data-scenario="ui">${zh ? '界面改动' : 'UI change'}</button></div><div class="demo-actions"><button type="button" class="btn primary" data-demo-start>${zh ? '开始任务' : 'Start job'}</button><button type="button" class="btn" data-demo-reset>${zh ? '重置' : 'Reset'}</button></div></div>
  <div class="job"><aside class="job-side"><div class="job-kicker">${zh ? '任务' : 'JOB'}</div><div class="job-meta"><span>${zh ? '仓库' : 'Repository'}</span><b data-demo-repo>—</b></div><div class="job-meta"><span>${zh ? '分支' : 'Branch'}</span><b data-demo-branch>—</b></div><div class="job-meta"><span>${zh ? '环境' : 'Environment'}</span><b>${zh ? '隔离容器' : 'Isolated container'}</b></div><div class="job-meta"><span>${zh ? '交付物' : 'Deliverable'}</span><b>${zh ? '1 个 Pull Request' : '1 pull request'}</b></div><div class="job-ledger"><div data-step="plan"><i></i>${zh ? '计划' : 'Plan'}</div><div data-step="test"><i></i>${zh ? '失败测试' : 'Failing test'}</div><div data-step="patch"><i></i>${zh ? '修复' : 'Patch'}</div><div data-step="checks"><i></i>${zh ? '检查' : 'Checks'}</div><div data-step="pr"><i></i>${zh ? 'Pull Request' : 'Pull request'}</div><div data-step="review"><i></i>${zh ? '人工审查' : 'Human review'}</div></div></aside><div class="job-main"><div class="job-log" data-demo-chat aria-live="polite"><div class="demo-empty">${zh ? '选择场景后开始。' : 'Choose a scenario, then start.'}</div></div><div class="job-actions" data-demo-actions></div></div></div>
  <div class="demo-foot"><span>${zh ? '浏览器内模拟 · 不接触模型或仓库' : 'Runs in your browser · no model or repository access'}</span><a href="${zh ? '/zh/docs/getting-started/' : '/docs/getting-started/'}">${zh ? '真实部署' : 'Deploy for real'} ↗</a></div>
</section>
<script>window.FLEDGE_DEMO=${JSON.stringify(zh ? {
  bug: { repo: 'github.com/acme/app', branch: 'fledge/parser-empty', plan: '复现空输入失败，补充回归测试，修改 src/parser.ts，运行 test、lint 与 build，然后创建一个 Pull Request。', test: 'FAIL  parser.test.ts > rejects empty input', patch: 'src/parser.ts  +8 −3', checks: 'test ✓  lint ✓  build ✓', pr: '#42  fix(parser): reject empty input  · 1 commit  · checks green', review: '证据已附在 PR 上，等待维护者审查。', merged: '维护者已合并。' },
  docs: { repo: 'github.com/acme/app', branch: 'fledge/metrics-token-docs', plan: '补充生产 METRICS_TOKEN 要求与回滚说明，检查链接与构建，然后创建一个 Pull Request。', test: 'FAIL  docs-check > deploy.md mentions METRICS_TOKEN', patch: 'docs/deploy.md  +18 −2', checks: 'links ✓  lint ✓  build ✓', pr: '#43  docs: document the METRICS_TOKEN requirement  · 1 commit', review: '文档证据已附在 PR 上，等待维护者审查。', merged: '维护者已合并。' },
  ui: { repo: 'github.com/acme/app', branch: 'fledge/repo-list-390', plan: '复现 390px 布局问题，调整仓库列表，生成 390/768/1440 截图，运行 Playwright，然后创建一个 Pull Request。', test: 'FAIL  e2e/repo-list.spec.ts > 390px layout', patch: 'src/client/repo-list.css  +12 −4  · screenshots attached', checks: 'playwright ✓  lint ✓  build ✓', pr: '#44  fix(ui): stack the repository list at 390px  · 1 commit', review: '截图与测试证据已附在 PR 上，等待维护者审查。', merged: '维护者已合并。' },
} : {
  bug: { repo: 'github.com/acme/app', branch: 'fledge/parser-empty', plan: 'Reproduce the empty-input failure, add a regression test, patch src/parser.ts, run test, lint and build, then open one pull request.', test: 'FAIL  parser.test.ts > rejects empty input', patch: 'src/parser.ts  +8 −3', checks: 'test ✓  lint ✓  build ✓', pr: '#42  fix(parser): reject empty input  · 1 commit  · checks green', review: 'Evidence attached. Waiting for the maintainer.', merged: 'Merged by the maintainer.' },
  docs: { repo: 'github.com/acme/app', branch: 'fledge/metrics-token-docs', plan: 'Document the production METRICS_TOKEN requirement and rollback note, check links and build, then open one pull request.', test: 'FAIL  docs-check > deploy.md mentions METRICS_TOKEN', patch: 'docs/deploy.md  +18 −2', checks: 'links ✓  lint ✓  build ✓', pr: '#43  docs: document the METRICS_TOKEN requirement  · 1 commit', review: 'Documentation evidence attached. Waiting for the maintainer.', merged: 'Merged by the maintainer.' },
  ui: { repo: 'github.com/acme/app', branch: 'fledge/repo-list-390', plan: 'Reproduce the 390px layout, adjust the repository list, capture 390/768/1440 screenshots, run Playwright, then open one pull request.', test: 'FAIL  e2e/repo-list.spec.ts > 390px layout', patch: 'src/client/repo-list.css  +12 −4  · screenshots attached', checks: 'playwright ✓  lint ✓  build ✓', pr: '#44  fix(ui): stack the repository list at 390px  · 1 commit', review: 'Screenshots and test evidence attached. Waiting for the maintainer.', merged: 'Merged by the maintainer.' },
})};</script>`;
}

function page({ lang, slug, title, body, home = false }) {
  const isZh = lang === 'zh';
  const current = home ? (isZh ? '/zh/' : '/') : (isZh ? `/zh/docs/${slug}/` : `/docs/${slug}/`);
  const other = home ? (isZh ? '/' : '/zh/') : (isZh ? `/docs/${slug}/` : `/zh/docs/${slug}/`);
  const brand = isZh ? '/zh/' : '/';
  return `<!doctype html><html lang="${isZh ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Fledge Docs</title><meta name="description" content="${esc(title)} — Fledge documentation"><meta name="theme-color" content="#080a0f">
<link rel="icon" href="/assets/images/logo.svg"><link rel="stylesheet" href="/assets/docs.css"><link rel="stylesheet" href="/assets/demo.css?v=3">
<script defer src="/assets/demo.js?v=3"></script></head><body>
<header class="site-header"><a class="brand" href="${brand}"><span class="brand-mark">F</span> HUGOXK <small>LAB / FLEDGE DOCS</small></a>
<nav class="nav"><a href="${brand}">${isZh ? '文档首页' : 'Docs home'}</a><a href="${other}">${isZh ? 'English' : '中文'}</a><a href="${APP}">${isZh ? '打开 Fledge' : 'Open Fledge'} ↗</a><a href="${GH}">GitHub ↗</a></nav></header>
<div class="docs-shell"><aside class="docs-nav"><h2>Fledge</h2>${nav(lang, current)}<div class="app"><a href="${APP}">${isZh ? '打开 Fledge' : 'Open Fledge'} ↗</a><a href="${GH}">${isZh ? '源仓库' : 'Source'} ↗</a></div></aside><main class="docs-main">${body}</main></div>
<footer class="docs-footer"><span>© 2026 HUGOXK // LAB · FLEDGE</span><div><a href="${brand}">${isZh ? '首页' : 'Home'}</a><a href="${APP}">${isZh ? '应用' : 'App'}</a><a href="${GH}">GitHub</a></div></footer></body></html>`;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets', 'images'), { recursive: true });
mkdirSync(join(OUT, 'docs'), { recursive: true });
mkdirSync(join(OUT, 'zh', 'docs'), { recursive: true });

for (const p of PAGES) {
  const enMd = rewrite(read(enFile(p.slug)), 'en');
  const enCut = p.slug === 'overview' ? enMd.indexOf('\n## ') : -1;
  const enIntro = enCut === -1 ? enMd : enMd.slice(0, enCut);
  const enRest = enCut === -1 ? '' : enMd.slice(enCut + 1);
  const enBody = `<p class="mut" style="margin-bottom:18px"><a href="${DOCS_GH}/blob/main/content/en/${p.slug}.md">Edit content/en/${p.slug}.md on GitHub ↗</a></p>` + marked.parse(enIntro) + (p.slug === 'overview' ? demoHtml('en') : '') + marked.parse(enRest);
  const zhMd = rewrite(read(zhFile(p.slug)), 'zh');
  const zhCut = p.slug === 'overview' ? zhMd.indexOf('\n## ') : -1;
  const zhIntro = zhCut === -1 ? zhMd : zhMd.slice(0, zhCut);
  const zhRest = zhCut === -1 ? '' : zhMd.slice(zhCut + 1);
  const zhBody = `<p class="mut" style="margin-bottom:18px"><a href="${DOCS_GH}/blob/main/content/zh/${p.slug}.md">在 GitHub 上编辑 content/zh/${p.slug}.md ↗</a></p>` + marked.parse(zhIntro) + (p.slug === 'overview' ? demoHtml('zh') : '') + marked.parse(zhRest);
  const enTitle = titleOf(read(enFile(p.slug)), p.slug);
  const zhTitle = titleOf(read(zhFile(p.slug)), enTitle);
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
cpSync(join(ROOT, 'docs', 'assets', 'demo.css'), join(OUT, 'assets', 'demo.css'));
cpSync(join(ROOT, 'docs', 'assets', 'demo.js'), join(OUT, 'assets', 'demo.js'));
if (existsSync(join(ROOT, 'docs', 'assets', 'images'))) cpSync(join(ROOT, 'docs', 'assets', 'images'), join(OUT, 'assets', 'images'), { recursive: true });
console.log(`built ${PAGES.length * 2} pages into ${OUT}`);
