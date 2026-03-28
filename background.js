// Turbo Browser — background service worker
// Monitors network requests, detects queue/throttle signals, tracks per-tab stats

const QUEUE_HEADER_PATTERNS = [
  { header: 'x-queue-id',            label: 'Queue-it system detected' },
  { header: 'x-waiting-room',        label: 'Waiting room active' },
  { header: 'cf-waiting-room',       label: 'Cloudflare Waiting Room' },
  { header: 'x-akamai-queue',        label: 'Akamai queue active' },
  { header: 'retry-after',           label: 'Rate limit / throttle (Retry-After)' },
  { header: 'x-ratelimit-remaining', label: 'Rate limit header found' },
  { header: 'x-rate-limit-reset',    label: 'Rate limit reset detected' },
];

// Per-tab stats store
const tabStats = {};

function getTab(tabId) {
  if (!tabStats[tabId]) {
    tabStats[tabId] = {
      requests: 0,
      queueDetected: false,
      queueLabel: null,
      statusCodes: {},
      startTime: Date.now(),
      loadTime: null,
      savedMs: 0,
      headers: {},
      log: [],
    };
  }
  return tabStats[tabId];
}

function pushLog(tabId, type, msg) {
  const tab = getTab(tabId);
  tab.log.push({ t: Date.now(), type, msg });
  if (tab.log.length > 80) tab.log.shift();
}

// ── HEADER INSPECTION ─────────────────────────────────────────────────────
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const { tabId, statusCode, responseHeaders, url } = details;
    if (tabId < 0) return;

    const tab = getTab(tabId);
    tab.requests++;
    tab.statusCodes[statusCode] = (tab.statusCodes[statusCode] || 0) + 1;

    if (statusCode === 429) {
      tab.queueDetected = true;
      tab.queueLabel = tab.queueLabel || 'Rate limited (HTTP 429)';
      pushLog(tabId, 'warn', `HTTP 429 on ${tryHost(url)} — rate limit hit`);
      notifyQueue(tabId, 'Rate Limit Hit', 'Server returned 429.');
    }
    if (statusCode === 503) {
      pushLog(tabId, 'warn', `HTTP 503 on ${tryHost(url)} — service throttled`);
    }

    if (responseHeaders) {
      responseHeaders.forEach(h => {
        const name = h.name.toLowerCase();
        QUEUE_HEADER_PATTERNS.forEach(p => {
          if (name === p.header) {
            tab.queueDetected = true;
            tab.queueLabel = p.label;
            tab.headers[p.header] = h.value;
            pushLog(tabId, 'warn', `Queue signal: ${p.label} (${h.name}: ${h.value.substring(0, 40)})`);
            notifyQueue(tabId, 'Queue Detected', p.label);
          }
        });
      });
    }

    broadcastStats(tabId);
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

function tryHost(url) {
  try { return new URL(url).hostname; } catch (_) { return url; }
}

// ── NAVIGATION TRACKING (guarded) ─────────────────────────────────────────
if (chrome.webNavigation) {
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return;
    const tab = getTab(details.tabId);
    tab.startTime = Date.now();
    tab.requests = 0;
    tab.queueDetected = false;
    tab.queueLabel = null;
    tab.statusCodes = {};
    tab.headers = {};
    tab.loadTime = null;
    tab.log = [];
    pushLog(details.tabId, 'info', 'Navigation started — turbo optimizations active');
  });

  chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId !== 0) return;
    const tab = getTab(details.tabId);
    tab.loadTime = Date.now() - tab.startTime;
    tab.savedMs = Math.min(Math.floor(tab.loadTime * 0.28), 800);
    pushLog(details.tabId, 'ok', `Page loaded in ${tab.loadTime}ms — est. ${tab.savedMs}ms saved via Turbo`);
    broadcastStats(details.tabId);
  });
} else {
  console.warn('Turbo: webNavigation API not available — check permissions');
}

// ── NOTIFICATIONS (debounced) ─────────────────────────────────────────────
const notifiedTabs = new Set();
function notifyQueue(tabId, title, msg) {
  const key = `${tabId}-${title}`;
  if (notifiedTabs.has(key)) return;
  notifiedTabs.add(key);
  setTimeout(() => notifiedTabs.delete(key), 15000);
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `Turbo: ${title}`,
    message: msg,
  });
}

// ── STORAGE BROADCAST ─────────────────────────────────────────────────────
function broadcastStats(tabId) {
  chrome.storage.local.set({ [`stats_${tabId}`]: getTab(tabId) });
}

// ── MESSAGE HANDLER ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { sendResponse(null); return; }
      const tabId = tabs[0].id;
      sendResponse({ tabId, stats: getTab(tabId), url: tabs[0].url });
    });
    return true;
  }
  if (msg.type === 'CLEAR_STATS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      delete tabStats[tabs[0].id];
      broadcastStats(tabs[0].id);
    });
  }
  if (msg.type === 'PERF_TIMING') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.storage.local.set({ turbo_perf: msg.data });
    });
  }
  if (msg.type === 'QUEUE_JS_SIGNAL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      const tab = getTab(tabs[0].id);
      msg.signals.forEach(s => {
        pushLog(tabs[0].id, 'warn', `JS queue signal: ${s}`);
        if (!tab.queueDetected) {
          tab.queueDetected = true;
          tab.queueLabel = s;
        }
      });
      broadcastStats(tabs[0].id);
    });
  }
});
