export async function handler(event) {
  if (!process.env.APIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIFY_TOKEN not configured" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }

  const { jobUrl } = body;
  if (!jobUrl) return { statusCode: 400, body: JSON.stringify({ error: "jobUrl required" }) };

  // Trigger a single-job scrape using memo23 Indeed scraper
  const triggerRes = await fetch(
    `https://api.apify.com/v2/acts/memo23~apify-indeed-cheerio-ppr/runs?token=${process.env.APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: jobUrl }],
        maxItems: 1,
        includeCompanyDetails: false,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      })
    }
  );

  const data = await triggerRes.json();
  if (!triggerRes.ok) {
    return { statusCode: triggerRes.status, body: JSON.stringify({ error: data?.error?.message || "Apify error" }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      runId: data?.data?.id,
      datasetId: data?.data?.defaultDatasetId
    })
  };
}
