import { useState } from "react"
import {
  parseJD,
  generateResume
} from "./narrative_os_engine.js"

export default function App() {
  const [resume, setResume] = useState("")
  const [jd, setJd] = useState("")
  const [result, setResult] = useState(null)
  const [improved, setImproved] = useState(null)
  const [improvedScore, setImprovedScore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState("")

  async function callClaude(system, user) {
    const res = await fetch("/.netlify/functions/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, user })
    })

    const data = await res.json()
    return data?.text || ""
  }

  const handleGenerate = async () => {
    setLoading(true)
    setResult(null)
    setImproved(null)
    setImprovedScore(null)

    setStage("Analyzing job...")
    const jdStruct = await parseJD(jd, callClaude)

    setStage("Scoring resume...")
    const output = await generateResume(
      resume,
      jd,
      [],
      jdStruct,
      callClaude
    )

    setResult(output)
    setLoading(false)
    setStage("")
  }

  const handleImprove = async () => {
    if (!result) return

    setLoading(true)
    setStage("Improving resume...")

    const missing = result.keywords.filter((_, i) =>
      result.explain.semanticReasons[i] === "None"
    )

    const improvedResume = await callClaude(
      "Improve resume WITHOUT adding fake experience",
      `Resume:
${resume}

Missing:
${missing.join("\n")}

Rules:
- Do NOT invent experience
- Strengthen existing experience
- Improve alignment`
    )

    setImproved(improvedResume)
    setLoading(false)
    setStage("")
  }

  // 🔥 NEW: Re-score improved resume
  const handleRescore = async () => {
    if (!improved) return

    setLoading(true)
    setStage("Re-scoring improved resume...")

    const jdStruct = await parseJD(jd, callClaude)

    const newScore = await generateResume(
      improved,
      jd,
      [],
      jdStruct,
      callClaude
    )

    setImprovedScore(newScore)
    setLoading(false)
    setStage("")
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "auto" }}>
      <h1>NarrativeOS</h1>

      <textarea
        placeholder="Resume"
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <textarea
        placeholder="Job Description"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={handleGenerate}>
        Analyze Resume
      </button>

      {loading && <div>{stage}</div>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <h2>Original Score: {result.bestScore}/10</h2>

          <button onClick={handleImprove}>
            Improve Resume
          </button>
        </div>
      )}

      {improved && (
        <div style={{ marginTop: 20 }}>
          <h3>Improved Resume</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {improved}
          </pre>

          <button onClick={handleRescore}>
            Re-score Improved Resume
          </button>
        </div>
      )}

      {improvedScore && (
        <div style={{ marginTop: 20 }}>
          <h2>
            Improved Score: {improvedScore.bestScore}/10
          </h2>
        </div>
      )}
    </div>
  )
}
