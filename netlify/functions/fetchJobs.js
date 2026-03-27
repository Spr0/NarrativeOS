export async function handler(event) {
  if (!process.env.APIFY_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "APIFY_TOKEN not configured" }) };
  }

  const { runId, datasetId } = eveexport async function handler(event) {
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

  // Fetch and normalize dataset items
  if (datasetId) {
    const res = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_TOKEN}&clean=true&limit=50`
    );
    const jobs = await res.json();
    if (!Array.isArray(jobs)) return { statusCode: 200, body: JSON.stringify([]) };

    // Normalize — Indeed field names vary by actor version
    const normalized = jobs.map(j => {
      // JD: try every known Indeed field name
      const description =
        j.description ||
        j.jobDescription ||
        j.job_description ||
        j.fullDescription ||
        j.snippet ||
        j.descriptionHTML?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
        "";

      const title = j.positionName || j.title || j.jobTitle || j.job_title || "";
      const company = j.company || j.companyName || j.company_name || "";
      const location = j.location || j.jobLocation || j.job_location || "";
      const salary = j.salary || j.salaryRange || j.salaryText || "";
      const url = j.externalApplyLink || j.applyLink || j.url || j.job_url || j.jobUrl || j.link || "";
      const remote = ["remote", "anywhere", "work from home"]
        .some(w => (location + " " + (j.jobType || "")).toLowerCase().includes(w));

      return {
        // Normalized fields for CareerForge display
        title, company, location, salary, url, remote,
        description,
        postedAt: j.postedAt || j.datePosted || j.date || "",
        // Aliased fields for scoring + JobResultCard
        job_title: title,
        company_name: company,
        job_location: location,
        job_description: description,
        job_url: url,
      };
    });

    return { statusCode: 200, body: JSON.stringify(normalized) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: "runId or datasetId required" }) };
}nt.queryStringParameters || {};

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

  // Fetch and normalize dataset items
  if (datasetId) {
    const res = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_TOKEN}&clean=true&limit=50`
    );
    const jobs = await res.json();
    if (!Array.isArray(jobs)) return { statusCode: 200, body: JSON.stringify([]) };

    // Normalize Indeed fields to match CareerForge's expected schema
    const normalized = jobs.map(j => ({
      title:       j.positionName || j.title || j.job_title || "",
      company:     j.company || j.company_name || "",
      location:    j.location || j.job_location || "",
      salary:      j.salary || j.salaryRange || "",
      description: j.description || j.job_description || "",
      url:         j.externalApplyLink || j.url || j.job_url || j.applyUrl || "",
      remote:      (j.jobType || j.location || "").toLowerCase().includes("remote"),
      postedAt:    j.postedAt || j.datePosted || "",
      // Pass through originals too for scoring
      job_title:       j.positionName || j.title || "",
      company_name:    j.company || "",
      job_description: j.description || "",
      job_url:         j.externalApplyLink || j.url || "",
    }));

    return { statusCode: 200, body: JSON.stringify(normalized) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: "runId or datasetId required" }) };
}
