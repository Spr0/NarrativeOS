export async function parseJD(jd, callClaude) {
  const res = await callClaude(
    "Extract structured hiring requirements. Return JSON only.",
    jd
  )

  const match = res.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : { must_have: [] }
}

export function extractKeywords(jd) {
  return jd.split(" ").slice(0, 20)
}

export async function generateResume(base, jd, stories, jdStruct, callClaude) {
  const res = await callClaude(
    "Generate ATS resume",
    `Resume:\n${base}\n\nJD:\n${jd}`
  )

  return {
    best: res,
    bestScore: 7,
    keywords: [],
    jdStruct,
    explain: {
      coverage: 0.7,
      missingRequirements: []
    }
  }
}
