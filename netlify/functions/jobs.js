export async function handler() {
  if (!process.env.APIFY_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APIFY_TOKEN is not set" }),
    };
  }

  const res = await fetch(
    `https://api.apify.com/v2/acts/memo23~apify-hiring-cafe-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [
          "https://hiring.cafe/?searchState={\"query\":\"technical project manager\",\"dateFetchedPastNDays\":1}"
        ],
        maxItems: 25
      }),
    }
  );

  const data = await res.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
}
