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
  const normalized = await parseResume(resumeData);

  const cleanedRequirements = cleanRequirements(jobRequirements);
  const jdPhrases = extractJDPhrases(cleanedRequirements);

  const baseRoles = enforceRoles(normalized.roles);

  const initialAnalysis = analyzeRequirements(normalized, cleanedRequirements);

  const enhancedRoles = await injectGapBullets({
    roles: baseRoles,
    analysis: initialAnalysis,
    jdPhrases
  });

  const finalResume = {
    ...normalized,
    roles: enhancedRoles
  };

  const finalAnalysis = analyzeRequirements(finalResume, cleanedRequirements);

  const summary = buildSummary(finalResume, jdPhrases);

  return {
    header: normalized.header || "Candidate",
    summary,
    skills: normalized.skills || [],
    roles: enhancedRoles,
    education: normalized.education || [],
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
      header: rawText.split("\n")[0] || "Candidate",
      skills: [],
      roles: [],
      education: []
    };
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
    .slice(0, 10);
}

/**
 * JD PHRASES
 */
function extractJDPhrases(requirements) {
  return requirements.map(r =>
    r.replace(/[^\w\s]/g, "").split(" ").slice(0, 6).join(" ")
  );
}

/**
 * GAP INJECTION (🔥 CORE FEATURE)
 */
async function injectGapBullets({ roles, analysis, jdPhrases }) {
  const gaps = [...analysis.missing, ...analysis.partial].slice(0, 6);

  let roleIndex = 0;

  for (let gap of gaps) {
    const role = roles[roleIndex % roles.length];

    if (role.bullets.length >= 4) {
      roleIndex++;
      continue;
    }

    const jdPhrase = jdPhrases[roleIndex % jdPhrases.length] || gap;

    const bullet = await generateGapBullet(role, gap, jdPhrase);

    if (bullet) {
      role.bullets.push(trimBullet(bullet));
    }

    roleIndex++;
  }

  return roles.map(r => ({
    ...r,
    bullets: r.bullets.slice(0, 4)
  }));
}

/**
 * 🔥 GAP BULLET GENERATOR
 */
async function generateGapBullet(role, gap, jdPhrase) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `
Write ONE resume bullet.

RULES:
- No fake tools or platforms
- Use real experience from bullets
- Inject JD language when possible
- Max 25 words
- One sentence

ROLE:
${role.title} at ${role.company}

EXISTING BULLETS:
${role.bullets.join("\n")}

TARGET GAP:
${gap}

JD LANGUAGE:
${jdPhrase}
`
      }]
    });

    return res.choices[0].message.content.trim();
  } catch {
    return null;
  }
}

/**
 * SCORING (same capability-based)
 */
function analyzeRequirements(resume, requirements = []) {
  const resumeText = normalizeText([
    ...(resume.skills || []),
    ...(resume.roles || []).flatMap(r => r.bullets || [])
  ].join(" "));

  const matched = [];
  const partial = [];
  const missing = [];

  for (let req of requirements) {
    const r = normalizeText(req);

    if (resumeText.includes(r)) matched.push(req);
    else if (isWeakMatch(r, resumeText)) partial.push(req);
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
 * SUMMARY
 */
function buildSummary(resume, jdPhrases = []) {
  const roles = resume.roles?.map(r => r.title).join(", ");
  const skills = resume.skills?.slice(0, 4).join(", ");
  const jd = jdPhrases.slice(0, 2).join(", ");

  return `${roles} professional with experience in ${skills}. Aligned with ${jd}.`;
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

function trimBullet(text) {
  return text.split(" ").slice(0, 25).join(" ");
}

function enforceRoles(roles = []) {
  if (!roles.length) {
    return [{
      title: "Experience",
      company: "",
      dates: "",
      bullets: ["Experience not parsed"]
    }];
  }

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
