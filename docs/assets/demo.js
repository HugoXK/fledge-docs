(() => {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const copy = window.FLEDGE_DEMO || {};
  const chat = root.querySelector('[data-demo-chat]');
  const actions = root.querySelector('[data-demo-actions]');
  const start = root.querySelector('[data-demo-start]');
  const reset = root.querySelector('[data-demo-reset]');
  const tabs = [...root.querySelectorAll('[data-scenario]')];
  const repo = root.querySelector('[data-demo-repo]');
  const branch = root.querySelector('[data-demo-branch]');
  const ledger = [...root.querySelectorAll('[data-step]')];
  if (!chat || !actions || !start || !reset) return;
  const zh = root.dataset.lang === 'zh';
  let scenario = 'bug';
  let timers = [];
  let running = false;

  const clearTimers = () => { for (const id of timers) clearTimeout(id); timers = []; };
  const empty = () => {
    chat.replaceChildren();
    const p = document.createElement('div');
    p.className = 'demo-empty';
    p.textContent = zh ? '选择场景后开始。' : 'Choose a scenario, then start.';
    chat.append(p);
  };
  const mark = (step, state = 'on') => {
    const item = ledger.find((el) => el.dataset.step === step);
    if (item) item.dataset.state = state;
  };
  const resetLedger = () => { for (const item of ledger) delete item.dataset.state; };
  const setMeta = (data) => {
    if (repo) repo.textContent = data.repo;
    if (branch) branch.textContent = data.branch;
  };
  const add = (kind, label, text, tone = '') => {
    chat.querySelector('.demo-empty')?.remove();
    const row = document.createElement('div');
    row.className = `job-entry ${tone}`;
    const tag = document.createElement('span');
    tag.className = 'job-tag';
    tag.textContent = label;
    const body = document.createElement('div');
    body.className = 'job-text';
    body.textContent = text;
    if (kind === 'code') body.classList.add('mono');
    row.append(tag, body);
    chat.append(row);
    chat.scrollTop = chat.scrollHeight;
  };
  const button = (label, handler) => {
    actions.replaceChildren();
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'demo-action';
    el.textContent = label;
    el.addEventListener('click', () => { actions.replaceChildren(); handler(); });
    actions.append(el);
  };

  const run = () => {
    if (running) return;
    const data = copy[scenario];
    if (!data) return;
    running = true;
    start.disabled = true;
    clearTimers();
    chat.replaceChildren();
    actions.replaceChildren();
    resetLedger();
    setMeta(data);
    mark('plan');
    add('text', 'PLAN', data.plan);
    button(zh ? '批准计划 ↗' : 'Approve plan ↗', approvePlan);
  };

  const approvePlan = () => {
    const data = copy[scenario];
    if (!data) return;
    add('code', 'TEST', data.test, 'bad');
    mark('test');
    timers.push(setTimeout(() => {
      add('code', 'PATCH', data.patch);
      mark('patch');
    }, 600));
    timers.push(setTimeout(() => {
      add('code', 'CHECKS', data.checks, 'ok');
      mark('checks');
    }, 1250));
    timers.push(setTimeout(() => {
      add('code', 'PR', data.pr);
      mark('pr');
    }, 1900));
    timers.push(setTimeout(() => {
      add('text', 'REVIEW', data.review);
      mark('review', 'wait');
      button(zh ? '批准合并 ↗' : 'Approve merge ↗', approveMerge);
    }, 2550));
  };

  const approveMerge = () => {
    const data = copy[scenario];
    if (!data) return;
    add('text', 'MERGED', data.merged, 'ok');
    mark('review', 'done');
    running = false;
    start.disabled = false;
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      if (running) return;
      scenario = tab.dataset.scenario;
      for (const item of tabs) {
        item.classList.toggle('on', item === tab);
        item.setAttribute('aria-selected', String(item === tab));
      }
      clearTimers();
      chat.replaceChildren();
      actions.replaceChildren();
      resetLedger();
      empty();
    });
  }
  start.addEventListener('click', run);
  reset.addEventListener('click', () => {
    running = false;
    start.disabled = false;
    clearTimers();
    chat.replaceChildren();
    actions.replaceChildren();
    resetLedger();
    empty();
  });
  empty();
})();
