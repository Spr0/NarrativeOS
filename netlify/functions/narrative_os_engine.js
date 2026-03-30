// NarrativeOS Engine vNext — Hybrid Scoring + True Gap Reasoning

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const STOPWORDS = [
  "address", "phone", "email", "linkedin",
  "anjali", "recruiter", "pyramid consulting",
  "please review", "forward your resume"
];

const CAPABILITY_MAP = {
  PROGRAM_DELIVERY: ["delivery", "implementation", "execution", "erp", "program"],
  STAKEHOLDER: ["stakeholder", "executive", "c-suite", "board"],
  GOVERNANCE: ["governance", "risk", "compliance", "controls"],
  TECHNICAL: ["sap", "netsuite", "salesforce", "platform"],
  TRANSFORMATION: ["transformation", "migration", "modernization"]
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function cleanText(text = "") {
  return text
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function isGarbage(text = "") {
  const t = text.toLowerCase();
  return STOPWORDS.some(w => t.includes(w)) || t.length < 30;
}

function detectCapability(req) {
  const lower = req.toLowerCase();
  for (const [cap, words] of Object.entries(CAPABILITY_MAP)) {
    if (words.some(w => lower.includes(w))) return cap;
  }
  return "GENERAL";
}

function keywordScore(req, resume) {
  const words = req.toLowerCase().split(/\W+/).filter(w => w.length > 4);
  let hits = 0;

  words.forEach(w => {
    if (resume.toLowerCase().includes(w)) hits++;
  });

  return Math.min(1, hits / (words.length || 1));
}

// ─────────────────────────────────────────────────────────────
// LLM GAP EXTRACTION (THE IMPORTANT PART)
// ─────────────────────────────────────────────────────────────

async function extractGapWithLLM(requirement, resumeText) {
  try {
    const res = await fetch("/.netlify/functions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "gap",
        requirement,
        resumeText: resumeText.slice(0, 1500)
      })
    });

    const data = await res.json();

    return data || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// CORE ENGINE
// ─────────────────────────────────────────────────────────────

export async function analyzeJob(jobText, resumeText) {
  const cleanedJD = cleanText(jobText);

  const rawRequirements = cleanedJD
    .split(/\n|\.|•|-/)
    .map(r => r.trim())
    .filter(r => r.length > 40)
    .filter(r => !isGarbage(r));

  const requirements = rawRequirements.slice(0, 12);

  const results = [];

  for (const req of requirements) {
    const capability = detectCapability(req);

    const baseScore = keywordScore(req, resumeText);

    // Normalize to real range (prevents inflated 80s)
    let score = Math.round(40 + baseScore * 50); // 40–90 realistic

    // Get intelligent gap
    const gap = await extractGapWithLLM(req, resumeText);

    if (gap?.isGap) {
      score -= 15;
    } else if (baseScore > 0.7) {
      score += 5;
    }

    score = Math.max(0, Math.min(100, score));

    results.push({
      requirement: req,
      capability,
      score,
      gap: gap?.gap || null,
      fix: gap?.fix || null,
      summary: gap?.summary || null
    });
  }

  // ─────────────────────────────────────────────────────────────
  // FINAL SCORE (FIXED)
  // ─────────────────────────────────────────────────────────────

  const avg = results.reduce((a, r) => a + r.score, 0) / (results.length || 1);

  const finalScore = Math.round(avg / 10); // converts to 1–10 properly

  return {
    score: finalScore,
    requirements: results
  };
}
