// --- EMBEDDINGS ---
async function getEmbedding(text) {
  try {
    const res = await fetch("/.netlify/functions/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: text })
    })

    const data = await res.json()
    return data?.embedding || null
  } catch {
    return null
  }
}

// --- COSINE SIMILARITY ---
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

// --- HYBRID VALIDATION (graded + safe) ---
async function validateHybrid(resume, jdStruct, callClaude) {
  const requirements = jdStruct?.must_have || []

  if (!requirements.length) {
    return { satisfied: [], reasons: [], weights: [] }
  }

  const resumeChunks = resume
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)

  const resumeEmbeddings = []

  for (const chunk of resumeChunks) {
    const emb = await getEmbedding(chunk)
    if (emb) resumeEmbeddings.push(emb)
  }

  const satisfied = []
  const reasons = []
  const weights = []

  for (const req of requirements) {
    const reqEmb = await getEmbedding(req)
    let bestScore = 0

    // --- EMBEDDING MATCH ---
    if (reqEmb && resumeEmbeddings.length) {
      for (const emb of resumeEmbeddings) {
        const s = cosineSimilarity(emb, reqEmb)
        if (s > bestScore) bestScore = s
      }
    } else {
      // --- FALLBACK ---
      const check = await callClaude(
        "Classify match as STRONG, WEAK, or NONE",
        `Requirement: ${req}\nResume:\n${resume}`
      )

      const text = check.toLowerCase()

      if (text.includes("strong")) {
        satisfied.push(true)
        reasons.push("LLM strong")
        weights.push(0.75)
      } else if (text.includes("weak")) {
        satisfied.push(true)
        reasons.push("Weak match")
        weights.push(0.5)
      } else {
        satisfied.push(false)
        reasons.push("No match")
        weights.push(0)
      }

      continue
    }

    // --- GRADED LOGIC ---
    if (bestScore > 0.80) {
      satisfied.push(true)
      reasons.push("Strong match")
      weights.push(1)
    } else if (bestScore > 0.60) {
      const check = await callClaude(
        "Classify match as STRONG, WEAK, or NONE",
        `Requirement: ${req}\nResume:\n${resume}`
      )

      const text = check.toLowerCase()

      if (text.includes("strong")) {
        satisfied.push(true)
        reasons.push("LLM strong")
        weights.push(0.75)
      } else if (text.includes("weak")) {
        satisfied.push(true)
        reasons.push("Weak match")
        weights.push(0.5)
      } else {
        satisfied.push(false)
        reasons.push("No match")
        weights.push(0)
      }
    } else {
      satisfied.push(false)
      reasons.push("No match")
      weights.push(0)
    }
  }

  return { satisfied, reasons, weights }
}

// --- GENERATION (truth-constrained) ---
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
      "Rewrite resume optimized for ATS. DO NOT invent experience. Only use what exists in the original resume.",
      `Original Resume:
${base}

Job Description:
${jd}

Missing requirements:
${missing.join("\n")}

Improve alignment WITHOUT adding fake experience.`
    )

    // 🔥 TRUTH VALIDATION (original resume)
    const truthSemantic = await validateHybrid(base, jdStruct, callClaude)

    // 🔥 GENERATED VALIDATION
    const semantic = await validateHybrid(res, jdStruct, callClaude)

    const weights = semantic?.weights || []
    const truthWeights = truthSemantic?.weights || []

    const total = weights.length || 1

    const weightedScore = weights.reduce((sum, w) => sum + w, 0)
    const truthScore = truthWeights.reduce((sum, w) => sum + w, 0)

    // 🔥 CRITICAL: prevent hallucination scoring
    const coverage = Math.min(weightedScore, truthScore) / total
    const score = Math.round(coverage * 10)

    if (score > bestScore) {
      best = res
      bestScore = score
      bestExplain = {
        coverage,
        semanticReasons: semantic.reasons || []
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
