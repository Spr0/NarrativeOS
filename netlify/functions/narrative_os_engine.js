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

  const skills = cleanSkills(parsed.skills);

  const cleanedRequirements = cleanRequirements(jobRequirements);

  const analysis = analyzeRequirements(
    { ...parsed, skills, roles },
    cleanedRequirements
  );

  const summary = buildSummary({ roles, skills });

  return {
    header: parsed.header,
    summary,
    skills,
    roles,
    education: parsed.education,
    analysis
  };
}

/**
 * PARSER (same stable hybrid)
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

  return {
    header: parsed.header || rawText.split("\n")[0],
    skills: parsed.skills || [],
    roles: parsed.roles || [],
    education: parsed.education || []
  };
}

/**
 * 🔥 CLEAN SKILLS
 */
function cleanSkills(skills = []) {
  const flat = skills
    .join(" | ")
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 40);

  return [...new Set(flat)].slice(0, 10);
}

/**
 * 🔥 CLEAN JD (critical)
 */
function cleanRequirements(reqs = []) {
  return reqs
    .map(r => r.trim())
    .filter(r =>
      r.length > 25 &&
      !r.toLowerCase().includes("apply") &&
      !r.toLowerCase().includes("linkedin") &&
      !r.toLowerCase().includes("people") &&
      !r.toLowerCase().includes("click")
    )
    .slice(0, 8);
}

/**
 * SCORING (unchanged)
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
 * 🔥 CLEAN SUMMARY (deterministic)
 */
function buildSummary({ roles, skills }) {
  const roleTitles = roles?.map(r => r.title).slice(0, 2).join(", ");
  const skillList = skills?.slice(0, 4).join(", ");

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
