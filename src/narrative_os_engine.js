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

  let dot = 0
  let magA = 0
  let magB = 0

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

// --- HYBRID VALIDATION (chunked) ---
async function validateHybrid(resume, jdStruct, callClaude) {
  const requirements = jdStruct?.must_have || []

  if (!requirements.length) {
    return { satisfied: [], reasons: [] }
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

  for (const req of requirements) {
    const reqEmb = await getEmbedding(req)

    if (!reqEmb || !resumeEmbeddings.length) {
      satisfied.push(false)
      reasons.push("Embedding failure")
      continue
    }

    let bestScore = 0

    for (const emb of resumeEmbeddings) {
      const score = cosineSimilarity(emb, reqEmb)
      if (score > bestScore) bestScore = score
    }

    if (bestScore > 0.82) {
      satisfied.push(true)
      reasons.push("Strong semantic match")
    } else if (bestScore < 0.65) {
      satisfied.push(false)
      reasons.push("Low similarity")
    } else {
      const check = await callClaude(
        "Answer ONLY true or false: does resume satisfy requirement?",
        `Requirement: ${req}\nResume:\n${resume}`
      )

      const isMatch = check.toLowerCase().includes("true")

      satisfied.push(isMatch)
      reasons.push("LLM fallback")
    }
  }

  return { satisfied, reasons }
}

// --- GENERATION WITH FEEDBACK LOOP ---
export async function generateResume(base, jd, stories, jdStruct, callClaude) {
  let best = ""
  let bestScore = 0
  let bestExplain = { coverage: 0, semanticReasons: [] }

  for (let i = 0; i < 3; i++) {
    // 🔥 Identify missing requirements from previous attempt
    let missing = []

    if (i > 0 && bestExplain?.semanticReasons?.length) {
      const reqs = jdStruct?.must_have || []

      reqs.forEach((req, idx) => {
        const reason = bestExplain.semanticReasons[idx] || ""
        if (!reason.includes("Strong")) {
          missing.push(req)
        }
      })
    }

    const res = await callClaude(
      "Rewrite resume optimized for ATS. Explicitly address missing requirements.",
      `Resume:
${base}

Job Description:
${jd}

Missing requirements to include:
${missing.join("\n")}

Improve alignment specifically for these requirements.`
    )

    const semantic = await validateHybrid(res, jdStruct, callClaude)

    const satisfiedArray = semantic?.satisfied || []
    const satisfiedCount = satisfiedArray.filter(Boolean).length
    const total = satisfiedArray.length || 1

    const coverage = satisfiedCount / total
    const score = Math.round(coverage * 10)

    // Track best attempt
    if (score > bestScore) {
      best = res
      bestScore = score
      bestExplain = {
        coverage,
        semanticReasons: semantic.reasons || []
      }
    }

    // ✅ Early exit if strong
    if (score >= 6 && coverage >= 0.6) {
      return {
        best: res,
        bestScore: score,
        keywords: jdStruct?.must_have || [],
        jdStruct,
        explain: {
          coverage,
          semanticReasons: semantic.reasons || []
        },
        reject: false
      }
    }
  }

  // ❌ Final fallback
  return {
    best,
    bestScore,
    keywords: jdStruct?.must_have || [],
    jdStruct,
    explain: bestExplain,
    reject: bestScore < 5
  }
}
