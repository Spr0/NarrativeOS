export async function handler(event) {
  if (!process.env.APIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIFY_TOKEN not configured" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { body = {}; }

  const keyword = body.keyword || "transformation director";
  const maxItems = body.maxItems || 30;

  // Build the HiringCafe URL with searchState — this is what the scraper navigates to
  const searchState = encodeURIComponent(JSON.stringify({
    query: keyword,
    workplaceType: "remote",
    sortBy: "relevance"
  }));

  const res = await fetch(
    `https://api.apify.com/v2/acts/shahidirfan~hiring-cafe-jobs-scraper/runs?token=${process.env.APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrl: `https://hiring.cafe/?searchState=${searchState}`,
        keyword,
        workplaceType: "Remote",
        results_wanted: maxItems,
        max_pages: 3,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      })
    }
  );

  const data = await res.json();
  if (!res.ok) {
    return { statusCode: res.status, body: JSON.stringify({ error: data?.error?.message || "Apify error" }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      runId: data?.data?.id,
      datasetId: data?.data?.defaultDatasetId
    })
  };
}
