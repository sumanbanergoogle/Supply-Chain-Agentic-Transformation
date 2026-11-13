/* Theme initialization + shared navigation helpers */
(function () {
  try {
    if ((localStorage.getItem('deck-theme') || 'light') === 'dark') {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  } catch (e) {}
})();

window.initDeckChrome = function (opts) {
  opts = opts || {};
  var rootPrefix = opts.root || '../';
  var btn = document.getElementById('themeToggle');
  if (btn) {
    function paint() {
      btn.textContent = document.documentElement.classList.contains('theme-dark') ? 'Light' : 'Dark';
    }
    paint();
    btn.addEventListener('click', function () {
      var el = document.documentElement;
      var dark = el.classList.toggle('theme-dark');
      el.classList.toggle('theme-light', !dark);
      try { localStorage.setItem('deck-theme', dark ? 'dark' : 'light'); } catch (e) {}
      paint();
    });
  }

  // Keyboard navigation (Left / Right arrows when not inside an input)
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if (e.key === 'ArrowRight' && opts.next) window.location.href = opts.next;
    if (e.key === 'ArrowLeft' && opts.prev) window.location.href = opts.prev;
    if (e.key === 'Escape') window.location.href = rootPrefix + 'index.html';
  });
};
