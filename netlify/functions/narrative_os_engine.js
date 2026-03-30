// narrative_os_engine.js

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function clean(text = "") {
  return text.replace(/^com\s+/i, "").trim();
}

// ==============================
// REQUIREMENTS (FILTER STRONG ONLY)
// ==============================

function extractRequirements(text = "") {
  try {
    return text
      .split("\n")
      .map(r => clean(r))
      .filter(r =>
        r.length > 30 &&
        !/responsibilities$/i.test(r) &&
        !/summary$/i.test(r)
      )
      .slice(0, 15);
  } catch {
    return [];
  }
}

// ==============================
// BULLETS
// ==============================

function extractBullets(text = "") {
  try {
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

  } catch {
    return [];
  }
}

// ==============================
// SCORING (IMPROVED)
// ==============================

function scoreBullet(req, bullet) {
  try {
    const r = req.toLowerCase();
    const b = bullet.toLowerCase();

    let score = 0;

    // capability signals (strong weight)
    if (b.includes("program")) score += 0.25;
    if (b.includes("delivery")) score += 0.25;
    if (b.includes("stakeholder")) score += 0.2;
    if (b.includes("dependency")) score += 0.2;

    // keyword overlap
    const words = r.split(/\W+/).filter(w => w.length > 5);
    const matches = words.filter(w => b.includes(w)).length;

    score += Math.min(matches * 0.08, 0.3);

    return Math.min(score, 1);

  } catch {
    return 0;
  }
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

    for (const req of requirements) {
      const ranked = safeArray(bullets).map((b, i) => ({
        bulletId: i,
        text: b,
        score: scoreBullet(req, b),
      }));

      ranked.sort((a, b) => b.score - a.score);

      results.push({
        requirement: req,
        capability: "GENERAL",
        rankedBullets: ranked.slice(0, 5),
        recommendation: ranked[0] || null,
      });
    }

    // ==============================
    // REALISTIC SCORING
    // ==============================

    const strongMatches = results.filter(
      r => r?.rankedBullets?.[0]?.score >= 0.65
    ).length;

    const mediumMatches = results.filter(
      r => {
        const s = r?.rankedBullets?.[0]?.score || 0;
        return s >= 0.45 && s < 0.65;
      }
    ).length;

    const total = results.length || 1;

    // weighted coverage
    const weightedCoverage =
      (strongMatches * 1.0 + mediumMatches * 0.5) / total;

    // compression (harder to reach 10)
    const compressed = Math.pow(weightedCoverage, 0.8);

    const finalScore = Math.min(
      10,
      Math.round(compressed * 10)
    );

    return {
      score: finalScore,
      coverage: weightedCoverage,
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
