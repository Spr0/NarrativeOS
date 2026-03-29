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
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState("")
  const [error, setError] = useState(null)

  async function callClaude(system, user) {
    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, user })
      })

      const data = await res.json()
      return data?.text || ""
    } catch {
      return ""
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setResult(null)
    setImproved(null)

    try {
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
    } catch {
      setError("Error generating")
    } finally {
      setLoading(false)
      setStage("")
    }
  }

  // 🔥 NEW: Improve resume using gaps
  const handleImprove = async () => {
    if (!result) return

    setLoading(true)
    setStage("Improving resume...")

    try {
      const missing = result.keywords.filter((_, i) =>
        result.explain.semanticReasons[i] === "None"
      )

      const improvedResume = await callClaude(
        "Improve resume WITHOUT adding fake experience",
        `Original Resume:
${resume}

Missing Requirements:
${missing.join("\n")}

Instructions:
- Do NOT invent experience
- Reframe existing experience to better align
- Highlight transferable skills
- Strengthen positioning for these requirements`
      )

      setImproved(improvedResume)
    } catch {
      setError("Improve failed")
    } finally {
      setLoading(false)
      setStage("")
    }
  }

  const breakdown = (() => {
    if (!result?.keywords) return null

    const matched = []
    const partial = []
    const missing = []

    result.keywords.forEach((req, i) => {
      const reason = result.explain.semanticReasons[i]

      if (reason === "Strong") matched.push(req)
      else if (reason === "Weak" || reason === "Loose") partial.push(req)
      else missing.push(req)
    })

    return { matched, partial, missing }
  })()

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
          <h2>{result.bestScore}/10 Match</h2>

          {breakdown && (
            <div style={{ display: "flex", gap: 20 }}>
              <div>
                <h3>Matched</h3>
                {breakdown.matched.map((m, i) => <div key={i}>{m}</div>)}
              </div>
              <div>
                <h3>Partial</h3>
                {breakdown.partial.map((p, i) => <div key={i}>{p}</div>)}
              </div>
              <div>
                <h3>Missing</h3>
                {breakdown.missing.map((m, i) => <div key={i}>{m}</div>)}
              </div>
            </div>
          )}

          {/* 🔥 NEW BUTTON */}
          <button
            onClick={handleImprove}
            style={{ marginTop: 20 }}
          >
            Improve Resume (Truthfully)
          </button>
        </div>
      )}

      {improved && (
        <div style={{ marginTop: 20 }}>
          <h3>Improved Version</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {improved}
          </pre>
        </div>
      )}
    </div>
  )
}
