function normalizeText(text = "") {
  return text.toLowerCase();
}

/**
 * 🧠 MAIN
 */
async function generateNarrativeOSResume({
  resumeData = "",
  jobRequirements = []
}) {
  const resume = parseResume(resumeData);

  const analysis = analyzeRequirementsWithTrace(
    resume,
    jobRequirements
  );

  return {
    header: resume.header,
    summary: resume.summary,
    skills: resume.skills,
    roles: resume.roles,
    education: resume.education,
    analysis
  };
}

/**
 * 🧱 SAFE PARSER (deterministic > smart)
 */
function parseResume(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const header = lines[0] || "Candidate";

  return {
    header,
    summary: extractSummary(lines),
    skills: extractSkills(lines),
    roles: extractRoles(lines),
    education: extractEducation(lines)
  };
}

/**
 * 🔹 SUMMARY = first long paragraph
 */
function extractSummary(lines) {
  return lines.find(l => l.length > 80) || "";
}

/**
 * 🔹 SKILLS = short clean lines only
 */
function extractSkills(lines) {
  return lines
    .filter(l =>
      l.length < 60 &&
      !l.includes("@") &&
      !l.includes("|") &&
      !l.match(/\d{4}/)
    )
    .slice(0, 8);
}

/**
 * 🔹 ROLES (STRICT + SAFE)
 */
function extractRoles(lines) {
  const roles = [];

  let currentRole = null;

  for (let line of lines) {
    // 👉 ROLE HEADERS (must look like a job)
    const isRoleHeader =
      line.includes("—") ||
      (line.includes("|") && line.match(/\d{4}/));

    if (isRoleHeader) {
      if (currentRole) roles.push(currentRole);

      currentRole = {
        title: line,
        bullets: []
      };
      continue;
    }

    // 👉 BULLETS (strict filter)
    if (
      currentRole &&
      line.length > 40 &&
      line.length < 180 &&
      !line.includes("@") &&
      !line.toLowerCase().includes("summary") &&
      !line.toLowerCase().includes("competencies") &&
      !line.toLowerCase().includes("skills") &&
      currentRole.bullets.length < 4
    ) {
      currentRole.bullets.push(line);
    }
  }

  if (currentRole) roles.push(currentRole);

  // 👉 HARD GUARANTEE
  return roles.slice(0, 3);
}

/**
 * 🔹 EDUCATION
 */
function extractEducation(lines) {
  return lines
    .filter(l =>
      l.toLowerCase().includes("university") ||
      l.toLowerCase().includes("mba") ||
      l.toLowerCase().includes("ba")
    )
    .map(l => ({
      degree: l,
      field: "",
      institution: ""
    }))
    .slice(0, 2);
}

/**
 * 🧠 MATCHING (simple + reliable)
 */
function analyzeRequirementsWithTrace(resume, requirements = []) {
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
    const words = r.split(" ").filter(w => w.length > 4);

    const scored = allBullets.map(b => {
      let score = 0;

      for (let w of words) {
        if (b.norm.includes(w)) score += 2;
      }

      if (b.norm.includes("program")) score += 1;
      if (b.norm.includes("governance")) score += 2;

      return { ...b, score };
    });

    const best = scored
      .sort((a, b) => b.score - a.score)
      .filter(s => s.score > 1);

    if (best.length) {
      partial.push(req);

      trace.push({
        requirement: req,
        status: "partial",
        evidence: best.slice(0, 2)
      });

    } else {
      missing.push(req);

      trace.push({
        requirement: req,
        status: "missing",
        evidence: []
      });
    }
  }

  const total = requirements.length || 1;
  const coverage = Math.round((partial.length / total) * 100);
  const score = Math.round((coverage / 10) * 10) / 10;

  return {
    score,
    coverage,
    partial,
    missing,
    trace
  };
}

/**
 * ✅ EXPORT (CRITICAL)
 */
module.exports = {
  generateNarrativeOSResume
};
