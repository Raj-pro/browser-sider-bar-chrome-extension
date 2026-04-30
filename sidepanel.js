const urlInput  = document.getElementById('url-input');
const clearBtn  = document.getElementById('clear-btn');
const goBtn     = document.getElementById('go-btn');
const refreshBtn = document.getElementById('refresh-btn');
const tabsEl    = document.getElementById('tabs');
const newTabBtn = document.getElementById('new-tab-btn');
const content   = document.getElementById('content');
const loadingBar = document.getElementById('loading-bar');

let tabs = [];
let activeId = null;
let nextId = 1;

/* ── Helpers ── */
function normalize(raw) {
  const url = raw.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.includes('.') && !url.includes(' ')) return 'https://' + url;
  return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
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

function showLoading() {
  loadingBar.classList.add('loading');
}
function hideLoading() {
  loadingBar.classList.remove('loading');
}

/* ── URL input helpers ── */
urlInput.addEventListener('input', () => {
  clearBtn.style.display = urlInput.value ? 'flex' : 'none';
});
clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.style.display = 'none';
  urlInput.focus();
});

/* ── Tab management ── */
function createTab(url) {
  const id = nextId++;

  // Frame or placeholder
  let frameEl = null;
  let placeholderEl = null;

  if (url) {
    frameEl = makeFrame(url);
    content.appendChild(frameEl);
  } else {
    placeholderEl = makePlaceholder();
    content.appendChild(placeholderEl);
  }

  // Tab element
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.dataset.id = id;
  tabEl.innerHTML = `
    <span class="tab-icon">🌐</span>
    <span class="tab-title">${url ? labelFromUrl(url) : 'New Tab'}</span>
    <button class="tab-close" title="Close tab">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/>
      </svg>
    </button>`;

  if (url) setTabFavicon(tabEl, url);

  tabEl.addEventListener('click', e => {
    if (!e.target.classList.contains('tab-close')) switchTab(id);
  });
  tabEl.querySelector('.tab-close').addEventListener('click', e => {
    e.stopPropagation();
    closeTab(id);
  });

  tabsEl.appendChild(tabEl);
  tabs.push({ id, url: url || null, tabEl, frameEl, placeholderEl });
  switchTab(id);

  // Scroll new tab into view
  tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
}

function makeFrame(url) {
  const f = document.createElement('iframe');
  f.className = 'tab-frame';
  f.allow = 'clipboard-read; clipboard-write';
  f.src = url;
  showLoading();
  f.addEventListener('load', hideLoading);
  return f;
}

function makePlaceholder() {
  const d = document.createElement('div');
  d.className = 'placeholder';
  d.innerHTML = `
    <div class="placeholder-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    </div>
    <div class="placeholder-text">
      <h3>New Tab</h3>
      <p>Type a URL, search term, or<br/>pick a quick-access preset below.</p>
    </div>
    <div class="placeholder-shortcuts">
      <span class="shortcut-hint"><kbd>Ctrl T</kbd> New tab</span>
      <span class="shortcut-hint"><kbd>Ctrl W</kbd> Close</span>
      <span class="shortcut-hint"><kbd>Ctrl L</kbd> Focus URL</span>
    </div>`;
  return d;
}

function setTabFavicon(tabEl, url) {
  const iconEl = tabEl.querySelector('.tab-icon');
  const img = document.createElement('img');
  img.src = faviconFor(url);
  img.onerror = () => { iconEl.textContent = '🌐'; };
  img.onload = () => { iconEl.innerHTML = ''; iconEl.appendChild(img); };
}

function switchTab(id) {
  activeId = id;

  tabs.forEach(t => {
    const on = t.id === id;
    t.tabEl.classList.toggle('active', on);
    if (t.frameEl) t.frameEl.classList.toggle('active', on);
    if (t.placeholderEl) t.placeholderEl.style.display = on ? 'flex' : 'none';
  });

  const active = tabs.find(t => t.id === id);
  urlInput.value = active?.url || '';
  clearBtn.style.display = urlInput.value ? 'flex' : 'none';
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

function navigateActive(raw) {
  const url = normalize(raw);
  if (!url) return;

  const active = tabs.find(t => t.id === activeId);
  if (!active) return;

  if (active.placeholderEl) {
    active.placeholderEl.remove();
    active.placeholderEl = null;
    active.frameEl = makeFrame(url);
    active.frameEl.classList.add('active');
    content.appendChild(active.frameEl);
  } else {
    showLoading();
    active.frameEl.src = url;
  }

  active.url = url;
  urlInput.value = url;
  clearBtn.style.display = 'block';

  active.tabEl.querySelector('.tab-title').textContent = labelFromUrl(url);
  setTabFavicon(active.tabEl, url);
}

function reloadActive() {
  const active = tabs.find(t => t.id === activeId);
  if (!active?.frameEl) return;
  showLoading();
  active.frameEl.src = active.frameEl.src;
}

/* ── Events ── */
goBtn.addEventListener('click', () => navigateActive(urlInput.value));
urlInput.addEventListener('keydown', e => e.key === 'Enter' && navigateActive(urlInput.value));
refreshBtn.addEventListener('click', reloadActive);
newTabBtn.addEventListener('click', () => createTab(null));

document.querySelectorAll('.chip').forEach(btn =>
  btn.addEventListener('click', () => {
    urlInput.value = btn.dataset.url;
    navigateActive(btn.dataset.url);
  })
);

// Ctrl+T → new tab
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 't') { e.preventDefault(); createTab(null); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'w') { e.preventDefault(); closeTab(activeId); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); urlInput.select(); }
});

// Presets toggle
const presetsWrap   = document.getElementById('presets-wrap');
const presetsToggle = document.getElementById('presets-toggle');

function setPresetsCollapsed(collapsed) {
  presetsWrap.classList.toggle('collapsed', collapsed);
  presetsToggle.classList.toggle('collapsed', collapsed);
  localStorage.setItem('presetsCollapsed', collapsed);
}

presetsToggle.addEventListener('click', () => {
  const isCollapsed = presetsWrap.classList.contains('collapsed');
  setPresetsCollapsed(!isCollapsed);
});

// Restore saved state
setPresetsCollapsed(localStorage.getItem('presetsCollapsed') === 'true');

// Start
createTab(null);
