const engine = require("./narrative_os_engine");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    // 🔍 DEBUG (optional, remove later)
    console.log("ENGINE KEYS:", Object.keys(engine));

    /**
     * 🔧 FIX MODE
     */
    if (body.mode === "fix") {
      if (!body.bullet || !body.requirement) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: true,
            message: "Missing bullet or requirement"
          })
        };
      }

      const rewritten = await rewriteBullet(
        body.bullet,
        body.requirement
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          rewritten
        })
      };
    }

    /**
     * 🧠 NORMAL ANALYSIS MODE
     */
    if (!engine.generateNarrativeOSResume) {
      throw new Error("Engine function not found");
    }

    const result = await engine.generateNarrativeOSResume({
      resumeData: body.resume,
      jobRequirements: body.requirements
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error("❌ FUNCTION ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: true,
        message: err.message || "Unknown server error"
      })
    };
  }
};

/**
 * 🔧 SAFE BULLET REWRITE
 */
async function rewriteBullet(original, requirement) {
  try {
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

  } catch (err) {
    console.error("Rewrite failed:", err);
    return original; // 🔥 fallback: never break UX
  }
}
