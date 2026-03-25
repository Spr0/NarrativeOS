import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// NETLIFY IDENTITY + STYLES (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function useNetlifyAuth() {
  // ... EXACT SAME as previous version ...
}

function LoginGate() {
  // ... EXACT SAME as previous version ...
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  btn: {
    background: "#4f6ef7",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "11px 26px",
    fontSize: "14px",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: "#a8a0c8",
    border: "1px solid #3a3d5c",
    borderRadius: "6px",
    padding: "10px 18px",
    fontSize: "13px",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    cursor: "pointer",
  },
  section: {
    background: "#181a2e",
    border: "1px solid #2e3050",
    borderRadius: "10px",
    padding: "24px",
    marginBottom: "20px",
  },
};

function Spinner() {
  return (
    <>
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          border: "2px solid #333",
          borderTopColor: "#7a7adf",
          borderRadius: "50%",
          animation: "spin .7s linear infinite",
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTHROPIC API (minimal version)
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

async function callClaude(system, user, maxTokens = 2000) {
  if (!ANTHROPIC_API_KEY) throw new Error("Set VITE_ANTHROPIC_API_KEY");
  
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `API ${res.status}`);
  }
  
  return data.content?.[0]?.text || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// TABS: ANALYZE JD (your core functionality)
// ─────────────────────────────────────────────────────────────────────────────

function AnalyzeTab() {
  const [jd, setJd] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const text = await callClaude(
        `Analyze this job description and score it 0-10 for a senior enterprise transformation leader with NetSuite/SAP experience, renewable energy background, $20M+ P&L ownership, enterprise agile coaching at Nike/Intel. 
Provide: 
1. SCORE: X/10
2. RATIONALE: 1-2 sentences
3. 3 KEY GAPS: what they're looking for that doesn't align
4. STRATEGY: 2-3 sentences on resume/cover letter approach`,
        `Job Description:\n${jd.slice(0, 4000)}`
      );
      setResult(text);
    } catch (e) {
      setResult(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "11px", color: "#8880b8", marginBottom: "8px" }}>
          Job Description
        </label>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={8}
          style={{
            width: "100%",
            background: "#1e2035",
            border: "1px solid #3a3d5c",
            borderRadius: "6px",
            color: "#e8e4f8",
            fontSize: "14px",
            padding: "12px",
            fontFamily: "Georgia, serif",
          }}
          placeholder="Paste job description..."
        />
      </div>
      
      <button
        onClick={run}
        disabled={!jd.trim() || loading}
        style={{
          ...S.btn,
          opacity: !jd.trim() || loading ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {loading ? <><Spinner /> Analyzing…</> : "Analyze Fit"}
      </button>

      {result && (
        <div style={{ ...S.section, marginTop: "20px" }}>
          <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.7" }}>
            {result}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP SHELL
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const { user, authLoading, logout } = useNetlifyAuth();
  const [activeTab, setActiveTab] = useState("analyze");

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e8e4f8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <LoginGate />;
  }

  const TABS = [
    { id: "analyze", label: "Analyze JD" },
    // Add more tabs later: "Resume", "Cover Letter", etc.
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#050716", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px 40px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px" }}>CareerForge</div>
            <div style={{ fontSize: "12px", color: "#6860a0", textTransform: "uppercase", letterSpacing: "1.6px" }}>
              Job Search Intelligence
            </div>
          </div>
          <button onClick={logout} style={{ ...S.btnGhost, fontSize: "13px", padding: "10px 18px" }}>
            Log out
          </button>
        </header>

        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...S.btnGhost,
                fontWeight: activeTab === tab.id ? 600 : 500,
                background: activeTab === tab.id ? "#2a2d50" : "transparent",
                borderColor: activeTab === tab.id ? "#4f6ef7" : "#3a3d5c",
                color: activeTab === tab.id ? "#e8e4f8" : "#a8a0c8",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={S.section}>
          {activeTab === "analyze" && <AnalyzeTab />}
        </div>
      </div>
    </div>
  );
}
