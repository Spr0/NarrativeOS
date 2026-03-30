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
  const sections = splitSections(resumeData);
  const parsed = await parseResume(resumeData);

  const roles = normalizeRoles(parsed.roles, sections.experience);

  const skills = extractSkillsFromCore(resumeData);

  const education = normalizeEducation(parsed.education, sections.education);

  const cleanedRequirements = cleanRequirements(jobRequirements);

  const analysis = analyzeRequirementsWithTrace(
    { skills, roles },
    cleanedRequirements
  );

  const summary = buildSummary(roles, skills);

  return {
    header: extractHeader(resumeData),
    summary,
    skills,
    roles,
    education,
    analysis
  };
}

/**
 * 🔥 HEADER FIX (CRITICAL)
 */
function extractHeader(text) {
  return text.split("\n")[0].trim();
}

/**
 * 🔥 SKILLS FIX (CORE COMPETENCIES PARSER)
 */
function extractSkillsFromCore(text) {
  const match = text.match(/CORE COMPETENCIES([\s\S]*?)\n[A-Z]/);

  if (!match) return [];

  return match[1]
    .split("|")
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 50)
    .slice(0, 12);
}

/**
 * TRACEABLE SCORING (unchanged)
 */
function analyzeRequirementsWithTrace(resume, requirements = []) {
  const matched = [];
  const partial = [];
  const missing = [];
  const trace = [];

  const allBullets = resume.roles.flatMap((r, ri) =>
    r.bullets.map((b, bi) => ({
      text: b,
      roleIndex: ri,
      bulletIndex: bi,
      norm: normalizeText(b)
    }))
  );

  for (let req of requirements) {
    const r = normalizeText(req);

    let strong = [];
    let weak = [];

    for (let b of allBullets) {
      if (b.norm.includes(r)) strong.push(b);
      else if (isWeakMatch(r, b.norm)) weak.push(b);
    }

    if (strong.length) {
      matched.push(req);
      trace.push({ requirement: req, status: "matched", evidence: strong.slice(0, 2) });
    } else if (weak.length) {
      partial.push(req);
      trace.push({ requirement: req, status: "partial", evidence: weak.slice(0, 2) });
    } else {
      missing.push(req);
      trace.push({ requirement: req, status: "missing", evidence: [] });
    }
  }

  const total = requirements.length || 1;

  const coverage = Math.round(
    ((matched.length + partial.length * 0.6) / total) * 100
  );

  const score = Math.round((coverage / 10) * 10) / 10;

  return { score, coverage, matched, partial, missing, trace };
}

/**
 * ROLES (unchanged stable)
 */
function normalizeRoles(roles = [], lines = []) {
  if (roles.length && roles.some(r => r.bullets?.length)) {
    return roles.slice(0, 3).map(r => ({
      ...r,
      bullets: r.bullets.slice(0, 4)
    }));
  }

  return extractRoles(lines.join("\n"));
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
        title: parts[0]?.trim(),
        company: parts[1]?.trim(),
        bullets: []
      };
    } else if (current && line.length > 40) {
      current.bullets.push(line.trim());
    }
  }

  if (current) roles.push(current);

  return roles.slice(0, 3);
}

/**
 * EDUCATION
 */
function normalizeEducation(edu = [], lines = []) {
  return (edu.length ? edu : lines)
    .filter(e => e.toLowerCase().includes("university"))
    .map(e => ({ degree: typeof e === "string" ? e : e.degree }))
    .slice(0, 2);
}

/**
 * CLEAN JD
 */
function cleanRequirements(reqs = []) {
  return reqs.map(r => r.trim()).filter(r => r.length > 25).slice(0, 8);
}

/**
 * 🔥 SUMMARY FIX
 */
function buildSummary(roles, skills) {
  const roleTitles = roles.map(r => r.title).slice(0, 2).join(", ");

  if (!skills.length) {
    return `${roleTitles} professional with extensive experience in enterprise program delivery and transformation.`;
  }

  const skillList = skills.slice(0, 4).join(", ");

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

function splitSections(text) {
  const lines = text.split("\n");

  let current = "header";

  const sections = { header: [], skills: [], experience: [], education: [] };

  for (let line of lines) {
    const l = line.toLowerCase();

    if (l.includes("skills") || l.includes("competencies")) current = "skills";
    else if (l.includes("experience")) current = "experience";
    else if (l.includes("education")) current = "education";

    sections[current].push(line);
  }

  return sections;
}

async function parseResume() {
  return {};
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

module.exports = {
  generateNarrativeOSResume
};
