export async function handler(event) {
  if (!process.env.APIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIFY_TOKEN not configured" }) };
  }

  const { runId, datasetId } = event.queryStringParameters || {};

  // Check run status
  if (runId && !datasetId) {
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_TOKEN}`
    );
    const data = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: data?.data?.status,
        datasetId: data?.data?.defaultDatasetId
      })
    };
  }

  // Fetch dataset items
  if (datasetId) {
    const res = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_TOKEN}&clean=true&limit=50`
    );
    const jobs = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(Array.isArray(jobs) ? jobs : [])
    };
  }

  return { statusCode: 400, body: JSON.stringify({ error: "runId or datasetId required" }) };
}
