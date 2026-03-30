import { useState } from "react";
import { analyzeJob } from "./narrative_os_engine.js"; // ✅ FIXED IMPORT

// ─────────────────────────────────────────
// SAFE HELPERS
// ─────────────────────────────────────────

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

function RequirementCard({ item }) {
  const [open, setOpen] = useState(false);

  const score = clamp(item.score || 0, 0, 100);

  const color =
    score >= 85 ? "#22c55e" :
    score >= 70 ? "#84cc16" :
    score >= 55 ? "#f59e0b" :
    score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div style={{
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      background: "#fff"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {item.requirement}
          </div>

          <div style={{ fontSize: 13, color: "#555" }}>
            {item.summary || "No strong evidence found"}
          </div>
        </div>

        <div style={{
          minWidth: 60,
          textAlign: "center",
          fontWeight: 700,
          color,
          fontSize: 18
        }}>
          {score}
          <div style={{ fontSize: 11, fontWeight: 400 }}>Strength</div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            fontSize: 12,
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer"
          }}
        >
          {open ? "Hide details" : "Show details"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          {item.gap && (
            <div style={{ marginBottom: 10 }}>
              <strong style={{ color: "#dc2626" }}>Gap:</strong>
              <div>{item.gap}</div>
            </div>
          )}

          {item.fix && (
            <div>
              <strong style={{ color: "#16a34a" }}>How to Improve:</strong>
              <div>{item.fix}</div>
            </div>
          )}

          {!item.gap && (
            <div style={{ color: "#16a34a" }}>
              Strong match — no critical gaps detected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────

export default function App() {
  const [jobText, setJobText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleAnalyze() {
    setLoading(true);
    setResult(null);

    try {
      const data = await analyzeJob(jobText, resumeText); // ✅ no dynamic import

      setResult(data);
    } catch (e) {
      console.error("Analyze failed:", e);
      setResult({ error: "Analysis failed. Check console." });
    }

    setLoading(false);
  }

  const requirements = safeArray(result?.requirements);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Resume Match Analyzer</h1>

      <div style={{ marginBottom: 20 }}>
        <textarea
          placeholder="Paste job description..."
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          style={{ width: "100%", height: 120, marginBottom: 10 }}
        />

        <textarea
          placeholder="Paste resume..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          style={{ width: "100%", height: 120 }}
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || !jobText || !resumeText}
        style={{
          padding: "10px 20px",
          fontSize: 16,
          cursor: "pointer"
        }}
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {result && !result.error && (
        <div style={{ marginTop: 30 }}>
          <h2>Score: {result.score}/10</h2>

          <div style={{ marginTop: 20 }}>
            {requirements.map((r, i) => (
              <RequirementCard key={i} item={r} />
            ))}
          </div>
        </div>
      )}

      {result?.error && (
        <div style={{ color: "red", marginTop: 20 }}>
          {result.error}
        </div>
      )}
    </div>
  );
}
