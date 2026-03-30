// NarrativeOS Engine — Stable + Clean Matching (No LLM yet)

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function clean(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

// ─────────────────────────────────────────
// FILTER JUNK (CRITICAL FIX)
// ─────────────────────────────────────────

function isJunk(line = "") {
  const l = line.toLowerCase();

  return (
    l.includes("@") ||
    l.includes("linkedin") ||
    l.includes("http") ||
    l.includes("bellingham") ||
    l.match(/\d{3}[-\s]?\d{3}/) || // phone
    l.split("|").length > 3 ||     // contact line
    l.length < 40
  );
}

// ─────────────────────────────────────────
// REQUIREMENTS
// ─────────────────────────────────────────

function extractRequirements(text = "") {
  try {
    return text
      .split(/\n|\.|•|-/)
      .map(r => clean(r))
      .filter(r => r.length > 40)
      .slice(0, 10);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────
// RESUME BULLETS
// ─────────────────────────────────────────

function extractBullets(text = "") {
  try {
    return text
      .split("\n")
      .map(l => clean(l))
      .filter(l => !isJunk(l)) // ✅ removes headers/contact
      .slice(0, 25);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────
// BETTER SCORING (NON-DUMB)
// ─────────────────────────────────────────

function score(req, bullet) {
  try {
    const r = req.toLowerCase();
    const b = bullet.toLowerCase();

    let score = 0;

    // Core signals
    if (b.includes("erp")) score += 0.25;
    if (b.includes("program")) score += 0.2;
    if (b.includes("delivery")) score += 0.2;
    if (b.includes("stakeholder")) score += 0.15;
    if (b.includes("transformation")) score += 0.15;

    // Fuzzy overlap
    const rWords = r.split(" ").filter(w => w.length > 4);
    let overlap = 0;

    rWords.forEach(w => {
      if (b.includes(w)) overlap++;
    });

    score += overlap * 0.05;

    return Math.min(1, score);

  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────
// SUMMARIZE EVIDENCE (UX FIX)
// ─────────────────────────────────────────

function summarizeBullet(bullet = "") {
  if (!bullet) return "";

  let summary = bullet.split(";")[0];

  if (summary.length > 140) {
    summary = summary.slice(0, 140) + "...";
  }

  return summary;
}

// ─────────────────────────────────────────
// MAIN ENGINE
// ─────────────────────────────────────────

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

      const strength = Math.round(bestScore * 100);

      results.push({
        requirement: req,
        score: strength,
        summary: summarizeBullet(bestBullet),
        gap: bestScore < 0.45
          ? "Evidence not clearly demonstrated"
          : null,
        fix: bestScore < 0.45
          ? "Make impact explicit (scale, stakeholders, measurable results)"
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
