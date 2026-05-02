// Polls for a background job result stored in Blobs.
// Returns 202 { status: 'pending' } while running, 200 with data when done.
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
  if (!user?.sub) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { jobId } = event.queryStringParameters || {};
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'jobId required' }) };
  }

  let store;
  try {
    store = initStore();
  } catch (err) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Storage unavailable', detail: err.message }) };
  }

  try {
    const key = `job:${user.sub}:${jobId}`;
    const result = await store.get(key, { type: 'json' });

    if (!result) {
      return {
        statusCode: 202,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      };
    }

    // Clean up after reading
    store.delete(key).catch(() => {});

    if (!result.ok) {
      return {
        statusCode: result.statusCode || 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data || { error: result.error || 'Job failed' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    };
  } catch {
    // Blobs miss — still pending
    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' }),
    };
  }
};
