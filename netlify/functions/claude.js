// netlify/functions/claude.js
// Proxies all Anthropic API calls server-side.
// API key never reaches the browser.

const RESEARCH_SYSTEM_PROMPT = `You are a PE-grade company analyst. When given a company name and a job title, you produce a structured interview briefing that surfaces non-obvious insights a sophisticated operator would value. You do not summarize press releases. You interpret what the data means.

## Research Workflow

1. Use web_search to find: current revenue, headcount, funding history, investor identities (PE vs VC matters), executive changes in the past 12 months, Glassdoor rating trajectory, recent product launches, and the specific job posting.
2. Use web_search again for: competitive dynamics, pricing signals, integration partnerships, and any signals of organizational strain or strategic pivot.
3. Synthesize findings into the structured briefing format below. Prioritize interpretation over description. If a fact is interesting, say why.

## Output Format

Return a JSON object with the following keys. Each value is a markdown string.

{
  "thesis": "...",
  "financials": "...",
  "role_mandate": "...",
  "org_signals": "...",
  "ai_architecture": "...",
  "competitive_moat": "...",
  "pe_clock": "...",
  "scott_positioning": "...",
  "risk_table": [
    {
      "risk": "...",
      "description": "...",
      "mitigation": "..."
    }
  ],
  "comp_read": "...",
  "differentiating_questions": [
    "...",
    "..."
  ]
}

## Rules

- Never describe what a company does without interpreting what that means for someone joining it.
- Always look for timing correlations: if a role posts 6 weeks after an executive appointment, say so and explain why that matters.
- Glassdoor rating trajectory matters more than the current number. A 4.8 to 3.3 drop tells a different story than a stable 3.5.
- When PE investors are involved, always run the hold period math. Exit pressure is context for every other signal.
- "Record revenue" with no new funding and a CFO-dominated culture = pre-exit tightening. Name it.
- Hard-skip domains for Scott: healthcare, financial services, insurance. If the company is in one of these, flag it at the top and stop.
- Scott's verified proof points: $28M EBITDA at EDF (73 to 15 initiatives), $6.8M NetSuite ERP at CCR, $2M software cost reduction at CCR via Digital Catalog, $4.8M SG&A via RPA at EDF, 27% compliance fine reduction via Microsoft Copilot at CCR, $2.2B DTC growth enabled at Nike.
- When mapping Scott's background, cite specific proof points. Do not say "Scott's transformation experience is relevant." Say which story maps to which problem.`;

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

  if (!process.env.ANTHROPIC_MODEL) {
    return { statusCode: 500, body: JSON.stringify({ error: "ANTHROPIC_MODEL is not set. Add it to Netlify Site settings > Environment variables." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { mode, system, userMessage, maxTokens = 2000, company, roleTitle, jdUrl, jdText } = body;

  const sanitize = (str, limit = 60000) =>
    typeof str === "string" ? str.slice(0, limit) : "";

  let requestBody;

  if (mode === "research") {
    if (!company) {
      return { statusCode: 400, body: JSON.stringify({ error: "company is required for research mode" }) };
    }
    const userMsg = [
      `Company: ${company}`,
      roleTitle ? `Role title: ${roleTitle}` : null,
      jdUrl     ? `JD URL: ${jdUrl}`         : null,
      jdText    ? `\nJob Description:\n${sanitize(jdText, 8000)}` : null,
    ].filter(Boolean).join("\n");

    requestBody = {
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: Math.min(Math.max(Number(maxTokens) || 6000, 100), 8000),
      system: RESEARCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    };
  } else {
    // Standard and search modes
    if (!userMessage || typeof userMessage !== "string") {
      return { statusCode: 400, body: JSON.stringify({ error: "userMessage is required" }) };
    }
    requestBody = {
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: Math.min(Math.max(Number(maxTokens) || 1500, 100), 1500),
      messages: [{ role: "user", content: sanitize(userMessage) }],
    };
    if (system) requestBody.system = sanitize(system);
    if (mode === "search") {
      requestBody.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }
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
