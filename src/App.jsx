import { useState } from "react"
import {
  parseJD,
  generateResume
} from "./narrative_os_engine.js"

export default function App() {
  const [resume, setResume] = useState("")
  const [jd, setJd] = useState("")
  const [result, setResult] = useState(null)
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
    if (!resume || !jd) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      setStage("Parsing job description...")
      const jdStruct = await parseJD(jd, callClaude)

      setStage("Optimizing resume...")
      const output = await generateResume(
        resume,
        jd,
        [],
        jdStruct,
        callClaude
      )

      setResult(output)
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
      setStage("")
    }
  }

  // --- Breakdown logic ---
  const breakdown = (() => {
    if (!result?.keywords || !result?.explain?.semanticReasons) return null

    const matched = []
    const partial = []
    const missing = []

    result.keywords.forEach((req, i) => {
      const reason = result.explain.semanticReasons[i] || ""

      if (reason.includes("Strong")) matched.push(req)
      else if (reason.includes("Weak") || reason.includes("Loose")) partial.push(req)
      else missing.push(req)
    })

    return { matched, partial, missing }
  })()

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      
      <h1 style={{ marginBottom: 10 }}>NarrativeOS</h1>

      {/* INPUT */}
      <textarea
        placeholder="Paste your resume"
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <textarea
        placeholder="Paste job description"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Working..." : "Analyze Resume"}
      </button>

      {/* PROGRESS */}
      {loading && (
        <div style={{ marginTop: 10, color: "#666" }}>
          {stage}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{ color: "red", marginTop: 10 }}>
          {error}
        </div>
      )}

      {/* RESULTS */}
      {result && (
        <div style={{ marginTop: 30 }}>

          {/* SCORE CARD */}
          <div style={{
            padding: 16,
            borderRadius: 8,
            background: "#f4f4f4",
            marginBottom: 20
          }}>
            <div style={{ fontSize: 24, fontWeight: "bold" }}>
              {result.bestScore}/10 Match
            </div>

            <div style={{ color: "#666" }}>
              {Math.round(result.explain.coverage * 100)}% alignment
            </div>

            {result.reject && (
              <div style={{ color: "red", marginTop: 8 }}>
                Low match — consider improving before applying
              </div>
            )}
          </div>

          {/* BREAKDOWN */}
          {breakdown && (
            <div style={{ display: "flex", gap: 20 }}>

              {/* MATCHED */}
              <div style={{ flex: 1 }}>
                <h3 style={{ color: "green" }}>Matched</h3>
                {breakdown.matched.map((m, i) => (
                  <div key={i}>• {m}</div>
                ))}
              </div>

              {/* PARTIAL */}
              <div style={{ flex: 1 }}>
                <h3 style={{ color: "orange" }}>Partial</h3>
                {breakdown.partial.map((p, i) => (
                  <div key={i}>• {p}</div>
                ))}
              </div>

              {/* MISSING */}
              <div style={{ flex: 1 }}>
                <h3 style={{ color: "red" }}>Missing</h3>
                {breakdown.missing.map((m, i) => (
                  <div key={i}>• {m}</div>
                ))}
              </div>

            </div>
          )}

          {/* ACTION HINT */}
          {breakdown?.missing?.length > 0 && (
            <div style={{
              marginTop: 20,
              padding: 12,
              background: "#fff3cd",
              borderRadius: 6
            }}>
              💡 Focus on adding or highlighting:
              <ul>
                {breakdown.missing.slice(0, 3).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* RESUME OUTPUT */}
          <details style={{ marginTop: 20 }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
              View optimized resume
            </summary>
            <pre style={{
              whiteSpace: "pre-wrap",
              marginTop: 10,
              background: "#f6f6f6",
              padding: 12
            }}>
              {result.best}
            </pre>
          </details>

        </div>
      )}
    </div>
  )
}
