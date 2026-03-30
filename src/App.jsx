import { useState, useRef } from "react";

function App() {
  const [resumeInput, setResumeInput] = useState("");
  const [jdInput, setJdInput] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [selectedTrace, setSelectedTrace] = useState(null);
  const [selectedBullet, setSelectedBullet] = useState(null);

  const [changedBullet, setChangedBullet] = useState(null);
  const [changeInfo, setChangeInfo] = useState(null);

  const bulletRefs = useRef({});

  function extractRequirements(text) {
    return text
      .split(/\n|•|\-|\./)
      .map(t => t.trim())
      .filter(t => t.length > 25)
      .slice(0, 8);
  }

  async function safeFetch(body) {
    try {
      const res = await fetch("/.netlify/functions/generate", {
        method: "POST",
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.message || "Server error");
      }

      return data;
    } catch (err) {
      console.error(err);
      setError(err.message);
      return null;
    }
  }

  const handleGenerate = async () => {
    setError(null);

    const data = await safeFetch({
      resume: resumeInput,
      requirements: extractRequirements(jdInput)
    });

    if (!data) return;

    setResult(data);
    setSelectedTrace(null);
    setSelectedBullet(null);
    setChangeInfo(null);
  };

  const handleFix = async () => {
    if (!selectedBullet || !selectedTrace) return;

    setError(null);

    const oldScore = result?.analysis?.score || 0;

    const fixData = await safeFetch({
      mode: "fix",
      bullet: selectedBullet.text,
      requirement: selectedTrace.requirement
    });

    if (!fixData) return;

    const updatedRoles = result.roles.map((r, ri) => ({
      ...r,
      bullets: r.bullets.map((b, bi) => {
        if (
          ri === selectedBullet.roleIndex &&
          bi === selectedBullet.bulletIndex
        ) {
          return fixData.rewritten;
        }
        return b;
      })
    }));

    const rescored = await safeFetch({
      resume: resumeInput,
      requirements: extractRequirements(jdInput)
    });

    if (!rescored) return;

    const newScore = rescored?.analysis?.score || oldScore;

    setResult({
      ...rescored,
      roles: updatedRoles
    });

    const key = `${selectedBullet.roleIndex}-${selectedBullet.bulletIndex}`;

    setChangedBullet(key);

    setChangeInfo({
      before: selectedBullet.text,
      after: fixData.rewritten,
      delta: (newScore - oldScore).toFixed(1)
    });

    setTimeout(() => {
      bulletRefs.current[key]?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 100);
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>NarrativeOS</h1>

      {error && (
        <div style={{ color: "red", marginBottom: 10 }}>
          ⚠️ {error}
        </div>
      )}

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
                  style={{ cursor: "pointer" }}
                >
                  {req}
                </li>
              );
            })}
          </ul>

          {selectedTrace && (
            <div>
              {selectedTrace.evidence.map((e, i) => (
                <p key={i} onClick={() => setSelectedBullet(e)}>
                  • {e.text}
                </p>
              ))}

              <button onClick={handleFix}>
                🔧 Fix selected bullet
              </button>
            </div>
          )}

          <h3>Experience</h3>
          {result.roles.map((r, ri) => (
            <div key={ri}>
              <strong>{r.title}</strong>
              <ul>
                {r.bullets.map((b, bi) => {
                  const key = `${ri}-${bi}`;
                  return (
                    <li key={bi} ref={el => (bulletRefs.current[key] = el)}>
                      {b}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
