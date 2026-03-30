export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");

    if (body.mode === "gap") {
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
${body.requirement}

Resume:
${body.resumeText}
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
    }

    return { statusCode: 400, body: "Invalid mode" };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
}
