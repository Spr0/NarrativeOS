const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  try {
    const { user } = context.clientContext || {};
    if (!user?.sub) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    let store;
    try {
      store = getStore('nos-data');
    } catch (storeErr) {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Storage init failed', detail: storeErr.message })
      };
    }

    const key = `u:${user.sub}`;

    if (event.httpMethod === 'GET') {
      try {
        const data = await store.get(key, { type: 'json' });
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data ?? {})
        };
      } catch (getErr) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        };
      }
    }

    if (event.httpMethod === 'POST') {
      try {
        const payload = JSON.parse(event.body);
        await store.set(key, JSON.stringify(payload));
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      } catch (setErr) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Sync failed', detail: setErr.message }) };
      }
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error', detail: err.message }) };
  }
};
