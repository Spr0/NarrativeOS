export async function handler() {
  if (!process.env.APIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "no token" }) };
  }

  const searchState = encodeURIComponent(JSON.stringify({
    query: "transformation director",
    dateFetchedPastNDays: 7,
    sortBy: "relevance"
  }));

  const res = await fetch(
    `https://api.apify.com/v2/acts/memo23~apify-hiring-cafe-scraper/runs?token=${process.env.APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [
          `https://hiring.cafe/?searchState=${searchState}`
        ],
        maxItems: 50
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
