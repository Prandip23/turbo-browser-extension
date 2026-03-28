// Turbo Browser — popup.js
// All event listeners attached via addEventListener (no inline onclick — CSP requirement)

const settingsDefs = [
  { id:'preconnect', name:'Preconnect injection',   desc:'Auto-add preconnect hints for all domains',       on:true },
  { id:'dns',        name:'DNS prefetch',           desc:'Resolve hostnames before you click',              on:true },
  { id:'queue',      name:'Queue detection',        desc:'Alert on waiting rooms & rate limits',            on:true },
  { id:'notify',     name:'Desktop notifications', desc:'Notify when a queue is detected',                 on:true },
  { id:'perf',       name:'Perf timing report',    desc:'Collect & display detailed load timings',         on:true },
];

let currentSettings = {};
let perfData = null;

function ms(v) { return (v != null && v !== undefined) ? v + 'ms' : '—'; }
function pct(v, max) { return (max && max > 0) ? Math.min(100, Math.round((v / max) * 100)) : 0; }
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const tabEl = document.querySelector(`.tab[data-tab="${name}"]`);
  const panelEl = document.getElementById('panel-' + name);
  if (tabEl) tabEl.classList.add('active');
  if (panelEl) panelEl.classList.add('active');
  if (name === 'perf') renderPerf();
  if (name === 'log') renderFullLog();
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ── SETTINGS ─────────────────────────────────────────────────────────────
function buildSettings() {
  chrome.storage.local.get('turbo_settings', (res) => {
    currentSettings = res.turbo_settings || {};
    settingsDefs.forEach(s => {
      if (currentSettings[s.id] === undefined) currentSettings[s.id] = s.on;
    });
    const c = document.getElementById('settings-container');
    c.innerHTML = '';
    settingsDefs.forEach(s => {
      const row = document.createElement('div');
      row.className = 'setting-row';
      row.innerHTML = `
        <div>
          <div class="sn">${escHtml(s.name)}</div>
          <div class="sd">${escHtml(s.desc)}</div>
        </div>
        <div class="toggle ${currentSettings[s.id] ? 'on' : ''}" data-id="${s.id}"></div>
      `;
      row.querySelector('.toggle').addEventListener('click', function() {
        this.classList.toggle('on');
        currentSettings[s.id] = this.classList.contains('on');
        chrome.storage.local.set({ turbo_settings: currentSettings });
      });
      c.appendChild(row);
    });
  });
}

// ── LOG ───────────────────────────────────────────────────────────────────
let renderedLogCount = 0;

function renderLogEntry(entry, box) {
  const div = document.createElement('div');
  div.className = 'll';
  const t = new Date(entry.t).toLocaleTimeString('en-US', { hour12: false });
  div.innerHTML = `<span class="lt">[${t}]</span><span class="l${entry.type}">${escHtml(entry.msg)}</span>`;
  box.appendChild(div);
}

function renderFullLog() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => {
    if (!res || !res.stats) return;
    const box = document.getElementById('log-box');
    const entries = res.stats.log || [];
    box.innerHTML = '';
    renderedLogCount = 0;
    entries.forEach(e => renderLogEntry(e, box));
    renderedLogCount = entries.length;
    box.scrollTop = box.scrollHeight;
  });
}

// ── PERF BARS ─────────────────────────────────────────────────────────────
function renderPerf() {
  if (!perfData) {
    // Try fetching from storage
    chrome.storage.local.get('turbo_perf', (res) => {
      if (res && res.turbo_perf) { perfData = res.turbo_perf; applyPerfBars(); }
    });
    return;
  }
  applyPerfBars();
}

function applyPerfBars() {
  if (!perfData) return;
  const { dns, tcp, tls, ttfb, domReady, total } = perfData;
  const max = total || 1;
  [
    ['dns', dns], ['tcp', tcp], ['tls', tls],
    ['ttfb', ttfb], ['dom', domReady], ['tot', total],
  ].forEach(([key, val]) => {
    const b = document.getElementById('b-' + key);
    const t = document.getElementById('t-' + key);
    if (b) b.style.width = pct(val, max) + '%';
    if (t) t.textContent = ms(val);
  });
}

// ── STATS PANEL ───────────────────────────────────────────────────────────
function updateStats(stats, url) {
  try {
    const u = new URL(url);
    document.getElementById('url-strip').textContent = u.hostname + u.pathname.substring(0, 40);
  } catch(_) {
    document.getElementById('url-strip').textContent = url || '—';
  }

  if (!stats) return;

  const lt = stats.loadTime;
  document.getElementById('s-load').textContent = lt ? (lt / 1000).toFixed(2) + 's' : '—';
  document.getElementById('s-load-sub').textContent = lt ? 'completed' : 'loading…';
  document.getElementById('s-req').textContent = stats.requests || 0;
  document.getElementById('s-saved').textContent = stats.savedMs ? stats.savedMs + 'ms' : '0ms';

  if (perfData && perfData.protocol) {
    document.getElementById('s-proto').textContent = perfData.protocol.toUpperCase();
    document.getElementById('s-proto-sub').textContent = 'transport';
  }

  const alert = document.getElementById('queue-alert');
  if (stats.queueDetected) {
    alert.className = 'queue-alert detected';
    document.getElementById('qa-title').textContent = '⚠ Queue / throttle detected';
    document.getElementById('qa-msg').textContent = stats.queueLabel || 'Queue signal in response headers';
  } else {
    alert.className = 'queue-alert clear';
    document.getElementById('qa-title').textContent = '✓ No queue detected';
    document.getElementById('qa-msg').textContent = 'Direct access — no waiting room or throttle found';
  }

  document.getElementById('footer-note').textContent =
    `Turbo v1.0 — ${stats.requests || 0} reqs monitored`;
}

// ── CLEAR BUTTON ──────────────────────────────────────────────────────────
document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_STATS' });
  const box = document.getElementById('log-box');
  box.innerHTML = '<div class="ll"><span class="lt">--:--:--</span><span class="li">Stats cleared.</span></div>';
  renderedLogCount = 0;
  perfData = null;
  ['b-dns','b-tcp','b-tls','b-ttfb','b-dom','b-tot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.width = '0%';
  });
  ['t-dns','t-tcp','t-tls','t-ttfb','t-dom','t-tot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
});

// ── POLL ─────────────────────────────────────────────────────────────────
function refresh() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => {
    if (!res) return;
    updateStats(res.stats, res.url);

    // Append any new log entries to log panel if it's visible
    const logPanel = document.getElementById('panel-log');
    if (logPanel.classList.contains('active')) {
      const box = document.getElementById('log-box');
      const entries = (res.stats && res.stats.log) || [];
      const newEntries = entries.slice(renderedLogCount);
      newEntries.forEach(e => renderLogEntry(e, box));
      renderedLogCount = entries.length;
      if (newEntries.length) box.scrollTop = box.scrollHeight;
    }
  });

  chrome.storage.local.get('turbo_perf', (res) => {
    if (res && res.turbo_perf) {
      perfData = res.turbo_perf;
      const perfPanel = document.getElementById('panel-perf');
      if (perfPanel.classList.contains('active')) applyPerfBars();
    }
  });
}

// ── INIT ─────────────────────────────────────────────────────────────────
buildSettings();
refresh();
setInterval(refresh, 1500);
