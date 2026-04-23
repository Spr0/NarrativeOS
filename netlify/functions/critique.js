// netlify/functions/critique.js
// Fresh-context critique pass — no generation context, five reader personas.
// Returns structured JSON scored across ATS, recruiter, HR, hiring manager, and technical reviewer.

const CRITIQUE_SYSTEM_PROMPT = `You are an independent resume reviewer. You have not seen how this resume was generated.
Evaluate the resume against the job description from five perspectives. Return ONLY valid JSON.

PERSONAS:
1. ATS_BOT: Does it pass keyword matching for this JD? (score 0-20)
2. RECRUITER_10S: First 10-second scan — does the summary and first bullet earn a longer read? (score 0-20)
3. HR_SCREEN_30S: 30-second read — is the level/scope clear? Does it fit the role band? (score 0-20)
4. HIRING_MANAGER: Full read — are the outcomes credible and specific? Are there red flags? (score 0-20)
5. TECHNICAL_REVIEWER: Are the tools, methods, and scale claims internally consistent? (score 0-20)

Return this JSON structure exactly:
{
  "totalScore": <sum of all scores>,
  "personas": {
    "ATS_BOT": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "RECRUITER_10S": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "HR_SCREEN_30S": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "HIRING_MANAGER": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "TECHNICAL_REVIEWER": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" }
  },
  "topFixes": ["<fix 1, highest impact>", "<fix 2>", "<fix 3>"],
  "interviewLikelihood": "<Low / Medium / High> — <one sentence rationale>"
}`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };
  }

  let resumeText, jdText;
  try {
    ({ resumeText, jdText } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!resumeText || !jdText) {
    return { statusCode: 400, body: JSON.stringify({ error: "resumeText and jdText are required" }) };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: CRITIQUE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `JOB DESCRIPTION:\n${jdText}\n\n---\n\nRESUME:\n${resumeText}`,
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data.error?.message || "Anthropic API error" }) };
    }

    const raw = data.content?.[0]?.text || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return { statusCode: 500, body: JSON.stringify({ error: "Failed to parse critique JSON", raw }) };
    }

    const parsed = JSON.parse(match[0]);
    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
