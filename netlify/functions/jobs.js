export async function handler() {
  if (!process.env.APIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "no token" }) };
  }

  const res = await fetch(
    `https://api.apify.com/v2/acts/shahidirfan~hiring-cafe-jobs-scraper/runs?token=${process.env.APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrl: "https://hiring.cafe",
        keyword: "transformation director",
        location: "United States",
        workplaceType: "Remote",
        results_wanted: 25,
        max_pages: 3,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      })
    }
  );

  const data = await res.json();
  return {
    statusCode: 200,
    body: JSON.stringify({
      runId: data?.data?.id,
      datasetId: data?.data?.defaultDatasetId
    })
  };
}
