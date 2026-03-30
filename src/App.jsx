import { useState } from "react";

function cleanText(text = "") {
  return text
    .replace(/^com\s+/i, "") // remove leading "com"
    .replace(/\s+/g, " ")
    .trim();
}

function formatScore(score) {
  return Math.round(score * 100); // 0–100 scale
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
    message: "",
  });

  const handleAnalyze = async () => {
    setLoading(true);

    try {
      const res = await fetch("/.netlify/functions/generate", {
        method: "POST",
        body: JSON.stringify({ resumeText, jobDescription }),
      });

      const result = await res.json();

      setData({
        score: result?.score ?? 0,
        coverage: result?.coverage ?? 0,
        requirements: Array.isArray(result?.requirements)
          ? result.requirements
          : [],
        error: result?.error ?? false,
        message: result?.message ?? "",
      });
    } catch (err) {
      setData({
        score: 0,
        coverage: 0,
        requirements: [],
        error: true,
        message: "Request failed",
      });
    }

    setLoading(false);
  };

  const safeRequirements = Array.isArray(data.requirements)
    ? data.requirements
    : [];

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>NarrativeOS</h1>

      <textarea
        placeholder="Paste Resume"
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <textarea
        placeholder="Paste Job Description"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        rows={8}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {data.error && (
        <div style={{ color: "red", marginTop: 20 }}>
          {data.message || "Something went wrong"}
        </div>
      )}

      {!data.error && (
        <div style={{ marginTop: 20 }}>
          <h2>Match Score: {data.score}/10</h2>
          <p>Coverage: {(data.coverage * 100).toFixed(0)}%</p>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
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
                padding: 15,
                marginBottom: 15,
              }}
            >
              <h3>Requirement</h3>
              <p>{cleanText(req.requirement)}</p>

              <p>
                <strong>Capability:</strong>{" "}
                {req.capability || "GENERAL"}
              </p>

              {best && (
                <div
                  style={{
                    background: "#f3f3f3",
                    padding: 10,
                    marginTop: 10,
                  }}
                >
                  <strong>⭐ Best Evidence</strong>
                  <p>{cleanText(best.text)}</p>

                  <p>
                    Strength: {formatScore(best.score)}/100
                  </p>

                  {best.gaps?.length > 0 && (
                    <p>
                      Missing: {best.gaps.join(", ")}
                    </p>
                  )}

                  {best.estimatedImprovement > 0 && (
                    <p>
                      Potential improvement: +
                      {formatScore(best.estimatedImprovement)}
                    </p>
                  )}
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <strong>Other Evidence</strong>

                {ranked.slice(1).map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderTop: "1px solid #eee",
                      marginTop: 8,
                      paddingTop: 8,
                    }}
                  >
                    <p>{cleanText(b.text)}</p>

                    <small>
                      Strength: {formatScore(b.score)}/100
                    </small>
                  </div>
                ))}
              </div>

              {req?.recommendation?.rewriteGuidance && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    background: "#eef6ff",
                  }}
                >
                  <strong>How to Improve</strong>
                  <p>
                    {req.recommendation.rewriteGuidance.guidance}
                  </p>
                  <p>
                    Focus:{" "}
                    {
                      req.recommendation.rewriteGuidance
                        .exampleFocus
                    }
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
