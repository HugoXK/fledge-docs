import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCT = process.env.FLEDGE_DIR || join(ROOT, 'fledge');
const OUT = process.env.OUT_DIR || join(ROOT, 'site');
const APP = 'https://fledge.hugoxk.online';
const GH = 'https://github.com/HugoXK/fledge';
const DOCS_GH = 'https://github.com/HugoXK/fledge-docs';
const ZH_DIR = join(ROOT, 'translations', 'zh');

const PAGE_DEFS = [
  { slug: '', en: 'README.md', zh: 'index.md', groupEn: 'Overview', groupZh: '概览', titleEn: 'Fledge', titleZh: 'Fledge 文档' },
  { slug: 'deploy', en: 'docs/deploy.md', zh: 'deploy.md', groupEn: 'Getting started', groupZh: '开始' },
  { slug: 'quota', en: 'docs/quota.md', zh: 'quota.md', groupEn: 'Getting started', groupZh: '开始' },
  { slug: 'architecture', en: 'docs/architecture.md', zh: 'architecture.md', groupEn: 'Understand', groupZh: '理解' },
  { slug: 'security', en: 'docs/security.md', zh: 'security.md', groupEn: 'Understand', groupZh: '理解' },
  { slug: 'autonomous-dev', en: 'docs/autonomous-dev.md', zh: 'autonomous-dev.md', groupEn: 'Understand', groupZh: '理解' },
  { slug: 'code-standards', en: 'docs/code-standards.md', zh: 'code-standards.md', groupEn: 'Understand', groupZh: '理解' },
  { slug: 'observability', en: 'docs/observability.md', zh: 'observability.md', groupEn: 'Operations', groupZh: '运维' },
  { slug: 'roadmap', en: 'docs/roadmap.md', zh: 'roadmap.md', groupEn: 'Operations', groupZh: '运维' },
  { slug: 'secrets', en: 'docs/secrets.md', groupEn: 'Operations', groupZh: '英文参考' },
  { slug: 'handoff', en: 'docs/handoff.md', groupEn: 'Operations', groupZh: '英文参考' },
  { slug: 'api', en: 'docs/api.md', groupEn: 'Reference', groupZh: '英文参考' },
  { slug: 'ui', en: 'docs/ui.md', groupEn: 'Reference', groupZh: '英文参考' },
];

