/* ═══════════════════════════════════════════════════════════════
   Sidebar Browser — sidepanel.js
═══════════════════════════════════════════════════════════════ */

/* ── Element refs ── */
const $ = id => document.getElementById(id);
const urlInput      = $('url-input');
const clearBtn      = $('clear-btn');
const goBtn         = $('go-btn');
const refreshBtn    = $('refresh-btn');
const backBtn       = $('back-btn');
const tabsEl        = $('tabs');
const newTabBtn     = $('new-tab-btn');
const contentEl     = $('content');
const loadingBar    = $('loading-bar');
const urlPrefix     = $('url-prefix');
const statusIcon    = $('status-icon');
const statusText    = $('status-text');
const presetsWrap   = $('presets-wrap');
const presetsToggle = $('presets-toggle');

/* ── State ── */
let tabs     = [];
let activeId = null;
let nextId   = 1;
let isLoading = false;

/* ═══ Helpers ══════════════════════════════════════════════════ */
function normalizeUrl(raw) {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.includes('.') && !s.includes(' ')) return 'https://' + s;
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

function labelFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') || 'New Tab'; }
  catch { return 'New Tab'; }
}

function faviconFor(url) {
  try {
    return `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(new URL(url).origin)}`;
  } catch { return null; }
}

function isHttps(url) {
  try { return new URL(url).protocol === 'https:'; }
  catch { return false; }
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

/* ── SVG fragments for status/prefix icons ── */
const SVG_GLOBE = `<svg class="icon" width="10" height="10" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const SVG_LOCK  = `<svg class="icon" width="10" height="10" viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const SVG_WARN  = `<svg class="icon" width="10" height="10" viewBox="0 0 24 24" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const SVG_SEARCH_SM = `<svg class="icon" width="11" height="11" viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;
const SVG_LOCK_SM   = `<svg class="icon" width="11" height="11" viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

/* ═══ Loading state ═════════════════════════════════════════════ */
function setLoading(on) {
  isLoading = on;
  loadingBar.classList.toggle('active', on);
  goBtn.classList.toggle('is-stop', on);
  refreshBtn.classList.toggle('is-loading', on);
  goBtn.title       = on ? 'Stop loading' : 'Go (Enter)';
  goBtn.setAttribute('aria-label', on ? 'Stop loading' : 'Navigate');
}

/* ═══ URL bar & status bar updates ═════════════════════════════ */
function updateUrlBar(url) {
  urlInput.value = url || '';
  clearBtn.style.display = url ? 'flex' : 'none';

  if (!url) {
    urlPrefix.className = '';
    urlPrefix.innerHTML = SVG_SEARCH_SM;
    return;
  }
  if (isHttps(url)) {
    urlPrefix.className = 'secure';
    urlPrefix.innerHTML = SVG_LOCK_SM;
  } else {
    urlPrefix.className = '';
    urlPrefix.innerHTML = SVG_SEARCH_SM;
  }
}

function updateStatusBar(url) {
  if (!url) {
    statusIcon.className = '';
    statusIcon.innerHTML = SVG_GLOBE;
    statusText.textContent = 'Ready';
    return;
  }
  const domain = getDomain(url);
  statusText.textContent = domain || url.slice(0, 50);

  if (isHttps(url)) {
    statusIcon.className = 'secure';
    statusIcon.innerHTML = SVG_LOCK;
  } else {
    statusIcon.className = 'warning';
    statusIcon.innerHTML = SVG_WARN;
  }
}

/* ═══ Tab management ════════════════════════════════════════════ */
function getActive() { return tabs.find(t => t.id === activeId) || null; }

function createTab(url) {
  const id = nextId++;

  const frameEl       = url ? makeFrame(url) : null;
  const placeholderEl = url ? null : makePlaceholder();

  if (frameEl)       contentEl.appendChild(frameEl);
  if (placeholderEl) contentEl.appendChild(placeholderEl);

  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.dataset.id = id;
  tabEl.setAttribute('role', 'tab');
  tabEl.setAttribute('aria-selected', 'false');
  tabEl.innerHTML = `
    <span class="tab-favicon" aria-hidden="true">
      <svg class="icon" width="12" height="12" viewBox="0 0 24 24" stroke-width="1.75">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    </span>
    <span class="tab-title">${url ? labelFromUrl(url) : 'New Tab'}</span>
    <button class="tab-close" title="Close tab (Ctrl+W)" aria-label="Close tab">
      <svg class="icon" width="8" height="8" viewBox="0 0 24 24" stroke-width="2.8">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  if (url) loadFavicon(tabEl, url);
  tabsEl.appendChild(tabEl);

  tabs.push({
    id,
    url: url || null,
    tabEl,
    frameEl,
    placeholderEl,
    history: url ? [url] : [],
    histIdx: url ? 0 : -1,
  });

  switchTab(id);
  tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
}

