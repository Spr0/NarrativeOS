const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const { user } = context.clientContext || {};
  if (!user?.sub) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const store = getStore({ name: 'nos-data', consistency: 'strong' });
  const key = `u:${user.sub}`;

  if (event.httpMethod === 'GET') {
    try {
      const data = await store.get(key, { type: 'json' });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data ?? {})
      };
    } catch {
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
      await store.setJSON(key, payload);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
