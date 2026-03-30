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

  const cleanedRequirements = cleanRequirements(jobRequirements);
  const jdPhrases = extractJDPhrases(cleanedRequirements);

  const baseRoles = enforceRoles(parsed.roles);

  const initialAnalysis = analyzeRequirements(parsed, cleanedRequirements);

  const enhancedRoles = await rewriteBulletsWithJD({
    roles: baseRoles,
    analysis: initialAnalysis,
    jdPhrases
  });

  const finalResume = { ...parsed, roles: enhancedRoles };

  const finalAnalysis = analyzeRequirements(finalResume, cleanedRequirements);

  const summary = buildSummary(parsed); // 🔥 no JD injection

  return {
    header: parsed.header,
    summary,
    skills: parsed.skills,
    roles: enhancedRoles,
    education: parsed.education,
    analysis: finalAnalysis
  };
}

/**
 * PARSER
 */
async function parseResume(rawText) {
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

    return JSON.parse(extractJSON(res.choices[0].message.content));
  } catch {
    return {
      header: rawText.split("\n")[0],
      skills: [],
      roles: [],
      education: []
    };
  }
}

/**
 * 🔥 REWRITE INSTEAD OF GENERATE
 */
async function rewriteBulletsWithJD({ roles, analysis, jdPhrases }) {
  let phraseIndex = 0;

  for (let role of roles) {
    for (let i = 0; i < role.bullets.length; i++) {
      if (phraseIndex >= jdPhrases.length) break;

      const jdPhrase = jdPhrases[phraseIndex];

      const rewritten = await rewriteBullet(role.bullets[i], jdPhrase);

      if (rewritten) {
        role.bullets[i] = rewritten;
      }

      phraseIndex++;
    }
  }

  return roles;
}

/**
 * 🔥 SAFE REWRITE
 */
async function rewriteBullet(originalBullet, jdPhrase) {
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
- DO NOT add new experience
- Lightly incorporate JD phrasing
- Max 25 words

ORIGINAL:
${originalBullet}

JD LANGUAGE:
${jdPhrase}
`
      }]
    });

    return res.choices[0].message.content.trim();
  } catch {
    return originalBullet;
  }
}

/**
 * CLEAN JD
 */
function cleanRequirements(reqs = []) {
  return reqs
    .map(r => r.trim())
    .filter(r =>
      r.length > 20 &&
      !r.toLowerCase().includes("linkedin") &&
      !r.toLowerCase().includes("apply") &&
      !r.toLowerCase().includes("people")
    )
    .slice(0, 8);
}

/**
 * JD PHRASES (cleaner)
 */
function extractJDPhrases(reqs) {
  return reqs.map(r =>
    r
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(" ")
      .slice(2, 7)
      .join(" ")
  );
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
    ((matched.length + partial.length * 0.7) / total) * 100
  );

  const score = Math.round((coverage / 10) * 10) / 10;

  return { score, coverage, matched, partial, missing };
}

/**
 * SUMMARY (clean)
 */
function buildSummary(resume) {
  const roles = resume.roles?.map(r => r.title).join(", ");
  const skills = resume.skills?.slice(0, 5).join(", ");

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
