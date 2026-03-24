const res = await fetch(
  `https://api.apify.com/v2/acts/shahidirfan~hiring-cafe-jobs-scraper/runs?token=${process.env.APIFY_TOKEN}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      queries: ["transformation director"],
      location: "United States",
      maxItems: 50,
      workplaceType: "remote"
    })
  }
);
```
