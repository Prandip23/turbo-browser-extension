// ================================================================
// Smart Page Summarizer — APIM Client
// ================================================================
// SETUP REQUIRED before using the AI tab:
//
// 1. Deploy the backend API first:
//    https://github.com/Prandip23/smart-page-summarizer-api
//
// 2. After deployment, get your values from:
//    Azure Portal -> API Management -> summarizer-apim -> Subscriptions
//
// 3. Replace the placeholders below with your actual values:
// ================================================================

const APIM_ENDPOINT = "https://YOUR-APIM-NAME.azure-api.net/summarizer/summarize";
const APIM_KEY = "YOUR-APIM-SUBSCRIPTION-KEY";

// ================================================================
// Do not edit below this line
// ================================================================

async function summarizePage(htmlContent, mode) {
  if (APIM_KEY === "YOUR-APIM-SUBSCRIPTION-KEY") {
    throw new Error("API not configured. See api_client.js setup instructions.");
  }

  const response = await fetch(APIM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": APIM_KEY
    },
    body: JSON.stringify({
      html_content: htmlContent,
      mode: mode
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }

  return await response.json();
}
