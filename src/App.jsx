import { useState, useEffect, useCallback } from "react";

// ── Profile & Constants ───────────────────────────────────────────────────────

const PROFILE = {
  name: "Scott Henderson",
  title: "Enterprise Transformation Leader",
  focus: "VP Technology | Renewable Energy | Enterprise Applications",
  background: `Senior transformation leader with 15+ years driving enterprise-scale change at grid-scale renewable energy companies and Fortune 500 technology organizations. VP of Technology at EDF Renewables and Cypress Creek Renewables with full P&L ownership — budget, revenue forecasting, margin management, and board/C-suite reporting. Earlier career as enterprise agile coach at Nike and Intel. Known for translating complex technology strategy into measurable P&L outcomes. Located in Bellingham, WA, open to remote roles.`,
  proofPoints: [
    "$28M annualized EBITDA improvement at EDF Renewables through platform consolidation",
    "27% reduction in compliance-related fines at CCR via AI governance implementation",
    "$13M SaaS catalog identified through ledger mining → 15% OPEX reduction",
    "Full P&L ownership at both CCR and EDF — budget, forecasting, margin, board reporting",
    "Enterprise agile coach at Nike and Intel — transformation at scale",
    "Built Nike OIA/Airbag platform from whiteboard to production — ~$600M revenue in first year",
  ],
  // CONFIRMED facts. Gap analysis MUST cross-reference before declaring any gap.
  // Never list something as a gap if it appears here.
  confirmedSkills: [
    "Lean Six Sigma Black Belt (LSSBB) — Intel internal certification",
    "Lean Six Sigma Green Belt (LSSGB) — LinkedIn Learning certified",
    "Lean Six Sigma Black Belt (LSSBB) — LinkedIn Learning certified",
    "ERP implementation — led full NetSuite ERP implementation at CCR, on time and under budget",
    "CRM — Salesforce and Sitetracker implementation at CCR",
    "Platform implementations delivered on time/under budget: Oracle FCC, Blackline, NSPB/Planful, Snowflake (all at CCR)",
    "IT product development — Nike OIA/Airbag platform, built whiteboard to production, ~$600M revenue Y1, still in use",
    "OCM and factory adoption — post-deploy change management for Nike airbag platform",
    "Process optimization using Lean/Six Sigma principles embedded across EDF and CCR transformation programs",
    "Agile at scale — SAFe, Scrum, Kanban; enterprise agile coach at Nike and Intel",
    "US Citizen — eligible for security clearance, no known impediments",
    "Capital-intensive regulated industry: renewable energy (grid-scale), manufacturing (Nike/Intel)",
    "Board and C-suite reporting — direct at both EDF and CCR",
    "Full P&L ownership — multi-million dollar technology budgets at VP level",
    "Vendor management — enterprise selection, contract negotiation, managed services",
    "Data governance and compliance frameworks — AI governance at CCR",
    "Team leadership — built/led teams of 15+ at CCR and EDF",
  ],
};

const RESUME_BASELINE = `SCOTT HENDERSON
Bellingham, WA | scott@hendersonsolution.com | linkedin.com/in/mrscotthenderson | hendersonsolution.com

SUMMARY
Enterprise transformation leader with 15+ years driving technology-led change at grid-scale renewable energy companies and Fortune 500 organizations. Full P&L accountability at VP level — budget ownership, revenue forecasting, margin management, and board/C-suite reporting. Proven track record of translating complex technology strategy into measurable business outcomes.

EXPERIENCE

VP of Technology | EDF Renewables | 2021–2024
- Led enterprise-scale platform consolidation delivering $28M annualized EBITDA improvement
- Identified $13M SaaS catalog through ledger mining; executed rationalization delivering 15% OPEX reduction
- Owned full technology P&L including budget, vendor contracts, and capital allocation
- Reported directly to C-suite and board on technology strategy, risk, and performance

Senior Director, Enterprise Applications | Cypress Creek Renewables | 2018–2021
- Designed and deployed AI governance framework reducing compliance-related fines by 27%
- Led enterprise application portfolio across project development, asset management, and finance systems
- Managed $X budget with full P&L accountability
- Built and led teams of 15+ across internal and vendor resources

Enterprise Agile Coach | Nike | 2016–2018
- Coached enterprise agile transformation across multiple technology program teams
- Designed and delivered coaching programs; built internal coaching bench
- Facilitated executive alignment sessions and scaled agile framework adoption

Enterprise Agile Coach | Intel | 2014–2016
- Led agile transformation engagements across enterprise technology programs
- Established scaled delivery frameworks and coaching practices

EDUCATION
[Degree] | [Institution]

SKILLS
Enterprise transformation · P&L management · Technology strategy · AI governance · Platform architecture · Vendor management · Agile at scale · ERP/EAM/CMMS · Board-level communication`;

const COMPETENCIES = [
  "Transformation", "Financial Impact", "Leadership", "Technical",
  "Agile/Delivery", "Governance", "Vendor Management", "Strategy", "Stakeholder"
];

