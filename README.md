# ⚡ Turbo Browser Extension

> A Brave/Chrome extension that accelerates page loads, detects waiting rooms and rate limits in real time, and injects connection optimizations automatically — built for booking sites, ticketing portals, and government services.

![Version](https://img.shields.io/badge/version-1.0.0-cyan)
![Manifest](https://img.shields.io/badge/manifest-v3-purple)
![License](https://img.shields.io/badge/license-MIT-green)
![Browser](https://img.shields.io/badge/browser-Brave%20%7C%20Chrome-orange)

---

## What it does

Most booking portals (IRCTC, ticketing sites, airline portals, government services) use queue systems and rate limiting to manage traffic. This extension works silently in the background to:

- **Inject preconnect + DNS prefetch hints** for every external domain on the page, warming up connections before the browser would normally bother
- **Detect queue systems** in real time — Cloudflare Waiting Room, Akamai Queue-it, custom PHP waitrooms, and more — by inspecting response headers and JS globals
- **Alert you instantly** via desktop notification when a queue or rate limit is detected
- **Show detailed performance timings** — DNS lookup, TCP connect, TLS handshake, TTFB, DOM ready — for every page you visit
- **Log every network event** so you can see exactly what's happening on any site

---

## Screenshots

### Stats Panel
Displays live load time, request count, estimated time saved, and transport protocol.

### Perf Panel
Visual breakdown of DNS → TCP → TLS → TTFB → DOM timings as horizontal bars.

### Log Panel
Real-time console showing every navigation event, queue signal, and optimization action.

### Settings Panel
Toggle each optimization on or off individually.

---

## Installation (Brave / Chrome)

> No Chrome Web Store needed — load it directly in developer mode.

**Step 1 — Download**

Clone this repo or download the ZIP:

```bash
git clone https://github.com/YOUR_USERNAME/turbo-browser-extension.git
```

Or click **Code → Download ZIP** on GitHub and unzip it.

**Step 2 — Open Extensions**

- Brave: type `brave://extensions` in the address bar
- Chrome: type `chrome://extensions` in the address bar

**Step 3 — Enable Developer Mode**

Toggle **Developer mode** ON (top-right corner).

**Step 4 — Load the extension**

Click **Load unpacked** → select the folder containing `manifest.json` → click OK.

The ⚡ Turbo icon will appear in your toolbar. Click it to open the dashboard.

---

## File structure

```
turbo-browser-extension/
├── manifest.json       # Extension manifest (Manifest V3)
├── background.js       # Service worker — header monitoring, queue detection, stats
├── content.js          # Content script — preconnect injection, JS queue probing, perf timing
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic — tab switching, stats display, settings
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## How it works

### Connection pre-warming (`content.js`)

Runs at `document_start` — before the page has finished parsing — and scans every `<script src>`, `<link href>`, `<img src>`, and `<form action>` element. For each unique external origin it finds, it injects:

```html
<link rel="dns-prefetch" href="https://cdn.example.com" />
<link rel="preconnect" href="https://cdn.example.com" crossorigin />
```

A `MutationObserver` watches for any elements added dynamically and injects hints for those too. This can save **80–400ms** on sites with many third-party resources.

### Queue & throttle detection (`background.js`)

Every HTTP response is inspected for known queue signals:

| Header | System |
|--------|--------|
| `cf-waiting-room` | Cloudflare Waiting Room |
| `x-queue-id` | Queue-it |
| `x-akamai-queue` | Akamai |
| `retry-after` | Generic rate limit |
| `x-ratelimit-remaining` | API rate limit |

HTTP status codes `429` (Too Many Requests) and `503` (Service Unavailable) also trigger alerts.

The content script additionally probes for JS-side queue signals — `window.queueit`, `window.__cfWaitingRoom`, queue-related cookies, and queue-related text in the page title or body.

### Performance timing (`content.js`)

After `window.load`, the [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API) is used to collect:

- DNS lookup duration
- TCP connection time
- TLS handshake time
- Time to First Byte (TTFB)
- DOM content loaded time
- Total page load time
- Transport protocol (h2, h3, http/1.1)

These are sent to the background worker and displayed in the **PERF** tab.

---

## Permissions explained

| Permission | Why it's needed |
|------------|-----------------|
| `webRequest` | Inspect HTTP response headers for queue signals |
| `webNavigation` | Detect when navigation starts/ends for accurate timing |
| `storage` | Save settings and per-tab stats |
| `tabs` | Identify the currently active tab |
| `notifications` | Desktop alert when a queue is detected |
| `declarativeNetRequest` | Reserved for future request modification rules |
| `host_permissions: <all_urls>` | Required to monitor requests on all sites |

---

## Supported queue systems

| System | Detection method |
|--------|-----------------|
| Cloudflare Waiting Room | `cf-waiting-room` header + `__cfWaitingRoom` JS global |
| Queue-it (Akamai) | `x-queue-id` header + `queueit` cookie + JS SDK |
| Generic rate limiting | HTTP 429 + `retry-after` header |
| Custom PHP waitrooms | Page title/body text scan + cookie rotation detection |
| AWS WAF throttle | HTTP 503 detection |

---

## Known sites where this helps

- IRCTC (Indian Railways ticketing)
- Tatkal booking portals
- Airline booking portals (IndiGo, Air India, SpiceJet)
- Government service portals
- Ticketmaster / BookMyShow
- Any site behind Cloudflare or Akamai

---

## Contributing

Pull requests are welcome. To contribute:

```bash
git clone https://github.com/YOUR_USERNAME/turbo-browser-extension.git
cd turbo-browser-extension
# Make your changes
# Load unpacked in Brave/Chrome to test
# Submit a PR
```

Ideas for future improvements:
- [ ] Auto-retry on 429 with configurable backoff
- [ ] Export performance reports as JSON/CSV
- [ ] Custom blocklist for known slow CDNs
- [ ] Support for Firefox (Manifest V2 port)

---

## License

MIT — free to use, modify, and distribute.

---

## Disclaimer

This extension optimizes your browser's connection behaviour using standard web APIs. It does not bypass authentication, circumvent paywalls, or violate any website's terms of service. Queue detection is read-only — it observes headers and alerts you; it does not modify requests or fake queue tokens.
