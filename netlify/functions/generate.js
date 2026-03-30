import OpenAI from "openai";
import { runNarrativeOS } from "./narrative_os_engine.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function safeResponse(data = {}) {
  return {
    score: 0,
    coverage: 0,
    requirements: [],
    error: false,
    message: "",
    ...data,
  };
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 200,
        body: JSON.stringify(
          safeResponse({ error: true, message: "POST only" })
        ),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const result = await runNarrativeOS({
      resumeText: body.resumeText || "",
      jobDescription: body.jobDescription || "",
      openai,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(safeResponse(result)),
    };

  } catch (err) {
    console.error("FATAL:", err);

    return {
      statusCode: 200,
      body: JSON.stringify(
        safeResponse({
          error: true,
          message: "Server failure",
        })
      ),
    };
  }
}