const SEED_STORIES = [
  {
    id: "story-001",
    title: "$28M EBITDA Improvement — EDF Renewables",
    company: "EDF Renewables", role: "VP Technology",
    competencies: ["Financial Impact", "Transformation", "Technical"],
    situation: "EDF Renewables had a fragmented technology landscape across its U.S. renewable energy portfolio — redundant platforms, siloed data, and no consolidated view of asset performance or cost.",
    task: "As VP of Technology, I was accountable for identifying and executing a platform consolidation strategy that would reduce operational cost while improving data quality and reporting capability.",
    action: "Led a cross-functional team to audit the full technology stack, identified $13M in redundant SaaS spend through ledger mining, rationalized the vendor portfolio, and rearchitected core operational platforms to eliminate duplication. Built the business case, presented to C-suite and board, and owned execution through go-live.",
    result: "$28M annualized EBITDA improvement through platform consolidation and cost elimination. 15% OPEX reduction. Improved reporting accuracy to board level.",
    tags: ["P&L", "platform consolidation", "cost reduction", "board reporting", "enterprise architecture"],
    starred: true,
  },
  {
    id: "story-002",
    title: "27% Reduction in Compliance Fines — CCR AI Governance",
    company: "Cypress Creek Renewables", role: "Senior Director, Enterprise Applications",
    competencies: ["Governance", "Technical", "Financial Impact"],
    situation: "Cypress Creek Renewables was facing escalating compliance-related fines due to inconsistent data governance and manual audit processes across its renewable energy project portfolio.",
    task: "Design and implement an AI-assisted governance framework that would reduce compliance risk and demonstrate measurable reduction in regulatory exposure.",
    action: "Architected and deployed an AI governance implementation covering automated compliance monitoring, audit trail generation, and exception flagging. Built stakeholder alignment across legal, operations, and finance. Managed vendor selection and implementation.",
    result: "27% reduction in compliance-related fines. Repeatable governance framework adopted across the portfolio. Reduced manual audit burden by approximately 40%.",
    tags: ["AI governance", "compliance", "risk reduction", "regulatory", "automation"],
    starred: true,
  },
  {
    id: "story-003",
    title: "$13M SaaS Catalog Identified via Ledger Mining",
    company: "EDF Renewables", role: "VP Technology",
    competencies: ["Financial Impact", "Vendor Management", "Strategy"],
    situation: "No single owner had visibility into the full SaaS spend across EDF Renewables' U.S. operations. Contracts were distributed across business units with no consolidated catalog.",
    task: "Surface total SaaS exposure, identify redundancy, and build a rationalization roadmap.",
    action: "Designed and executed a ledger mining process — working with finance to extract and categorize all SaaS-related spend from AP records. Built a vendor catalog, mapped redundancies, and developed a rationalization plan with phased vendor exits.",
    result: "$13M SaaS catalog identified. Rationalization plan delivered 15% OPEX reduction. Established ongoing SaaS governance process preventing future unchecked sprawl.",
    tags: ["SaaS rationalization", "spend analysis", "vendor management", "OPEX", "ledger mining"],
    starred: false,
  },
  {
    id: "story-004",
    title: "Enterprise Agile Transformation — Nike",
    company: "Nike", role: "Enterprise Agile Coach",
    competencies: ["Transformation", "Leadership", "Agile/Delivery"],
    situation: "Nike was scaling agile practices across multiple enterprise technology programs with inconsistent adoption, methodology fragmentation, and low coaching maturity.",
    task: "As enterprise agile coach, build coaching capability, align methodology across teams, and accelerate delivery performance.",
    action: "Designed and delivered coaching programs across multiple program teams. Introduced scaled agile frameworks, facilitated leadership alignment sessions, and built internal coach capability.",
    result: "Improved delivery predictability across coached programs. Built internal coaching bench. Established repeatable transformation patterns later applied at Intel and in renewables context.",
    tags: ["agile", "coaching", "transformation", "enterprise", "Nike"],
    starred: false,
  },
];

const TABS = ["Library", "Analyze JD", "Resume", "Cover Letter", "Interview Prep"];

// ── Storage ───────────────────────────────────────────────────────────────────

async function storageGet(key) {
  try {
    const r = await window.storage.get(key);
    return r?.value ? JSON.parse(r.value) : null;
  } catch { return null; }
}

async function storageSet(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch {}
}

// ── API ───────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

async function callClaude(system, user, maxTokens = 2000) {
  if (!ANTHROPIC_API_KEY) throw new Error("API key not configured. Set VITE_ANTHROPIC_API_KEY in environment.");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }]
    })
  });
  let raw = "";
  try {
    raw = await response.text();
    const data = JSON.parse(raw);
    if (!response.ok || data.error) throw new Error(data.error?.message || `API ${response.status}`);
    return data.content?.find(b => b.type === "text")?.text || "";
  } catch (e) {
    throw new Error(e.message || `Parse failed: ${raw.slice(0, 200)}`);
  }
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

const S = {
  input: {
    width: "100%", background: "#0d0e1a", border: "1px solid #2a2a3a",
    borderRadius: "4px", color: "#c0b8d8", fontFamily: "system-ui, sans-serif",
    fontSize: "13px", padding: "9px 12px", outline: "none", boxSizing: "border-box"
  },
  textarea: {
    width: "100%", background: "#0d0e1a", border: "1px solid #2a2a3a",
    borderRadius: "4px", color: "#c0b8d8", fontFamily: "Georgia, serif",
    fontSize: "13px", lineHeight: "1.7", padding: "12px", resize: "vertical",
    outline: "none", boxSizing: "border-box"
  },
  btn: {
    background: "#4a4abf", color: "#e0e0ff", border: "none",
    borderRadius: "4px", padding: "10px 24px", fontSize: "13px",
    fontFamily: "system-ui, sans-serif", fontWeight: "600", cursor: "pointer"
  },
  btnGhost: {
    background: "transparent", color: "#5a5870", border: "1px solid #2a2a3a",
    borderRadius: "4px", padding: "10px 18px", fontSize: "13px",
    fontFamily: "system-ui, sans-serif", cursor: "pointer"
  },
  label: {
    display: "block", fontSize: "10px", letterSpacing: "2px",
    textTransform: "uppercase", color: "#5858a0", fontFamily: "system-ui, sans-serif",
    fontWeight: "600", marginBottom: "8px"
  },
  section: {
    background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e2e",
    borderRadius: "8px", padding: "24px", marginBottom: "20px"
  },
  resultBox: {
    background: "#0d0e1a", border: "1px solid #2a2a3a", borderRadius: "6px",
    padding: "20px", fontFamily: "Georgia, serif", fontSize: "14px",
    lineHeight: "1.8", color: "#b8b0d0", whiteSpace: "pre-wrap", wordBreak: "break-word"
  }
};

