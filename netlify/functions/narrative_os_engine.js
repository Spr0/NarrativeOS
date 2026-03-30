import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * ENTRY
 */
export async function generateNarrativeOSResume({
  resumeData,
  jobRequirements
}) {
  const normalized = await normalizeResume(resumeData);

  const requirementMap = mapRequirementsToResume(jobRequirements);

  const enhancedRoles = await buildRolesDeterministically(
    normalized.roles,
    requirementMap,
    normalized
  );

  const summary = await generateSummary(normalized, jobRequirements);

  const finalResume = assembleResume({
    header: normalized.header,
    summary,
    skills: normalized.skills,
    roles: enhancedRoles,
    education: normalized.education
  });

  validateFinalResume(finalResume);

  return finalResume;
}

/**
 * NORMALIZE (RAW TEXT SUPPORT)
 */
async function normalizeResume(resume) {
  if (typeof resume === "string") {
    return await parseRawResume(resume);
  }

  return {
    header: resume.header || "",
    summary: resume.summary || "",
    skills: resume.skills || [],
    roles: (resume.roles || []).slice(0, 3),
    education: resume.education || ""
  };
}

/**
 * PARSE RAW RESUME → JSON
 */
async function parseRawResume(rawText) {
  const prompt = `
Convert this resume into JSON.

STRICT:
- No hallucination
- Max 3 roles
- Max 4 bullets per role

FORMAT:
{
  "header": "",
  "summary": "",
  "skills": [],
  "roles": [
    {
      "title": "",
      "company": "",
      "dates": "",
      "bullets": []
    }
  ],
  "education": ""
}

RESUME:
${rawText}
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  const text = res.choices[0].message.content;

  try {
    return JSON.parse(extractJSON(text));
  } catch (e) {
    throw new Error("Failed to parse resume");
  }
}

/**
 * SAFELY EXTRACT JSON (handles messy LLM output)
 */
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

/**
 * REQUIREMENT CLASSIFICATION (stub → replace later)
 */
function mapRequirementsToResume(requirements) {
  return requirements.map((req) => {
    const r = Math.random();
    if (r > 0.7) return { text: req, status: "missing" };
    if (r > 0.4) return { text: req, status: "partial" };
    return { text: req, status: "matched" };
  });
}

/**
 * GAP SELECTION
 */
function getGapRequirements(map) {
  const missing = map.filter((r) => r.status === "missing");
  const partial = map.filter((r) => r.status === "partial");
  return [...missing, ...partial].slice(0, 6);
}

/**
 * ROLE BUILDER (DETERMINISTIC + GAP BRIDGING)
 */
async function buildRolesDeterministically(
  roles,
  requirementMap,
  resume
) {
  const gaps = getGapRequirements(requirementMap);
  let gapIndex = 0;

  const finalRoles = [];

  for (let role of roles.slice(0, 3)) {
    let bullets = (role.bullets || []).map(trimBullet).slice(0, 4);

    while (bullets.length < 4 && gapIndex < gaps.length) {
      const gap = gaps[gapIndex];

      const newBullet = await generateGapBullet({
        role,
        requirement: gap
      });

      if (newBullet) bullets.push(trimBullet(newBullet));

      gapIndex++;
    }

    finalRoles.push({
      ...role,
      bullets: bullets.slice(0, 4)
    });
  }

  return finalRoles;
}

/**
 * GAP BULLET GENERATION
 */
async function generateGapBullet({ role, requirement }) {
  const prompt = `
Fix a resume gap.

RULES:
- No fake experience
- Reframe existing work
- Max 25 words
- One sentence

ROLE:
${role.title} at ${role.company}

EXISTING BULLETS:
${(role.bullets || []).join("\n")}

TARGET:
${requirement.text}

Write ONE bullet:
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  return res.choices[0].message.content.trim();
}

/**
 * SUMMARY
 */
async function generateSummary(resume, jobRequirements) {
  const prompt = `
Write a short summary (max 80 words).
No hallucinations.

ROLES:
${resume.roles.map((r) => r.title).join(", ")}

TARGET:
${jobRequirements.slice(0, 5).join(", ")}
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }]
  });

  return res.choices[0].message.content.trim();
}

/**
 * CLEAN BULLET
 */
function trimBullet(text) {
  return text
    .replace(/\n/g, " ")
    .split(" ")
    .slice(0, 25)
    .join(" ");
}

/**
 * FINAL SHAPE
 */
function assembleResume(data) {
  return {
    header: data.header,
    summary: data.summary,
    skills: (data.skills || []).slice(0, 12),
    roles: data.roles.map((r) => ({
      title: r.title,
      company: r.company,
      dates: r.dates,
      bullets: r.bullets.slice(0, 4)
    })),
    education: data.education
  };
}

/**
 * VALIDATION
 */
function validateFinalResume(resume) {
  if (!resume.header) throw new Error("Missing header");
  if (!resume.roles.length) throw new Error("No roles");
  if (!resume.education) throw new Error("Missing education");
}
