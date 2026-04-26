export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const user = context.clientContext?.user;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    if (body.mode !== "gap") {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid mode" }) };
    }

    const requirement = typeof body.requirement === "string" ? body.requirement.slice(0, 2000) : "";
    const resumeText = typeof body.resumeText === "string" ? body.resumeText.slice(0, 8000) : "";

    if (!requirement || !resumeText) {
      return { statusCode: 400, body: JSON.stringify({ error: "requirement and resumeText are required" }) };
    }

    const prompt = `
You are a senior recruiter evaluating ONE requirement.

RULES:
- Only flag a gap if it is clearly missing
- If transferable experience exists → NOT a gap
- Be concise and practical

Return JSON ONLY:

{
  "isGap": true/false,
  "summary": "short evidence summary",
  "gap": "missing piece (if real)",
  "fix": "how to address or rewrite resume"
}

Requirement:
${requirement}

Resume:
${resumeText}
`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const match = text.match(/\{[\s\S]*\}/);

    return {
      statusCode: 200,
      body: match ? match[0] : "{}"
    };

  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected error" })
    };
  }
}
