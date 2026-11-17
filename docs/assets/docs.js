(function () {
  var key = 'fledge-docs-theme';
  var root = document.documentElement;
  var button = document.querySelector('[data-docs-theme]');
  var zh = String(root.lang || '').toLowerCase().indexOf('zh') === 0;

  function current() {
    var chosen = root.getAttribute('data-theme');
    if (chosen === 'light' || chosen === 'dark') return chosen;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function sync() {
    var next = current() === 'dark' ? 'light' : 'dark';
    var label = next === 'dark'
      ? (zh ? '切换到深色主题' : 'Switch to dark theme')
      : (zh ? '切换到浅色主题' : 'Switch to light theme');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  }

  if (!button) return;
  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(key, next); } catch (error) { /* private mode */ }
    sync();
  });
  sync();
})();