function makeFrame(url) {
  const f = document.createElement('iframe');
  f.className = 'tab-frame';
  f.allow = 'clipboard-read; clipboard-write';
  f.src = url;
  setLoading(true);
  f.addEventListener('load', () => setLoading(false));
  return f;
}

function makePlaceholder() {
  const d = document.createElement('div');
  d.className = 'placeholder';
  d.setAttribute('aria-label', 'New tab — enter a URL to navigate');
  d.innerHTML = `
    <div class="placeholder-mark" aria-hidden="true">
      <svg class="icon" viewBox="0 0 24 24" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    </div>
    <div class="placeholder-copy">
      <h2>Where to next?</h2>
      <p>Type a URL, search term, or pick<br/>a quick-access site below.</p>
    </div>
    <div class="placeholder-shortcuts">
      <span class="shortcut"><kbd>Ctrl T</kbd> New tab</span>
      <span class="shortcut"><kbd>Ctrl W</kbd> Close</span>
      <span class="shortcut"><kbd>Ctrl L</kbd> Focus URL</span>
      <span class="shortcut"><kbd>Ctrl Tab</kbd> Cycle tabs</span>
    </div>`;
  return d;
}

function loadFavicon(tabEl, url) {
  const src = faviconFor(url);
  if (!src) return;
  const img = new Image();
  img.width = 14;
  img.height = 14;
  img.onload = () => {
    const el = tabEl.querySelector('.tab-favicon');
    if (el) { el.innerHTML = ''; el.appendChild(img); }
  };
  img.src = src;
}

function switchTab(id) {
  activeId = id;
  const active = getActive();

  tabs.forEach(t => {
    const on = t.id === id;
    t.tabEl.classList.toggle('active', on);
    t.tabEl.setAttribute('aria-selected', String(on));
    if (t.frameEl)       t.frameEl.classList.toggle('active', on);
    if (t.placeholderEl) t.placeholderEl.style.display = on ? 'flex' : 'none';
  });

  const url = active?.url || null;
  updateUrlBar(url);
  updateStatusBar(url);
  backBtn.disabled = !active || active.histIdx <= 0;
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  const tab = tabs[idx];

  tab.tabEl.remove();
  tab.frameEl?.remove();
  tab.placeholderEl?.remove();
  tabs.splice(idx, 1);

  if (tabs.length === 0) {
    createTab(null);
  } else if (activeId === id) {
    switchTab(tabs[Math.min(idx, tabs.length - 1)].id);
  }
}

/* ═══ Navigation ════════════════════════════════════════════════ */
function navigateActive(raw) {
  const url = normalizeUrl(raw);
  if (!url) return;

  const active = getActive();
  if (!active) return;

  if (active.placeholderEl) {
    active.placeholderEl.remove();
    active.placeholderEl = null;
    active.frameEl = makeFrame(url);
    active.frameEl.classList.add('active');
    contentEl.appendChild(active.frameEl);
  } else {
    setLoading(true);
    active.frameEl.src = url;
  }

  active.url = url;

  /* Push to per-tab history, discarding any forward entries */
  active.history = active.history.slice(0, active.histIdx + 1);
  active.history.push(url);
  active.histIdx = active.history.length - 1;

  active.tabEl.querySelector('.tab-title').textContent = labelFromUrl(url);
  loadFavicon(active.tabEl, url);
  updateUrlBar(url);
  updateStatusBar(url);
  backBtn.disabled = active.histIdx <= 0;
}

