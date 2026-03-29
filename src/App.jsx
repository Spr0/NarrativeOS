import { useState } from "react"
import { parseJD, generateResume } from "./narrative_os_engine"

async function callClaude(system, user) {
  const res = await fetch("/api/claude", {
    method: "POST",
    body: JSON.stringify({ system, user })
  })
  const data = await res.json()
  return data.text
}

export default function App() {
  const [resume, setResume] = useState("")
  const [jd, setJD] = useState("")
  const [output, setOutput] = useState("")
  const [score, setScore] = useState(null)
  const [explain, setExplain] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [jdCache, setJdCache] = useState({})

  const handleGenerate = async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      let jdStruct = jdCache[jd]

      if (!jdStruct) {
        jdStruct = await parseJD(jd, callClaude)
        setJdCache(prev => ({ ...prev, [jd]: jdStruct }))
      }

      const result = await generateResume(
        resume,
        jd,
        [],
        jdStruct,
        callClaude
      )

      setOutput(result.best)
      setScore(result.bestScore)
      setExplain(result.explain)

    } catch (e) {
      setError(e.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "auto" }}>
      <h2>NarrativeOS — ATS Engine</h2>

      <textarea
        placeholder="Paste resume"
        value={resume}
        onChange={e => setResume(e.target.value)}
        style={{ width: "100%", height: 120 }}
      />

      <textarea
        placeholder="Paste job description"
        value={jd}
        onChange={e => setJD(e.target.value)}
        style={{ width: "100%", height: 120, marginTop: 10 }}
      />

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate"}
      </button>

      {error && <div style={{ color: "red" }}>{error}</div>}

      {score && <div>Score: {score}/10</div>}

      {explain && (
        <div style={{ marginTop: 10 }}>
          <div>Coverage: {(explain.coverage * 100).toFixed(0)}%</div>

          {explain.missingRequirements.length > 0 && (
            <div style={{ color: "orange" }}>
              Missing: {explain.missingRequirements.slice(0,3).join(", ")}
            </div>
          )}
        </div>
      )}

      <pre style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>
        {output}
      </pre>
    </div>
  )
}
