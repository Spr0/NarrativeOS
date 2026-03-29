import { useState } from "react"
import { parseJD, generateResume } from "./narrative_os_engine"

async function callClaude(system, user) {
  const res = await fetch("/.netlify/functions/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ system, user })
  })

  const text = await res.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("API did not return JSON")
  }

  return data.text || JSON.stringify(data)
}

export default function App() {
  const [resume, setResume] = useState("")
  const [jd, setJD] = useState("")
  const [output, setOutput] = useState("")
  const [score, setScore] = useState(null)
  const [explain, setExplain] = useState({ coverage: 0, semanticReasons: [] })
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

      setOutput(result?.best || "")
      setScore(result?.bestScore ?? null)
      setExplain(
        result?.explain || { coverage: 0, semanticReasons: [] }
      )

    } catch (e) {
      setError(e.message || "Failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>NarrativeOS</h2>

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

      {error && (
        <div style={{ color: "red", marginTop: 10 }}>
          {error}
        </div>
      )}

      {score !== null && (
        <div style={{ marginTop: 10 }}>
          Score: {score}/10
        </div>
      )}

      {typeof explain?.coverage === "number" && (
        <div>
          Coverage: {(explain.coverage * 100).toFixed(0)}%
        </div>
      )}

      {explain?.semanticReasons?.length > 0 && (
        <div style={{ fontSize: 12, color: "#666" }}>
          {explain.semanticReasons.slice(0, 3).join(" | ")}
        </div>
      )}

      <pre style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>
        {output}
      </pre>
    </div>
  )
}
