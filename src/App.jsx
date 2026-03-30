import { useState } from "react";

function App() {
  const [resumeInput, setResumeInput] = useState("");
  const [jdInput, setJdInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function extractRequirements(text) {
    return text
      .split(/\n|•|\-|\./)
      .map((t) => t.trim())
      .filter((t) => t.length > 25)
      .slice(0, 12);
  }

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/.netlify/functions/generate", {
        method: "POST",
        body: JSON.stringify({
          resume: resumeInput,
          requirements: extractRequirements(jdInput)
        })
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Server returned non-JSON (likely timeout)");
      }

      console.log("RESPONSE:", data);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>NarrativeOS</h1>

      <h3>Resume</h3>
      <textarea
        rows={10}
        style={{ width: "100%" }}
        value={resumeInput}
        onChange={(e) => setResumeInput(e.target.value)}
      />

      <h3>Job Description</h3>
      <textarea
        rows={6}
        style={{ width: "100%" }}
        value={jdInput}
        onChange={(e) => setJdInput(e.target.value)}
      />

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Resume"}
      </button>

      {result && !result.error && (
        <div style={{ marginTop: 30 }}>
          <h2>{result.header}</h2>
          <p>{result.summary}</p>

          {/* SCORE */}
          {result.analysis && (
            <div style={{ marginTop: 20 }}>
              <h3>Score: {result.analysis.score} / 10</h3>
              <p>Coverage: {result.analysis.coverage}%</p>

              <h4>✅ Matched</h4>
              <ul>
                {result.analysis.matched.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>

              <h4>⚠️ Partial</h4>
              <ul>
                {result.analysis.partial.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>

              <h4>❌ Missing</h4>
              <ul>
                {result.analysis.missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <h3>Skills</h3>
          <ul>
            {result.skills?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <h3>Experience</h3>
          {result.roles?.map((r, i) => (
            <div key={i}>
              <strong>
                {r.title} — {r.company}
              </strong>
              <ul>
                {r.bullets?.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}

          <h3>Education</h3>
          <ul>
            {result.education?.map((e, i) => (
              <li key={i}>
                {e.degree} {e.field ? `in ${e.field}` : ""} — {e.institution}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
