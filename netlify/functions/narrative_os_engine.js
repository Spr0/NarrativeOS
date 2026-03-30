// narrative_os_engine.js

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function clean(text = "") {
  return text.replace(/^com\s+/i, "").trim();
}

// ==============================
// REQUIREMENTS (AND/OR AWARE)
// ==============================

function extractRequirements(text = "") {
  const lines = text
    .split("\n")
    .map(r => clean(r))
    .filter(r =>
      r.length > 30 &&
      !/responsibilities$/i.test(r)
    );

  return lines.slice(0, 15).map(line => {
    const lower = line.toLowerCase();

    let type = "STANDARD";

    if (lower.includes(" and ")) type = "REQUIRED";
    if (lower.includes(" or ")) type = "OPTIONAL";

    return {
      text: line,
      type,
      weight:
        type === "REQUIRED" ? 1.2 :
        type === "OPTIONAL" ? 0.8 :
        1.0
    };
  });
}

// ==============================
// BULLETS
// ==============================

function extractBullets(text = "") {
  const lines = text.split("\n").map(l => clean(l)).filter(Boolean);

  let bullets = lines.filter(l =>
    l.startsWith("-") ||
    l.startsWith("•") ||
    l.startsWith("*")
  );

  bullets = bullets.map(b => b.replace(/^[-•*]\s*/, ""));

  if (bullets.length === 0) {
    bullets = text
      .split(/[.!?]/)
      .map(s => clean(s))
      .filter(s => s.length > 40);
  }

  return safeArray(bullets).slice(0, 20);
}

// ==============================
// SCORING (BALANCED + CONTINUOUS)
// ==============================

function scoreBullet(req, bullet) {
  const r = req.toLowerCase();
  const b = bullet.toLowerCase();

  let score = 0.3; // base

  let signalCount = 0;

  if (b.includes("program")) {
    score += 0.12;
    signalCount++;
  }

  if (b.includes("delivery")) {
    score += 0.12;
    signalCount++;
  }

  if (b.includes("stakeholder")) {
    score += 0.08;
    signalCount++;
  }

  if (b.includes("dependency")) {
    score += 0.08;
    signalCount++;
  }

  // keyword overlap
  const words = r.split(/\W+/).filter(w => w.length > 5);
  const matches = words.filter(w => b.includes(w)).length;

  score += Math.min(matches * 0.05, 0.25);

  // multi-signal bonus
  if (signalCount >= 2) {
    score += 0.08;
  }

  return Math.max(0, Math.min(score, 1));
}

// ==============================
// MAIN ENGINE
// ==============================

export async function runNarrativeOS({
  resumeText = "",
  jobDescription = ""
}) {
  try {
    const requirements = extractRequirements(jobDescription);
    const bullets = extractBullets(resumeText);

    const results = [];

    let totalWeight = 0;
    let weightedScoreSum = 0;

    for (const reqObj of requirements) {
      const { text: req, weight, type } = reqObj;

      const ranked = safeArray(bullets).map((b, i) => ({
        bulletId: i,
        text: b,
        score: scoreBullet(req, b),
      }));

      ranked.sort((a, b) => b.score - a.score);

      const bestScore = ranked[0]?.score || 0;

      totalWeight += weight;
      weightedScoreSum += bestScore * weight;

      results.push({
        requirement: req,
        type,
        weight,
        capability: "GENERAL",
        rankedBullets: ranked.slice(0, 5),
        recommendation: ranked[0] || null,
      });
    }

    // ==============================
    // AVERAGE-BASED SCORING (FIX)
    // ==============================

    const averageScore =
      totalWeight > 0 ? weightedScoreSum / totalWeight : 0;

    // slight compression (prevents easy 10s)
    const adjusted = Math.pow(averageScore, 1.15);

    const finalScore = Math.min(
      10,
      Math.round(adjusted * 10)
    );

    return {
      score: finalScore,
      coverage: averageScore,
      requirements: safeArray(results),
    };

  } catch (e) {
    console.error("ENGINE FAIL:", e);

    return {
      score: 0,
      coverage: 0,
      requirements: [],
    };
  }
}
