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
  const parsed = await parseResume(resumeData);

  const roles = enforceRoles(parsed.roles);

  const skills = parsed.skills?.length ? parsed.skills : extractSkills(resumeData);

  const education = parsed.education?.length
    ? parsed.education
    : extractEducation(resumeData);

  const cleanedRequirements = cleanRequirements(jobRequirements);

  const analysis = analyzeRequirements(
    { skills, roles },
    cleanedRequirements
  );

  const summary = buildSummary({ roles, skills });

  return {
    header: parsed.header || resumeData.split("\n")[0],
    summary,
    skills,
    roles,
    education,
    analysis
  };
}

/**
 * 🔥 HYBRID PARSER (LLM + FALLBACK)
 */
async function parseResume(rawText) {
  let parsed = {};

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `
Extract resume JSON.

FORMAT:
{
  "header": "",
  "skills": [],
  "roles": [],
  "education": []
}

RESUME:
${rawText}
`
      }]
    });

    parsed = JSON.parse(extractJSON(res.choices[0].message.content));
  } catch (e) {
    console.log("LLM parse failed, using fallback");
  }

  return {
    header: parsed.header || extractHeader(rawText),
    skills: parsed.skills || [],
    roles: parsed.roles || [],
    education: parsed.education || []
  };
}

/**
 * 🔥 FALLBACKS (CRITICAL)
 */

function extractHeader(text) {
  return text.split("\n")[0];
}

function extractSkills(text) {
  return text
    .split("\n")
    .filter(line =>
      line.toLowerCase().includes("sap") ||
      line.toLowerCase().includes("net") ||
      line.toLowerCase().includes("salesforce") ||
      line.toLowerCase().includes("agile") ||
      line.toLowerCase().includes("risk")
    )
    .slice(0, 8);
}

function extractRoles(text) {
  const lines = text.split("\n");

  const roles = [];
  let current = null;

  for (let line of lines) {
    if (line.includes("—")) {
      if (current) roles.push(current);

      const parts = line.split("—");

      current = {
        title: parts[0].trim(),
        company: parts[1]?.trim() || "",
        bullets: []
      };
    } else if (current && line.length > 40) {
      current.bullets.push(line.trim());
    }
  }

  if (current) roles.push(current);

  return roles.slice(0, 3);
}

function extractEducation(text) {
  return text
    .split("\n")
    .filter(l =>
      l.toLowerCase().includes("university") ||
      l.toLowerCase().includes("mba") ||
      l.toLowerCase().includes("ba")
    )
    .slice(0, 2)
    .map(e => ({ degree: e }));
}

/**
 * ENSURE ROLES ALWAYS EXIST
 */
function enforceRoles(roles = []) {
  if (!roles.length) {
    return extractRoles("");
  }

  return roles.slice(0, 3).map(r => ({
    ...r,
    bullets: (r.bullets || []).slice(0, 4)
  }));
}

/**
 * CLEAN JD
 */
function cleanRequirements(reqs = []) {
  return reqs
    .map(r => r.trim())
    .filter(r => r.length > 25)
    .slice(0, 8);
}

/**
 * SCORING
 */
function analyzeRequirements(resume, requirements = []) {
  const text = normalizeText([
    ...(resume.skills || []),
    ...(resume.roles || []).flatMap(r => r.bullets || [])
  ].join(" "));

  const matched = [];
  const partial = [];
  const missing = [];

  for (let req of requirements) {
    const r = normalizeText(req);

    if (text.includes(r)) matched.push(req);
    else if (isWeakMatch(r, text)) partial.push(req);
    else missing.push(req);
  }

  const total = requirements.length || 1;

  const coverage = Math.round(
    ((matched.length + partial.length * 0.6) / total) * 100
  );

  const score = Math.round((coverage / 10) * 10) / 10;

  return { score, coverage, matched, partial, missing };
}

/**
 * SUMMARY (SAFE)
 */
function buildSummary({ roles, skills }) {
  const roleTitles = roles?.map(r => r.title).slice(0, 2).join(", ");
  const skillList = skills?.slice(0, 4).join(", ");

  if (!roleTitles && !skillList) return "Experienced professional.";

  return `${roleTitles} professional with expertise in ${skillList}.`;
}

/**
 * UTILS
 */
function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, "");
}

function isWeakMatch(req, text) {
  const words = req.split(" ").filter(w => w.length > 4);
  return words.some(w => text.includes(w));
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

module.exports = {
  generateNarrativeOSResume
};