function goBack() {
  const active = getActive();
  if (!active || active.histIdx <= 0) return;

  active.histIdx--;
  const url = active.history[active.histIdx];
  active.url = url;

  setLoading(true);
  active.frameEl.src = url;
  active.tabEl.querySelector('.tab-title').textContent = labelFromUrl(url);
  loadFavicon(active.tabEl, url);
  updateUrlBar(url);
  updateStatusBar(url);
  backBtn.disabled = active.histIdx <= 0;
}

function reloadActive() {
  const active = getActive();
  if (!active?.frameEl) return;
  setLoading(true);
  /* Force reload by resetting src */
  active.frameEl.src = active.frameEl.src;
}

function stopLoading() {
  const active = getActive();
  if (active?.frameEl) {
    try { active.frameEl.contentWindow.stop(); } catch (_) { /* cross-origin */ }
  }
  setLoading(false);
}

/* ═══ Event wiring ══════════════════════════════════════════════ */

/* URL input */
urlInput.addEventListener('input', () => {
  clearBtn.style.display = urlInput.value ? 'flex' : 'none';
});

urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    isLoading ? stopLoading() : navigateActive(urlInput.value);
  }
  if (e.key === 'Escape' && isLoading) stopLoading();
});

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.style.display = 'none';
  urlInput.focus();
});

/* Toolbar buttons */
goBtn.addEventListener('click',      () => isLoading ? stopLoading() : navigateActive(urlInput.value));
refreshBtn.addEventListener('click', reloadActive);
backBtn.addEventListener('click',    goBack);
newTabBtn.addEventListener('click',  () => createTab(null));

/* Tab container — single delegated listener */
tabsEl.addEventListener('click', e => {
  const closeEl = e.target.closest('.tab-close');
  if (closeEl) {
    e.stopPropagation();
    const tabEl = closeEl.closest('.tab');
    if (tabEl) closeTab(+tabEl.dataset.id);
    return;
  }
  const tabEl = e.target.closest('.tab');
  if (tabEl) switchTab(+tabEl.dataset.id);
});

/* Chips — delegated */
$('presets').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  navigateActive(chip.dataset.url);
});

/* Global keyboard shortcuts */
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 't') { e.preventDefault(); createTab(null); }
  if (mod && e.key === 'w') { e.preventDefault(); closeTab(activeId); }
  if (mod && e.key === 'l') { e.preventDefault(); urlInput.select(); }
  if (mod && e.key === 'r') { e.preventDefault(); reloadActive(); }
  if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }

  /* Ctrl+Tab / Ctrl+Shift+Tab — cycle tabs */
  if (mod && e.key === 'Tab') {
    e.preventDefault();
    if (!tabs.length) return;
    const idx  = tabs.findIndex(t => t.id === activeId);
    const next = e.shiftKey
      ? tabs[(idx - 1 + tabs.length) % tabs.length]
      : tabs[(idx + 1) % tabs.length];
    switchTab(next.id);
  }
});

/* ═══ Presets toggle ════════════════════════════════════════════ */
function setPresetsCollapsed(collapsed) {
  presetsWrap.classList.toggle('collapsed', collapsed);
  presetsToggle.classList.toggle('collapsed', collapsed);
  presetsToggle.setAttribute('aria-expanded', String(!collapsed));
  localStorage.setItem('presetsCollapsed', collapsed);
}

presetsToggle.addEventListener('click', () => {
  setPresetsCollapsed(!presetsWrap.classList.contains('collapsed'));
});

/* ═══ Init ══════════════════════════════════════════════════════ */
setPresetsCollapsed(localStorage.getItem('presetsCollapsed') === 'true');
createTab(null);
