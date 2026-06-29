# ⚡ Turbo Browser Extension

A Brave/Chrome extension that supercharges your browsing with real-time performance monitoring, queue detection, DNS prefetch injection — and an **AI-powered page summarizer** backed by Azure OpenAI.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Brave](https://img.shields.io/badge/Brave-Compatible-orange)
![Chrome](https://img.shields.io/badge/Chrome-Compatible-yellow)
![Azure OpenAI](https://img.shields.io/badge/Azure-OpenAI%20gpt--5.1-purple)

---

## ⚠️ AI Tab Requires Backend Setup

The **AI ✦** summarizer tab requires the backend API to be deployed first (If you plan to disable the AI Summarizer feature, you can skip directly to Step 4):

```
Step 1 → Deploy the backend API:
         https://github.com/Prandip23/smart-page-summarizer-api

Step 2 → Get your APIM endpoint + subscription key from Azure Portal

Step 3 → Update api_client.js in this extension with your values

Step 4 → Load the extension in Brave/Chrome
```

The other tabs (STATS, PERF, LOG, CONFIG) work without any backend.

---

## ✨ Features

### STATS Tab
- Real-time page load time
- Request count intercepted
- Estimated time saved via optimizations
- Protocol detection (H2, H3, HTTP/1.1)
- Queue / waiting room detection alert

### PERF Tab
- DNS lookup time
- TCP connect time
- TLS handshake time
- Time to First Byte (TTFB)
- DOM ready time
- Total load time — all shown as visual bars

### LOG Tab
- Live event log of all extension activity
- Timestamped entries with colour-coded severity

### AI ✦ Tab
Summarize any web page in five modes:

| Mode | Full Form | What it returns |
|---|---|---|
| TLDR | Too Long; Didn't Read | 3-sentence summary |
| BULLETS | Bullet Points | 5 key takeaways |
| ELI5 | Explain Like I'm 5 | Simple language explanation |
| FACTS | Key Facts Extraction | Verifiable claims only |
| BIAS | Bias & Sentiment Analysis | Tone and ideological lean |

### CONFIG Tab
Toggle each feature on/off individually:
- Preconnect injection
- DNS prefetch
- Queue detection
- Desktop notifications
- Perf timing report
- AI Summarizer

---

## 🔧 Installation

### Step 1 — Deploy the backend (required for AI tab)

Follow the setup guide at:
**https://github.com/Prandip23/smart-page-summarizer-api**

After deployment you will have:
- An APIM endpoint like `https://YOUR-APIM-NAME.azure-api.net/summarizer/summarize`
- A subscription key from Azure Portal -> API Management -> Subscriptions

### Step 2 — Configure api_client.js

Open `api_client.js` and replace the placeholders:

```javascript
const APIM_ENDPOINT = "https://YOUR-APIM-NAME.azure-api.net/summarizer/summarize";
const APIM_KEY = "YOUR-APIM-SUBSCRIPTION-KEY";
```

### Step 3 — Load in Brave or Chrome

```
brave://extensions   (or chrome://extensions)
  -> Enable Developer mode (top right toggle)
    -> Load unpacked
      -> Select this folder
```

### Step 4 — Pin the extension

```
Toolbar -> puzzle piece icon
  -> Find "Turbo Browser"
    -> Click the pin
```

---

## 🏗️ Architecture (AI Tab)

```
Brave / Chrome Extension
        |
        | POST /summarize
        | Header: Ocp-Apim-Subscription-Key
        v
Azure API Management         <- auth + rate limiting (10 calls/min)
        |
        v
FastAPI on Azure App Service <- HTML cleaning + prompt building
        |
        v
Azure OpenAI gpt-5.1         <- summarization
        |
        v
Summary rendered in AI tab
```

---

## 📁 File Structure

```
turbo-browser-extension/
├── manifest.json      # Extension config, permissions
├── popup.html         # Extension popup UI (all tabs)
├── popup.js           # All popup logic including AI summarizer
├── api_client.js      # Azure APIM integration <- configure this
├── content.js         # Injected into every page (preconnect, queue detection)
├── background.js      # Service worker (stats, perf timing)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔐 Security Note

`api_client.js` contains your APIM subscription key. This key is rate-limited to 10 calls/minute by Azure API Management, so exposure risk is low — but for production use, consider proxying through your own backend to keep the key server-side.

Never commit your real key to a public repo. The file in this repo uses placeholder values.

---

## 🔗 Related Repository

**[smart-page-summarizer-api](https://github.com/Prandip23/smart-page-summarizer-api)** — the Azure backend that powers the AI tab. Deploy this first before using the AI summarizer feature.

---

## 📄 License

MIT — free to use, modify, and distribute.
