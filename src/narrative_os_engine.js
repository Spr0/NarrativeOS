// --- SIMPLE CACHE (in-memory) ---
const embeddingCache = new Map()

async function getEmbedding(text) {
  if (embeddingCache.has(text)) return embeddingCache.get(text)

  try {
    const res = await fetch("/.netlify/functions/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text })
    })

    const data = await res.json()
    const emb = data?.embedding || null

    if (emb) embeddingCache.set(text, emb)

    return emb
  } catch {
    return null
  }
}

// --- COSINE ---
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0

  let dot = 0, magA = 0, magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  if (!magA || !magB) return 0

  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// --- JD PARSING ---
export async function parseJD(jd, callClaude) {
  try {
    const res = await callClaude(
      "Extract must-have requirements as JSON: { must_have: [] }",
      jd
    )

    const match = res.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { must_have: [] }
  } catch {
    return { must_have: [] }
  }
}

// --- HYBRID VALIDATION (FAST) ---
async function validateHybrid(resume, jdStruct, callClaude) {
  const requirements = jdStruct?.must_have || []

  if (!requirements.length) {
    return { reasons: [], weights: [] }
  }

  const resumeChunks = resume
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)

  // ⚡ PARALLEL embeddings
  const resumeEmbeddings = (await Promise.all(
    resumeChunks.map(getEmbedding)
  )).filter(Boolean)

  const reqEmbeddings = await Promise.all(
    requirements.map(getEmbedding)
  )

  const reasons = []
  const weights = []

  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i]
    const reqEmb = reqEmbeddings[i]

    let bestScore = 0

    if (reqEmb && resumeEmbeddings.length) {
      for (const emb of resumeEmbeddings) {
        const s = cosineSimilarity(emb, reqEmb)
        if (s > bestScore) bestScore = s
      }
    }

    if (bestScore > 0.80) {
      reasons.push("Strong")
      weights.push(1)
    } else if (bestScore > 0.60) {
      const check = await callClaude(
        "Classify match as STRONG, WEAK, or NONE",
        `Requirement: ${req}\nResume:\n${resume}`
      )

      const text = check.toLowerCase()

      if (text.includes("strong")) {
        reasons.push("LLM strong")
        weights.push(0.75)
      } else if (text.includes("weak")) {
        reasons.push("Weak")
        weights.push(0.5)
      } else {
        reasons.push("None")
        weights.push(0)
      }
    } else {
      reasons.push("None")
      weights.push(0)
    }
  }

  return { reasons, weights }
}

// --- GENERATION ---
export async function generateResume(base, jd, stories, jdStruct, callClaude) {
  let best = ""
  let bestScore = 0
  let bestExplain = { coverage: 0, semanticReasons: [] }

  for (let i = 0; i < 3; i++) {
    let missing = []

    if (i > 0 && bestExplain?.semanticReasons?.length) {
      const reqs = jdStruct?.must_have || []

      reqs.forEach((req, idx) => {
        const reason = bestExplain.semanticReasons[idx] || ""
        if (!reason.toLowerCase().includes("strong")) {
          missing.push(req)
        }
      })
    }

    const res = await callClaude(
      "Rewrite resume optimized for ATS. DO NOT invent experience.",
      `Original Resume:\n${base}\n\nJD:\n${jd}\n\nMissing:\n${missing.join("\n")}`
    )

    const truth = await validateHybrid(base, jdStruct, callClaude)
    const gen = await validateHybrid(res, jdStruct, callClaude)

    const total = gen.weights.length || 1

    const genScore = gen.weights.reduce((a, b) => a + b, 0)
    const truthScore = truth.weights.reduce((a, b) => a + b, 0)

    // ⚖️ Balanced scoring
    let adjusted = (genScore * 0.7) + (truthScore * 0.3)

    // 🔥 MUST-HAVE PENALTIES
    const critical = jdStruct?.must_have?.slice(0, 2) || []

    critical.forEach((_, i) => {
      if ((truth.weights[i] || 0) === 0) {
        adjusted -= 0.5
      }
    })

    const coverage = adjusted / total
    const score = Math.max(0, Math.round(coverage * 10))

    if (score > bestScore) {
      best = res
      bestScore = score
      bestExplain = {
        coverage,
        semanticReasons: gen.reasons
      }
    }

    if (score >= 6 && coverage >= 0.6) {
      return {
        best,
        bestScore,
        keywords: jdStruct?.must_have || [],
        jdStruct,
        explain: bestExplain,
        reject: false
      }
    }
  }

  return {
    best,
    bestScore,
    keywords: jdStruct?.must_have || [],
    jdStruct,
    explain: bestExplain,
    reject: bestScore < 5
  }
}
