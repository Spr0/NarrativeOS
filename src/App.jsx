import { useState } from "react";

function clean(text = "") {
  return text.replace(/^com\s+/i, "").trim();
}

function percent(score) {
  return Math.round((score || 0) * 100);
}

export default function App() {
  const [data, setData] = useState({
    score: 0,
    coverage: 0,
    requirements: [],
    error: false,
  });

  const [expanded, setExpanded] = useState({});

  const toggle = (i) => {
    setExpanded(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const analyze = async () => {
    try {
      const res = await fetch("/.netlify/functions/generate", {
        method: "POST",
        body: JSON.stringify({
          resumeText: document.getElementById("resume").value,
          jobDescription: document.getElementById("jd").value,
        }),
      });

      const result = await res.json();

      setData({
        score: result?.score ?? 0,
        coverage: result?.coverage ?? 0,
        requirements: Array.isArray(result?.requirements)
          ? result.requirements
          : [],
        error: result?.error ?? false,
      });

    } catch (e) {
      setData({
        score: 0,
        coverage: 0,
        requirements: [],
        error: true,
      });
    }
  };

  const safeRequirements = Array.isArray(data?.requirements)
    ? data.requirements
    : [];

  return (
    <div style={{ padding: 20 }}>
      <h1>NarrativeOS</h1>

      <textarea id="resume" placeholder="Resume" rows={6} style={{ width: "100%" }} />
      <textarea id="jd" placeholder="Job Description" rows={6} style={{ width: "100%", marginTop: 10 }} />

      <button onClick={analyze} style={{ marginTop: 10 }}>
        Analyze
      </button>

      <h2>Score: {data.score}/10</h2>

      {data.error && (
        <p style={{ color: "red" }}>Something went wrong</p>
      )}

      {safeRequirements.map((req, i) => {
        const ranked = Array.isArray(req?.rankedBullets)
          ? req.rankedBullets
          : [];

        const best = ranked[0];

        return (
          <div key={i} style={{ border: "1px solid #ccc", marginTop: 10, padding: 10 }}>
            <div onClick={() => toggle(i)} style={{ cursor: "pointer" }}>
              <strong>{clean(req.requirement)}</strong>
            </div>

            {expanded[i] && (
              <>
                <p>Capability: {req.capability}</p>

                {best && (
                  <>
                    <p><strong>Best Evidence</strong></p>
                    <p>{clean(best.text)}</p>
                    <p>Strength: {percent(best.score)}/100</p>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
