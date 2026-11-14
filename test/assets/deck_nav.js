/* Theme initialization + Top Masthead Slide Nav + Floating Presentation HUD */
(function () {
  try {
    if ((localStorage.getItem('deck-theme') || 'light') === 'dark') {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  } catch (e) {}
})();

window.SC_SLIDE_DECK = [
  { num: "00", title: "Executive Overview (ITC TM&D)", path: "slides/slide_00.html" },
  { num: "01", title: "Capital & Margin Reality", path: "slides/slide_01.html" },
  { num: "02", title: "Swiss Cheese Barriers", path: "slides/slide_02.html" },
  { num: "03", title: "The 3 Traps & Tribal Knowledge", path: "slides/slide_03.html" },
  { num: "04", title: "The Plug is an Agent (5 Criteria)", path: "slides/slide_04.html" },
  { num: "05", title: "Live Demo: ITC TM&D Cockpit", path: "slides/slide_05.html" },
  { num: "06", title: "From One Agent to an Agentic Org", path: "pages/one_to_many.html" },
  { num: "07", title: "Persona Map: 60 Roles & Agents", path: "pages/persona_map.html" },
  { num: "08", title: "How Agents Are Built", path: "pages/build_01_how.html" },
  { num: "09", title: "Architecture", path: "pages/build_02_arch.html" },
  { num: "10", title: "Model Choice", path: "pages/build_03_models.html" },
  { num: "11", title: "Governance", path: "pages/build_04_govern.html" },
  { num: "12", title: "Where People Meet the Agent", path: "pages/build_05_surface.html" },
  { num: "13", title: "Structural Resilience", path: "pages/build_06_resilience.html" },
  { num: "14", title: "Why Google Cloud", path: "pages/build_07_why_google.html" },
  { num: "15", title: "100 Days to Proof of Value", path: "pages/build_08_100_days.html" }
];

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

  // Detect current slide index from URL
  var currentPath = window.location.pathname;
  var curIdx = window.SC_SLIDE_DECK.findIndex(function (s) {
    return currentPath.indexOf(s.path) !== -1;
  });

  var totalIdx = window.SC_SLIDE_DECK.length - 1;
  var prevSlide = opts.prev || (curIdx > 0 ? rootPrefix + window.SC_SLIDE_DECK[curIdx - 1].path : null);
  var nextSlide = opts.next || (curIdx !== -1 && curIdx < totalIdx ? rootPrefix + window.SC_SLIDE_DECK[curIdx + 1].path : rootPrefix + 'slides/slide_01.html');

  var curStr = curIdx !== -1 ? String(curIdx).padStart(2, '0') : '••';
  var totStr = String(totalIdx).padStart(2, '0');

  // Populate Top Masthead Slide Nav if #mastSlideNav exists (or add All Slides button to .mast-nav)
  var mastSlideNav = document.getElementById('mastSlideNav');
  if (mastSlideNav) {
    var prevTop = prevSlide
      ? '<a class="btn-ghost" href="' + prevSlide + '">← Prev Page</a>'
      : '<span class="btn-ghost" style="opacity:.45;cursor:not-allowed;">← Prev Page</span>';
    var nextTop = (curIdx < totalIdx)
      ? '<a class="btn-cta" href="' + nextSlide + '">Next Page →</a>'
      : '<a class="btn-cta" href="' + rootPrefix + 'index.html">All Slides ↻</a>';
    var themeBtn = document.getElementById('themeToggle');
    mastSlideNav.innerHTML =
      prevTop +
      '<button type="button" class="btn-ghost top-all-slides" style="font-family:var(--font-mono);font-weight:700;color:var(--blue-ink);">' + curStr + ' / ' + totStr + ' ▾</button>' +
      nextTop +
      '<a class="btn-ghost" href="' + rootPrefix + 'index.html">All Slides ↗</a>';
    if (themeBtn) mastSlideNav.insertBefore(themeBtn, mastSlideNav.firstChild);
  } else {
    var anyMast = document.querySelector('.mast-nav');
    if (anyMast && !anyMast.querySelector('.top-all-slides')) {
      var allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'btn-ghost top-all-slides';
      allBtn.textContent = 'All Slides ▾';
      anyMast.insertBefore(allBtn, anyMast.firstChild);
    }
  }

  // Inject Floating Presentation HUD Controls (matching Oil & Gas reference deck)
  var hud = document.createElement('div');
  hud.id = 'sc-hud';
  hud.style.cssText = 'position:fixed;bottom:20px;right:24px;background:rgba(13,17,23,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.16);border-radius:30px;padding:6px 14px;display:flex;align-items:center;gap:10px;z-index:9990;box-shadow:0 10px 30px rgba(0,0,0,0.45);';

  var prevHtml = prevSlide
    ? '<a href="' + prevSlide + '" style="color:#E2E8F0;text-decoration:none;font:600 13px var(--font-display);padding:5px 10px;border-radius:16px;background:rgba(255,255,255,0.08);">◀ Prev</a>'
    : '<span style="color:#475569;font:600 13px var(--font-display);padding:5px 10px;cursor:not-allowed;">◀ Prev</span>';

  var nextHtml = (curIdx === -1 || curIdx < totalIdx)
    ? '<a href="' + nextSlide + '" style="color:#FFF;text-decoration:none;background:rgba(49,134,255,0.28);padding:5px 14px;border-radius:18px;border:1px solid #8AB4F8;font:700 13px var(--font-display);display:inline-flex;align-items:center;gap:4px;">Next Slide ▶</a>'
    : '<a href="' + rootPrefix + 'index.html" style="color:#FFF;text-decoration:none;background:rgba(0,175,87,0.28);padding:5px 14px;border-radius:18px;border:1px solid #5BB974;font:700 13px var(--font-display);display:inline-flex;align-items:center;gap:4px;">All Slides ↻</a>';

  hud.innerHTML =
    prevHtml +
    '<button id="hudSlideMenuBtn" type="button" title="Jump to any slide" style="background:transparent;border:none;color:#8AB4F8;font:700 13px var(--font-mono);min-width:62px;text-align:center;cursor:pointer;padding:4px 6px;border-radius:8px;">' + curStr + ' / ' + totStr + ' ▾</button>' +
    nextHtml +
    '<button id="hudFsBtn" type="button" title="Toggle Fullscreen (F)" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);color:#E2E8F0;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center;">⛶</button>';

  document.body.appendChild(hud);

  // Slide Switcher Popover
  var menu = document.createElement('div');
  menu.id = 'hudSlideMenu';
  menu.style.cssText = 'position:fixed;bottom:72px;right:24px;width:350px;max-height:72vh;overflow-y:auto;background:var(--surface);border:1px solid var(--border-subtle);border-radius:16px;box-shadow:var(--shadow-lg);padding:10px;z-index:9991;display:none;';
  menu.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px 8px;border-bottom:1px solid var(--border-subtle);margin-bottom:6px;">' +
      '<span style="font:600 11px var(--font-mono);text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);">All Slides (00–15)</span>' +
      '<a href="' + rootPrefix + 'index.html" style="font:600 12px var(--font-display);color:var(--blue-ink);">Briefing Map ↗</a>' +
    '</div>' +
    window.SC_SLIDE_DECK.map(function (s, idx) {
      var isActive = idx === curIdx;
      return '<a href="' + rootPrefix + s.path + '" style="display:flex;align-items:center;gap:10px;padding:7px 9px;border-radius:10px;font:500 13px var(--font-display);text-decoration:none;color:' + (isActive ? 'var(--blue-ink)' : 'var(--text)') + ';background:' + (isActive ? 'color-mix(in srgb, var(--g-blue) 12%, var(--surface))' : 'transparent') + ';">' +
        '<span style="font:700 11px var(--font-mono);opacity:.75;">' + s.num + '</span>' +
        '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.title + '</span>' +
      '</a>';
    }).join('');
  document.body.appendChild(menu);

  function toggleMenu(e) {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
  document.getElementById('hudSlideMenuBtn').addEventListener('click', toggleMenu);
  document.querySelectorAll('.top-all-slides').forEach(function (el) { el.addEventListener('click', toggleMenu); });
  document.addEventListener('click', function (e) {
    if (!menu.contains(e.target) && e.target.id !== 'hudSlideMenuBtn' && !e.target.classList.contains('top-all-slides')) {
      menu.style.display = 'none';
    }
  });

  function toggleFs() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen();
    }
  }
  document.getElementById('hudFsBtn').addEventListener('click', toggleFs);

  // Keyboard navigation (Left / Right arrows, F for fullscreen, Esc for map)
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if (e.key === 'ArrowRight' && nextSlide) window.location.href = nextSlide;
    if (e.key === 'ArrowLeft' && prevSlide) window.location.href = prevSlide;
    if (e.key === 'f' || e.key === 'F') toggleFs();
    if (e.key === 'Escape') window.location.href = rootPrefix + 'index.html';
  });
};
