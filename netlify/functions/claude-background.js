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
  if (!user?.sub) return;

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return; }

  const { jobId, system, userMessage, maxTokens = 2700 } = body;
  if (!jobId || !userMessage) return;

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
    const requestBody = {
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: Math.min(Math.max(Number(maxTokens) || 2700, 100), 4000),
      messages: [{ role: 'user', content: String(userMessage).slice(0, 80000) }],
    };
    if (system) requestBody.system = String(system).slice(0, 40000);

    console.log('[bg] calling Anthropic, max_tokens:', requestBody.max_tokens);
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
    console.log('[bg] Anthropic responded, status:', res.status);
    await store.set(key, JSON.stringify({ ok: res.ok, statusCode: res.status, data }));
    console.log('[bg] result written to Blobs');
  } catch (err) {
    console.error('[bg] error:', err.message);
    try { await store.set(key, JSON.stringify({ ok: false, error: err.message })); }
    catch { /* swallow */ }
  }
};
