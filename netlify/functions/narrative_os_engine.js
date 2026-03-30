async function extractGapWithLLM(requirement, resumeText) {
  try {
    const res = await fetch("/.netlify/functions/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "gap",
        requirement,
        resumeText
      })
    });

    const text = await res.text(); // ✅ safer than .json()

    try {
      return JSON.parse(text);
    } catch {
      return {
        isGap: false,
        summary: "",
        gap: null,
        fix: null
      };
    }

  } catch {
    return {
      isGap: false,
      summary: "",
      gap: null,
      fix: null
    };
  }
}
