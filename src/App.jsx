import { useState } from "react";

function App() {
  const [resumeInput, setResumeInput] = useState("");
  const [jdInput, setJdInput] = useState("");
  const [result, setResult] = useState(null);

  const [selectedTrace, setSelectedTrace] = useState(null);
  const [selectedBullet, setSelectedBullet] = useState(null);
  const [beforeAfter, setBeforeAfter] = useState(null);

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
    setBeforeAfter(null);
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

    // update roles
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

    // 🔥 re-score automatically
    const rescore = await fetch("/.netlify/functions/generate", {
      method: "POST",
      body: JSON.stringify({
        resume: resumeInput,
        requirements: extractRequirements(jdInput)
      })
    });

    const rescored = await rescore.json();

    setBeforeAfter({
      before: selectedBullet.text,
      after: data.rewritten,
      oldScore: result.analysis.score,
      newScore: rescored.analysis.score
    });

    setResult({
      ...rescored,
      roles: updatedRoles
    });

    setSelectedBullet(null);
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

          <h3>
            Score: {result.analysis.score} / 10
          </h3>

          <h4>⚠️ Partial</h4>
          <ul>
            {result.analysis.partial.map((req) => {
              const traceItem = result.analysis.trace.find(
                t => t.requirement === req
              );

              return (
                <li
                  key={req}
                  onClick={() => {
                    setSelectedTrace(traceItem);
                    setSelectedBullet(null);
                  }}
                  style={{ cursor: "pointer", marginBottom: 6 }}
                >
                  {req}
                </li>
              );
            })}
          </ul>

          {selectedTrace && (
            <div style={{ marginTop: 20 }}>
              <h4>Evidence (click one)</h4>

              {selectedTrace.evidence.map((e, i) => (
                <p
                  key={i}
                  onClick={() => setSelectedBullet(e)}
                  style={{
                    cursor: "pointer",
                    background:
                      selectedBullet === e ? "#e0f7fa" : "transparent",
                    padding: 4
                  }}
                >
                  • {e.text}
                </p>
              ))}

              <button
                onClick={handleFix}
                disabled={!selectedBullet}
                style={{ marginTop: 10 }}
              >
                🔧 Fix selected bullet
              </button>
            </div>
          )}

          {beforeAfter && (
            <div style={{ marginTop: 20, border: "1px solid #ccc", padding: 10 }}>
              <h4>Change</h4>
              <p><strong>Before:</strong> {beforeAfter.before}</p>
              <p><strong>After:</strong> {beforeAfter.after}</p>
              <p>
                Score: {beforeAfter.oldScore} → {beforeAfter.newScore}
              </p>
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
