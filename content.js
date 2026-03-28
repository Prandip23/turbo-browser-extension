// Turbo Browser — content script (runs at document_start on every page)
// 1. Injects DNS prefetch + preconnect hints for all discovered hosts
// 2. Detects JS-based queue signals (Cloudflare, Queue-it etc.)
// 3. Reports findings back to background

(function () {
  'use strict';

  // ─── 1. PRECONNECT INJECTION ─────────────────────────────────────────────
  // Parse all resource URLs from link/script/img/iframe tags and inject
  // <link rel="preconnect"> + <link rel="dns-prefetch"> for unique origins

  function injectHint(rel, href) {
    if (!href || href.startsWith('data:') || href.startsWith('blob:')) return;
    try {
      const origin = new URL(href).origin;
      if (origin === window.location.origin) return;
      if (document.querySelector(`link[rel="${rel}"][href="${origin}"]`)) return;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = origin;
      if (rel === 'preconnect') link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch (_) {}
  }

  function injectHintsForEl(el) {
    const src = el.src || el.href || el.action || el.dataset.src;
    if (src) {
      injectHint('dns-prefetch', src);
      injectHint('preconnect', src);
    }
  }

  // Run immediately on existing elements
  function scanAndInject() {
    document.querySelectorAll('script[src], link[href], img[src], iframe[src], source[src], form[action]')
      .forEach(injectHintsForEl);
  }

  // Observe DOM additions in real time
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        injectHintsForEl(node);
        node.querySelectorAll && node.querySelectorAll('script[src], link[href], img[src]').forEach(injectHintsForEl);
      });
    });
  });

  if (document.head) {
    scanAndInject();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      scanAndInject();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  // ─── 2. QUEUE / WAITROOM JS DETECTION ────────────────────────────────────
  // Many queue systems inject global JS variables or cookies.
  // We probe for them and report to background.

  const QUEUE_JS_SIGNALS = [
    { test: () => typeof window.queueit !== 'undefined',          label: 'Queue-it JS SDK present' },
    { test: () => typeof window.__cfWaitingRoom !== 'undefined',  label: 'Cloudflare Waiting Room JS' },
    { test: () => document.cookie.includes('queueit'),            label: 'Queue-it cookie detected' },
    { test: () => document.cookie.includes('cf_clearance'),       label: 'Cloudflare clearance cookie' },
    { test: () => document.cookie.includes('__utmz'),             label: 'GA session (queue-aware)' },
    { test: () => /waiting|queue|waitroom|holding/i.test(document.title), label: 'Page title suggests queue' },
    { test: () => /waiting|queue|waitroom|you are in line/i.test(document.body && document.body.innerText || ''), label: 'Queue text in page body' },
  ];

  function detectQueueSignals() {
    const found = [];
    QUEUE_JS_SIGNALS.forEach(s => {
      try { if (s.test()) found.push(s.label); } catch (_) {}
    });
    if (found.length > 0) {
      chrome.runtime.sendMessage({ type: 'QUEUE_JS_SIGNAL', signals: found });
    }
  }

  // Run once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectQueueSignals);
  } else {
    detectQueueSignals();
  }

  // ─── 3. PERFORMANCE TIMING REPORT ────────────────────────────────────────
  // After load, report navigation timing to background for accurate stats

  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav) {
          chrome.runtime.sendMessage({
            type: 'PERF_TIMING',
            data: {
              dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
              tcp: Math.round(nav.connectEnd - nav.connectStart),
              tls: Math.round(nav.connectEnd - nav.secureConnectionStart),
              ttfb: Math.round(nav.responseStart - nav.requestStart),
              domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
              total: Math.round(nav.loadEventEnd - nav.startTime),
              protocol: nav.nextHopProtocol,
            }
          });
        }
      } catch (_) {}
    }, 500);
  });

})();
