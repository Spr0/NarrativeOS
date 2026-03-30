const { generateNarrativeOSResume } = require("./narrative_os_engine");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // 🔥 FIX MODE
    if (body.mode === "fix") {
      const { bullet, requirement } = body;

      const rewritten = await rewriteBullet(bullet, requirement);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          rewritten
        })
      };
    }

    // NORMAL MODE
    const result = await generateNarrativeOSResume({
      resumeData: body.resume,
      jobRequirements: body.requirements
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: true,
        message: err.message
      })
    };
  }
};

/**
 * 🔥 SAFE BULLET REWRITE
 */
async function rewriteBullet(original, requirement) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 80,
    messages: [{
      role: "user",
      content: `
Rewrite this resume bullet.

RULES:
- Keep original meaning EXACT
- Do NOT add new tools/platforms
- Lightly align wording to requirement
- Max 25 words

ORIGINAL:
${original}

TARGET REQUIREMENT:
${requirement}
`
    }]
  });

  return res.choices[0].message.content.trim();
}
