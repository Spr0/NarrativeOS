// Background function — returns 202 immediately, runs up to 15 min.
// Stores result in Blobs keyed by job:userId:jobId so the client can poll.
const { getStore } = require('@netlify/blobs');

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

function initStore() {
  try { return getStore('nos-jobs'); }
  catch {
    const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    if (!siteID || !token) throw new Error('NETLIFY_ACCESS_TOKEN not configured');
    return getStore({ name: 'nos-jobs', siteID, token });
  }
}

exports.handler = async (event, context) => {
  const user = context.clientContext?.user;
  if (!user?.sub) return;

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return; }

  const { jobId, mode, system, userMessage, maxTokens = 2700, company, roleTitle, jdUrl, jdText } = body;
  if (!jobId) return;
  if (mode !== 'research' && !userMessage) return;

  let store;
  try { store = initStore(); } catch (e) {
    console.error('[bg] store init failed:', e.message);
    return;
  }

  const key = `job:${user.sub}:${jobId}`;

  // Heartbeat — confirms function is alive; client sees "running" until result replaces it
  try { await store.set(key, JSON.stringify({ status: 'running' })); }
  catch (e) { console.error('[bg] heartbeat write failed:', e.message); return; }

  try {
    let requestBody;

    if (mode === 'research') {
      if (!company) throw new Error('company is required for research mode');
      const userMsg = [
        `Company: ${company}`,
        roleTitle ? `Role title: ${roleTitle}` : null,
        jdUrl     ? `JD URL: ${jdUrl}`         : null,
        jdText    ? `\nJob Description:\n${String(jdText).slice(0, 8000)}` : null,
      ].filter(Boolean).join('\n');

      requestBody = {
        model: process.env.ANTHROPIC_MODEL,
        max_tokens: 8000,
        system: RESEARCH_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      };
    } else {
      requestBody = {
        model: process.env.ANTHROPIC_MODEL,
        max_tokens: Math.min(Math.max(Number(maxTokens) || 2700, 100), 4000),
        messages: [{ role: 'user', content: String(userMessage).slice(0, 80000) }],
      };
      if (system) requestBody.system = String(system).slice(0, 40000);
    }

    console.log('[bg] calling Anthropic, mode:', mode || 'standard', 'max_tokens:', requestBody.max_tokens);
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 240000); // 4-minute safety net
    let res;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(fetchTimeout);
    }

    // Retry once on 429 rate limit — wait for Retry-After header or default 15s
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '15', 10);
      console.log(`[bg] 429 rate limited, retrying after ${retryAfter}s`);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      const res2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });
      const data2 = await res2.json();
      console.log('[bg] retry responded, status:', res2.status);
      await store.set(key, JSON.stringify({ ok: res2.ok, statusCode: res2.status, data: data2 }));
      console.log('[bg] retry result written to Blobs');
      return;
    }

    const data = await res.json();
    console.log('[bg] Anthropic responded, status:', res.status);
    await store.set(key, JSON.stringify({ ok: res.ok, statusCode: res.status, data }));
    console.log('[bg] result written to Blobs');
  } catch (err) {
    console.error('[bg] error:', err.message);
    try { await store.set(key, JSON.stringify({ ok: false, error: err.message })); }
    catch { /* swallow */ }
  }
};
