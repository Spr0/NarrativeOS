// --- EMBEDDINGS ---
async function getEmbedding(text) {
  const res = await fetch("/.netlify/functions/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: text })
  })
  const data = await res.json()
  return data.embedding
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// --- JD PARSING ---
export async function parseJD(jd, callClaude) {
  const res = await callClaude(
    "Extract must-have requirements as JSON: { must_have: [] }",
    jd
  )

  try {
    const match = res.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { must_have: [] }
  } catch {
    return { must_have: [] }
  }
}

// --- HYBRID VALIDATION ---
async function validateHybrid(resume, jdStruct, callClaude) {
  const resumeEmb = await getEmbedding(resume)

  const satisfied = []
  const reasons = []

 for (const req of (jdStruct && jdStruct.must_have) ? jdStruct.must_have : []) {
    const reqEmb = await getEmbedding(req)
    const score = cosineSimilarity(resumeEmb, reqEmb)

    if (score > 0.82) {
      satisfied.push(true)
      reasons.push("Strong semantic match")
    } else if (score < 0.65) {
      satisfied.push(false)
      reasons.push("Low similarity")
    } else {
      // fallback to LLM
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

// --- GENERATION ---
export async function generateResume(base, jd, stories, jdStruct, callClaude) {
  const res = await callClaude(
    "Rewrite resume optimized for ATS and job description",
    `Resume:\n${base}\n\nJD:\n${jd}`
  )

  const semantic = await validateHybrid(res, jdStruct, callClaude)

  const satisfiedArray = semantic?.satisfied || []

const satisfiedCount = satisfiedArray.filter(Boolean).length
const total = satisfiedArray.length || 1
  const score = Math.round((satisfiedCount / total) * 10)

  const coverage = satisfiedCount / total

const reject =
  score < 6 ||
  coverage < 0.6 ||
  satisfiedCount < 2

return {
  best: res,
  bestScore: score,
  keywords: (jdStruct && jdStruct.must_have) ? jdStruct.must_have : [],
  jdStruct,
  explain: {
    coverage,
    semanticReasons: semantic.reasons
  },
  reject
}
}
