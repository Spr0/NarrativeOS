const OpenAI = require("openai");

let openai;

try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} catch (e) {
  console.error("OpenAI INIT ERROR:", e);
}

/**
 * ENTRY
 */
async function generateNarrativeOSResume({
  resumeData,
  jobRequirements
}) {
  console.log("⚙️ ENGINE START");

  const normalized = await normalizeResume(resumeData);

  const requirementMap = mapRequirementsToResume(jobRequirements);

  const roles = await buildRoles(normalized.roles, requirementMap);

  const summary = await safeSummary(normalized, jobRequirements);

  return {
    header: normalized.header || "Candidate",
    summary,
    skills: normalized.skills || [],
    roles,
    education: normalized.education || ""
  };
}

/**
 * NORMALIZE
 */
async function normalizeResume(resume) {
  if (typeof resume !== "string") return resume;

  return await parseResume(resume);
}

/**
 * PARSE RESUME (SAFE)
 */
async function parseResume(raw) {
  try {
    const prompt = `
Extract structured resume JSON.

RULES:
- No hallucination
- Max 3 roles
- Max 4 bullets per role

Return ONLY JSON.

RESUME:
${raw}
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    });

    const text = res.choices?.[0]?.message?.content || "{}";

    const json = extractJSON(text);

    return JSON.parse(json);
  } catch (e) {
    console.error("PARSE FAIL:", e);

    return {
      header: raw.split("\n")[0] || "Candidate",
      summary: "",
      skills: [],
      roles: [],
      education: ""
    };
  }
}

/**
 * SAFE JSON EXTRACT
 */
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

/**
 * REQUIREMENTS (TEMP LOGIC)
 */
function mapRequirementsToResume(reqs) {
  return (reqs || []).map((r) => ({
    text: r,
    status: "missing"
  }));
}

/**
 * BUILD ROLES (SAFE + GAP)
 */
async function buildRoles(roles = [], requirements = []) {
  const final = [];
  let gapIndex = 0;

  for (let role of roles.slice(0, 3)) {
    let bullets = (role.bullets || []).slice(0, 4);

    while (bullets.length < 4 && gapIndex < requirements.length) {
      const gap = requirements[gapIndex];

      const bullet = await safeBullet(role, gap);

      if (bullet) bullets.push(bullet);

      gapIndex++;
    }

    final.push({
      title: role.title || "",
      company: role.company || "",
      dates: role.dates || "",
      bullets: bullets.slice(0, 4)
    });
  }

  return final;
}

/**
 * SAFE BULLET
 */
async function safeBullet(role, requirement) {
  try {
    const prompt = `
Write ONE resume bullet.

- No hallucination
- Max 20 words

ROLE:
${role.title}

REQUIREMENT:
${requirement.text}
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    });

    return res.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("BULLET FAIL:", e);
    return null;
  }
}

/**
 * SAFE SUMMARY
 */
async function safeSummary(resume, reqs) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `Write a short professional summary.`
        }
      ]
    });

    return res.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

module.exports = {
  generateNarrativeOSResume
};
