import { useState } from "react";

function clean(text = "") {
  return text.replace(/^com\s+/i, "").trim();
}

function percent(score) {
  return Math.round((score || 0) * 100);
}

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
      const res = await fetch("/.netlify/functions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
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
      console.error("Analyze failed:", e);

      setData({
        score: 0,
        coverage: 0,
        requirements: [],
        error: true,
      });
    }

    setLoading(false);
  };

  const safeRequirements = Array.isArray(data?.requirements)
    ? data.requirements
    : [];

  return (
    <div style={{ padding: 20 }}>
      <h1>NarrativeOS</h1>

      {/* RESUME */}
      <textarea
        placeholder="Paste Resume"
        rows={6}
        style={{ width: "100%" }}
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
      />

      {/* JOB DESCRIPTION */}
      <textarea
        placeholder="Paste Job Description"
        rows={6}
        style={{ width: "100%", marginTop: 10 }}
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      {/* BUTTON */}
      <button
        onClick={analyze}
        disabled={loading}
        style={{ marginTop: 10 }}
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {/* ERROR */}
      {data.error && (
        <p style={{ color: "red" }}>
          Something went wrong. Try again.
        </p>
      )}

      {/* SCORE */}
      <h2>Score: {data.score}/10</h2>

      {/* RESULTS */}
      {safeRequirements.map((req, i) => {
        const ranked = Array.isArray(req?.rankedBullets)
          ? req.rankedBullets
          : [];

        const best = ranked[0];

        return (
          <div
            key={i}
            style={{
              border: "1px solid #ccc",
              marginTop: 10,
              padding: 10,
            }}
          >
            <div
              onClick={() => toggle(i)}
              style={{ cursor: "pointer" }}
            >
              <strong>{clean(req.requirement)}</strong>
            </div>

            {expanded[i] && (
              <>
                <p>Capability: {req.capability}</p>

                {best && (
                  <>
                    <p><strong>Best Evidence</strong></p>
                    <p>{clean(best.text)}</p>
                    <p>
                      Strength: {percent(best.score)}/100
                    </p>
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
