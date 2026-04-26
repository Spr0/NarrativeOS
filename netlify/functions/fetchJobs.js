export async function handler(event, context) {
  const user = context.clientContext?.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (!process.env.APIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIFY_TOKEN not configured" }) };
  }

  const { runId } = event.queryStringParameters || {};

  if (!runId) {
    return { statusCode: 400, body: JSON.stringify({ error: "runId required" }) };
  }

  // Apify run IDs are alphanumeric with no special characters
  if (!/^[a-zA-Z0-9]{10,30}$/.test(runId)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid runId format" }) };
  }

  const res = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_TOKEN}`
  );

  if (!res.ok) {
    return { statusCode: res.status, body: JSON.stringify({ error: "Apify error" }) };
  }

  const data = await res.json();
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: data?.data?.status,
      datasetId: data?.data?.defaultDatasetId
    })
  };
}