const GROUPS_EN = ['Overview', 'Getting started', 'Understand', 'Operations', 'Reference', 'Design & decisions'];
const GROUPS_ZH = ['概览', '开始', '理解', '运维', '英文参考'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = (p) => readFileSync(p, 'utf8');
const titleOf = (md, fallback) => (md.match(/^#\s+(.+)$/m)?.[1] || fallback).replace(/[*_`]/g, '').trim();

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.md')) acc.push('docs/' + relative(join(PRODUCT, 'docs'), p).split(sep).join('/'));
  }
  return acc;
}

function collectPages() {
  const known = new Map(PAGE_DEFS.map((p) => [p.en, p]));
  const pages = PAGE_DEFS.map((p) => ({ ...p }));
  const extra = [];
  for (const en of walk(join(PRODUCT, 'docs'))) {
    if (known.has(en)) continue;
    const slug = en.replace(/^docs\//, '').replace(/\.md$/, '').replace(/^README$/, '');
    extra.push({ slug, en, groupEn: 'Design & decisions', groupZh: '英文参考' });
  }
  return [...pages, ...extra];
}

function rewrite(md, lang, sourcePath) {
  return md.replace(/\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (match, target, title = '') => {
    if (/^(https?:|mailto:|#|data:)/.test(target)) return match;
    const at = target.indexOf('#');
    const hash = at === -1 ? '' : target.slice(at);
    const raw = at === -1 ? target : target.slice(0, at);
    if (!raw) return match;
    if (/(?:^|\/)images\//.test(raw)) {
      const file = raw.replace(/^(?:\.\.\/)?docs\/images\//, '').replace(/^images\//, '');
      return `](/assets/images/${file}${hash}${title})`;
    }
    const resolved = posix.normalize(posix.join(posix.dirname(sourcePath), raw)).replace(/^\.\//, '');
    if (resolved.startsWith('docs/') && resolved.endsWith('.md')) {
      const slug = resolved.replace(/^docs\//, '').replace(/\.md$/, '').replace(/^README$/, '');
      if (lang === 'zh' && ZH_URL.has(slug)) return `](${ZH_URL.get(slug)}${hash}${title})`;
      return `](${EN_URL.get(resolved) || `/docs/${slug}/`}${hash}${title})`;
    }
    if (resolved === 'README.md') return `](${lang === 'zh' ? '/zh/' : '/'}${hash}${title})`;
    if (resolved === 'README.zh.md') return `](/zh/${hash}${title})`;
    if (existsSync(join(PRODUCT, resolved))) return `](${GH}/blob/main/${resolved}${hash}${title})`;
    return match;
  });
}

function nav(lang, current) {
  const groups = lang === 'zh' ? GROUPS_ZH : GROUPS_EN;
  const labels = {
    zh: { '概览': '概览', '开始': '开始', '理解': '理解', '运维': '运维', '英文参考': '英文参考' },
    en: { 'Overview': 'Overview', 'Getting started': 'Getting started', 'Understand': 'Understand', 'Operations': 'Operations', 'Reference': 'Reference', 'Design & decisions': 'Design & decisions' },
  };
  const out = [];
  for (const group of groups) {
    const refSlugs = ['secrets', 'handoff', 'api', 'ui'];
    const pool = lang === 'zh' && group === '英文参考'
      ? PAGES.filter((p) => refSlugs.includes(p.slug))
      : PAGES.filter((p) => (lang === 'zh' ? p.groupZh === group : p.groupEn === group)).filter((p) => (lang === 'en' ? true : group === '英文参考' || p.zh));
    const items = pool
      .map((p) => {
        const title = lang === 'zh' && p.zh ? p.titleZh || titleOf(read(join(ZH_DIR, p.zh)), p.slug) : p.titleEn || titleOf(read(join(PRODUCT, p.en)), p.slug);
        const href = lang === 'zh' && group !== '英文参考' && p.zh ? `/zh${p.slug ? `/docs/${p.slug}/` : '/'}` : `${p.slug ? `/docs/${p.slug}/` : '/'}`;
        const active = href === current ? ' class="on"' : '';
        const mark = lang === 'zh' && group === '英文参考' ? ' <span class="en-mark">EN</span>' : '';
        return `<a${active} href="${href}">${esc(title)}${mark}</a>`;
      }).join('');
    if (items) {
      const more = lang === 'zh' && group === '英文参考' ? `<a href="/docs/">完整英文文档 <span class="en-mark">EN</span></a>` : '';
      out.push(`<h2>${esc(labels[lang][group] || group)}</h2>${items}${more}`);
    }
  }
  return out.join('');
}

function page({ lang, slug, title, body, description, home = false }) {
  const isZh = lang === 'zh';
  const brand = isZh ? '/zh/' : '/';
  const other = home ? (isZh ? '/' : '/zh/') : (isZh ? `/docs/${slug}/` : (PAGES.find((p) => p.slug === slug)?.zh ? `/zh/docs/${slug}/` : '/zh/'));
  const current = home ? brand : isZh ? `/zh/docs/${slug}/` : `/docs/${slug}/`;
  const navHtml = nav(lang, current);
  return `<!doctype html><html lang="${isZh ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Fledge Docs</title><meta name="description" content="${esc(description || 'Fledge documentation')}"><meta name="theme-color" content="#080a0f">
<link rel="icon" href="/assets/images/logo.svg"><link rel="stylesheet" href="/assets/docs.css"><link rel="stylesheet" href="/assets/demo.css">
<script defer src="/assets/demo.js"></script></head><body>
<header class="site-header"><a class="brand" href="${brand}"><span class="brand-mark">F</span> HUGOXK <small>LAB / FLEDGE DOCS</small></a>
<nav class="nav"><a href="${brand}">${isZh ? '文档首页' : 'Docs home'}</a><a href="${other}">${isZh ? 'English' : '中文'}</a><a href="${APP}">${isZh ? '打开 Fledge' : 'Open Fledge'} ↗</a><a href="${GH}">GitHub ↗</a></nav></header>
<div class="docs-shell"><aside class="docs-nav"><h2>Fledge</h2>${navHtml}<div class="app"><a href="${APP}">${isZh ? '打开 Fledge' : 'Open Fledge'} ↗</a><a href="${GH}">${isZh ? '源仓库' : 'Source'} ↗</a></div></aside><main class="docs-main">${body}</main></div>
<footer class="docs-footer"><span>© 2026 HUGOXK // LAB · FLEDGE</span><div><a href="${brand}">${isZh ? '首页' : 'Home'}</a><a href="${APP}">${isZh ? '应用' : 'App'}</a><a href="${GH}">GitHub</a></div></footer></body></html>`;
}

function demoHtml(lang) {
  const zh = lang === 'zh';
  return `<section class="demo" data-demo data-lang="${zh ? 'zh' : 'en'}">
  <div class="demo-head"><div><span class="kicker">${zh ? '浏览器模拟' : 'BROWSER SIMULATION'}</span><h2>${zh ? '看一次 Fledge 任务如何完成' : 'See one Fledge job end to end'}</h2><p>${zh ? '选择一个场景，观察计划、测试、PR 与人工审查的完整链路。不会调用模型，也不会改动任何仓库。' : 'Pick a scenario and follow planning, tests, a pull request and human review. No model calls or repositories are touched.'}</p></div><span class="demo-badge">${zh ? '模拟' : 'SIMULATION'}</span></div>
  <div class="demo-controls"><div class="demo-tabs" role="tablist"><button type="button" class="on" data-scenario="bug">${zh ? '修复缺陷' : 'Bug fix'}</button><button type="button" data-scenario="docs">${zh ? '更新文档' : 'Documentation'}</button><button type="button" data-scenario="ui">${zh ? '界面改动' : 'UI change'}</button></div><div class="demo-actions"><button type="button" class="btn primary" data-demo-start>${zh ? '开始模拟' : 'Start simulation'}</button><button type="button" class="btn" data-demo-reset>${zh ? '重置' : 'Reset'}</button></div></div>
  <div class="demo-chat" data-demo-chat aria-live="polite"><div class="demo-empty">${zh ? '选择场景后开始。' : 'Choose a scenario, then start.'}</div></div>
  <div class="demo-foot"><span>${zh ? '浏览器内模拟 · 不接触模型或仓库' : 'Runs in your browser · no model or repository access'}</span><a href="${zh ? '/zh/docs/deploy/' : '/docs/deploy/'}">${zh ? '真实部署' : 'Deploy for real'} ↗</a></div>
</section>
<script>window.FLEDGE_DEMO=${JSON.stringify(zh ? {
  bug: { user: '连接 github.com/acme/app，并修复 parser 的空输入失败。', steps: ['仓库已连接。计划：复现失败、添加回归测试、修改 parser.ts、创建一个 PR。', '已复现。补充回归测试，parser.ts 已修复。', '草稿 PR #42：一个提交，测试通过。等待人工审查。', '维护者已批准并合并。'] },
  docs: { user: '更新部署文档，说明 METRICS_TOKEN 的生产要求，并创建一个 PR。', steps: ['仓库已连接。计划：核对 deploy.md 与配置代码，补充生产启动条件与回滚说明。', '已更新 deploy.md，并链接到 security.md 与 quotas。', '草稿 PR #43：只改文档，检查通过。等待人工审查。', '维护者已批准并合并。'] },
  ui: { user: '修复仓库列表在 390px 下的布局问题，并附 before/after 截图。', steps: ['仓库已连接。计划：复现窄屏问题、修改样式、运行 Playwright、创建 PR。', '已复现。列表在 390px 下改为单列，截图已保存。', '草稿 PR #44：样式与测试通过，包含 390/768/1440 截图。', '维护者已批准并合并。'] },
} : {
  bug: { user: 'Connect github.com/acme/app and fix the failing parser test on empty input.', steps: ['Repository connected. Plan: reproduce, add a regression test, patch parser.ts, open one PR.', 'Failure reproduced. Added a regression test; parser.ts patched.', 'Draft PR #42: one commit, tests green. Waiting for human review.', 'Approved and merged by the maintainer.'] },
  docs: { user: 'Update the deployment guide for the METRICS_TOKEN production requirement, then open one PR.', steps: ['Repository connected. Plan: compare deploy.md with the configuration code, add the production startup condition and rollback note.', 'deploy.md updated with links to security and quota docs.', 'Draft PR #43: documentation only, checks green. Waiting for human review.', 'Approved and merged by the maintainer.'] },
  ui: { user: 'Fix the repository list layout at 390px and include before/after screenshots.', steps: ['Repository connected. Plan: reproduce the narrow layout, adjust styles, run Playwright, open one PR.', 'Reproduced. The list is single-column at 390px and screenshots are stored.', 'Draft PR #44: styles and tests green, with 390/768/1440 screenshots.', 'Approved and merged by the maintainer.'] },
})};</script>`;
}

const PAGES = collectPages();
const EN_URL = new Map(PAGES.map((p) => [p.en, p.slug ? `/docs/${p.slug}/` : '/']));
const ZH_URL = new Map(PAGES.filter((p) => p.zh).map((p) => [p.slug, p.slug ? `/zh/docs/${p.slug}/` : '/zh/']));

for (const p of PAGES) {
  p.titleEn = p.titleEn || titleOf(read(join(PRODUCT, p.en)), p.slug || 'Fledge');
  if (p.zh) p.titleZh = p.titleZh || titleOf(read(join(ZH_DIR, p.zh)), p.titleEn);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets', 'images'), { recursive: true });
mkdirSync(join(OUT, 'docs'), { recursive: true });
mkdirSync(join(OUT, 'zh', 'docs'), { recursive: true });

for (const p of PAGES) {
  const enDir = p.slug ? join(OUT, 'docs', p.slug) : OUT;
  mkdirSync(enDir, { recursive: true });
  const enBody = `<p class="mut" style="margin-bottom:18px"><a href="${GH}/blob/main/${p.en}">Edit ${esc(p.en)} on GitHub ↗</a></p>` + (p.slug === '' ? demoHtml('en') : '') + marked.parse(rewrite(read(join(PRODUCT, p.en)), 'en', p.en));
  writeFileSync(join(enDir, 'index.html'), page({ lang: 'en', slug: p.slug, title: p.titleEn, body: enBody, home: p.slug === '' }));
  if (!p.zh) continue;
  const zhDir = p.slug ? join(OUT, 'zh', 'docs', p.slug) : join(OUT, 'zh');
  mkdirSync(zhDir, { recursive: true });
  const zhBody = `<p class="mut" style="margin-bottom:18px"><a href="${DOCS_GH}/blob/main/translations/zh/${p.zh}">在 GitHub 上编辑 translations/zh/${esc(p.zh)} ↗</a></p>` + (p.slug === '' ? demoHtml('zh') : '') + marked.parse(rewrite(read(join(ZH_DIR, p.zh)), 'zh', `translations/zh/${p.zh}`));
  writeFileSync(join(zhDir, 'index.html'), page({ lang: 'zh', slug: p.slug, title: p.titleZh, body: zhBody, home: p.slug === '' }));
}


function redirect(path, to) {
  const file = join(OUT, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"><title>Redirect</title></head><body><a href="${to}">Continue</a></body></html>`);
}
redirect('docs', '/');
redirect('zh/docs', '/zh/');
redirect('docs/readme.zh', '/zh/');

cpSync(join(PRODUCT, 'docs', 'images'), join(OUT, 'assets', 'images'), { recursive: true });
cpSync(join(ROOT, 'docs', 'assets', 'docs.css'), join(OUT, 'assets', 'docs.css'));
cpSync(join(ROOT, 'docs', 'assets', 'demo.css'), join(OUT, 'assets', 'demo.css'));
cpSync(join(ROOT, 'docs', 'assets', 'demo.js'), join(OUT, 'assets', 'demo.js'));
if (existsSync(join(ROOT, 'docs', 'assets', 'images'))) cpSync(join(ROOT, 'docs', 'assets', 'images'), join(OUT, 'assets', 'images'), { recursive: true });
console.log(`built ${PAGES.length} English pages and ${PAGES.filter((p) => p.zh).length} Chinese pages into ${OUT}`);
