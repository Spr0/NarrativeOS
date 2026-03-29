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
  const [error, setError] = useState(null)

  // 🔥 BULLETPROOF CALL
  async function callClaude(system, user) {
    if (!system || !user) {
      console.warn("Claude called with missing input", { system, user })
      return ""
    }

    try {
      const payload = {
        system: String(system),
        user: String(user)
      }

      console.log("Sending to Claude:", payload)

      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const text = await res.text()

      try {
        const data = JSON.parse(text)
        return data?.text || ""
      } catch {
        console.error("Non-JSON response:", text)
        return ""
      }
    } catch (e) {
      console.error("Claude error:", e)
      return ""
    }
  }

  const handleGenerate = async () => {
    if (!resume || !jd) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("STARTING GENERATION")

      // 🔥 ensure JD parsing gets valid input
      const jdStruct = await parseJD(jd, callClaude)

      console.log("JD STRUCT:", jdStruct)

      const output = await generateResume(
        resume,
        jd,
        [],
        jdStruct,
        callClaude
      )

      console.log("RESULT:", output)

      setResult(output)
    } catch (e) {
      console.error(e)
      setError("Generation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>NarrativeOS</h1>

      <textarea
        placeholder="Paste your resume"
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        rows={10}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <textarea
        placeholder="Paste job description"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={10}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate Resume"}
      </button>

      {error && (
        <div style={{ color: "red", marginTop: 10 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          {result.reject && (
            <div style={{ color: "red", marginBottom: 10 }}>
              Low match — resume not generated
            </div>
          )}

          <div>
            <strong>Score:</strong> {result.bestScore}/10
          </div>

          <div>
            <strong>Coverage:</strong>{" "}
            {Math.round((result.explain?.coverage || 0) * 100)}%
          </div>

          {result.explain?.semanticReasons?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {result.explain.semanticReasons.slice(0, 3).join(" | ")}
            </div>
          )}

          <pre
            style={{
              whiteSpace: "pre-wrap",
              marginTop: 12,
              background: "#f6f6f6",
              padding: 12
            }}
          >
            {result.best}
          </pre>
        </div>
      )}
    </div>
  )
}
