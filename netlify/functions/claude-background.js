// Background function — returns 202 immediately, runs up to 15 min.
// Stores result in Blobs keyed by job:userId:jobId so the client can poll.
const { getStore } = require('@netlify/blobs');

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
  if (!user?.sub) return; // background — just exit

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return; }

  const { jobId, system, userMessage, maxTokens = 2700 } = body;
  if (!jobId || !userMessage) return;

  let store;
  try { store = initStore(); } catch { return; }

  const key = `job:${user.sub}:${jobId}`;

  try {
    const requestBody = {
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: Math.min(Math.max(Number(maxTokens) || 2700, 100), 4000),
      messages: [{ role: 'user', content: String(userMessage).slice(0, 80000) }],
    };
    if (system) requestBody.system = String(system).slice(0, 40000);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();
    await store.set(key, JSON.stringify({ ok: res.ok, statusCode: res.status, data }));
  } catch (err) {
    try {
      await store.set(key, JSON.stringify({ ok: false, error: err.message }));
    } catch { /* swallow */ }
  }
};