function Spinner() {
  return (
    <>
      <span style={{
        display: "inline-block", width: 13, height: 13,
        border: "2px solid #333", borderTopColor: "#7a7adf",
        borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px", color: copied ? "#7a9a7a" : "#5a5870" }}
    >{copied ? "✓ Copied" : "Copy"}</button>
  );
}

function JDInput({ jd, setJd }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <label style={S.label}>Job Description — paste here to use across all tools</label>
      <textarea
        value={jd} onChange={e => setJd(e.target.value)}
        placeholder="Paste the full job description here…"
        rows={6} style={S.textarea}
        onFocus={e => e.target.style.borderColor = "#4a4abf"}
        onBlur={e => e.target.style.borderColor = "#2a2a3a"}
      />
    </div>
  );
}

function ResultSection({ title, result, loading, error }) {
  if (!result && !loading && !error) return null;
  return (
    <div style={S.section}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ ...S.label, margin: 0 }}>{title}</div>
        {result && <CopyBtn text={result} />}
      </div>
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#4a4860", fontFamily: "system-ui, sans-serif", fontSize: "13px" }}>
          <Spinner /> Generating…
        </div>
      )}
      {error && <div style={{ color: "#c06060", fontFamily: "system-ui, sans-serif", fontSize: "13px", wordBreak: "break-word" }}>{error}</div>}
      {result && <div style={S.resultBox}>{result}</div>}
    </div>
  );
}

// ── Analysis Modal ────────────────────────────────────────────────────────────

