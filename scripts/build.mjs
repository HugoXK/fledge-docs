#!/usr/bin/env node
// Build the Fledge documentation site from the product repository's docs and
// README. The workflow checks the product repo out next to this repo as
// ./fledge.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, posix, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const product = process.env.FLEDGE_DIR || join(root, 'fledge')
const out = process.env.OUT_DIR || join(root, 'site')
const base = (process.env.BASE_PATH || '/docs').replace(/\/$/, '')
const app = 'https://fledge.hugoxk.online'
const guide = 'https://hugoxk.online/fledge/guide/?v=5'
const gh = 'https://github.com/HugoXK/fledge'

if (!existsSync(join(product, 'docs'))) {
  console.error('missing product docs at', product)
  process.exit(2)
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const walk = (dir, acc = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (path.endsWith('.md')) acc.push(path)
  }
  return acc
}
const all = walk(join(product, 'docs')).map((path) => 'docs/' + relative(join(product, 'docs'), path).split(sep).join('/'))
const extra = ['README.md', 'README.zh.md'].filter((path) => existsSync(join(product, path)))
const files = [...all, ...extra]

const assetBase = (process.env.ASSET_BASE || `${base}/assets`).replace(/\/$/, '')
const slugOf = (path) => {
  if (path === 'README.md') return ''
  if (path === 'README.zh.md') return 'readme.zh'
  return path.replace(/^docs\//, '').replace(/\.md$/, '').replace(/^README$/, '')
}
const urlOf = (path) => `${base}/${slugOf(path) ? `${slugOf(path)}/` : ''}`
const titleOf = (path, text) => {
  if (path === 'README.md') return 'Fledge'
  if (path === 'README.zh.md') return 'Fledge 中文'
  const match = text.match(/^#\s+(.+)$/m)
  return match ? match[1].replace(/[*_`]/g, '').trim() : path.split('/').pop().replace(/\.md$/, '')
}
const source = (path) => readFileSync(join(product, path), 'utf8')
const exists = (path) => existsSync(join(product, path))
const urlMap = new Map(files.map((path) => [path, urlOf(path)]))

function rewrite(md, path) {
  return md.replace(/\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (match, target, title = '') => {
    if (/^(https?:|mailto:|#)/.test(target)) return match
    const hashAt = target.indexOf('#')
    const hash = hashAt === -1 ? '' : target.slice(hashAt)
    const raw = hashAt === -1 ? target : target.slice(0, hashAt)
    if (raw === '') return match
    let resolved = posix.normalize(posix.join(posix.dirname(path), raw))
    resolved = resolved.replace(/^\.\//, '')
    if (resolved.startsWith('docs/images/') || resolved.startsWith('images/')) {
      const image = resolved.replace(/^docs\//, '')
      return `](${assetBase}/${image}${hash}${title})`
    }
    if (urlMap.has(resolved)) return `](${urlMap.get(resolved)}${hash}${title})`
    if (exists(resolved)) return `](${gh}/blob/main/${resolved}${hash}${title})`
    return match
  })
}

const groups = [
  ['Overview', ['README.md', 'README.zh.md']],
  ['Run', ['docs/deploy.md', 'docs/quota.md']],
  ['Understand', ['docs/architecture.md', 'docs/api.md', 'docs/security.md']],
  ['Project', ['docs/code-standards.md', 'docs/autonomous-dev.md', 'docs/handoff.md', 'docs/roadmap.md', 'docs/decisions/0001-name.md']],
]
const titleMap = new Map(files.map((path) => [path, titleOf(path, source(path))]))
const navHtml = (current) => groups
  .map(([group, paths]) => {
    const items = paths
      .filter((path) => exists(path))
      .map((path) => `<a class="${path === current ? 'on' : ''}" href="${urlOf(path)}">${esc(titleMap.get(path) || path)}</a>`)
      .join('')
    return items ? `<h2>${esc(group)}</h2>${items}` : ''
  })
  .join('')

const page = (path, title, body) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Fledge Docs</title><meta name="description" content="Fledge documentation: hosted repositories that grow themselves."><meta name="theme-color" content="#080a0f">
<link rel="icon" href="${assetBase}/images/logo.svg"><link rel="stylesheet" href="${assetBase}/docs.css"></head><body>
<header class="site-header"><a class="brand" href="${base}/"><span class="brand-mark">F</span> HUGOXK <small>LAB / FLEDGE DOCS</small></a>
<nav class="nav"><a href="${base}/">Docs home</a><a href="${guide}">Guide</a><a href="${app}">Open Fledge ↗</a><a href="${gh}">GitHub ↗</a></nav></header>
<div class="docs-shell"><aside class="docs-nav"><h2>Fledge</h2>${navHtml(path)}<div class="app"><a href="${app}">Open Fledge ↗</a><a href="${gh}">Source ↗</a></div></aside><main class="docs-main">${body}</main></div>
<footer class="docs-footer"><span>© 2026 HUGOXK // LAB · FLEDGE</span><div><a href="${base}/">Home</a><a href="${guide}">Guide</a><a href="${app}">App</a><a href="${gh}">GitHub</a></div></footer></body></html>`

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'docs'), { recursive: true })
mkdirSync(join(out, 'assets', 'images'), { recursive: true })
for (const path of files) {
  const slug = slugOf(path)
  const dir = join(out, 'docs', slug)
  mkdirSync(dir, { recursive: true })
  const md = source(path)
  const title = titleOf(path, md)
  const body = `<p class="mut" style="margin-bottom:18px"><a href="${gh}/blob/main/${path}">在 GitHub 上编辑 ${esc(path)} ↗</a></p>` + marked.parse(rewrite(md, path))
  writeFileSync(join(dir, 'index.html'), page(path, title, body))
}
cpSync(join(product, 'docs/images'), join(out, 'assets', 'images'), { recursive: true })
cpSync(join(root, 'docs/assets/docs.css'), join(out, 'assets', 'docs.css'))
cpSync(join(root, 'docs/assets/images/logo.svg'), join(out, 'assets', 'images/logo.svg'))

