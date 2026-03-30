// netlify/functions/generate.js

import OpenAI from "openai";
import { runNarrativeOS } from "./narrative_os_engine.js";

// ==============================
// INIT OPENAI
// ==============================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==============================
// SAFE RESPONSE BUILDER
// ==============================

function buildSafeResponse(overrides = {}) {
  return {
    score: 0,
    coverage: 0,
    requirements: [],
    error: false,
    message: "",
    ...overrides,
  };
}

// ==============================
// HANDLER
// ==============================

export async function handler(event) {
  console.log("=== NarrativeOS Generate Function Invoked ===");

  try {
    // ------------------------------
    // METHOD CHECK
    // ------------------------------
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 200,
        body: JSON.stringify(
          buildSafeResponse({
            error: true,
            message: "Only POST requests are allowed",
          })
        ),
      };
    }

    // ------------------------------
    // ENV CHECK
    // ------------------------------
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY");

      return {
        statusCode: 200,
        body: JSON.stringify(
          buildSafeResponse({
            error: true,
            message: "Server misconfiguration: missing API key",
          })
        ),
      };
    }

    console.log("✅ OpenAI key present");

    // ------------------------------
    // PARSE BODY
    // ------------------------------
    let body;

    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      console.error("❌ Failed to parse request body", err);

      return {
        statusCode: 200,
        body: JSON.stringify(
          buildSafeResponse({
            error: true,
            message: "Invalid JSON body",
          })
        ),
      };
    }

    const { resumeText, jobDescription } = body;

    // ------------------------------
    // INPUT VALIDATION
    // ------------------------------
    if (!resumeText || !jobDescription) {
      return {
        statusCode: 200,
        body: JSON.stringify(
          buildSafeResponse({
            error: true,
            message: "Missing resumeText or jobDescription",
          })
        ),
      };
    }

    console.log("📄 Resume length:", resumeText.length);
    console.log("📄 JD length:", jobDescription.length);

    // ------------------------------
    // RUN ENGINE
    // ------------------------------
    let result;

    try {
      result = await runNarrativeOS({
        resumeText,
        jobDescription,
        openai,
      });
    } catch (engineError) {
      console.error("❌ ENGINE FAILURE:", engineError);

      return {
        statusCode: 200,
        body: JSON.stringify(
          buildSafeResponse({
            error: true,
            message: "Engine processing failed",
          })
        ),
      };
    }

    // ------------------------------
    // FINAL SAFETY CHECK
    // ------------------------------
    if (!result || !result.requirements) {
      console.error("❌ Invalid engine output:", result);

      return {
        statusCode: 200,
        body: JSON.stringify(
          buildSafeResponse({
            error: true,
            message: "Invalid engine output",
          })
        ),
      };
    }

    console.log("✅ Engine success");
    console.log("📊 Score:", result.score);

    // ------------------------------
    // SUCCESS RESPONSE
    // ------------------------------
    return {
      statusCode: 200,
      body: JSON.stringify({
        ...buildSafeResponse(),
        ...result,
      }),
    };

  } catch (fatalError) {
    // ------------------------------
    // GLOBAL CATCH (NEVER 502)
    // ------------------------------
    console.error("💥 FATAL ERROR:", fatalError);

    return {
      statusCode: 200,
      body: JSON.stringify(
        buildSafeResponse({
          error: true,
          message: "Unexpected server error",
        })
      ),
    };
  }
}
