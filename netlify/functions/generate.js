const { generateNarrativeOSResume } = require("./narrative_os_engine");

exports.handler = async (event) => {
  console.log("🚀 FUNCTION START");

  try {
    const body = JSON.parse(event.body || "{}");

    console.log("📥 INPUT RECEIVED");

    const result = await generateNarrativeOSResume({
      resumeData: body.resume,
      jobRequirements: body.requirements || []
    });

    console.log("✅ SUCCESS");

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error("🔥 FUNCTION ERROR:", err);

    return {
      statusCode: 200, // prevent frontend crash
      body: JSON.stringify({
        error: true,
        message: err.message || "Unknown error",
        fallback: true
      })
    };
  }
};
