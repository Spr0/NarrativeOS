import { useState } from "react";

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [data, setData] = useState({
    score: 0,
    coverage: 0,
    requirements: [],
    error: false,
    message: "",
  });
  const [loading, setLoading] = useState(false);

  // ==============================
  // SAFE FETCH
  // ==============================

  const handleAnalyze = async () => {
    setLoading(true);

    try {
      const res = await fetch("/.netlify/functions/generate", {
        method: "POST",
        body: JSON.stringify({
          resumeText,
          jobDescription,
        }),
      });

      const result = await res.json();

      setData({
        score: result?.score || 0,
        coverage: result?.coverage || 0,
        requirements: Array.isArray(result?.requirements)
          ? result.requirements
          : [],
        error: result?.error || false,
        message: result?.message || "",
      });
    } catch (err) {
      console.error("Frontend error:", err);

      setData({
        score: 0,
        coverage: 0,
        requirements: [],
        error: true,
        message: "Failed to fetch results",
      });
    }

    setLoading(false);
  };

  // ==============================
  // SAFE HELPERS
  // ==============================

  const safeRequirements = Array.isArray(data?.requirements)
    ? data.requirements
    : [];

  // ==============================
  // RENDER
  // ==============================

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>NarrativeOS</h1>

      {/* INPUTS */}
      <div style={{ marginBottom: 20 }}>
        <textarea
          placeholder="Paste Resume"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={10}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <textarea
          placeholder="Paste Job Description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={10}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {/* ERROR */}
      {data.error && (
        <div style={{ color: "red", marginBottom: 20 }}>
          {data.message || "Something went wrong"}
        </div>
      )}

      {/* SCORE */}
      {!data.error && (
        <div style={{ marginBottom: 20 }}>
          <h2>Score: {data.score} / 10</h2>
          <p>Coverage: {(data.coverage * 100).toFixed(0)}%</p>
        </div>
      )}

      {/* REQUIREMENTS */}
      <div>
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
                borderRadius: 6,
              }}
            >
              {/* REQUIREMENT */}
              <h3>Requirement</h3>
              <p>{req?.requirement || "N/A"}</p>

              {/* CAPABILITY */}
              <p>
                <strong>Capability:</strong>{" "}
                {req?.capability || "GENERAL"}
              </p>

              {/* BEST BULLET */}
              {best && (
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: 10,
                    marginBottom: 10,
                    borderRadius: 4,
                  }}
                >
                  <strong>⭐ Best Match</strong>
                  <p>{best.text}</p>
                  <p>
                    Score: {best.score.toFixed(2)}
                  </p>
                </div>
              )}

              {/* RANKED BULLETS */}
              <div>
                <strong>Top Matches</strong>

                {ranked.map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginTop: 8,
                      padding: 8,
                      border: "1px solid #eee",
                      borderRadius: 4,
                    }}
                  >
                    <p>{b.text}</p>

                    <small>
                      Score: {b.score.toFixed(2)} | Emb:{" "}
                      {b.breakdown?.embedding?.toFixed(2)} | Cap:{" "}
                      {b.breakdown?.capability?.toFixed(2)} | Key:{" "}
                      {b.breakdown?.keyword?.toFixed(2)}
                    </small>

                    {/* GAPS */}
                    {b.gaps?.length > 0 && (
                      <div style={{ marginTop: 5 }}>
                        <small>
                          Missing: {b.gaps.join(", ")}
                        </small>
                      </div>
                    )}

                    {/* DELTA */}
                    {b.estimatedImprovement > 0 && (
                      <div>
                        <small>
                          Potential Gain: +
                          {b.estimatedImprovement.toFixed(2)}
                        </small>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* REWRITE GUIDANCE */}
              {req?.recommendation?.rewriteGuidance && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    background: "#eef6ff",
                    borderRadius: 4,
                  }}
                >
                  <strong>Rewrite Guidance</strong>

                  <p>
                    {req.recommendation.rewriteGuidance.guidance}
                  </p>

                  <p>
                    <strong>Focus:</strong>{" "}
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
