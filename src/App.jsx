import { useState } from "react";

// ✅ INLINE IMPORT SAFETY (no tree-shaking issues)
import * as Engine from "./narrative_os_engine.js";

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function RequirementCard({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600 }}>{item.requirement}</div>
        <div>{item.score}</div>
      </div>

      <div style={{ fontSize: 13, color: "#666" }}>
        {item.summary || "No strong evidence"}
      </div>

      <button onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Details"}
      </button>

      {open && (
        <div>
          {item.gap && <div><b>Gap:</b> {item.gap}</div>}
          {item.fix && <div><b>Fix:</b> {item.fix}</div>}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);

    try {
      const data = await Engine.analyzeJob(jd, resume);
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: true });
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>NarrativeOS</h1>

      <textarea
        placeholder="Job Description"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        style={{ width: "100%", height: 120 }}
      />

      <textarea
        placeholder="Resume"
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        style={{ width: "100%", height: 120, marginTop: 10 }}
      />

      <button onClick={analyze} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {result?.score && <h2>Score: {result.score}/10</h2>}

      {safeArray(result?.requirements).map((r, i) => (
        <RequirementCard key={i} item={r} />
      ))}
    </div>
  );
}
