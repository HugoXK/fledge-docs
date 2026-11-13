(() => {
  const root = document.querySelector('[data-fd]');
  if (!root) return;
  const app = window.FLEDGE_APP || {};
  const jobs = app.jobs || {};
  const zh = app.lang === 'zh';
  const t = (en, cn) => (zh ? cn : en);
  let current = Object.keys(jobs)[0] || 'app';
  let state = 'planned';
  let tab = 'plan';
  const $ = (sel) => root.querySelector(sel);
  const labels = {
    plan: t('Plan', '计划'),
    evidence: t('Evidence', '证据'),
    files: t('Files', '文件'),
    pr: t('Pull request', 'Pull Request'),
    planned: t('Awaiting plan approval', '等待批准计划'),
    failed: t('Test failed', '测试失败'),
    fixed: t('Checks green', '检查通过'),
    pr_open: t('Pull request open', 'PR 已创建'),
    merged: t('Merged', '已合并'),
  };
  const ledger = [
    ['plan', t('Plan', '计划')],
    ['test', t('Failing test', '失败测试')],
    ['patch', t('Patch', '修复')],
    ['checks', t('Checks', '检查')],
    ['pr', t('Pull request', 'Pull Request')],
    ['review', t('Human review', '人工审查')],
  ];
  const order = { planned: 0, failed: 1, fixed: 3, pr_open: 4, merged: 5 };
  const job = () => jobs[current];
  const statusOf = (step) => {
    const at = order[state] ?? 0;
    const index = ledger.findIndex(([key]) => key === step);
    if (step === 'review') return state === 'merged' ? 'done' : state === 'pr_open' ? 'wait' : 'idle';
    if (index < at) return 'done';
    if (index === at) return state === 'failed' && step === 'test' ? 'bad' : 'on';
    return 'idle';
  };
  const setTab = (next) => { tab = next; render(); };
  const primary = () => {
    if (state === 'planned') return { label: t('Approve plan ↗', '批准计划 ↗'), next: () => { state = 'failed'; tab = 'evidence'; } };
    if (state === 'failed') return { label: t('Apply fix ↗', '应用修复 ↗'), next: () => { state = 'fixed'; tab = 'evidence'; } };
    if (state === 'fixed') return { label: t('Open pull request ↗', '创建 Pull Request ↗'), next: () => { state = 'pr_open'; tab = 'pr'; } };
    if (state === 'pr_open') return { label: t('Merge (human) ↗', '合并（人工） ↗'), next: () => { state = 'merged'; tab = 'pr'; } };
    return { label: t('Run again', '重新运行'), next: () => { state = 'planned'; tab = 'plan'; } };
  };
  const render = () => {
    const j = job();
    root.querySelector('[data-fd-title]').textContent = j.title;
    root.querySelector('[data-fd-sub]').textContent = `${j.repo} · ${j.branch}`;
    root.querySelector('[data-fd-status]').textContent = labels[state] || state;
    root.querySelector('[data-fd-status]').dataset.state = state;
    root.querySelector('[data-fd-kind]').textContent = j.kind;
    root.querySelector('[data-fd-risk]').textContent = j.risk;
    root.querySelector('[data-fd-repos]').innerHTML = Object.entries(jobs).map(([key, value]) => `<button class="fd-repo ${key === current ? 'on' : ''}" data-repo="${key}"><span>${value.repo}</span><small>${value.kind}</small></button>`).join('');
    root.querySelector('[data-fd-ledger]').innerHTML = ledger.map(([key, label]) => `<li data-state="${statusOf(key)}"><i></i>${label}</li>`).join('');
    root.querySelector('[data-fd-tabs]').innerHTML = ['plan', 'evidence', 'files', 'pr'].map((key) => `<button class="${tab === key ? 'on' : ''}" data-tab="${key}">${labels[key]}</button>`).join('');
    const panel = root.querySelector('[data-fd-panel]');
    if (tab === 'plan') {
      panel.innerHTML = `<ol class="fd-steps">${j.plan.map((step, i) => `<li data-state="${i < (order[state] || 0) ? 'done' : i === (order[state] || 0) ? 'on' : 'idle'}"><span>${String(i + 1).padStart(2, '0')}</span>${step}</li>`).join('')}</ol><p class="fd-note">${t('The plan is visible before the job runs. Approval is scoped to this repository and this job.', '计划在任务运行前可见。批准只作用于这个仓库和这个任务。')}</p>`;
    } else if (tab === 'evidence') {
      const failed = state === 'planned' || state === 'failed';
      const test = failed ? j.fail : j.pass;
      const checks = j.checks.map((c) => `<li data-state="${failed ? 'idle' : 'done'}"><span>${c}</span><b>${failed ? '—' : t('green', '通过')}</b></li>`).join('');
      panel.innerHTML = `<div class="fd-evidence"><div><h4>${t('Test output', '测试输出')}</h4><pre class="${failed ? 'bad' : 'ok'}">${test}</pre></div><div><h4>${t('Checks', '检查')}</h4><ul class="fd-checks">${checks}</ul><p class="fd-note">${t('Evidence is attached to the pull request; a maintainer reads it before merging.', '证据附在 Pull Request 上；维护者合并前会阅读。')}</p></div></div>`;
    } else if (tab === 'files') {
      const available = order[state] >= 2;
      panel.innerHTML = `<div class="fd-files">${available ? j.files.map((f) => `<div class="fd-file"><code>${f.path}</code><span>${f.change}</span></div>`).join('') : `<p class="fd-empty">${t('The patch appears after the plan is approved and the fix is applied.', '计划批准并应用修复后显示补丁。')}</p>`}</div>`;
    } else {
      const available = state === 'pr_open' || state === 'merged';
      panel.innerHTML = available ? `<article class="fd-pr"><span class="fd-kicker">PULL REQUEST</span><h4>${j.pr.title}</h4><p>${j.pr.body}</p><div class="fd-pr-meta"><span>${t('Commit', '提交')} <b>${j.pr.commit}</b></span><span>${t('Checks', '检查')} <b>${t('green', '通过')}</b></span><span>${t('Merge', '合并')} <b>${state === 'merged' ? t('done', '完成') : t('human decision', '人工决定')}</b></span></div></article>` : `<p class="fd-empty">${t('Open the pull request after the checks are green.', '检查通过后创建 Pull Request。')}</p>`;
    }
    const action = primary();
    root.querySelector('[data-fd-actions]').innerHTML = `<button class="fd-primary" data-fd-primary>${action.label}</button><button class="fd-secondary" data-fd-reset>${t('Reset', '重置')}</button><span class="fd-cost">${t('Platform quota', '平台额度')} ${j.quota} · ${t('this job', '本任务')} ${j.cost}</span>`;
    root.querySelector('[data-fd-primary]').addEventListener('click', () => { action.next(); render(); });
    root.querySelector('[data-fd-reset]').addEventListener('click', () => { state = 'planned'; tab = 'plan'; render(); });
    for (const button of root.querySelectorAll('[data-tab]')) button.addEventListener('click', () => setTab(button.dataset.tab));
    for (const button of root.querySelectorAll('[data-repo]')) button.addEventListener('click', () => { current = button.dataset.repo; state = 'planned'; tab = 'plan'; render(); });
  };
  render();
})();