const cards = [
  [`${base}/`, 'Overview', 'Fledge 是什么、安装、第一次运行。'],
  [`${base}/architecture/`, 'Architecture', '组件、数据模型、任务生命周期和信任边界。'],
  [`${base}/api/`, 'API', '浏览器路由、Job 凭据/回调和模型网关。'],
  [`${base}/quota/`, 'Quota', '1 元额度、402、自带模型和计量口径。'],
  [`${base}/security/`, 'Security', 'token 加密、CSRF、SSRF、审批和日志。'],
  [`${base}/deploy/`, 'Deploy', 'OAuth、SMTP、nginx、systemd、Docker、备份。'],
]
const landing = `<span class="kicker">FLEDGE · DOCUMENTATION</span><h1>Fledge 文档</h1>
<p class="lead">Hosted repositories that grow themselves. 从 GitHub 登录、接入仓库，到 FlyBot 打开一个可审查的 PR。</p>
<div class="docs-cards">${cards.map(([href, title, desc]) => `<a class="docs-card" href="${href}"><b>${title}</b><span>${desc}</span><em>READ ↗</em></a>`).join('')}</div>
<h2>Quick links</h2><ul><li><a href="${app}">打开 Fledge</a></li><li><a href="${guide}">使用 Guide</a></li><li><a href="${gh}">GitHub 仓库</a></li><li><a href="${gh}/tree/main/docs">文档源文件</a></li></ul>
<p class="mut">这个站点从 <code>HugoXK/fledge</code> 的 <code>README.md</code> 和 <code>docs/</code> 自动构建；文档不在这里复制或锁定。</p>`
writeFileSync(join(out, 'index.html'), page('', 'Fledge 文档', landing))
if (process.env.CNAME) writeFileSync(join(out, 'CNAME'), `${process.env.CNAME}\n`)
console.log(`built ${files.length} doc pages -> ${out} (base ${base})`)
