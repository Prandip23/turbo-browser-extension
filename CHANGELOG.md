# Changelog

All notable changes to Turbo Browser Extension will be documented here.

## [1.1.0] — 2026-06-29

### Added
- **AI Summarizer** tab in the popup with five modes: TLDR, Bullets, ELI5, Facts, Bias
- `api_client.js` — APIM client that calls FastAPI → Azure OpenAI for page summarization
- `scripting` permission to extract page HTML for the summarizer
- `ai_summarizer` toggle in **CONFIG** (hides the AI tab when off)
- Word count and reading-time metadata returned with each summary

### Changed
- Popup is now five tabs (STATS / PERF / LOG / AI ✦ / CONFIG); footer updated to `v1.1`
- README rewritten to document the AI Summarizer, `api_client.js`, the new permission, and the expanded queue-header table
- Detection table now lists `x-waiting-room` and `x-rate-limit-reset` headers that were already wired in `background.js`

### Security
- README now explicitly warns against committing the APIM subscription key and documents how to rotate it from the Azure Portal

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
