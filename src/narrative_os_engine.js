// narrative_os_engine.js

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function clean(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

// ==============================
// REQUIREMENTS
// ==============================

function extractRequirements(text = "") {
  try {
    return text
      .split("\n")
      .map(r => clean(r))
      .filter(r => r.length > 30)
      .slice(0, 10);
  } catch {
    return [];
  }
}

// ==============================
// BULLETS
// ==============================

function extractBullets(text = "") {
  try {
    return text
      .split("\n")
      .map(l => clean(l))
      .filter(l => l.length > 30)
      .slice(0, 20);
  } catch {
    return [];
  }
}

// ==============================
// SIMPLE SCORING (SAFE)
// ==============================

function score(req, bullet) {
  try {
    const r = req.toLowerCase();
    const b = bullet.toLowerCase();

    let s = 0;

    if (b.includes("program")) s += 0.2;
    if (b.includes("delivery")) s += 0.2;
    if (b.includes("stakeholder")) s += 0.2;

    if (r.split(" ").some(w => b.includes(w))) {
      s += 0.3;
    }

    return Math.min(1, s);
  } catch {
    return 0;
  }
}

// ==============================
// MAIN FUNCTION (NEVER FAILS)
// ==============================

export async function analyzeJob(jobText = "", resumeText = "") {
  try {
    const requirements = extractRequirements(jobText);
    const bullets = extractBullets(resumeText);

    const results = [];

    for (const req of requirements) {
      let bestScore = 0;
      let bestBullet = "";

      for (const b of bullets) {
        const s = score(req, b);
        if (s > bestScore) {
          bestScore = s;
          bestBullet = b;
        }
      }

      results.push({
        requirement: req,
        score: Math.round(bestScore * 100),
        summary: bestBullet || "No strong evidence found",
        gap: bestScore < 0.5 ? "Weak or unclear evidence" : null,
        fix: bestScore < 0.5
          ? "Add measurable outcomes, scope, or stakeholder impact"
          : null
      });
    }

    const avg =
      results.reduce((a, r) => a + r.score, 0) /
      (results.length || 1);

    return {
      score: Math.round(avg / 10),
      requirements: safeArray(results)
    };

  } catch (e) {
    console.error("ENGINE ERROR:", e);

    return {
      score: 0,
      requirements: [],
      error: true
    };
  }
}
