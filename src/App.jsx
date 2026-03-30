import { useState } from "react";

function App() {
  const [resumeInput, setResumeInput] = useState("");
  const [jdInput, setJdInput] = useState("");
  const [result, setResult] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);

  function extractRequirements(text) {
    return text
      .split(/\n|•|\-|\./)
      .map(t => t.trim())
      .filter(t => t.length > 25)
      .slice(0, 8);
  }

  const handleGenerate = async () => {
    const res = await fetch("/.netlify/functions/generate", {
      method: "POST",
      body: JSON.stringify({
        resume: resumeInput,
        requirements: extractRequirements(jdInput)
      })
    });

    const data = await res.json();
    setResult(data);
  };

  const handleFix = async () => {
    if (!selectedTrace || !selectedTrace.evidence.length) return;

    const bullet = selectedTrace.evidence[0].text;
    const requirement = selectedTrace.requirement;

    const res = await fetch("/.netlify/functions/generate", {
      method: "POST",
      body: JSON.stringify({
        mode: "fix",
        bullet,
        requirement
      })
    });

    const data = await res.json();

    // 🔥 replace bullet in UI
    const updatedRoles = result.roles.map(r => ({
      ...r,
      bullets: r.bullets.map(b =>
        b === bullet ? data.rewritten : b
      )
    }));

    setResult({
      ...result,
      roles: updatedRoles
    });
  };

  const renderRequirement = (req) => {
    const traceItem = result.analysis.trace.find(t => t.requirement === req);

    return (
      <li
        key={req}
        onClick={() => setSelectedTrace(traceItem)}
        style={{ cursor: "pointer", marginBottom: 6 }}
      >
        {req}
      </li>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>NarrativeOS</h1>

      <textarea
        rows={10}
        style={{ width: "100%" }}
        value={resumeInput}
        onChange={(e) => setResumeInput(e.target.value)}
      />

      <textarea
        rows={6}
        style={{ width: "100%", marginTop: 10 }}
        value={jdInput}
        onChange={(e) => setJdInput(e.target.value)}
      />

      <button onClick={handleGenerate}>Analyze</button>

      {result && (
        <div style={{ marginTop: 30 }}>
          <h2>{result.header}</h2>
          <p>{result.summary}</p>

          <h3>Score: {result.analysis.score} / 10</h3>

          <h4>⚠️ Partial</h4>
          <ul>
            {result.analysis.partial.map(renderRequirement)}
          </ul>

          {selectedTrace && (
            <div style={{ marginTop: 20 }}>
              <h4>Evidence</h4>

              {selectedTrace.evidence.map((e, i) => (
                <p key={i}>• {e.text}</p>
              ))}

              <button onClick={handleFix}>
                🔧 Fix this requirement
              </button>
            </div>
          )}

          <h3>Experience</h3>
          {result.roles.map((r, i) => (
            <div key={i}>
              <strong>{r.title}</strong>
              <ul>
                {r.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
