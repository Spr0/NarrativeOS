body: JSON.stringify({
  startUrls: [
    'https://hiring.cafe/?searchState={"query":"transformation director","dateFetchedPastNDays":7}'
  ],
  maxItems: 50
})
```

Push, redeploy, hit `/.netlify/functions/jobs` — paste the new `runId` and `datasetId` back here.

While that deploys, also try this directly in your browser to confirm HiringCafe has results for your target roles:
```
https://hiring.cafe/?searchState={"query":"transformation director","dateFetchedPastNDays":7}
