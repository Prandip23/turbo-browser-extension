# ⚡ Turbo Browser Extension

> A Brave / Chrome extension that accelerates page loads, detects waiting rooms and rate limits in real time, injects connection optimizations automatically, and now summarizes any page on demand with Azure OpenAI — built for booking sites, ticketing portals, government services, and long-form reading.

![Version](https://img.shields.io/badge/version-1.1.0-cyan)
![Manifest](https://img.shields.io/badge/manifest-v3-purple)
![License](https://img.shields.io/badge/license-MIT-green)
![Browser](https://img.shields.io/badge/browser-Brave%20%7C%20Chrome-orange)

---

## What it does

Most booking portals (IRCTC, ticketing sites, airline portals, government services) use queue systems and rate limiting to manage traffic, and most long-form pages bury the point under ads and boilerplate. Turbo Browser works silently in the background to:

- **Inject preconnect + DNS prefetch hints** for every external domain on the page, warming up connections before the browser would normally bother.
- **Detect queue systems** in real time — Cloudflare Waiting Room, Akamai, Queue-it, custom PHP waitrooms, and more — by inspecting response headers and JS globals.
- **Alert you instantly** via desktop notification when a queue or rate limit is detected.
- **Show detailed performance timings** — DNS lookup, TCP connect, TLS handshake, TTFB, DOM ready, total load — for every page you visit.
- **Log every network event** so you can see exactly what's happening on any site.
- **Summarize any page** with one click using Azure OpenAI (TLDR / Bullets / ELI5 / Facts / Bias modes) via your own Azure API Management endpoint.

---

## Popup tour

The toolbar popup has five tabs:

| Tab | What it shows |
|-----|---------------|
| **STATS** | Live load time, request count, estimated time saved, transport protocol, queue alert banner |
| **PERF** | Horizontal bar breakdown: DNS → TCP → TLS → TTFB → DOM ready → Total |
| **LOG** | Real-time stream of every navigation event, queue signal, and optimization action |
| **AI ✦** | One-click page summarizer with five modes (TLDR, Bullets, ELI5, Facts, Bias) |
| **CONFIG** | Per-feature toggles persisted in `chrome.storage.local` |

---

## Installation (Brave / Chrome)

> No Chrome Web Store needed — load it directly in developer mode.

**Step 1 — Download**

```bash
git clone https://github.com/Prandip23/turbo-browser-extension.git
```

Or click **Code → Download ZIP** on GitHub and unzip it.

**Step 2 — (Optional) Configure the AI Summarizer**

The AI summarizer requires a running backend. The full backend setup — FastAPI on Azure App Service, Azure API Management config, Azure OpenAI deployment, and environment variables — is documented in the companion repo:

> **[smart-page-summarizer-api](https://github.com/Prandip23/smart-page-summarizer-api)** — the Azure FastAPI backend that powers the AI ✦ tab.

Once you have the backend deployed, open [api_client.js](api_client.js) and fill in your APIM endpoint and subscription key:

```js
const APIM_ENDPOINT = "https://<your-apim>.azure-api.net/summarize";
const APIM_KEY      = "<your-subscription-key>";
```

If you don't want AI summarization, just turn off the **AI Summarizer** toggle on the **CONFIG** tab — the rest of the extension works fine without it.

> ⚠️ **Never commit your real subscription key.** Treat `api_client.js` as a local-only file (add it to `.gitignore` or template it at build time). If a key is ever exposed, rotate it immediately from the Azure Portal under your APIM instance → *Subscriptions* → *Regenerate primary key*.

**Step 3 — Open Extensions**

- Brave: `brave://extensions`
- Chrome: `chrome://extensions`

**Step 4 — Enable Developer Mode**

Toggle **Developer mode** ON (top-right corner).

**Step 5 — Load the extension**

Click **Load unpacked** → select the folder containing `manifest.json` → click OK.

The ⚡ Turbo icon will appear in your toolbar. Click it to open the dashboard.

---

## File structure

```
turbo-browser-extension/
├── manifest.json       # Extension manifest (Manifest V3)
├── background.js       # Service worker — header monitoring, queue detection, stats
├── content.js          # Content script — preconnect injection, JS queue probing, perf timing
├── api_client.js       # APIM client for the AI summarizer (Azure OpenAI)
├── popup.html          # Extension popup UI (5 tabs)
├── popup.js            # Popup logic — tab switching, stats, settings, summarizer
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── CHANGELOG.md
├── LICENSE
└── README.md
```

---

## How it works

### Connection pre-warming (`content.js`)

Runs at `document_start` — before the page has finished parsing — and scans every `<script src>`, `<link href>`, `<img src>`, `<iframe src>`, `<source src>`, and `<form action>` element. For each unique cross-origin host it finds, it injects:

```html
<link rel="dns-prefetch" href="https://cdn.example.com" />
<link rel="preconnect"   href="https://cdn.example.com" crossorigin />
```

A `MutationObserver` watches for elements added dynamically and injects hints for those too. This can save **80–400 ms** on sites with many third-party resources.

### Queue & throttle detection (`background.js`)

Every HTTP response is inspected for known queue signals:

| Header | System |
|--------|--------|
| `cf-waiting-room` | Cloudflare Waiting Room |
| `x-waiting-room` | Generic waiting room |
| `x-queue-id` | Queue-it |
| `x-akamai-queue` | Akamai |
| `retry-after` | Generic rate limit |
| `x-ratelimit-remaining` | API rate limit |
| `x-rate-limit-reset` | API rate limit reset window |

HTTP status codes `429` (Too Many Requests) and `503` (Service Unavailable) also trigger log entries and notifications.

The content script additionally probes for JS-side queue signals — `window.queueit`, `window.__cfWaitingRoom`, queue-related cookies (`queueit`, `cf_clearance`), and queue-related text in the page title or body.

### Performance timing (`content.js`)

After `window.load`, the [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API) is used to collect:

- DNS lookup duration
- TCP connection time
- TLS handshake time
- Time to First Byte (TTFB)
- DOM content loaded time
- Total page load time
- Transport protocol (h2, h3, http/1.1)

These are sent to the background worker and rendered in the **PERF** tab.

### AI page summarization (`api_client.js` + `popup.js`)

When you click **⚡ SUMMARIZE THIS PAGE**:

1. `chrome.scripting.executeScript` extracts the page's full HTML from the active tab.
2. `popup.js` posts `{ html_content, mode }` to your APIM endpoint via `api_client.js`.
3. APIM forwards to the **[smart-page-summarizer-api](https://github.com/Prandip23/smart-page-summarizer-api)** — a FastAPI service on Azure App Service that cleans the HTML and calls Azure OpenAI (`gpt-5.1`).
4. The response (`summary`, `word_count`, `reading_time_minutes`) is rendered in the AI panel.

Full backend setup, API reference, Azure deployment instructions, and environment variable config are in the **[smart-page-summarizer-api repo](https://github.com/Prandip23/smart-page-summarizer-api)**.

Available modes:

| Mode | Output |
|------|--------|
| **TLDR** | Short-sentence takeaway |
| **BULLETS** | Numbered key points |
| **ELI5** | Explain Like I'm 5 |
| **FACTS** | Standalone factual claims |
| **BIAS** | Tone, framing, and slant analysis |

The summarizer is **opt-in** — disable it in **CONFIG** and the AI tab is hidden.

---

## Permissions explained

| Permission | Why it's needed |
|------------|-----------------|
| `webRequest` | Inspect HTTP response headers for queue signals |
| `webNavigation` | Detect when navigation starts/ends for accurate timing |
| `storage` | Save settings, per-tab stats, and latest perf snapshot |
| `tabs` | Identify the currently active tab |
| `notifications` | Desktop alert when a queue is detected |
| `scripting` | Read the page's HTML for the AI summarizer |
| `declarativeNetRequest` | Reserved for future request modification rules |
| `host_permissions: <all_urls>` | Required to monitor requests on all sites |

---

## Supported queue systems

| System | Detection method |
|--------|-----------------|
| Cloudflare Waiting Room | `cf-waiting-room` header + `__cfWaitingRoom` JS global + `cf_clearance` cookie |
| Queue-it | `x-queue-id` header + `queueit` cookie + JS SDK |
| Akamai queue | `x-akamai-queue` header |
| Generic rate limiting | HTTP 429 + `retry-after` / `x-ratelimit-*` headers |
| Custom PHP waitrooms | Page title / body text scan + cookie rotation detection |
| AWS WAF throttle | HTTP 503 detection |

---

## Known sites where this helps

- IRCTC (Indian Railways ticketing)
- Tatkal booking portals
- Airline booking portals (IndiGo, Air India, SpiceJet)
- Government service portals
- Ticketmaster / BookMyShow
- Any site behind Cloudflare, Akamai, or Queue-it

---

## Contributing

Pull requests are welcome. To contribute:

```bash
git clone https://github.com/Prandip23/turbo-browser-extension.git
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
- [ ] Move APIM key to a CONFIG-tab input instead of source
- [ ] Cache summaries per-URL to avoid redundant API calls

---

## Related Repositories

| Repo | Description |
|------|-------------|
| **[turbo-browser-extension](https://github.com/Prandip23/turbo-browser-extension)** | This repo — the Brave/Chrome extension |
| **[smart-page-summarizer-api](https://github.com/Prandip23/smart-page-summarizer-api)** | Azure FastAPI backend powering the AI ✦ tab (APIM + Azure OpenAI gpt-5.1) |

---

## License

MIT — see [LICENSE](LICENSE). Free to use, modify, and distribute.

---

## Disclaimer

This extension optimizes your browser's connection behaviour using standard web APIs. It does not bypass authentication, circumvent paywalls, or violate any website's terms of service. Queue detection is read-only — it observes headers and alerts you; it does not modify requests or fake queue tokens. The AI summarizer sends the active page's HTML to **your own** Azure OpenAI deployment via APIM — no third-party service receives the content.
