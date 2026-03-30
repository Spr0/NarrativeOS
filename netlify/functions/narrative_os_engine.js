// narrative_os_engine.js

const GENERIC_PHRASES = [
  "program governance",
  "stakeholders",
  "cross-functional",
  "delivery excellence",
  "strategic alignment"
];

const CAPABILITY_RULES = [
  {
    name: "PROGRAM_DELIVERY",
    signals: ["program", "delivery", "roadmap", "execution"],
    guidance: "Clarify ownership of // narrative_os_engine.js

const GENERIC_PHRASES = [
  "program governance",
  "stakeholders",
  "cross-functional",
  "delivery excellence",
  "strategic alignment"
];

const NOISE_PATTERNS = [
  /@/,                     // emails
  /\d{3}[-.\s]?\d{3}/,     // phone numbers
  /\bWA\b|\bCA\b|\bNY\b/,  // states
  /\|/,                    // separators
  /linkedin/i,
  /bellingham/i,
  /^scott/i,
  /responsibilities$/i,
  /summary$/i
];

// ==============================
// TEXT CLEANING
// ==============================

function cleanLine(text = "") {
  return text
    .replace(/^com\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoise(line = "") {
  const l = line.toLowerCase();

  if (l.length < 20) return true;

  return NOISE_PATTERNS.some(p => p.test(l));
}

// ==============================
// BULLET EXTRACTION (FIXED)
// ==============================

function extractBullets(text = "") {
  const lines = text
    .split("\n")
    .map(l => cleanLine(l))
    .filter(l => l.length > 0);

  let bullets = lines.filter(l =>
    l.startsWith("-") ||
    l.startsWith("•") ||
    l.startsWith("*")
  );

  bullets = bullets.map(b => b.replace(/^[-•*]\s*/, ""));

  // fallback if no bullets
  if (bullets.length === 0) {
    bullets = text
      .split(/[.!?]/)
      .map(s => cleanLine(s))
      .filter(s => s.length > 40);
  }

  // remove noise
  bullets = bullets.filter(b => !isNoise(b));

  return bullets.slice(0, 25);
}

// ==============================
// CAPABILITIES
// ==============================

const CAPABILITY_RULES = [
  {
    name: "PROGRAM_DELIVERY",
    signals: ["program", "delivery", "roadmap", "execution"],
    guidance: "Clarify ownership of delivery and outcomes."
  },
  {
    name: "DEPENDENCY_MANAGEMENT",
    signals: ["dependency", "dependencies", "blockers"],
    guidance: "Show how dependencies were managed."
  },
  {
    name: "STAKEHOLDER_MANAGEMENT",
    signals: ["stakeholder", "executive", "alignment"],
    guidance: "Highlight stakeholder alignment."
  }
];

function extractCapabilities(text = "") {
  const lower = text.toLowerCase();

  return CAPABILITY_RULES.map(rule => {
    const matches = rule.signals.filter(s => lower.includes(s));
    return {
      name: rule.name,
      score: matches.length / rule.signals.length,
      guidance: rule.guidance
    };
  })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ==============================
// SCORING
// ==============================

function keywordScore(req = "", bullet = "") {
  const reqWords = req.toLowerCase().split(/\W+/);
  const bulletText = bullet.toLowerCase();

  let matches = 0;

  for (const w of reqWords) {
    if (w.length > 4 && bulletText.includes(w)) {
      matches++;
    }
  }

  return Math.min(matches / 5, 1);
}

function capabilityScore(reqCaps, bullet = "") {
  const text = bullet.toLowerCase();
  let score = 0;

  for (const cap of reqCaps) {
    if (cap.name === "PROGRAM_DELIVERY" && text.includes("program")) {
      score += 0.5;
    }
    if (cap.name === "STAKEHOLDER_MANAGEMENT" && text.includes("stakeholder")) {
      score += 0.3;
    }
    if (cap.name === "DEPENDENCY_MANAGEMENT" && text.includes("depend")) {
      score += 0.4;
    }
  }

  return Math.min(score, 1);
}

// ==============================
// MAIN ENGINE
// ==============================

export async function runNarrativeOS({
  resumeText = "",
  jobDescription = ""
}) {
  try {
    const requirements = jobDescription
      .split("\n")
      .map(r => cleanLine(r))
      .filter(r => r.length > 25 && !isNoise(r));

    const bullets = extractBullets(resumeText);

    const results = [];

    for (const req of requirements) {
      const reqCaps = extractCapabilities(req);
      const primaryCap = reqCaps[0];

      const ranked = bullets.map((bullet, i) => {
        const capScore = capabilityScore(reqCaps, bullet);
        const keyScore = keywordScore(req, bullet);

        const score = (0.6 * capScore) + (0.4 * keyScore);

        return {
          bulletId: i,
          text: bullet,
          score,
          gaps: [],
          estimatedImprovement: 0.1
        };
      });

      ranked.sort((a, b) => b.score - a.score);

      results.push({
        requirement: req,
        capability: primaryCap?.name || "GENERAL",
        rankedBullets: ranked.slice(0, 5),
        recommendation: ranked[0]
          ? {
              bestBullet: ranked[0].text,
              rewriteGuidance: {
                guidance: "Make this more specific and outcome-driven.",
                exampleFocus: "Add metrics, scope, and stakeholders."
              }
            }
          : null
      });
    }

    const coverage =
      results.filter(r => r.rankedBullets[0]?.score > 0.3).length /
      (results.length || 1);

    return {
      score: Math.round(coverage * 10),
      coverage,
      requirements: results
    };

  } catch (e) {
    return {
      score: 0,
      coverage: 0,
      requirements: []
    };
  }
}delivery, scope, and measurable outcomes."
  },
  {
    name: "DEPENDENCY_MANAGEMENT",
    signals: ["dependency", "dependencies", "blockers"],
    guidance: "Show how dependencies were identified and resolved."
  },
  {
    name: "STAKEHOLDER_MANAGEMENT",
    signals: ["stakeholder", "executive", "alignment"],
    guidance: "Highlight stakeholder groups and alignment outcomes."
  },
  {
    name: "PROCESS_OPTIMIZATION",
    signals: ["optimize", "improve", "efficiency", "process"],
    guidance: "Quantify improvements and impact."
  }
];

// ==============================
// SAFE PARSING (FIXED)
// ==============================

function extractBullets(text = "") {
  const lines = text.split("\n").map(l => l.trim());

  // bullet formats
  const bullets = lines.filter(l =>
    l.startsWith("-") ||
    l.startsWith("•") ||
    l.startsWith("*")
  );

  if (bullets.length > 0) {
    return bullets.map(b => b.replace(/^[-•*]\s*/, ""));
  }

  // fallback: split into sentences
  return text
    .split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 30)
    .slice(0, 20);
}

// ==============================
// UTIL
// ==============================

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function isGenericBullet(text = "") {
  const lower = text.toLowerCase();
  return GENERIC_PHRASES.some(p => lower.includes(p));
}

// ==============================
// CAPABILITIES
// ==============================

function extractCapabilities(text = "") {
  const lower = text.toLowerCase();

  return CAPABILITY_RULES.map(rule => {
    const matches = rule.signals.filter(s => lower.includes(s));
    return {
      name: rule.name,
      score: matches.length / rule.signals.length,
      guidance: rule.guidance
    };
  })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ==============================
// SCORING
// ==============================

function keywordScore(req = "", bullet = "") {
  const reqWords = req.toLowerCase().split(/\W+/);
  const bulletText = bullet.toLowerCase();

  let matches = 0;

  for (const w of reqWords) {
    if (w.length > 4 && bulletText.includes(w)) {
      matches++;
    }
  }

  return Math.min(matches / 5, 1);
}

function capabilityScore(reqCaps, bullet = "") {
  const text = bullet.toLowerCase();
  let score = 0;

  for (const cap of reqCaps) {
    if (cap.name === "DEPENDENCY_MANAGEMENT" && text.includes("depend")) {
      score += 0.4;
    }
    if (cap.name === "STAKEHOLDER_MANAGEMENT" && text.includes("stakeholder")) {
      score += 0.3;
    }
    if (cap.name === "PROGRAM_DELIVERY" && text.includes("program")) {
      score += 0.3;
    }
    if (cap.name === "PROCESS_OPTIMIZATION" && text.includes("improv")) {
      score += 0.3;
    }
  }

  return Math.min(score, 1);
}

// ==============================
// GAP + GUIDANCE
// ==============================

function analyzeGaps(reqCaps, bullet = "") {
  const text = bullet.toLowerCase();
  const missing = [];

  for (const cap of reqCaps) {
    if (cap.name === "DEPENDENCY_MANAGEMENT" && !text.includes("depend")) {
      missing.push("dependency management");
    }
    if (cap.name === "STAKEHOLDER_MANAGEMENT" && !text.includes("stakeholder")) {
      missing.push("stakeholder scope");
    }
    if (cap.name === "PROGRAM_DELIVERY" && !text.includes("program")) {
      missing.push("program ownership");
    }
    if (cap.name === "PROCESS_OPTIMIZATION" && !text.includes("improv")) {
      missing.push("quantified improvements");
    }
  }

  return missing;
}

function estimateScoreDelta(missing) {
  let delta = 0;

  for (const gap of missing) {
    if (gap.includes("dependency")) delta += 0.15;
    if (gap.includes("stakeholder")) delta += 0.1;
    if (gap.includes("program")) delta += 0.1;
    if (gap.includes("improvement")) delta += 0.1;
  }

  return Math.min(delta, 0.5);
}

function buildRewriteGuidance(requirement, bullet, missing, capability) {
  return {
    requirement,
    currentBullet: bullet,
    improveBy: missing,
    guidance: capability?.guidance || "Improve clarity and specificity.",
    exampleFocus: `Add: ${missing.join(", ")}`
  };
}

// ==============================
// MAIN ENGINE
// ==============================

export async function runNarrativeOS({
  resumeText = "",
  jobDescription = ""
}) {
  try {
    const requirements = jobDescription
      .split("\n")
      .filter(r => r.trim().length > 20);

    const bullets = extractBullets(resumeText);

    const bulletUsage = {};
    const results = [];

    for (let i = 0; i < requirements.length; i++) {
      const req = requirements[i];
      const reqCaps = extractCapabilities(req);
      const primaryCap = reqCaps[0];

      const ranked = [];

      for (let j = 0; j < bullets.length; j++) {
        const bullet = bullets[j];

        const capScore = capabilityScore(reqCaps, bullet);
        const keyScore = keywordScore(req, bullet);

        let penalty = 0;

        if (bulletUsage[j]) penalty += 0.15 * bulletUsage[j];
        if (isGenericBullet(bullet)) penalty += 0.2;

        const finalScore =
          (0.6 * capScore) +
          (0.4 * keyScore) -
          penalty;

        const missing = analyzeGaps(reqCaps, bullet);
        const delta = estimateScoreDelta(missing);

        ranked.push({
          bulletId: j,
          text: bullet,
          score: finalScore,
          breakdown: {
            capability: capScore,
            keyword: keyScore,
            penalty
          },
          gaps: missing,
          estimatedImprovement: delta
        });
      }

      ranked.sort((a, b) => b.score - a.score);

      const best = ranked[0];

      if (best) {
        bulletUsage[best.bulletId] =
          (bulletUsage[best.bulletId] || 0) + 1;
      }

      results.push({
        requirement: req,
        capability: primaryCap?.name || "GENERAL",
        bestBulletId: best?.bulletId ?? null,
        rankedBullets: safeArray(ranked).slice(0, 5),
        recommendation: best
          ? {
              bestBullet: best.text,
              gaps: best.gaps,
              estimatedScoreIncrease: best.estimatedImprovement,
              rewriteGuidance: buildRewriteGuidance(
                req,
                best.text,
                best.gaps,
                primaryCap
              )
            }
          : null
      });
    }

    const covered = results.filter(
      r => r?.rankedBullets?.[0]?.score > 0.4
    ).length;

    const coverage = requirements.length
      ? covered / requirements.length
      : 0;

    const score = Math.round(coverage * 10);

    return {
      score,
      coverage,
      requirements: results
    };

  } catch (e) {
    console.error("ENGINE ERROR:", e);

    return {
      score: 0,
      coverage: 0,
      requirements: []
    };
  }
}
