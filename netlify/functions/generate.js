export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");

    // ✅ fallback instead of 400
    const mode = body.mode || "gap";

    if (mode === "gap") {
      const prompt = `
You are a senior recruiter evaluating ONE requirement.

RULES:
- Only flag a gap if it is clearly missing
- If transferable experience exists → NOT a gap
- Ignore contact info, headers, recruiter messages

Return JSON ONLY:

{
  "isGap": true/false,
  "summary": "short evidence summary",
  "gap": "missing piece (if real)",
  "fix": "how to improve or rewrite resume"
}

Requirement:
${body.requirement || ""}

Resume:
${(body.resumeText || "").slice(0, 1500)}
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

      // ✅ ALWAYS valid JSON response
      return {
        statusCode: 200,
        body: match || JSON.stringify({
          isGap: false,
          summary: "",
          gap: null,
          fix: null
        })
      };
    }

    // ✅ never return 400 again
    return {
      statusCode: 200,
      body: JSON.stringify({
        isGap: false,
        summary: "",
        gap: null,
        fix: null
      })
    };

  } catch (e) {
    return {
      statusCode: 200, // ✅ never break frontend
      body: JSON.stringify({
        isGap: false,
        summary: "",
        gap: null,
        fix: null,
        error: e.message
      })
    };
  }
}
