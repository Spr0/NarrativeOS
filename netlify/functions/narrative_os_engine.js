const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * ENTRY
 */
async function generateNarrativeOSResume({
  resumeData,
  jobRequirements
}) {
  console.log("⚙️ ENGINE START");

  const normalized = await parseResume(resumeData);

  const roles = enforceRoles(normalized.roles);

  const analysis = analyzeRequirements(normalized, jobRequirements);

  const summary = buildSummary(normalized);

  return {
    header: normalized.header || "Candidate",
    summary,
    skills: normalized.skills || [],
    roles,
    education: normalized.education || [],
    analysis
  };
}

/**
 * 🔥 FAST PARSER (single LLM call)
 */
async function parseResume(rawText) {
  try {
    const prompt = `
Extract structured resume data.

RULES:
- No hallucination
- Extract real roles, skills, education
- Max 3 roles
- Max 4 bullets per role
- SHORT output

FORMAT (JSON ONLY):
{
  "header": "",
  "skills": [],
  "roles": [
    {
      "title": "",
      "company": "",
      "dates": "",
      "bullets": []
    }
  ],
  "education": []
}

RESUME:
${rawText}
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 700, // 🔥 prevents long responses
      messages: [{ role: "user", content: prompt }]
    });

    const text = res.choices[0].message.content;
    const json = extractJSON(text);

    return JSON.parse(json);
  } catch (e) {
    console.error("PARSE ERROR:", e);

    return {
      header: rawText.split("\n")[0] || "Candidate",
      skills: [],
      roles: [],
      education: []
    };
  }
}

/**
 * ENSURE ROLES
 */
function enforceRoles(roles = []) {
  if (!roles.length) {
    return [
      {
        title: "Experience",
        company: "",
        dates: "",
        bullets: ["Experience details not parsed"]
      }
    ];
  }

  return roles.slice(0, 3).map((role) => ({
    ...role,
    bullets: (role.bullets || []).slice(0, 4)
  }));
}

/**
 * 🔥 INSTANT SUMMARY (no LLM)
 */
function buildSummary(resume) {
  const roles = resume.roles?.map(r => r.title).join(", ") || "";
  const skills = resume.skills?.slice(0, 5).join(", ") || "";

  return `${roles} professional with experience in ${skills}.`;
}

/**
 * SCORING
 */
function analyzeRequirements(resume, requirements = []) {
  const resumeText = [
    ...(resume.skills || []),
    ...(resume.roles || []).flatMap(r => r.bullets || [])
  ].join(" ").toLowerCase();

  const matched = [];
  const partial = [];
  const missing = [];

  for (let req of requirements) {
    const r = req.toLowerCase();

    if (resumeText.includes(r)) {
      matched.push(req);
    } else if (hasPartialMatch(r, resumeText)) {
      partial.push(req);
    } else {
      missing.push(req);
    }
  }

  const total = requirements.length || 1;
  const coverage = Math.round(((matched.length + partial.length * 0.5) / total) * 100);
  const score = Math.round((coverage / 10) * 10) / 10;

  return {
    score,
    coverage,
    matched,
    partial,
    missing
  };
}

/**
 * PARTIAL MATCH
 */
function hasPartialMatch(req, text) {
  const words = req.split(" ").filter(w => w.length > 4);
  return words.some(w => text.includes(w));
}

/**
 * JSON CLEAN
 */
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

module.exports = {
  generateNarrativeOSResume
};
