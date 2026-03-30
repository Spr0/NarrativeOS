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

  const cleanedRequirements = cleanRequirements(jobRequirements);

  const analysis = analyzeRequirements(parsed, cleanedRequirements);

  const summary = buildSummary(parsed);

  return {
    header: parsed.header,
    summary,
    skills: parsed.skills,
    roles,
    education: parsed.education,
    analysis
  };
}

/**
 * 🔥 HYBRID PARSER (LLM + FALLBACK)
 */
async function parseResume(rawText) {
  let parsed;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 700,
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
  } catch {
    parsed = {};
  }

  // 🔥 FALLBACKS (CRITICAL)
  return {
    header: parsed.header || extractHeader(rawText),
    skills: parsed.skills?.length ? parsed.skills : extractSkills(rawText),
    roles: parsed.roles?.length ? parsed.roles : extractRoles(rawText),
    education: parsed.education?.length ? parsed.education : extractEducation(rawText)
  };
}

/**
 * 🔥 FALLBACK: HEADER
 */
function extractHeader(text) {
  return text.split("\n")[0];
}

/**
 * 🔥 FALLBACK: SKILLS
 */
function extractSkills(text) {
  const lines = text.split("\n");
  const skillLines = lines.filter(l =>
    l.toLowerCase().includes("sap") ||
    l.toLowerCase().includes("netSuite") ||
    l.toLowerCase().includes("salesforce") ||
    l.toLowerCase().includes("agile") ||
    l.toLowerCase().includes("risk")
  );

  return skillLines.slice(0, 8);
}

/**
 * 🔥 FALLBACK: ROLES
 */
function extractRoles(text) {
  const sections = text.split("\n");

  const roles = [];
  let currentRole = null;

  for (let line of sections) {
    if (line.match(/—/)) {
      if (currentRole) roles.push(currentRole);

      const [title, company] = line.split("—");

      currentRole = {
        title: title.trim(),
        company: company?.trim() || "",
        bullets: []
      };
    } else if (currentRole && line.length > 30) {
      currentRole.bullets.push(line.trim());
    }
  }

  if (currentRole) roles.push(currentRole);

  return roles.slice(0, 3);
}

/**
 * 🔥 FALLBACK: EDUCATION
 */
function extractEducation(text) {
  return text
    .split("\n")
    .filter(l => l.toLowerCase().includes("university"))
    .slice(0, 2)
    .map(e => ({ degree: e }));
}

/**
 * CLEAN JD
 */
function cleanRequirements(reqs = []) {
  return reqs
    .map(r => r.trim())
    .filter(r => r.length > 20)
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
 * SUMMARY
 */
function buildSummary(resume) {
  const roles = resume.roles?.map(r => r.title).join(", ");
  const skills = resume.skills?.slice(0, 4).join(", ");

  return `${roles} professional with experience in ${skills}.`;
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

function enforceRoles(roles = []) {
  return roles.slice(0, 3).map(r => ({
    ...r,
    bullets: (r.bullets || []).slice(0, 4)
  }));
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

module.exports = {
  generateNarrativeOSResume
};
