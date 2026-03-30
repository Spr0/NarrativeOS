// narrative_os_engine.js

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function clean(text = "") {
  return text.replace(/^com\s+/i, "").trim();
}

// ==============================
// REQUIREMENTS WITH AND/OR LOGIC
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
        type === "OPTIONAL" ? 0.7 :
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
// SCORING
// ==============================

function scoreBullet(req, bullet) {
  const r = req.toLowerCase();
  const b = bullet.toLowerCase();

  let score = 0.25;

  let signalCount = 0;

  if (b.includes("program")) {
    score += 0.15;
    signalCount++;
  }

  if (b.includes("delivery")) {
    score += 0.15;
    signalCount++;
  }

  if (b.includes("stakeholder")) {
    score += 0.1;
    signalCount++;
  }

  if (b.includes("dependency")) {
    score += 0.1;
    signalCount++;
  }

  const words = r.split(/\W+/).filter(w => w.length > 5);
  const matches = words.filter(w => b.includes(w)).length;

  score += Math.min(matches * 0.06, 0.25);

  if (signalCount >= 2) {
    score += 0.1;
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

    for (const reqObj of requirements) {
      const { text: req, weight, type } = reqObj;

      const ranked = safeArray(bullets).map((b, i) => ({
        bulletId: i,
        text: b,
        score: scoreBullet(req, b),
      }));

      ranked.sort((a, b) => b.score - a.score);

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
    // WEIGHTED SCORING (NEW)
    // ==============================

    let totalWeight = 0;
    let earnedWeight = 0;

    for (const r of results) {
      const bestScore = r?.rankedBullets?.[0]?.score || 0;

      totalWeight += r.weight;

      if (bestScore >= 0.7) {
        earnedWeight += r.weight;
      } else if (bestScore >= 0.5) {
        earnedWeight += r.weight * 0.6;
      }
    }

    const coverage =
      totalWeight > 0 ? earnedWeight / totalWeight : 0;

    const finalScore = Math.min(
      10,
      Math.round(Math.pow(coverage, 1.1) * 10)
    );

    return {
      score: finalScore,
      coverage,
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
