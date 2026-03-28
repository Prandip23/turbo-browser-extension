# Changelog

All notable changes to Turbo Browser Extension will be documented here.

## [1.0.0] — 2026-03-28

### Added
- Initial release
- Real-time HTTP response header inspection for queue signals
- Cloudflare Waiting Room, Queue-it, Akamai, and generic rate limit detection
- Automatic DNS prefetch + preconnect hint injection via content script
- MutationObserver for dynamically added resources
- Navigation Timing API integration (DNS, TCP, TLS, TTFB, DOM, total)
- Desktop notifications on queue/throttle detection
- Four-tab popup UI: Stats, Perf, Log, Settings
- Per-setting toggles with chrome.storage persistence
- Live log stream from background service worker
- HTTP 429 and 503 status code alerts
- JS-side queue signal probing (window globals, cookies, page text)
