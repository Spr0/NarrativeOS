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

// --- JD PARSE ---
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

// --- HYBRID VALIDATION ---
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
      // fallback immediately
      const check = await callClaude(
        "Answer ONLY true or false: does resume satisfy requirement?",
        `Requirement: ${req}\nResume:\n${resume}`
      )

      const isMatch = check.toLowerCase().includes("true")

      satisfied.push(isMatch)
      reasons.push("LLM (no embeddings)")
      continue
    }

    let bestScore = 0

    for (const emb of resumeEmbeddings) {
      const s = cosineSimilarity(emb, reqEmb)
      if (s > bestScore) bestScore = s
    }

    // 🔥 LOWER thresholds
    if (bestScore > 0.75) {
      satisfied.push(true)
      reasons.push("Strong semantic match")
    } else if (bestScore < 0.55) {
      // fallback instead of hard fail
      const check = await callClaude(
        "Answer ONLY true or false: does resume satisfy requirement?",
        `Requirement: ${req}\nResume:\n${resume}`
      )

      const isMatch = check.toLowerCase().includes("true")

      satisfied.push(isMatch)
      reasons.push("LLM fallback")
    } else {
      // borderline → LLM decides
      const check = await callClaude(
        "Answer ONLY true or false: does resume satisfy requirement?",
        `Requirement: ${req}\nResume:\n${resume}`
      )

      const isMatch = check.toLowerCase().includes("true")

      satisfied.push(isMatch)
      reasons.push("LLM decision")
    }
  }

  return { satisfied, reasons }
}

// --- GENERATION LOOP ---
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

Missing requirements:
${missing.join("\n")}

Improve alignment specifically for these.`
    )

    const semantic = await validateHybrid(res, jdStruct, callClaude)

    const satisfiedArray = semantic?.satisfied || []
    const satisfiedCount = satisfiedArray.filter(Boolean).length
    const total = satisfiedArray.length || 1

    const coverage = satisfiedCount / total

    // 🔥 smoother scoring
    const score = Math.round(coverage * 10)

    if (score > bestScore) {
      best = res
      bestScore = score
      bestExplain = {
        coverage,
        semanticReasons: semantic.reasons || []
      }
    }

    // 🔥 LOWER PASS BAR
    if (score >= 5 && coverage >= 0.5) {
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

  return {
    best,
    bestScore,
    keywords: jdStruct?.must_have || [],
    jdStruct,
    explain: bestExplain,
    reject: bestScore < 4
  }
}
