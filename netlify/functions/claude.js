// netlify/functions/claude.js
// Proxies all Anthropic API calls server-side.
// API key never reaches the browser.

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Auth — Netlify Identity populates context.clientContext.user
  // when client sends Authorization: Bearer <netlify-identity-jwt>
  const user = context.clientContext?.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured on server" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { mode, system, userMessage, maxTokens = 2000 } = body;

  if (!userMessage || typeof userMessage !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "userMessage is required" }) };
  }

  // Sanitize — truncate to reasonable limits
  const sanitize = (str, limit = 60000) =>
    typeof str === "string" ? str.slice(0, limit) : "";

  const cappedTokens = Math.min(Math.max(maxTokens, 100), 4000);

  const requestBody = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: cappedTokens,
    messages: [{ role: "user", content: sanitize(userMessage) }],
  };

  if (system) requestBody.system = sanitize(system);

  // Search mode attaches web_search tool
  if (mode === "search") {
    requestBody.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Upstream API error" }),
    };
  }
};
