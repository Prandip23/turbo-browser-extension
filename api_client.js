// Smart Page Summarizer — APIM Client
// Calls Azure API Management → FastAPI → Azure OpenAI gpt-5.1
// Replace with your own APIM endpoint and subscription key
// You can find this in the Azure portal under your API Management instance

const APIM_ENDPOINT = "YOUR_APIM_ENDPOINT_URL_HERE";
const APIM_KEY = "YOUR_APIM_KEY_HERE";

async function summarizePage(htmlContent, mode) {
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