function parseAnalysis(text) {
  // Extract fit score
  const scoreMatch = text.match(/fit score[:\s]*([0-9.]+)\s*\/?\s*10/i) ||
    text.match(/([0-9.]+)\s*\/\s*10/i) || text.match(/score[:\s]*([0-9.]+)/i);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;

  // Extract gaps section
  const gapsMatch = text.match(/gaps?\s+to\s+address[\s\S]*?(?=\n#{1,3}|\n[A-Z]{3,}|\nKEYWORDS|$)/i) ||
    text.match(/5\.\s*gaps?[\s\S]*?(?=\n6\.|\nKEYWORDS|$)/i);
  const gapsRaw = gapsMatch ? gapsMatch[0] : "";

  // Parse individual gaps from the gaps section
  const gapLines = gapsRaw.split(/\n/).filter(l =>
    l.trim() && !l.match(/^gaps?\s+to\s+address/i) && !l.match(/^5\.\s*gaps?/i)
  );

  const gaps = [];
  let current = null;
  for (const line of gapLines) {
    const boldMatch = line.match(/^\*{1,2}([^*]+)\*{1,2}|^[-•]\s*\*{1,2}([^*]+)\*{1,2}|^\d+\.\s*\*{1,2}([^*]+)\*{1,2}/);
    const headerMatch = line.match(/^\*{1,2}(No |Lack |Limited |Missing |Without )/i) ||
      line.match(/^[-•]\s*(No |Lack |Limited |Missing |Without )/i);
    if (boldMatch || headerMatch) {
      if (current) gaps.push(current);
      const title = (boldMatch?.[1] || boldMatch?.[2] || boldMatch?.[3] || line)
        .replace(/\*+/g, "").replace(/^[-•\d.]\s*/, "").trim();
      current = { title, detail: "" };
    } else if (current && line.trim()) {
      current.detail += (current.detail ? " " : "") + line.trim().replace(/\*+/g, "");
    }
  }
  if (current) gaps.push(current);

  return { score, gaps: gaps.filter(g => g.title.length > 2), fullText: text };
}

function AnalysisModal({ parsed, onProceed, onCorrectGaps, onNewJD, profileOverrides, onAddOverride }) {
  const { score, gaps, fullText } = parsed;
  const [correcting, setCorrecting] = useState(null); // gap index being corrected
  const [correction, setCorrection] = useState("");

  const scoreColor = score >= 8 ? "#7ab87a" : score >= 6 ? "#c9a84c" : "#c07070";

  const handleSaveCorrection = (gap) => {
    if (!correction.trim()) return;
    onAddOverride({ gap: gap.title, correction: correction.trim(), timestamp: Date.now() });
    setCorrecting(null);
    setCorrection("");
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px"
    }}>
      <div style={{
        background: "#0f1020", border: "1px solid #2a2a4a", borderRadius: "10px",
        maxWidth: "720px", width: "100%", maxHeight: "85vh", overflow: "auto",
        padding: "32px", boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
      }}>
        {/* Score */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#4a4860", fontFamily: "system-ui, sans-serif", marginBottom: "4px" }}>Fit Score</div>
            <div style={{ fontSize: "48px", fontWeight: "700", color: scoreColor, fontFamily: "system-ui, sans-serif", lineHeight: 1 }}>
              {score ? `${score}/10` : "—"}
            </div>
          </div>
          <div style={{ flex: 1, fontSize: "13px", color: "#7a7090", fontFamily: "system-ui, sans-serif", lineHeight: "1.6", paddingTop: "20px" }}>
            {/* Extract rationale line */}
            {fullText.match(/fit score[^.\n]*[.\n]/i)?.[0]?.replace(/fit score[:\s]*[0-9.]+\s*\/?\s*10\s*[-—]?\s*/i, "") || ""}
          </div>
        </div>

        {/* Gaps */}
        {gaps.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#7a5050", fontFamily: "system-ui, sans-serif", fontWeight: "600", marginBottom: "14px" }}>
              Gaps to Address ({gaps.length})
            </div>
            {gaps.map((gap, i) => {
              const override = profileOverrides.find(o => o.gap === gap.title);
              return (
                <div key={i} style={{
                  background: override ? "rgba(99,140,99,0.08)" : "rgba(180,80,80,0.07)",
                  border: `1px solid ${override ? "rgba(99,140,99,0.2)" : "rgba(180,80,80,0.2)"}`,
                  borderRadius: "6px", padding: "14px 16px", marginBottom: "10px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: override ? "#7ab87a" : "#c08080", fontFamily: "system-ui, sans-serif", marginBottom: "4px" }}>
                        {override ? "✓ " : ""}{gap.title}
                      </div>
                      {gap.detail && (
                        <div style={{ fontSize: "12px", color: "#5a5070", fontFamily: "system-ui, sans-serif", lineHeight: "1.6" }}>
                          {gap.detail.slice(0, 180)}{gap.detail.length > 180 ? "…" : ""}
                        </div>
                      )}
                      {override && (
                        <div style={{ fontSize: "12px", color: "#7a9a7a", fontFamily: "system-ui, sans-serif", marginTop: "6px", fontStyle: "italic" }}>
                          Your note: {override.correction}
                        </div>
                      )}
                    </div>
                    {!override && correcting !== i && (
                      <button onClick={() => { setCorrecting(i); setCorrection(""); }} style={{
                        ...S.btnGhost, fontSize: "11px", padding: "4px 10px",
                        color: "#8870a0", borderColor: "#3a2a4a", flexShrink: 0
                      }}>I have this</button>
                    )}
                  </div>
                  {correcting === i && (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ fontSize: "11px", color: "#5a5070", fontFamily: "system-ui, sans-serif", marginBottom: "6px" }}>
                        Describe your experience — this will be saved to your profile and used in future analyses:
                      </div>
                      <textarea
                        value={correction}
                        onChange={e => setCorrection(e.target.value)}
                        autoFocus
                        placeholder="e.g. I have LSSBB through Intel's internal program and LinkedIn Learning…"
                        rows={3}
                        style={{ ...S.textarea, fontSize: "12px", marginBottom: "8px" }}
                        onFocus={e => e.target.style.borderColor = "#7a5aaf"}
                        onBlur={e => e.target.style.borderColor = "#2a2a3a"}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleSaveCorrection(gap)} style={{ ...S.btn, padding: "6px 16px", fontSize: "12px", background: "#5a4aaf" }}>Save to Profile</button>
                        <button onClick={() => setCorrecting(null)} style={{ ...S.btnGhost, padding: "6px 12px", fontSize: "12px" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Full analysis (collapsed) */}
        <details style={{ marginBottom: "28px" }}>
          <summary style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "#3a3858", fontFamily: "system-ui, sans-serif", cursor: "pointer", userSelect: "none" }}>
            Full Analysis ▾
          </summary>
          <div style={{ ...S.resultBox, marginTop: "12px", fontSize: "13px" }}>{fullText}</div>
        </details>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={onProceed} style={{ ...S.btn, background: "#3a7a3a", flex: "1", minWidth: "140px" }}>
            ✓ Proceed to Build
          </button>
          <button onClick={onCorrectGaps} style={{ ...S.btn, background: "#5a4aaf", flex: "1", minWidth: "140px" }}>
            ✏️ Address Gaps
          </button>
          <button onClick={onNewJD} style={{ ...S.btnGhost, flex: "1", minWidth: "140px", textAlign: "center" }}>
            ↺ New JD Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Analyze JD ───────────────────────────────────────────────────────────

function AnalyzeTab({ jd, setJd, stories, profileOverrides, onAddOverride, onProceedToBuild }) {
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true); setError(null); setParsed(null);
    try {
      const storyTitles = stories.map((s, i) =>
        `${i + 1}. "${s.title}" — ${s.competencies.join(", ")}\n   Result: ${s.result}`
      ).join("\n");

      const overrideContext = profileOverrides.length > 0
        ? `\nUSER-CONFIRMED CORRECTIONS (treat as verified facts):\n${profileOverrides.map(o => `- ${o.gap}: ${o.correction}`).join("\n")}`
        : "";

      const system = `You are a senior career strategist helping ${PROFILE.name}, ${PROFILE.title}.

His background: ${PROFILE.background}

His confirmed skills and experience — YOU MUST CHECK THIS LIST before identifying any gap.
If a skill appears in this list, it is NOT a gap. Do not list it as one under any circumstances:
${PROFILE.confirmedSkills.map(s => `• ${s}`).join("\n")}
${overrideContext}

His proof points:
${PROFILE.proofPoints.map(p => `• ${p}`).join("\n")}

His STAR story library:
${storyTitles}

Analyze the job description and provide EXACTLY this structure:

FIT SCORE: [number]/10 — [one-line rationale]

KEY REQUIREMENTS
[5 most important requirements this role actually needs]

SCOTT'S STRONGEST ANGLES
[Top 3 proof points most relevant to this JD, and why]

TOP 3 STORIES TO TELL
[Which stories to lead with, and for which interview question type]

GAPS TO ADDRESS
[IMPORTANT: Only list genuine gaps — skills or experience NOT found in his confirmed skills list above.
For each real gap: name it clearly, give honest assessment, suggest framing.
If there are no real gaps, say "No significant gaps identified."]

KEYWORDS TO INCLUDE
[8-10 keywords from the JD to weave into resume and cover letter]

Be direct and specific. Never hallucinate gaps that contradict his confirmed skills list.`;

      const text = await callClaude(system, `Analyze this job description:\n\n${jd}`, 2500);
      const result = parseAnalysis(text);
      setParsed(result);
      setShowModal(true);
    } catch (e) { setError(`Analysis failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleNewJD = () => { setJd(""); setParsed(null); setShowModal(false); };

  return (
    <div>
      {showModal && parsed && (
        <AnalysisModal
          parsed={parsed}
          profileOverrides={profileOverrides}
          onAddOverride={onAddOverride}
          onProceed={() => { setShowModal(false); onProceedToBuild(); }}
          onCorrectGaps={() => setShowModal(false)}
          onNewJD={handleNewJD}
        />
      )}
      <JDInput jd={jd} setJd={setJd} />
      {profileOverrides.length > 0 && (
        <div style={{
          background: "rgba(99,140,99,0.08)", border: "1px solid rgba(99,140,99,0.2)",
          borderRadius: "4px", padding: "10px 14px", marginBottom: "16px",
          fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#7a9a7a"
        }}>
          ✓ {profileOverrides.length} profile correction{profileOverrides.length > 1 ? "s" : ""} active — AI will use these in analysis
        </div>
      )}
      <button onClick={run} disabled={!jd.trim() || loading} style={{
        ...S.btn, opacity: !jd.trim() || loading ? 0.5 : 1,
        display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px"
      }}>
        {loading ? <><Spinner /> Analyzing…</> : "Analyze JD"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "system-ui, sans-serif", fontSize: "13px", marginBottom: "16px", wordBreak: "break-word" }}>{error}</div>}
      {parsed && !showModal && (
        <div>
          <button onClick={() => setShowModal(true)} style={{ ...S.btn, background: "#3a5aaf", marginBottom: "16px" }}>
            View Analysis Results
          </button>
          <ResultSection title="Full Analysis" result={parsed.fullText} loading={false} error={null} />
        </div>
      )}
    </div>
  );
}

// ── Tab: Resume ───────────────────────────────────────────────────────────────

function ResumeTab({ jd, setJd }) {
  const [resume, setResume] = useState(RESUME_BASELINE);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResume, setShowResume] = useState(false);

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true); setError(null); setResult("");
    try {
      const system = `You are a senior executive resume strategist helping ${PROFILE.name}, ${PROFILE.title}.
His background: ${PROFILE.background}
His proof points: ${PROFILE.proofPoints.join("; ")}

Given his resume and a job description, provide:
1. SUMMARY REWRITE — a tailored 3-sentence summary optimized for this specific role
2. TOP 5 BULLET EDITS — specific existing bullets to strengthen or rewrite, with the revised version
3. BULLETS TO PROMOTE — which achievements to move higher or emphasize more
4. KEYWORDS TO ADD — specific phrases from the JD missing from the resume
5. WHAT TO DE-EMPHASIZE — anything that doesn't serve this application

Output should be immediately actionable — give the actual rewritten text, not just advice.`;
      const text = await callClaude(system, `Job Description:\n${jd}\n\nCurrent Resume:\n${resume}`, 2500);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />

      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ ...S.label, margin: 0 }}>Resume Baseline</label>
          <button onClick={() => setShowResume(!showResume)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>
            {showResume ? "Hide" : "Edit baseline"}
          </button>
        </div>
        {showResume && (
          <textarea value={resume} onChange={e => setResume(e.target.value)}
            rows={12} style={S.textarea}
            onFocus={e => e.target.style.borderColor = "#4a4abf"}
            onBlur={e => e.target.style.borderColor = "#2a2a3a"}
          />
        )}
      </div>

      <button onClick={run} disabled={!jd.trim() || loading} style={{
        ...S.btn, opacity: !jd.trim() || loading ? 0.5 : 1,
        display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px"
      }}>
        {loading ? <><Spinner /> Tailoring…</> : "Tailor Resume"}
      </button>
      <ResultSection title="Resume Tailoring Recommendations" result={result} loading={loading} error={error} />
    </div>
  );
}

// ── Tab: Cover Letter ─────────────────────────────────────────────────────────

function CoverLetterTab({ jd, setJd }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true); setError(null); setResult("");
    try {
      const system = `You are writing a cover letter for ${PROFILE.name}, ${PROFILE.title}.
His background: ${PROFILE.background}
His proof points: ${PROFILE.proofPoints.join("; ")}

Voice guidelines:
- Direct and confident, not sycophantic
- Lead with business impact, not years of experience
- Specific proof points over generic claims
- One strong opening hook, not "I am writing to apply for…"
- 3 tight paragraphs maximum — executives don't write long cover letters
- Close with forward momentum, not "I look forward to hearing from you"

Write a complete, ready-to-send cover letter. Do not add placeholders or commentary after — just the letter.`;
      const userMsg = `Company: ${company || "the company"}
Role: ${role || "this position"}
${notes ? `Additional context: ${notes}` : ""}

Job Description:
${jd}`;
      const text = await callClaude(system, userMsg, 1500);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div>
          <label style={S.label}>Company Name</label>
          <input value={company} onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Acme Corp" style={S.input}
            onFocus={e => e.target.style.borderColor = "#4a4abf"}
            onBlur={e => e.target.style.borderColor = "#2a2a3a"} />
        </div>
        <div>
          <label style={S.label}>Role Title</label>
          <input value={role} onChange={e => setRole(e.target.value)}
            placeholder="e.g. VP of Technology" style={S.input}
            onFocus={e => e.target.style.borderColor = "#4a4abf"}
            onBlur={e => e.target.style.borderColor = "#2a2a3a"} />
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Additional Context <span style={{ color: "#3a3858", textTransform: "none", letterSpacing: 0 }}>optional — anything specific to emphasize</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Referred by John Smith. They emphasize culture fit. I want to highlight the CCR governance work…"
          rows={3} style={S.textarea}
          onFocus={e => e.target.style.borderColor = "#4a4abf"}
          onBlur={e => e.target.style.borderColor = "#2a2a3a"} />
      </div>

      <button onClick={run} disabled={!jd.trim() || loading} style={{
        ...S.btn, opacity: !jd.trim() || loading ? 0.5 : 1,
        display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px"
      }}>
        {loading ? <><Spinner /> Drafting…</> : "Draft Cover Letter"}
      </button>
      <ResultSection title="Cover Letter Draft" result={result} loading={loading} error={error} />
    </div>
  );
}

// ── Tab: Interview Prep ───────────────────────────────────────────────────────

function InterviewPrepTab({ jd, setJd, stories }) {
  const [round, setRound] = useState("screening");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true); setError(null); setResult("");
    try {
      const storyContext = stories.map(s =>
        `"${s.title}": ${s.result}`
      ).join("\n");
      const system = `You are an executive interview coach preparing ${PROFILE.name} for a ${round} interview.
His background: ${PROFILE.background}
His proof points: ${PROFILE.proofPoints.join("; ")}
His STAR stories: ${storyContext}

Generate:
1. LIKELY QUESTIONS — 8 questions this interviewer will probably ask, based on the JD
2. ANGLE FOR EACH — for each question, the specific story or proof point Scott should lead with, and the key message to land
3. TRICKY QUESTIONS — 3 harder questions (gaps, concerns, failures) with suggested honest framings
4. QUESTIONS TO ASK — 4 sharp questions Scott should ask the interviewer that signal strategic thinking

Format clearly with the question, then the coaching note. Be specific to Scott's background, not generic.`;
      const text = await callClaude(system, `Interview round: ${round}\n\nJob Description:\n${jd}`, 3000);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const rounds = ["screening", "hiring manager", "panel", "executive", "final"];

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />

      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Interview Round</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {rounds.map(r => (
            <button key={r} onClick={() => setRound(r)} style={{
              ...S.btnGhost, fontSize: "12px", padding: "6px 14px",
              background: round === r ? "rgba(99,140,255,0.15)" : "transparent",
              color: round === r ? "#8aacff" : "#5a5870",
              borderColor: round === r ? "#4a6abf" : "#2a2a3a",
              textTransform: "capitalize"
            }}>{r}</button>
          ))}
        </div>
      </div>

      <button onClick={run} disabled={!jd.trim() || loading} style={{
        ...S.btn, opacity: !jd.trim() || loading ? 0.5 : 1,
        display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px"
      }}>
        {loading ? <><Spinner /> Preparing…</> : `Prep for ${round} interview`}
      </button>
      <ResultSection title={`Interview Prep — ${round}`} result={result} loading={loading} error={error} />
    </div>
  );
}

// ── Tab: Library ──────────────────────────────────────────────────────────────

function Tag({ label, color = "#2a2a3a", textColor = "#8880a0" }) {
  return (
    <span style={{
      background: color, color: textColor, borderRadius: "3px",
      padding: "2px 8px", fontSize: "11px", fontFamily: "system-ui, sans-serif",
      letterSpacing: "0.3px", whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

function CompetencyBadge({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(99,140,255,0.18)" : "rgba(255,255,255,0.03)",
      color: active ? "#8aacff" : "#5a5870",
      border: `1px solid ${active ? "#4a6abf" : "#2a2a3a"}`,
      borderRadius: "4px", padding: "5px 12px",
      fontSize: "12px", fontFamily: "system-ui, sans-serif",
      cursor: "pointer", transition: "all 0.15s"
    }}>{label}</button>
  );
}

function StoryCard({ story, onEdit, onDelete, onStar }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${story.starred ? "rgba(99,140,255,0.3)" : "#1e1e2e"}`,
      borderRadius: "8px", marginBottom: "12px", overflow: "hidden"
    }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        padding: "16px 20px", cursor: "pointer", display: "flex",
        alignItems: "flex-start", gap: "12px",
        background: expanded ? "rgba(99,140,255,0.04)" : "transparent"
      }}>
        <button onClick={(e) => { e.stopPropagation(); onStar(story.id); }} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "16px", padding: "0", marginTop: "1px", flexShrink: 0
        }}>
          {story.starred ? "⭐" : "☆"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "15px", fontWeight: "600", color: "#d8d0f0",
            fontFamily: "system-ui, sans-serif", marginBottom: "6px"
          }}>{story.title}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Tag label={story.company} color="rgba(99,140,255,0.12)" textColor="#7a9aef" />
            <Tag label={story.role} />
            {story.competencies.map(c => (
              <Tag key={c} label={c} color="rgba(180,140,255,0.1)" textColor="#b090d0" />
            ))}
          </div>
        </div>
        <div style={{ color: "#3e3a4e", fontSize: "18px", flexShrink: 0 }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 20px 20px 48px", borderTop: "1px solid #1a1a2a" }}>
          {[
            { label: "S — Situation", key: "situation", color: "#6b8080" },
            { label: "T — Task", key: "task", color: "#6b7a80" },
            { label: "A — Action", key: "action", color: "#6b6880" },
            { label: "R — Result", key: "result", color: "#7a8060" },
          ].map(({ label, key, color }) => (
            <div key={key} style={{ marginTop: "16px" }}>
              <div style={{
                fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase",
                color, fontFamily: "system-ui, sans-serif", fontWeight: "600", marginBottom: "6px"
              }}>{label}</div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#b0a8c0", fontFamily: "Georgia, serif" }}>
                {story[key]}
              </div>
            </div>
          ))}
          {story.tags?.length > 0 && (
            <div style={{ marginTop: "16px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {story.tags.map(t => <Tag key={t} label={`#${t}`} color="rgba(255,255,255,0.04)" textColor="#4a4860" />)}
            </div>
          )}
          <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
            <button onClick={() => onEdit(story)} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px" }}>✏️ Edit</button>
            <button onClick={() => onDelete(story.id)} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", color: "#6a3a3a", borderColor: "#2e1e1e" }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function generateId() { return `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function StoryEditor({ story, onSave, onCancel }) {
  const blank = { id: generateId(), title: "", company: "", role: "", competencies: [], situation: "", task: "", action: "", result: "", tags: "", starred: false };
  const [form, setForm] = useState(story ? { ...story, tags: story.tags?.join(", ") || "" } : blank);

  const field = (key, label, multiline = false, hint = "") => (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ ...S.label, color: "#6860a0" }}>{label}{hint && <span style={{ color: "#3e3a50", marginLeft: "8px", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>{hint}</span>}</label>
      {multiline ? (
        <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={4} style={S.textarea}
          onFocus={e => e.target.style.borderColor = "#4a4abf"}
          onBlur={e => e.target.style.borderColor = "#2a2a3a"} />
      ) : (
        <input type="text" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={S.input}
          onFocus={e => e.target.style.borderColor = "#4a4abf"}
          onBlur={e => e.target.style.borderColor = "#2a2a3a"} />
      )}
    </div>
  );

  return (
    <div style={{ background: "#0d0e1a", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "28px" }}>
      <div style={{ fontSize: "16px", fontWeight: "600", color: "#c0b8d8", fontFamily: "system-ui, sans-serif", marginBottom: "24px" }}>
        {story ? "Edit Story" : "Add New Story"}
      </div>
      {field("title", "Story Title")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>{field("company", "Company")}</div>
        <div>{field("role", "Role / Title")}</div>
      </div>
      <div style={{ marginBottom: "18px" }}>
        <label style={{ ...S.label, color: "#6860a0" }}>Competencies</label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {COMPETENCIES.map(c => (
            <CompetencyBadge key={c} label={c} active={form.competencies.includes(c)}
              onClick={() => setForm(f => ({
                ...f, competencies: f.competencies.includes(c)
                  ? f.competencies.filter(x => x !== c) : [...f.competencies, c]
              }))} />
          ))}
        </div>
      </div>
      {field("situation", "S — Situation", true, "Context and background")}
      {field("task", "T — Task", true, "Your specific responsibility")}
      {field("action", "A — Action", true, "What you did — be specific")}
      {field("result", "R — Result", true, "Quantified outcomes")}
      {field("tags", "Tags", false, "comma-separated keywords")}
      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        <button onClick={() => { if (!form.title.trim()) return; onSave({ ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) }); }}
          style={S.btn}>Save Story</button>
        <button onClick={onCancel} style={S.btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

function LibraryTab({ stories, setStories }) {
  const [editing, setEditing] = useState(null);
  const [filterComp, setFilterComp] = useState(null);
  const [filterStarred, setFilterStarred] = useState(false);
  const [search, setSearch] = useState("");

  const handleSave = (story) => {
    setStories(prev => prev.find(s => s.id === story.id) ? prev.map(s => s.id === story.id ? story : s) : [...prev, story]);
    setEditing(null);
  };

  const handleDelete = (id) => { if (window.confirm("Delete this story?")) setStories(prev => prev.filter(s => s.id !== id)); };
  const handleStar = (id) => setStories(prev => prev.map(s => s.id === id ? { ...s, starred: !s.starred } : s));

  const filtered = stories.filter(s => {
    if (filterStarred && !s.starred) return false;
    if (filterComp && !s.competencies.includes(filterComp)) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.company.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q)) || s.result.toLowerCase().includes(q);
    }
    return true;
  });

  if (editing) return <StoryEditor story={editing === "new" ? null : editing} onSave={handleSave} onCancel={() => setEditing(null)} />;

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories…"
          style={{ ...S.input, width: "200px" }}
          onFocus={e => e.target.style.borderColor = "#4a4abf"}
          onBlur={e => e.target.style.borderColor = "#2a2a3a"} />
        <button onClick={() => setFilterStarred(!filterStarred)} style={{
          ...S.btnGhost, fontSize: "12px",
          background: filterStarred ? "rgba(99,140,255,0.15)" : "transparent",
          color: filterStarred ? "#8aacff" : "#4a4860",
          borderColor: filterStarred ? "#4a6abf" : "#2a2a3a"
        }}>⭐ Starred</button>
        <button onClick={() => setEditing("new")} style={{ ...S.btn, marginLeft: "auto", padding: "8px 18px" }}>+ Add Story</button>
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        <CompetencyBadge label="All" active={!filterComp} onClick={() => setFilterComp(null)} />
        {COMPETENCIES.map(c => <CompetencyBadge key={c} label={c} active={filterComp === c} onClick={() => setFilterComp(filterComp === c ? null : c)} />)}
      </div>
      {filtered.length === 0 ? (
        <div style={{ color: "#3a3858", fontFamily: "system-ui, sans-serif", fontSize: "14px", padding: "40px", textAlign: "center", border: "1px dashed #1e1e2e", borderRadius: "8px" }}>
          No stories match.{" "}
          <button onClick={() => { setFilterComp(null); setFilterStarred(false); setSearch(""); }}
            style={{ background: "none", border: "none", color: "#5a5aaf", cursor: "pointer", fontSize: "14px" }}>Clear filters</button>
        </div>
      ) : (
        filtered.map(story => <StoryCard key={story.id} story={story} onEdit={setEditing} onDelete={handleDelete} onStar={handleStar} />)
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function CareerForge() {
  const [activeTab, setActiveTab] = useState("Library");
  const [stories, setStories] = useState([]);
  const [profileOverrides, setProfileOverrides] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [jd, setJd] = useState("");

  useEffect(() => {
    Promise.all([
      storageGet("careerforge:scott:stories"),
      storageGet("careerforge:scott:jd"),
      storageGet("careerforge:scott:overrides"),
    ]).then(([s, j, o]) => {
      setStories(s || SEED_STORIES);
      setJd(j || "");
      setProfileOverrides(o || []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => { if (loaded) storageSet("careerforge:scott:stories", stories); }, [stories, loaded]);
  useEffect(() => { if (loaded) storageSet("careerforge:scott:jd", jd); }, [jd, loaded]);
  useEffect(() => { if (loaded) storageSet("careerforge:scott:overrides", profileOverrides); }, [profileOverrides, loaded]);

  const handleAddOverride = (override) => {
    setProfileOverrides(prev => {
      const existing = prev.findIndex(o => o.gap === override.gap);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = override;
        return updated;
      }
      return [...prev, override];
    });
  };

  const starredCount = stories.filter(s => s.starred).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0b14", color: "#d0c8e8", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d0e1f 0%, #111228 100%)", borderBottom: "1px solid #1e1e2e", padding: "20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700", color: "#c8c0e8", letterSpacing: "-0.5px" }}>CareerForge</span>
              <span style={{ fontSize: "10px", letterSpacing: "3px", color: "#4a4abf", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>
                Job Search Intelligence
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#3a3858", fontFamily: "system-ui, sans-serif", marginTop: "3px" }}>
              {PROFILE.name} · {PROFILE.title}
              {profileOverrides.length > 0 && (
                <span style={{ color: "#5a8a5a", marginLeft: "10px" }}>· {profileOverrides.length} profile correction{profileOverrides.length > 1 ? "s" : ""} active</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", fontFamily: "system-ui, sans-serif" }}>
            <span style={{ fontSize: "12px", color: "#3a3858" }}>{stories.length} stories · {starredCount} starred</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginTop: "20px" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? "rgba(99,140,255,0.15)" : "transparent",
              color: activeTab === tab ? "#8aacff" : "#4a4860",
              border: `1px solid ${activeTab === tab ? "#4a6abf" : "transparent"}`,
              borderBottom: activeTab === tab ? "1px solid #0a0b14" : "1px solid transparent",
              borderRadius: "4px 4px 0 0", padding: "8px 18px", fontSize: "13px",
              fontFamily: "system-ui, sans-serif", cursor: "pointer",
              marginBottom: activeTab === tab ? "-1px" : "0"
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 40px", maxWidth: "900px" }}>
        {!loaded ? (
          <div style={{ color: "#3a3858", fontFamily: "system-ui, sans-serif" }}>Loading…</div>
        ) : (
          <>
            {activeTab === "Library" && <LibraryTab stories={stories} setStories={setStories} />}
            {activeTab === "Analyze JD" && (
              <AnalyzeTab
                jd={jd} setJd={setJd} stories={stories}
                profileOverrides={profileOverrides}
                onAddOverride={handleAddOverride}
                onProceedToBuild={() => setActiveTab("Resume")}
              />
            )}
            {activeTab === "Resume" && <ResumeTab jd={jd} setJd={setJd} />}
            {activeTab === "Cover Letter" && <CoverLetterTab jd={jd} setJd={setJd} />}
            {activeTab === "Interview Prep" && <InterviewPrepTab jd={jd} setJd={setJd} stories={stories} />}
          </>
        )}

        {/* Build log */}
        <div style={{ marginTop: "48px", borderTop: "1px solid #1a1a2a", paddingTop: "20px", fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#2e2e40", lineHeight: "1.8" }}>
          <div style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "#3a3850", marginBottom: "6px", fontWeight: "600" }}>CareerForge · Build Log</div>
          v1 · STAR story library with persistent storage — Scott Henderson profile<br />
          v2 · Layer 2 AI tools — JD Analyzer, Resume Tailoring, Cover Letter, Interview Prep · shared JD state persisted across tabs<br />
          v3a · Analysis modal with fit score + gap cards · gap correction flow → persistent profile overrides · enriched confirmed skills context to prevent gap hallucination<br />
          <span style={{ color: "#242438" }}>Next: v3b — Company Research Agent (multi-step agentic workflow) · multi-user profiles (Joshua, Aaron)</span>
        </div>
      </div>
    </div>
  );
}
