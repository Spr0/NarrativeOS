// --- BATCH EMBEDDINGS ---
async function getEmbeddingsBatch(texts) {
  try {
    const res = await fetch("/.netlify/functions/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: texts })
    })

    const data = await res.json()
    return data?.embeddings || []
  } catch {
    return []
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

// --- VALIDATION (FAST: 1 LLM CALL TOTAL) ---
async function validateHybrid(resume, jdStruct, callClaude) {
  const requirements = jdStruct?.must_have || []

  if (!requirements.length) {
    return { reasons: [], weights: [] }
  }

  const resumeChunks = resume
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)

  // ⚡ batch embeddings
  const resumeEmbeddings = (await getEmbeddingsBatch(resumeChunks)).filter(Boolean)
  const reqEmbeddings = await getEmbeddingsBatch(requirements)

  // 🔥 SINGLE LLM CALL
  let llmResults = []
  try {
    const response = await callClaude(
      "For each requirement, return STRONG, WEAK, or NONE as a JSON array.",
      `Requirements:
${requirements.join("\n")}

Resume:
${resume}

Return ONLY JSON like:
["STRONG","WEAK","NONE"]`
    )

    const match = response.match(/\[[\s\S]*\]/)
    llmResults = match ? JSON.parse(match[0]) : []
  } catch {
    llmResults = []
  }

  const reasons = []
  const weights = []

  for (let i = 0; i < requirements.length; i++) {
    const reqEmb = reqEmbeddings[i]
    const llmLabel = (llmResults[i] || "").toLowerCase()

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
    } else {
      if (llmLabel.includes("strong")) {
        reasons.push("LLM strong")
        weights.push(0.75)
      } else if (llmLabel.includes("weak")) {
        reasons.push("Weak")
        weights.push(0.5)
      } else {
        reasons.push("None")
        weights.push(0)
      }
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
      `Original Resume:
${base}

Job Description:
${jd}

Missing requirements:
${missing.join("\n")}

Improve alignment WITHOUT adding fake experience.`
    )

    const truth = await validateHybrid(base, jdStruct, callClaude)
    const gen = await validateHybrid(res, jdStruct, callClaude)

    const total = gen.weights.length || 1

    const genScore = gen.weights.reduce((a, b) => a + b, 0)
    const truthScore = truth.weights.reduce((a, b) => a + b, 0)

    // ⚖️ balanced scoring
    let adjusted = (genScore * 0.7) + (truthScore * 0.3)

    // 🔥 must-have penalty
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
