(() => {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const copy = window.FLEDGE_DEMO || {};
  const chat = root.querySelector('[data-demo-chat]');
  const start = root.querySelector('[data-demo-start]');
  const reset = root.querySelector('[data-demo-reset]');
  const tabs = [...root.querySelectorAll('[data-scenario]')];
  if (!chat || !start || !reset) return;

  let scenario = 'bug';
  let running = false;
  let timers = [];

  const clearTimers = () => {
    for (const id of timers) clearTimeout(id);
    timers = [];
  };
  const empty = () => {
    chat.replaceChildren();
    const p = document.createElement('div');
    p.className = 'demo-empty';
    p.textContent = root.dataset.lang === 'zh' ? '选择场景后开始。' : 'Choose a scenario, then start.';
    chat.append(p);
  };
  const message = (kind, who, text) => {
    chat.querySelector('.demo-empty')?.remove();
    const row = document.createElement('div');
    row.className = `demo-msg ${kind}`;
    const label = document.createElement('span');
    label.className = 'who';
    label.textContent = who;
    const body = document.createElement('p');
    body.textContent = text;
    row.append(label, body);
    chat.append(row);
    chat.scrollTop = chat.scrollHeight;
  };
  const setActive = (button) => {
    for (const tab of tabs) {
      tab.classList.toggle('on', tab === button);
      tab.setAttribute('aria-selected', String(tab === button));
    }
  };
  const showApprove = () => {
    const row = document.createElement('div');
    row.className = 'demo-approve';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = root.dataset.lang === 'zh' ? '批准模拟运行 ↗' : 'Approve sample run ↗';
    button.addEventListener('click', () => {
      row.remove();
      const steps = copy[scenario]?.steps || [];
      if (steps[3]) message('bot', 'FLEDGE', steps[3]);
      running = false;
      start.disabled = false;
    });
    row.append(button);
    chat.append(row);
    chat.scrollTop = chat.scrollHeight;
  };

  const run = () => {
    if (running) return;
    const data = copy[scenario];
    if (!data) return;
    running = true;
    start.disabled = true;
    clearTimers();
    chat.replaceChildren();
    message('user', root.dataset.lang === 'zh' ? '你' : 'YOU', data.user);
    timers.push(setTimeout(() => message('system', 'FLEDGE', data.steps[0]), 700));
    timers.push(setTimeout(() => message('bot', 'FLEDGE', data.steps[1]), 1700));
    timers.push(setTimeout(() => { message('system', 'FLEDGE', data.steps[2]); showApprove(); }, 2900));
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      if (running) return;
      scenario = tab.dataset.scenario;
      setActive(tab);
      clearTimers();
      empty();
    });
  }
  start.addEventListener('click', run);
  reset.addEventListener('click', () => {
    running = false;
    start.disabled = false;
    clearTimers();
    empty();
  });
  empty();
})();
