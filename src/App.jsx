import { useState } from "react";

function App() {
  const [resumeInput, setResumeInput] = useState("");
  const [jdInput, setJdInput] = useState("");
  const [result, setResult] = useState(null);

  const [selectedTrace, setSelectedTrace] = useState(null);
  const [selectedBullet, setSelectedBullet] = useState(null);

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
    setSelectedTrace(null);
    setSelectedBullet(null);
  };

  const handleFix = async () => {
    if (!selectedBullet || !selectedTrace) return;

    const res = await fetch("/.netlify/functions/generate", {
      method: "POST",
      body: JSON.stringify({
        mode: "fix",
        bullet: selectedBullet.text,
        requirement: selectedTrace.requirement
      })
    });

    const data = await res.json();

    const updatedRoles = result.roles.map((r, ri) => ({
      ...r,
      bullets: r.bullets.map((b, bi) => {
        if (
          ri === selectedBullet.roleIndex &&
          bi === selectedBullet.bulletIndex
        ) {
          return data.rewritten;
        }
        return b;
      })
    }));

    setResult({
      ...result,
      roles: updatedRoles
    });

    setSelectedBullet(null);
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>NarrativeOS</h1>

      <label><strong>Paste Resume</strong></label>
      <textarea
        rows={10}
        style={{ width: "100%", marginBottom: 10 }}
        value={resumeInput}
        onChange={(e) => setResumeInput(e.target.value)}
      />

      <label><strong>Paste Job Description</strong></label>
      <textarea
        rows={6}
        style={{ width: "100%", marginBottom: 10 }}
        value={jdInput}
        onChange={(e) => setJdInput(e.target.value)}
      />

      <button onClick={handleGenerate}>Analyze</button>

      {result && result.analysis && (
        <div style={{ marginTop: 30 }}>
          <h2>{result.header}</h2>
          <p>{result.summary}</p>

          <h3>Score: {result.analysis.score} / 10</h3>

          {/* STEP 1 */}
          <h3 style={{ marginTop: 20 }}>Step 1: Select a requirement</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {result.analysis.partial.map((req) => {
              const traceItem = result.analysis.trace.find(
                t => t.requirement === req
              );

              const isSelected =
                selectedTrace?.requirement === req;

              return (
                <li
                  key={req}
                  onClick={() => {
                    setSelectedTrace(traceItem);
                    setSelectedBullet(null);
                  }}
                  style={{
                    cursor: "pointer",
                    marginBottom: 8,
                    padding: 10,
                    border: isSelected
                      ? "2px solid #0077ff"
                      : "1px solid #ddd",
                    borderRadius: 6,
                    background: isSelected ? "#e3f2fd" : "white"
                  }}
                >
                  {isSelected ? "✔ " : "○ "} {req}
                </li>
              );
            })}
          </ul>

          {/* STEP 2 */}
          {selectedTrace && (
            <div style={{ marginTop: 20 }}>
              <h3>Step 2: Choose a bullet to improve</h3>

              {selectedTrace.evidence.map((e, i) => {
                const isSelected = selectedBullet === e;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedBullet(e)}
                    style={{
                      cursor: "pointer",
                      padding: 10,
                      marginBottom: 8,
                      border: isSelected
                        ? "2px solid #0077ff"
                        : "1px solid #ddd",
                      borderRadius: 6,
                      background: isSelected ? "#e8f5e9" : "#fafafa"
                    }}
                  >
                    {isSelected ? "✔ " : "○ "} {e.text}
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 3 */}
          {selectedTrace && (
            <div style={{ marginTop: 20 }}>
              <h3>Step 3: Improve bullet</h3>

              <button
                onClick={handleFix}
                disabled={!selectedBullet}
                style={{
                  background: selectedBullet ? "#0077ff" : "#ccc",
                  color: "white",
                  padding: "10px 14px",
                  border: "none",
                  borderRadius: 6,
                  cursor: selectedBullet ? "pointer" : "not-allowed"
                }}
              >
                🔧 Improve selected bullet
              </button>

              {!selectedBullet && (
                <p style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                  Select a bullet above to enable improvement
                </p>
              )}
            </div>
          )}

          {/* EXPERIENCE */}
          <h3 style={{ marginTop: 30 }}>Experience</h3>
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
