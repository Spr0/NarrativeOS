export async function handler(event) {
  if (!process.env.APIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIFY_TOKEN not configured" }) };
  }

  const { runId } = event.queryStringParameters || {};

  if (!runId) {
    return { statusCode: 400, body: JSON.stringify({ error: "runId required" }) };
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
