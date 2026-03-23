import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

const PROFILE = {
  name: "Scott Henderson",
  title: "Enterprise Transformation Leader",
  background: `Senior transformation leader with 15+ years driving enterprise-scale change at grid-scale renewable energy companies and Fortune 500 technology organizations. VP of Technology at EDF Renewables and Cypress Creek Renewables with full P&L ownership — budget, revenue forecasting, margin management, and board/C-suite reporting. Earlier career as enterprise agile coach at Nike and Intel.`,
  proofPoints: [
    "$28M annualized EBITDA improvement at EDF Renewables through platform consolidation",
    "27% reduction in compliance-related fines at CCR via AI governance implementation",
    "$13M SaaS catalog identified through ledger mining → 15% OPEX reduction",
    "Full P&L ownership at both CCR and EDF — budget, forecasting, margin, board reporting",
    "Enterprise agile coach at Nike and Intel — transformation at scale",
  ],
  certifications: [
    "Lean Six Sigma Black Belt — Intel internal certification program (VERIFIED)",
    "Lean Six Sigma Green Belt — LinkedIn Learning",
    "Lean Six Sigma Black Belt — LinkedIn Learning",
  ],
  implementations: [
    "NetSuite ERP — full end-to-end implementation at CCR, on time and under budget (VERIFIED)",
    "Salesforce + Sitetracker — full implementation at CCR",
    "Oracle Financial Consolidation and Close (FCC) — full implementation at CCR",
    "Blackline — financial close automation, full implementation at CCR",
    "NSPB (NetSuite Planning and Budgeting) — full implementation at CCR",
    "Snowflake — data platform implementation at CCR",
    "All implementations delivered on time and under budget — hands-on lead, not oversight",
  ],
  products: [
    "Nike Airbag Inspection Platform — full product lifecycle from whiteboard to production. ~$600M revenue in first year. Led OCM and global factory adoption. Still in active use. (VERIFIED IT PRODUCT EXPERIENCE)",
  ],
  industries: [
    "Renewable energy (grid-scale solar, wind, storage) — EDF Renewables, Cypress Creek Renewables",
    "Consumer products / global manufacturing — Nike (factory ops, airbag inspection platform)",
    "Semiconductor / technology manufacturing — Intel",
    "Regulated, capital-intensive, compliance-heavy industries across all roles",
  ],
  security: ["US Citizen — no impediments to security clearance. Can commence process immediately upon offer."],
};

const RESUME_BASELINE = `SCOTT HENDERSON
Bellingham, WA | scott@hendersonsolution.com | linkedin.com/in/mrscotthenderson | hendersonsolution.com

SUMMARY
Enterprise transformation leader with 15+ years driving technology-led change at grid-scale renewable energy companies and Fortune 500 organizations. Full P&L accountability at VP level — budget ownership, revenue forecasting, margin management, and board/C-suite reporting. Hands-on ERP implementation lead (NetSuite, Salesforce, Oracle FCC, Blackline, Snowflake) with all projects delivered on time and under budget.

EXPERIENCE

VP of Technology | EDF Renewables | 2021–2024
- Led enterprise-scale platform consolidation delivering $28M annualized EBITDA improvement
- Identified $13M SaaS catalog through ledger mining; rationalization delivered 15% OPEX reduction
- Owned full technology P&L including budget, vendor contracts, and capital allocation
- Reported directly to C-suite and board on technology strategy, risk, and performance

Senior Director, Enterprise Applications | Cypress Creek Renewables | 2018–2021
- Implemented NetSuite ERP, Salesforce/Sitetracker, Oracle FCC, Blackline, NSPB, and Snowflake — all on time and under budget
- Designed and deployed AI governance framework reducing compliance-related fines by 27%
- Led enterprise application portfolio across project development, asset management, and finance
- Full P&L accountability; managed teams of 15+ across internal and vendor resources

Enterprise Agile Coach | Nike | 2016–2018
- Led full product lifecycle of Nike Airbag Inspection Platform from whiteboard to global deployment; ~$600M revenue in year one
- Coached enterprise agile transformation; built internal coaching bench; led OCM and factory adoption

Enterprise Agile Coach | Intel | 2014–2016
- Led agile transformation engagements; Lean Six Sigma Black Belt (Intel internal certification)
- Established scaled delivery frameworks and coaching practices

CERTIFICATIONS
Lean Six Sigma Black Belt — Intel | LSSGB + LSSBB — LinkedIn Learning

SKILLS
Enterprise transformation · ERP/platform implementation · P&L management · AI governance · Technology strategy · Vendor management · Agile at scale · Board-level communication`;

const COMPETENCIES = ["Transformation","Financial Impact","Leadership","Technical","Agile/Delivery","Governance","Vendor Management","Strategy","Stakeholder"];

const SEED_STORIES = [
  {
    id: "story-001", title: "$28M EBITDA Improvement — EDF Renewables",
    company: "EDF Renewables", role: "VP Technology",
    competencies: ["Financial Impact","Transformation","Technical"],
    situation: "EDF Renewables had a fragmented technology landscape — redundant platforms, siloed data, no consolidated view of asset performance or cost.",
    task: "Identify and execute a platform consolidation strategy to reduce operational cost while improving data quality and board-level reporting.",
    action: "Led cross-functional audit of full tech stack, identified $13M in redundant SaaS spend via ledger mining, rationalized vendor portfolio, rearchitected core platforms. Built business case and presented to C-suite and board. Owned execution through go-live.",
    result: "$28M annualized EBITDA improvement. 15% OPEX reduction. Improved board reporting accuracy.",
    tags: ["P&L","platform consolidation","cost reduction","board reporting","enterprise architecture"], starred: true,
  },
  {
    id: "story-002", title: "27% Reduction in Compliance Fines — CCR AI Governance",
    company: "Cypress Creek Renewables", role: "Senior Director, Enterprise Applications",
    competencies: ["Governance","Technical","Financial Impact"],
    situation: "CCR faced escalating compliance fines due to inconsistent data governance and manual audit processes across its renewable energy portfolio.",
    task: "Design and implement an AI-assisted governance framework to reduce compliance risk and demonstrate measurable regulatory exposure reduction.",
    action: "Architected AI governance implementation covering automated compliance monitoring, audit trail generation, and exception flagging. Built stakeholder alignment across legal, operations, and finance. Managed vendor selection and implementation.",
    result: "27% reduction in compliance-related fines. Repeatable framework adopted across portfolio. ~40% reduction in manual audit burden.",
    tags: ["AI governance","compliance","risk reduction","regulatory","automation"], starred: true,
  },
  {
    id: "story-003", title: "$13M SaaS Catalog via Ledger Mining — EDF",
    company: "EDF Renewables", role: "VP Technology",
    competencies: ["Financial Impact","Vendor Management","Strategy"],
    situation: "No single owner had visibility into total SaaS spend across EDF's U.S. operations. Contracts were distributed across business units with no consolidated catalog.",
    task: "Surface total SaaS exposure, identify redundancy, build a rationalization roadmap.",
    action: "Designed and executed ledger mining process with finance — extracted and categorized all SaaS spend from AP records. Built vendor catalog, mapped redundancies, developed phased rationalization plan.",
    result: "$13M SaaS catalog identified. Rationalization plan delivered 15% OPEX reduction. Established ongoing SaaS governance.",
    tags: ["SaaS","spend analysis","vendor management","OPEX","ledger mining"], starred: false,
  },
  {
    id: "story-004", title: "Nike Airbag Inspection Platform — Full Product Lifecycle",
    company: "Nike", role: "Enterprise Agile Coach",
    competencies: ["Transformation","Leadership","Technical"],
    situation: "Nike needed a digital inspection platform for airbag manufacturing across global factories — no existing system, starting from whiteboard.",
    task: "Lead product development from concept to global production deployment and drive factory adoption.",
    action: "Led full product lifecycle — requirements, build, test, deploy. Designed and led OCM program for global factory adoption across multiple sites. Operated at intersection of product, technology, operations, and change management.",
    result: "Platform deployed to production. ~$600M revenue in first year. Still in active use globally.",
    tags: ["product","OCM","factory","manufacturing","Nike","digital platform"], starred: false,
  },
];

const TABS = ["Library","Analyze JD","Resume","Cover Letter","Interview Prep","Research"];

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

const PRIVACY_NOTICE = `CareerForge sends content you enter — job descriptions, resume text, and company names — to the Anthropic Claude API for AI processing. This is subject to Anthropic's privacy policy.

Do not enter confidential, proprietary, or personally sensitive information beyond what you intend to share with an AI service provider.

AI outputs require human review before use. Fit scores reflect keyword and experience alignment only — they are not assessments of your actual qualifications or likelihood of success.`;

// Cost estimate (Haiku pricing: ~$0.80/M input tokens, ~$4/M output tokens)
function estimateCost(inputChars, outputChars) {
  return ((inputChars / 4) * 0.0000008) + ((outputChars / 4) * 0.000004);
}

// Module-level session cost accumulator
let _sessionCost = 0;
const _costListeners = new Set();
function trackCost(inChars, outChars) {
  _sessionCost += estimateCost(inChars, outChars);
  _costListeners.forEach(cb => cb(_sessionCost));
}
function useSessionCost() {
  const [cost, setCost] = useState(_sessionCost);
  useEffect(() => { _costListeners.add(setCost); return () => _costListeners.delete(setCost); }, []);
  return cost;
}

// Global API lock — prevents concurrent calls across tabs
let _apiLocked = false;
const _lockListeners = new Set();
function setApiLock(v) { _apiLocked = v; _lockListeners.forEach(cb => cb(v)); }
function useApiLock() {
  const [locked, setLocked] = useState(_apiLocked);
  useEffect(() => { _lockListeners.add(setLocked); return () => _lockListeners.delete(setLocked); }, []);
  return locked;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────

async function storageGet(key) {
  try { const r = await window.storage.get(key); return r?.value ? JSON.parse(r.value) : null; } catch { return null; }
}
async function storageSet(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

async function callClaude(system, user, maxTokens = 2000) {
  if (!ANTHROPIC_API_KEY) throw new Error("API key not configured. Set VITE_ANTHROPIC_API_KEY.");
  setApiLock(true);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    const raw = await res.text();
    const data = JSON.parse(raw);
    if (!res.ok || data.error) throw new Error(data.error?.message || `API ${res.status}: ${raw.slice(0,200)}`);
    const text = data.content?.find(b => b.type === "text")?.text || "";
    trackCost((system + user).length, text.length);
    return text;
  } finally { setApiLock(false); }
}

async function callClaudeSearch(company, query) {
  // Safety: only company name in queries — no PII, no resume content
  if (!ANTHROPIC_API_KEY) throw new Error("API key not configured.");
  setApiLock(true);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `You are a research analyst preparing a pre-interview briefing about ${company}.
Summarize findings in 3-5 factual sentences with specific numbers, names, and dates.
After your summary, list 1-3 source URLs as: "Sources: url1, url2"
Scope is limited to public information about the company. Do not search for individual private persons.`,
        messages: [{ role: "user", content: query }],
      }),
    });
    const raw = await res.text();
    const data = JSON.parse(raw);
    if (!res.ok || data.error) throw new Error(data.error?.message || `API ${res.status}`);
    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    trackCost(query.length, (text || "").length);
    return text || "No information found.";
  } finally { setApiLock(false); }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCX HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const AI_STAMP = `AI-assisted | Generated ${TODAY} | Verify before use`;

async function downloadResumeDocx(resumeText, tailoringNotes, company) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("https://esm.sh/docx@8.5.0");
  const children = [
    new Paragraph({ children: [new TextRun({ text: "SCOTT HENDERSON", bold: true, size: 32, color: "1a1a4a" })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: "Bellingham, WA  |  scott@hendersonsolution.com  |  linkedin.com/in/mrscotthenderson  |  hendersonsolution.com", size: 18, color: "555555" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "2F2B8F" } }, spacing: { after: 160 } }),
  ];
  if (tailoringNotes) {
    children.push(new Paragraph({ children: [new TextRun({ text: `TAILORING — ${company || "THIS ROLE"}`, bold: true, size: 22, color: "2F2B8F" })], spacing: { before: 120, after: 80 } }));
    for (const line of tailoringNotes.split("\n")) {
      const t = line.trim();
      if (!t) { children.push(new Paragraph({ text: "", spacing: { after: 40 } })); continue; }
      if (t === t.toUpperCase() && t.length > 4 && !t.includes("@")) {
        children.push(new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 21, color: "2F2B8F" })], spacing: { before: 180, after: 60 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } } }));
      } else if (t.startsWith("-") || t.startsWith("•")) {
        children.push(new Paragraph({ children: [new TextRun({ text: t.replace(/^[-•]\s*/, ""), size: 20 })], bullet: { level: 0 }, spacing: { after: 40 } }));
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: t, size: 20 })], spacing: { after: 60 } }));
      }
    }
    children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "2F2B8F" } }, spacing: { before: 240, after: 160 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: "BASE RESUME", bold: true, size: 20, color: "888888" })], spacing: { after: 80 } }));
  }
  for (const line of resumeText.split("\n")) {
    const t = line.trim();
    if (!t) { children.push(new Paragraph({ text: "", spacing: { after: 40 } })); continue; }
    if (t === t.toUpperCase() && t.length > 4 && !t.includes("@") && !t.includes("|")) {
      children.push(new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 21, color: "333333" })], spacing: { before: 160, after: 60 } }));
    } else if (t.startsWith("-")) {
      children.push(new Paragraph({ children: [new TextRun({ text: t.replace(/^-\s*/, ""), size: 20 })], bullet: { level: 0 }, spacing: { after: 40 } }));
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: t, size: 20 })], spacing: { after: 60 } }));
    }
  }
  // AI stamp footer
  children.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: "EEEEEE" } }, spacing: { before: 400 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: AI_STAMP, size: 16, color: "AAAAAA", italics: true })], alignment: AlignmentType.CENTER }));

  const doc = new Document({ sections: [{ properties: {}, children }], styles: { default: { document: { run: { font: "Calibri" } } } } });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Scott_Henderson_Resume${company ? "_" + company.replace(/\s+/g,"_") : ""}.docx`; a.click();
  URL.revokeObjectURL(url);
}

async function downloadCoverLetterDocx(letterText, company, role) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("https://esm.sh/docx@8.5.0");
  const children = [
    new Paragraph({ children: [new TextRun({ text: "SCOTT HENDERSON", bold: true, size: 28, color: "1a1a4a" })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: "Bellingham, WA  |  scott@hendersonsolution.com  |  hendersonsolution.com", size: 18, color: "555555" })], spacing: { after: 60 } }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2F2B8F" } }, spacing: { after: 280 } }),
    new Paragraph({ children: [new TextRun({ text: TODAY, size: 20, color: "555555" })], spacing: { after: 280 } }),
  ];
  if (company) children.push(new Paragraph({ children: [new TextRun({ text: company, size: 20, bold: true })], spacing: { after: 40 } }));
  if (role) children.push(new Paragraph({ children: [new TextRun({ text: role, size: 20, color: "555555" })], spacing: { after: 280 } }));
  for (const line of letterText.split("\n")) {
    const t = line.trim();
    if (!t) { children.push(new Paragraph({ text: "", spacing: { after: 120 } })); continue; }
    children.push(new Paragraph({ children: [new TextRun({ text: t, size: 22 })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED }));
  }
  children.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: "EEEEEE" } }, spacing: { before: 400 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: AI_STAMP, size: 16, color: "AAAAAA", italics: true })], alignment: AlignmentType.CENTER }));

  const doc = new Document({ sections: [{ properties: {}, children }], styles: { default: { document: { run: { font: "Calibri" } } } } });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Scott_Henderson_CoverLetter${company ? "_" + company.replace(/\s+/g,"_") : ""}.docx`; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  input: { width: "100%", background: "#0d0e1a", border: "1px solid #2a2a3a", borderRadius: "4px", color: "#c0b8d8", fontFamily: "system-ui, sans-serif", fontSize: "13px", padding: "9px 12px", outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", background: "#0d0e1a", border: "1px solid #2a2a3a", borderRadius: "4px", color: "#c0b8d8", fontFamily: "Georgia, serif", fontSize: "13px", lineHeight: "1.7", padding: "12px", resize: "vertical", outline: "none", boxSizing: "border-box" },
  btn: { background: "#4a4abf", color: "#e0e0ff", border: "none", borderRadius: "4px", padding: "10px 24px", fontSize: "13px", fontFamily: "system-ui, sans-serif", fontWeight: "600", cursor: "pointer" },
  btnGhost: { background: "transparent", color: "#5a5870", border: "1px solid #2a2a3a", borderRadius: "4px", padding: "10px 18px", fontSize: "13px", fontFamily: "system-ui, sans-serif", cursor: "pointer" },
  label: { display: "block", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#5858a0", fontFamily: "system-ui, sans-serif", fontWeight: "600", marginBottom: "8px" },
  section: { background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e2e", borderRadius: "8px", padding: "24px", marginBottom: "20px" },
  resultBox: { background: "#0d0e1a", border: "1px solid #2a2a3a", borderRadius: "6px", padding: "20px", fontFamily: "Georgia, serif", fontSize: "14px", lineHeight: "1.8", color: "#b8b0d0", whiteSpace: "pre-wrap", wordBreak: "break-word" },
};

function Spinner({ size = 14 }) {
  return (<><span style={{ display: "inline-block", width: size, height: size, border: "2px solid #333", borderTopColor: "#7a7adf", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>);
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px", color: copied ? "#7a9a7a" : "#5a5870" }}>{copied ? "✓ Copied" : "Copy"}</button>;
}

function JDInput({ jd, setJd }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <label style={S.label}>Job Description — paste here to use across all tools</label>
      <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the full job description here…" rows={6} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#2a2a3a"} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY GATE
// ─────────────────────────────────────────────────────────────────────────────

function PrivacyGate({ onAccept }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}>
      <div style={{ background: "#111228", border: "1px solid #2a2a3a", borderRadius: "12px", width: "100%", maxWidth: "540px", padding: "36px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: "#4a4abf", fontFamily: "system-ui, sans-serif", fontWeight: "600", marginBottom: "12px" }}>Before You Begin</div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#c8c0e8", fontFamily: "system-ui, sans-serif", marginBottom: "20px", letterSpacing: "-0.5px" }}>CareerForge</div>
        <div style={{ fontSize: "13px", color: "#6a6080", fontFamily: "system-ui, sans-serif", lineHeight: "1.8", marginBottom: "24px", whiteSpace: "pre-line" }}>{PRIVACY_NOTICE}</div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e2e", borderRadius: "6px", padding: "12px 16px", marginBottom: "24px", fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#4a4860", lineHeight: "1.6" }}>
          Job descriptions are stored in your browser's local storage for session continuity. You can disable this after signing in.{" "}
          <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#5a5abf", textDecoration: "none" }}>Anthropic Privacy Policy →</a>
        </div>
        <button onClick={onAccept} style={{ ...S.btn, width: "100%", padding: "14px", fontSize: "14px" }}>I understand — continue to CareerForge</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS MODAL (decision gate)
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisModal({ score, rationale, gaps, onBuildResume, onResumeOnly, onCorrect, onNewJD }) {
  const verdict =
    score >= 8 ? { label: "Strong Match", color: "#7adf8a", rec: "This role fits your profile well. Build tailored materials and move forward with confidence." } :
    score >= 6 ? { label: "Qualified Match", color: "#c9a84c", rec: "Solid fit with addressable gaps. Review below, correct any misses, then build your materials." } :
    score >= 4 ? { label: "Partial Match", color: "#e09050", rec: "Real gaps exist. Consider whether to invest full application effort — a source-of-truth resume may be the right call." } :
                 { label: "Significant Gaps", color: "#df7a7a", rec: "This role may not be the best use of your time. If you still want to apply, a base resume is more appropriate than a tailored one." };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "#111228", border: `1px solid ${verdict.color}33`, borderRadius: "12px", width: "100%", maxWidth: "620px", maxHeight: "88vh", overflowY: "auto", padding: "36px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>

        {/* Score */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "72px", fontWeight: "700", lineHeight: 1, color: verdict.color, fontFamily: "system-ui, sans-serif" }}>{score}<span style={{ fontSize: "28px", color: "#3a3858" }}>/10</span></div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: verdict.color, fontFamily: "system-ui, sans-serif", marginTop: "8px" }}>{verdict.label}</div>
          <div style={{ fontSize: "13px", color: "#7a7090", fontFamily: "system-ui, sans-serif", marginTop: "10px", lineHeight: "1.6", maxWidth: "460px", margin: "10px auto 0" }}>{verdict.rec}</div>
          <div style={{ fontSize: "12px", color: "#4a4460", fontFamily: "system-ui, sans-serif", marginTop: "6px", fontStyle: "italic" }}>{rationale}</div>
        </div>

        {/* Bias disclaimer */}
        <div style={{ background: "rgba(74,74,191,0.05)", border: "1px solid rgba(74,74,191,0.15)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px", fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#4a4860", lineHeight: "1.5" }}>
          Score reflects keyword and experience alignment only — not your actual qualifications or suitability. Your judgment supersedes this score. Gaps flagged below may be incorrect — use the correction flow if the AI has missed something.
        </div>

        {/* Gaps */}
        {gaps.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ ...S.label, marginBottom: "10px" }}>Gaps to Review ({gaps.length})</div>
            {gaps.map((gap, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e2e", borderRadius: "6px", padding: "12px 16px", marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#c0b0d8", fontFamily: "system-ui, sans-serif", marginBottom: "3px" }}>{gap.title}</div>
                <div style={{ fontSize: "12px", color: "#5a5070", fontFamily: "system-ui, sans-serif", lineHeight: "1.6" }}>{gap.assessment}</div>
              </div>
            ))}
          </div>
        )}

        {/* Decision CTAs */}
        <div style={{ ...S.label, marginBottom: "12px" }}>What would you like to do?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={onBuildResume} style={{ background: "#4a4abf", color: "#e0e0ff", border: "none", borderRadius: "6px", padding: "14px 20px", fontSize: "14px", fontWeight: "600", fontFamily: "system-ui, sans-serif", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Build tailored resume + cover letter</span>
            <span style={{ fontSize: "12px", opacity: 0.7 }}>→ Resume tab</span>
          </button>
          <button onClick={onResumeOnly} style={{ background: "rgba(180,140,255,0.08)", color: "#b090d8", border: "1px solid rgba(180,140,255,0.25)", borderRadius: "6px", padding: "14px 20px", fontSize: "13px", fontFamily: "system-ui, sans-serif", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Apply with source-of-truth resume only</span>
            <span style={{ fontSize: "12px", opacity: 0.6 }}>no tailoring needed</span>
          </button>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button onClick={onCorrect} style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "6px", padding: "11px 16px", fontSize: "12px", fontFamily: "system-ui, sans-serif", cursor: "pointer", flex: 1 }}>Correct a gap first</button>
            <button onClick={onNewJD} style={{ background: "rgba(99,180,160,0.1)", color: "#6ab8a8", border: "1px solid rgba(99,180,160,0.3)", borderRadius: "6px", padding: "11px 16px", fontSize: "12px", fontFamily: "system-ui, sans-serif", cursor: "pointer", flex: 1 }}>Try a different JD</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAP CORRECTION PANEL
// ─────────────────────────────────────────────────────────────────────────────

function GapCorrectionPanel({ gaps, corrections, onSave, onDone }) {
  const [local, setLocal] = useState(gaps.map(g => ({ ...g, flagged: false, userCorrection: corrections[g.title] || "" })));
  const toggle = i => setLocal(p => p.map((g, idx) => idx === i ? { ...g, flagged: !g.flagged } : g));
  const update = (i, v) => setLocal(p => p.map((g, idx) => idx === i ? { ...g, userCorrection: v } : g));
  const handleSave = () => {
    const updated = {};
    local.forEach(g => { if (g.flagged && g.userCorrection.trim()) updated[g.title] = g.userCorrection.trim(); });
    onSave(updated);
  };
  return (
    <div style={{ background: "#0d0e1a", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "24px", marginBottom: "24px" }}>
      <div style={{ fontSize: "14px", fontWeight: "600", color: "#c0b8d8", fontFamily: "system-ui, sans-serif", marginBottom: "4px" }}>Correct the Gaps</div>
      <div style={{ fontSize: "12px", color: "#4a4860", fontFamily: "system-ui, sans-serif", marginBottom: "20px" }}>Flag any gap the AI got wrong. Corrections persist and feed all future analyses.</div>
      {local.map((gap, i) => (
        <div key={i} style={{ border: `1px solid ${gap.flagged ? "rgba(201,168,76,0.4)" : "#1e1e2e"}`, borderRadius: "6px", padding: "14px 16px", marginBottom: "10px", background: gap.flagged ? "rgba(201,168,76,0.04)" : "rgba(255,255,255,0.01)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <button onClick={() => toggle(i)} style={{ background: gap.flagged ? "#c9a84c" : "transparent", border: `1px solid ${gap.flagged ? "#c9a84c" : "#3a3858"}`, borderRadius: "3px", width: "18px", height: "18px", cursor: "pointer", flexShrink: 0, marginTop: "2px", fontSize: "11px", color: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center" }}>{gap.flagged ? "✓" : ""}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#c0b0d8", fontFamily: "system-ui, sans-serif", marginBottom: "3px" }}>{gap.title}</div>
              <div style={{ fontSize: "12px", color: "#4a4060", fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>{gap.assessment}</div>
              {gap.flagged && (
                <div style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a7040", fontFamily: "system-ui, sans-serif", marginBottom: "6px" }}>Your Correction</div>
                  <textarea value={gap.userCorrection} onChange={e => update(i, e.target.value)} placeholder="e.g. I DO have LSSBB — Intel internal certification plus LinkedIn Learning." rows={3} style={{ ...S.textarea, border: "1px solid #c9a84c" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button onClick={handleSave} style={{ background: "#c9a84c", color: "#0f1117", border: "none", borderRadius: "4px", padding: "10px 24px", fontSize: "13px", fontFamily: "system-ui, sans-serif", fontWeight: "600", cursor: "pointer" }}>Save Corrections</button>
        <button onClick={onDone} style={S.btnGhost}>Done</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYZE JD TAB
// ─────────────────────────────────────────────────────────────────────────────

function buildAnalysisSystem(corrections) {
  const correctionText = Object.keys(corrections).length > 0
    ? `\n\nUSER CORRECTIONS — treat as verified facts, do NOT re-flag:\n${Object.entries(corrections).map(([k,v]) => `- "${k}": ${v}`).join("\n")}`
    : "";
  return `You are a senior career strategist for ${PROFILE.name}, ${PROFILE.title}.

BACKGROUND: ${PROFILE.background}
PROOF POINTS: ${PROFILE.proofPoints.join("; ")}
CERTIFICATIONS (VERIFIED): ${PROFILE.certifications.join("; ")}
IMPLEMENTATIONS (VERIFIED, hands-on lead): ${PROFILE.implementations.join("; ")}
PRODUCT EXPERIENCE (VERIFIED): ${PROFILE.products.join("; ")}
INDUSTRIES: ${PROFILE.industries.join("; ")}
SECURITY: ${PROFILE.security.join("; ")}

CRITICAL: Before flagging any gap, check verified facts above. Only flag genuine verified gaps.${correctionText}

Return ONLY a JSON object:
{
  "score": <1-10>,
  "company": "<company name from JD>",
  "rationale": "<one sentence>",
  "keyRequirements": ["<req>","<req>","<req>","<req>","<req>"],
  "strongestAngles": [{"angle":"<angle>","why":"<why>"}],
  "topStories": [{"story":"<title>","useFor":"<question type>"}],
  "gaps": [{"title":"<gap>","assessment":"<honest 1-sentence>","framing":"<suggested framing>"}],
  "keywords": ["<kw>"]
}`;
}

function AnalyzeTab({ jd, setJd, stories, corrections, onSaveCorrections, onBuildResume, onResumeOnly, onNewJD }) {
  const [parsedScore, setParsedScore] = useState(null);
  const [parsedRationale, setParsedRationale] = useState("");
  const [parsedGaps, setParsedGaps] = useState([]);
  const [parsedCompany, setParsedCompany] = useState("");
  const [fullResult, setFullResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const apiLocked = useApiLock();

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true); setError(null); setShowFull(false); setShowModal(false);
    try {
      const storyList = stories.map((s,i) => `${i+1}. "${s.title}" — ${s.competencies.join(", ")} | Result: ${s.result}`).join("\n");
      const text = await callClaude(buildAnalysisSystem(corrections), `Stories:\n${storyList}\n\nJob Description:\n${jd}`, 3000);
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Could not parse analysis response");
      const p = JSON.parse(m[0]);
      setParsedScore(p.score); setParsedRationale(p.rationale);
      setParsedGaps(p.gaps || []); setParsedCompany(p.company || "");
      setFullResult(formatFull(p)); setShowModal(true);
    } catch (e) { setError(`Analysis failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const formatFull = (p) => [
    `FIT SCORE: ${p.score}/10\n${p.rationale}\n`,
    `KEY REQUIREMENTS:\n${p.keyRequirements?.map(r=>`• ${r}`).join("\n")||""}\n`,
    `STRONGEST ANGLES:\n${p.strongestAngles?.map(a=>`• ${a.angle}\n  → ${a.why}`).join("\n")||""}\n`,
    `TOP STORIES:\n${p.topStories?.map(s=>`• "${s.story}"\n  → ${s.useFor}`).join("\n")||""}\n`,
    p.gaps?.length ? `GAPS:\n${p.gaps.map(g=>`• ${g.title}\n  ${g.assessment}\n  Framing: ${g.framing}`).join("\n\n")}\n` : "GAPS: None identified.\n",
    `KEYWORDS: ${p.keywords?.join(", ")||""}`,
  ].join("\n");

  const handleSaveCorrections = (nc) => { onSaveCorrections({ ...corrections, ...nc }); setShowCorrections(false); setShowModal(false); };

  return (
    <div>
      {showModal && (
        <AnalysisModal
          score={parsedScore} rationale={parsedRationale} gaps={parsedGaps}
          onBuildResume={() => { setShowModal(false); setShowFull(true); onBuildResume(parsedCompany); }}
          onResumeOnly={() => { setShowModal(false); onResumeOnly(parsedCompany); }}
          onCorrect={() => { setShowModal(false); setShowCorrections(true); }}
          onNewJD={() => { setShowModal(false); onNewJD(); }}
        />
      )}
      <JDInput jd={jd} setJd={setJd} />
      {Object.keys(corrections).length > 0 && (
        <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "4px", padding: "10px 14px", marginBottom: "16px", fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#8a7040", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✓ {Object.keys(corrections).length} correction{Object.keys(corrections).length > 1?"s":""} active — AI will not re-flag these</span>
          <button onClick={() => setShowCorrections(true)} style={{ background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: "12px" }}>View / edit</button>
        </div>
      )}
      <button onClick={run} disabled={!jd.trim() || loading || apiLocked} style={{ ...S.btn, opacity: !jd.trim() || loading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner /> Analyzing…</> : "Analyze JD"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "system-ui, sans-serif", fontSize: "13px", marginBottom: "16px", wordBreak: "break-word" }}>{error}</div>}
      {showCorrections && parsedGaps.length > 0 && <GapCorrectionPanel gaps={parsedGaps} corrections={corrections} onSave={handleSaveCorrections} onDone={() => setShowCorrections(false)} />}
      {showFull && fullResult && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Full Analysis</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={fullResult} />
              {parsedGaps.length > 0 && <button onClick={() => setShowCorrections(!showCorrections)} style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px", color: "#c9a84c", borderColor: "rgba(201,168,76,0.3)" }}>Correct gaps</button>}
            </div>
          </div>
          <div style={S.resultBox}>{fullResult}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUME TAB
// ─────────────────────────────────────────────────────────────────────────────

function ResumeTab({ jd, setJd, resumeOnly, onDownloaded }) {
  const [resume, setResume] = useState(RESUME_BASELINE);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const apiLocked = useApiLock();

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true); setError(null); setResult("");
    try {
      const system = `You are a senior executive resume strategist for ${PROFILE.name}, ${PROFILE.title}.
Background: ${PROFILE.background}
Certifications: ${PROFILE.certifications.join("; ")}
Implementations: ${PROFILE.implementations.join("; ")}
Proof points: ${PROFILE.proofPoints.join("; ")}

Output:
1. SUMMARY REWRITE — tailored 3-sentence summary for this role
2. TOP 5 BULLET EDITS — specific bullets to strengthen, with revised text
3. BULLETS TO PROMOTE — what to move higher
4. KEYWORDS TO ADD — JD phrases missing from resume
5. WHAT TO DE-EMPHASIZE — anything that doesn't serve this application

Give actual rewritten text, not just advice.`;
      const text = await callClaude(system, `Job Description:\n${jd}\n\nResume:\n${resume}`, 2500);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const m = jd.match(/(?:at|for|with|joining)\s+([A-Z][A-Za-z\s&,.]+?)(?:\s+is|\s+are|\s+we|\.|,)/);
      await downloadResumeDocx(resume, result, m ? m[1].trim() : "");
      if (onDownloaded) onDownloaded();
    } catch (e) { setError(`Download failed: ${e.message}`); }
    finally { setDownloading(false); }
  };

  return (
    <div>
      {resumeOnly && (
        <div style={{ background: "rgba(180,140,255,0.08)", border: "1px solid rgba(180,140,255,0.2)", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#b090d8" }}>
          Source-of-truth path — use your base resume as-is or make minimal edits. Tailoring optional.
        </div>
      )}
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ ...S.label, margin: 0 }}>Resume Baseline</label>
          <button onClick={() => setShowResume(!showResume)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>{showResume ? "Hide" : "Edit baseline"}</button>
        </div>
        {showResume && <textarea value={resume} onChange={e => setResume(e.target.value)} rows={12} style={S.textarea} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#2a2a3a"} />}
      </div>
      <button onClick={run} disabled={!jd.trim() || loading || apiLocked} style={{ ...S.btn, opacity: !jd.trim()||loading||apiLocked?0.5:1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner />Tailoring…</> : "Tailor Resume"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Resume Tailoring</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={result} />
              <button onClick={handleDownload} disabled={downloading} style={{ ...S.btn, padding: "5px 14px", fontSize: "11px", background: downloading?"#2a2a3a":"#3a5abf", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading?<><Spinner />…</>:"⬇ Download .docx"}
              </button>
            </div>
          </div>
          <div style={S.resultBox}>{result}</div>
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#3a3848", fontFamily: "system-ui, sans-serif", fontStyle: "italic" }}>
            Download includes AI attribution stamp. Review all suggestions before sending.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER LETTER TAB
// ─────────────────────────────────────────────────────────────────────────────

function CoverLetterTab({ jd, setJd, onDownloaded }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const apiLocked = useApiLock();

  useEffect(() => {
    if (!jd.trim() || (company && role)) return;
    const t = setTimeout(async () => {
      setExtracting(true);
      try {
        const text = await callClaude(
          `Extract company name and job title from a job description. Return ONLY JSON: {"company":"...","role":"..."}. Empty string if not found.`,
          jd.slice(0, 1500), 200
        );
        const m = text.match(/\{[\s\S]*?\}/);
        if (m) { const p = JSON.parse(m[0]); if (p.company && !company) setCompany(p.company); if (p.role && !role) setRole(p.role); }
      } catch {} finally { setExtracting(false); }
    }, 800);
    return () => clearTimeout(t);
  }, [jd]);

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true); setError(null); setResult("");
    try {
      const system = `You are writing a cover letter for ${PROFILE.name}, ${PROFILE.title}.
Background: ${PROFILE.background}
Proof points: ${PROFILE.proofPoints.join("; ")}
Voice: Direct, confident, not sycophantic. Lead with business impact. Specific proof points over generic claims.
One strong opening hook — not "I am writing to apply for…"
3 tight paragraphs maximum. Close with forward momentum, not "I look forward to hearing from you."
Sign off: Scott Henderson
Write a complete ready-to-send letter. No placeholders or commentary.`;
      const text = await callClaude(system, `Company: ${company||"the company"}\nRole: ${role||"this position"}\n${notes?`Context: ${notes}\n`:""}\nJD:\n${jd}`, 1500);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadCoverLetterDocx(result, company, role); if (onDownloaded) onDownloaded(); }
    catch (e) { setError(`Download failed: ${e.message}`); }
    finally { setDownloading(false); }
  };

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div>
          <label style={S.label}>Company Name {extracting && <span style={{ color: "#4a4abf", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>extracting…</span>}</label>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" style={S.input} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#2a2a3a"} />
        </div>
        <div>
          <label style={S.label}>Role Title</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. VP of Technology" style={S.input} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#2a2a3a"} />
        </div>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Additional Context <span style={{ color: "#3a3858", textTransform: "none", letterSpacing: 0 }}>optional</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Referred by John Smith. Emphasize CCR governance work…" rows={3} style={S.textarea} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#2a2a3a"} />
      </div>
      <button onClick={run} disabled={!jd.trim()||loading||apiLocked} style={{ ...S.btn, opacity: !jd.trim()||loading||apiLocked?0.5:1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading?<><Spinner />Drafting…</>:"Draft Cover Letter"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Cover Letter Draft</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={result} />
              <button onClick={handleDownload} disabled={downloading} style={{ ...S.btn, padding: "5px 14px", fontSize: "11px", background: downloading?"#2a2a3a":"#3a5abf", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading?<><Spinner />…</>:"⬇ Download .docx"}
              </button>
            </div>
          </div>
          <div style={S.resultBox}>{result}</div>
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#3a3848", fontFamily: "system-ui, sans-serif", fontStyle: "italic" }}>
            Download includes AI attribution stamp and date. Review before sending.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERVIEW PREP TAB
// ─────────────────────────────────────────────────────────────────────────────

function InterviewPrepTab({ jd, setJd, stories }) {
  const [round, setRound] = useState("screening");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiLocked = useApiLock();

  const run = async () => {
    if (!jd.trim()) return;
    setLoading(true); setError(null); setResult("");
    try {
      const storyCtx = stories.map(s => `"${s.title}": ${s.result}`).join("\n");
      const system = `You are an executive interview coach preparing ${PROFILE.name} for a ${round} interview.
Background: ${PROFILE.background}
Proof points: ${PROFILE.proofPoints.join("; ")}
Stories: ${storyCtx}

Generate:
1. LIKELY QUESTIONS — 8 questions this interviewer will probably ask
2. ANGLE FOR EACH — the specific story or proof point to lead with, and the key message to land
3. TRICKY QUESTIONS — 3 harder questions (gaps, concerns, failures) with suggested honest framings
4. QUESTIONS TO ASK — 4 sharp questions Scott should ask the interviewer

Be specific to Scott's background. No generic advice.`;
      const text = await callClaude(system, `Round: ${round}\n\nJD:\n${jd}`, 3000);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Interview Round</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["screening","hiring manager","panel","executive","final"].map(r => (
            <button key={r} onClick={() => setRound(r)} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", textTransform: "capitalize", background: round===r?"rgba(99,140,255,0.15)":"transparent", color: round===r?"#8aacff":"#5a5870", borderColor: round===r?"#4a6abf":"#2a2a3a" }}>{r}</button>
          ))}
        </div>
      </div>
      <button onClick={run} disabled={!jd.trim()||loading||apiLocked} style={{ ...S.btn, opacity: !jd.trim()||loading||apiLocked?0.5:1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading?<><Spinner />Preparing…</>:`Prep for ${round} interview`}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Interview Prep — {round}</div>
            <CopyBtn text={result} />
          </div>
          <div style={S.resultBox}>{result}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEARCH TAB
// ─────────────────────────────────────────────────────────────────────────────

const RESEARCH_STEPS = [
  { key: "overview",       label: "Company overview & structure",          query: c => `${c} company overview mission revenue employees structure 2024 2025` },
  { key: "leadership",     label: "Leadership & org structure",             query: c => `${c} executive leadership team CEO CTO VP org structure 2025` },
  { key: "financials",     label: "Financial health & stability",           query: c => `${c} financial results revenue growth funding stability 2024 2025` },
  { key: "transformation", label: "Transformation & strategic initiatives", query: c => `${c} digital transformation technology strategy initiatives 2024 2025` },
];
const OPTIONAL_STEPS = [
  { key: "news",    label: "＋ Recent News",     query: c => `${c} news announcements 2025` },
  { key: "culture", label: "＋ Culture Signals", query: c => `${c} company culture values employee reviews Glassdoor 2025` },
];

function parseSources(text) {
  const m = text?.match(/Sources?:\s*(.+)/i);
  if (!m) return [];
  return m[1].split(",").map(s => s.trim()).filter(s => s.startsWith("http"));
}

function ResearchTab({ company, triggered }) {
  const [results, setResults] = useState({});
  const [steps, setSteps] = useState({});
  const [hasRun, setHasRun] = useState(false);
  const [override, setOverride] = useState("");
  const [confirmPending, setConfirmPending] = useState(false);
  const apiLocked = useApiLock();

  const effective = override || company;

  const runStep = async (step) => {
    if (!effective) return;
    setSteps(p => ({ ...p, [step.key]: "loading" }));
    try {
      const r = await callClaudeSearch(effective, step.query(effective));
      setResults(p => ({ ...p, [step.key]: r }));
      setSteps(p => ({ ...p, [step.key]: "done" }));
    } catch (e) {
      setResults(p => ({ ...p, [step.key]: `Search failed: ${e.message}` }));
      setSteps(p => ({ ...p, [step.key]: "error" }));
    }
  };

  const runAll = async () => {
    setHasRun(true); setConfirmPending(false);
    for (const step of RESEARCH_STEPS) await runStep(step);
  };

  useEffect(() => {
    if (triggered && effective && !hasRun && !confirmPending) setConfirmPending(true);
  }, [triggered, effective]);

  const allCoreDone = RESEARCH_STEPS.every(s => steps[s.key] === "done" || steps[s.key] === "error");
  const anyLoading = Object.values(steps).some(s => s === "loading");

  const ResultCard = ({ step }) => {
    const src = parseSources(results[step.key] || "");
    const body = (results[step.key] || "").replace(/Sources?:.*$/is, "").trim();
    return (
      <div style={{ ...S.section, marginBottom: "16px" }}>
        <div style={{ ...S.label, color: "#5858a0", marginBottom: "12px" }}>{step.label}</div>
        <div style={{ fontSize: "14px", lineHeight: "1.8", fontFamily: "Georgia, serif", color: steps[step.key]==="error"?"#c06060":"#b0a8c8", marginBottom: src.length?"12px":0 }}>{body}</div>
        {src.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "10px", borderTop: "1px solid #1a1a2a" }}>
            <span style={{ fontSize: "10px", color: "#3a3858", fontFamily: "system-ui, sans-serif", letterSpacing: "1px", textTransform: "uppercase", alignSelf: "center" }}>Sources</span>
            {src.map((url, i) => {
              let host = url;
              try { host = new URL(url).hostname.replace("www.", ""); } catch {}
              return <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#4a4abf", fontFamily: "system-ui, sans-serif", textDecoration: "none", background: "rgba(74,74,191,0.08)", padding: "2px 8px", borderRadius: "3px", border: "1px solid rgba(74,74,191,0.2)" }}>{host} ↗</a>;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Safety scope note */}
      <div style={{ background: "rgba(74,74,191,0.06)", border: "1px solid rgba(74,74,191,0.18)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px", fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#5858a0", lineHeight: "1.6" }}>
        <strong style={{ color: "#6868b0" }}>Scope:</strong> Only company name is used in search queries — no personal information or resume content is included. Results are AI-synthesized from public sources. Verify all claims before use in interviews.
      </div>

      {/* Confirm gate */}
      {confirmPending && !hasRun && (
        <div style={{ ...S.section, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.04)", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#c9a84c", fontFamily: "system-ui, sans-serif", marginBottom: "8px" }}>Ready to research: {effective}</div>
          <div style={{ fontSize: "13px", color: "#6a6040", fontFamily: "system-ui, sans-serif", lineHeight: "1.6", marginBottom: "16px" }}>
            The agent will run {RESEARCH_STEPS.length} web searches: overview, leadership, financials, and transformation initiatives. Each result will be sourced and cited.
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={runAll} disabled={apiLocked} style={{ ...S.btn, display: "flex", alignItems: "center", gap: "8px" }}>{apiLocked?<><Spinner />Running…</>:"Confirm — Run Research"}</button>
            <button onClick={() => setConfirmPending(false)} style={S.btnGhost}>Not now</button>
          </div>
        </div>
      )}

      {/* Company input */}
      <div style={{ marginBottom: "24px" }}>
        <label style={S.label}>Company {company && !override && <span style={{ color: "#4a4abf", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>from JD: {company}</span>}</label>
        <div style={{ display: "flex", gap: "10px" }}>
          <input value={override} onChange={e => setOverride(e.target.value)} placeholder={company || "Enter company name…"} style={{ ...S.input, flex: 1 }} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#2a2a3a"} />
          <button onClick={() => { setResults({}); setSteps({}); setHasRun(false); setConfirmPending(false); setTimeout(runAll, 50); }} disabled={!effective||anyLoading||apiLocked} style={{ ...S.btn, opacity: !effective||anyLoading||apiLocked?0.5:1, display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            {anyLoading?<><Spinner />Researching…</>:hasRun?"Re-run":"Run Research"}
          </button>
        </div>
      </div>

      {/* Step progress */}
      {hasRun && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ ...S.label, marginBottom: "10px" }}>Agent Steps</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {RESEARCH_STEPS.map(step => (
              <div key={step.key} style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "system-ui, sans-serif", fontSize: "12px" }}>
                <span style={{ width: "16px", textAlign: "center", flexShrink: 0, color: steps[step.key]==="done"?"#7adf8a":steps[step.key]==="error"?"#df7a7a":steps[step.key]==="loading"?"#c9a84c":"#3a3858" }}>
                  {steps[step.key]==="loading"?<Spinner size={10}/>:steps[step.key]==="done"?"✓":steps[step.key]==="error"?"✗":"○"}
                </span>
                <span style={{ color: steps[step.key]==="done"?"#8888b8":"#3a3858" }}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {RESEARCH_STEPS.filter(s => results[s.key]).map(step => <ResultCard key={step.key} step={step} />)}

      {allCoreDone && (
        <div style={{ marginTop: "8px" }}>
          <div style={{ ...S.label, marginBottom: "10px" }}>Optional Research</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
            {OPTIONAL_STEPS.map(step => (
              <button key={step.key} onClick={() => runStep(step)} disabled={steps[step.key]==="loading"||steps[step.key]==="done"||apiLocked} style={{ ...S.btnGhost, fontSize: "12px", background: steps[step.key]==="done"?"rgba(99,140,255,0.1)":"transparent", color: steps[step.key]==="done"?"#8aacff":steps[step.key]==="loading"?"#c9a84c":"#6ab8a8", borderColor: steps[step.key]==="done"?"#4a6abf":"rgba(99,180,160,0.4)", display: "flex", alignItems: "center", gap: "6px" }}>
                {steps[step.key]==="loading"?<><Spinner size={10}/>Loading…</>:step.label}
              </button>
            ))}
          </div>
          {OPTIONAL_STEPS.filter(s => results[s.key]).map(step => <ResultCard key={step.key} step={step} />)}
        </div>
      )}

      {!hasRun && !confirmPending && !effective && (
        <div style={{ padding: "48px", textAlign: "center", border: "1px dashed #1e1e2e", borderRadius: "8px", color: "#3a3858", fontFamily: "system-ui, sans-serif", fontSize: "14px" }}>
          Complete your application materials — research unlocks automatically.<br />
          Or enter a company name above to run research directly.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY TAB
// ─────────────────────────────────────────────────────────────────────────────

function Tag({ label, color="#2a2a3a", textColor="#8880a0" }) {
  return <span style={{ background: color, color: textColor, borderRadius: "3px", padding: "2px 8px", fontSize: "11px", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>{label}</span>;
}

function CompBadge({ label, active, onClick }) {
  return <button onClick={onClick} style={{ background: active?"rgba(99,140,255,0.18)":"rgba(255,255,255,0.03)", color: active?"#8aacff":"#5a5870", border: `1px solid ${active?"#4a6abf":"#2a2a3a"}`, borderRadius: "4px", padding: "5px 12px", fontSize: "12px", fontFamily: "system-ui, sans-serif", cursor: "pointer" }}>{label}</button>;
}

function StoryCard({ story, onEdit, onDelete, onStar }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${story.starred?"rgba(99,140,255,0.3)":"#1e1e2e"}`, borderRadius: "8px", marginBottom: "12px", overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", background: expanded?"rgba(99,140,255,0.04)":"transparent" }}>
        <button onClick={e => { e.stopPropagation(); onStar(story.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0", marginTop: "1px", flexShrink: 0 }}>{story.starred?"⭐":"☆"}</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#d8d0f0", fontFamily: "system-ui, sans-serif", marginBottom: "6px" }}>{story.title}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Tag label={story.company} color="rgba(99,140,255,0.12)" textColor="#7a9aef" />
            <Tag label={story.role} />
            {story.competencies.map(c => <Tag key={c} label={c} color="rgba(180,140,255,0.1)" textColor="#b090d0" />)}
          </div>
        </div>
        <div style={{ color: "#3e3a4e", fontSize: "18px", flexShrink: 0 }}>{expanded?"▲":"▼"}</div>
      </div>
      {expanded && (
        <div style={{ padding: "0 20px 20px 48px", borderTop: "1px solid #1a1a2a" }}>
          {[{l:"S — Situation",k:"situation",c:"#6b8080"},{l:"T — Task",k:"task",c:"#6b7a80"},{l:"A — Action",k:"action",c:"#6b6880"},{l:"R — Result",k:"result",c:"#7a8060"}].map(({l,k,c}) => (
            <div key={k} style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: c, fontFamily: "system-ui, sans-serif", fontWeight: "600", marginBottom: "6px" }}>{l}</div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#b0a8c0", fontFamily: "Georgia, serif" }}>{story[k]}</div>
            </div>
          ))}
          {story.tags?.length > 0 && <div style={{ marginTop: "16px", display: "flex", gap: "6px", flexWrap: "wrap" }}>{story.tags.map(t => <Tag key={t} label={`#${t}`} color="rgba(255,255,255,0.04)" textColor="#4a4860" />)}</div>}
          <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
            <button onClick={() => onEdit(story)} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px" }}>✏️ Edit</button>
            <button onClick={() => onDelete(story.id)} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", color: "#6a3a3a", borderColor: "#2e1e1e" }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function generateId() { return `story-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

function StoryEditor({ story, onSave, onCancel }) {
  const blank = { id: generateId(), title: "", company: "", role: "", competencies: [], situation: "", task: "", action: "", result: "", tags: "", starred: false };
  const [form, setForm] = useState(story ? { ...story, tags: story.tags?.join(", ") || "" } : blank);
  const field = (key, label, multi=false, hint="") => (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ ...S.label, color: "#6860a0" }}>{label}{hint&&<span style={{ color: "#3e3a50", marginLeft: "8px", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>{hint}</span>}</label>
      {multi ? <textarea value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} rows={4} style={S.textarea} onFocus={e=>e.target.style.borderColor="#4a4abf"} onBlur={e=>e.target.style.borderColor="#2a2a3a"} /> : <input type="text" value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} style={S.input} onFocus={e=>e.target.style.borderColor="#4a4abf"} onBlur={e=>e.target.style.borderColor="#2a2a3a"} />}
    </div>
  );
  return (
    <div style={{ background: "#0d0e1a", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "28px" }}>
      <div style={{ fontSize: "16px", fontWeight: "600", color: "#c0b8d8", fontFamily: "system-ui, sans-serif", marginBottom: "24px" }}>{story?"Edit Story":"Add New Story"}</div>
      {field("title","Story Title")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}><div>{field("company","Company")}</div><div>{field("role","Role / Title")}</div></div>
      <div style={{ marginBottom: "18px" }}>
        <label style={{ ...S.label, color: "#6860a0" }}>Competencies</label>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {COMPETENCIES.map(c => <CompBadge key={c} label={c} active={form.competencies.includes(c)} onClick={() => setForm(f=>({...f,competencies:f.competencies.includes(c)?f.competencies.filter(x=>x!==c):[...f.competencies,c]}))} />)}
        </div>
      </div>
      {field("situation","S — Situation",true,"Context")}
      {field("task","T — Task",true,"Your responsibility")}
      {field("action","A — Action",true,"What you did")}
      {field("result","R — Result",true,"Quantified outcomes")}
      {field("tags","Tags",false,"comma-separated")}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={() => { if(!form.title.trim())return; onSave({...form,tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean)}); }} style={S.btn}>Save Story</button>
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
  const handleSave = s => { setStories(p => p.find(x=>x.id===s.id)?p.map(x=>x.id===s.id?s:x):[...p,s]); setEditing(null); };
  const handleDelete = id => { if(window.confirm("Delete this story?")) setStories(p=>p.filter(s=>s.id!==id)); };
  const handleStar = id => setStories(p=>p.map(s=>s.id===id?{...s,starred:!s.starred}:s));
  const filtered = stories.filter(s => {
    if (filterStarred && !s.starred) return false;
    if (filterComp && !s.competencies.includes(filterComp)) return false;
    if (search) { const q=search.toLowerCase(); return s.title.toLowerCase().includes(q)||s.company.toLowerCase().includes(q)||s.tags?.some(t=>t.toLowerCase().includes(q))||s.result.toLowerCase().includes(q); }
    return true;
  });
  if (editing) return <StoryEditor story={editing==="new"?null:editing} onSave={handleSave} onCancel={()=>setEditing(null)} />;
  return (
    <div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stories…" style={{ ...S.input, width: "200px" }} onFocus={e=>e.target.style.borderColor="#4a4abf"} onBlur={e=>e.target.style.borderColor="#2a2a3a"} />
        <button onClick={()=>setFilterStarred(!filterStarred)} style={{ ...S.btnGhost, fontSize: "12px", background: filterStarred?"rgba(99,140,255,0.15)":"transparent", color: filterStarred?"#8aacff":"#4a4860", borderColor: filterStarred?"#4a6abf":"#2a2a3a" }}>⭐ Starred</button>
        <button onClick={()=>setEditing("new")} style={{ ...S.btn, marginLeft: "auto", padding: "8px 18px" }}>+ Add Story</button>
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        <CompBadge label="All" active={!filterComp} onClick={()=>setFilterComp(null)} />
        {COMPETENCIES.map(c=><CompBadge key={c} label={c} active={filterComp===c} onClick={()=>setFilterComp(filterComp===c?null:c)} />)}
      </div>
      {filtered.length===0?(
        <div style={{ color: "#3a3858", fontFamily: "system-ui, sans-serif", fontSize: "14px", padding: "40px", textAlign: "center", border: "1px dashed #1e1e2e", borderRadius: "8px" }}>
          No stories match.{" "}<button onClick={()=>{setFilterComp(null);setFilterStarred(false);setSearch("");}} style={{ background: "none", border: "none", color: "#5a5aaf", cursor: "pointer", fontSize: "14px" }}>Clear filters</button>
        </div>
      ) : filtered.map(s=><StoryCard key={s.id} story={s} onEdit={setEditing} onDelete={handleDelete} onStar={handleStar} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function CareerForge() {
  const [activeTab, setActiveTab] = useState("Library");
  const [stories, setStories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [jd, setJd] = useState("");
  const [corrections, setCorrections] = useState({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [saveJD, setSaveJD] = useState(true);
  const [researchCompany, setResearchCompany] = useState("");
  const [researchTriggered, setResearchTriggered] = useState(false);

  // Flow gates
  const [proceeded, setProceeded] = useState(false);
  const [resumeOnly, setResumeOnly] = useState(false);
  const [resumeDownloaded, setResumeDownloaded] = useState(false);
  const [coverDownloaded, setCoverDownloaded] = useState(false);

  const materialsComplete = resumeDownloaded && (coverDownloaded || resumeOnly);
  const sessionCost = useSessionCost();
  const apiLocked = useApiLock();

  useEffect(() => {
    if (sessionStorage.getItem("cf:privacy")) setPrivacyAccepted(true);
    Promise.all([
      storageGet("careerforge:scott:stories"),
      storageGet("careerforge:scott:jd"),
      storageGet("careerforge:scott:corrections"),
      storageGet("careerforge:scott:saveJD"),
    ]).then(([s, j, c, sj]) => {
      setStories(s || SEED_STORIES);
      const pref = sj !== null ? sj : true;
      setSaveJD(pref);
      if (pref) setJd(j || "");
      setCorrections(c || {});
      setLoaded(true);
    });
  }, []);

  useEffect(() => { if (loaded) storageSet("careerforge:scott:stories", stories); }, [stories, loaded]);
  useEffect(() => { if (loaded && saveJD) storageSet("careerforge:scott:jd", jd); else if (loaded && !saveJD) storageSet("careerforge:scott:jd", ""); }, [jd, loaded, saveJD]);
  useEffect(() => { if (loaded) storageSet("careerforge:scott:corrections", corrections); }, [corrections, loaded]);
  useEffect(() => { if (loaded) storageSet("careerforge:scott:saveJD", saveJD); }, [saveJD, loaded]);

  // Auto-navigate on gate changes
  useEffect(() => { if (resumeDownloaded && !coverDownloaded && !resumeOnly) setActiveTab("Cover Letter"); }, [resumeDownloaded]);
  useEffect(() => { if (materialsComplete) { setResearchTriggered(true); } }, [materialsComplete]);

  const handleNewJD = () => {
    setJd(""); setProceeded(false); setResumeOnly(false);
    setResumeDownloaded(false); setCoverDownloaded(false);
    setResearchTriggered(false); setResearchCompany("");
    setActiveTab("Analyze JD");
  };

  const tabConfig = [
    { name: "Library",        unlocked: true },
    { name: "Analyze JD",     unlocked: true },
    { name: "Resume",         unlocked: proceeded || resumeOnly },
    { name: "Cover Letter",   unlocked: resumeDownloaded && !resumeOnly },
    { name: "Interview Prep", unlocked: materialsComplete },
    { name: "Research",       unlocked: materialsComplete },
  ];

  const starredCount = stories.filter(s => s.starred).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0b14", color: "#d0c8e8", fontFamily: "Georgia, serif" }}>
      {!privacyAccepted && <PrivacyGate onAccept={() => { sessionStorage.setItem("cf:privacy","1"); setPrivacyAccepted(true); }} />}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d0e1f 0%, #111228 100%)", borderBottom: "1px solid #1e1e2e", padding: "20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700", color: "#c8c0e8", letterSpacing: "-0.5px" }}>CareerForge</span>
              <span style={{ fontSize: "10px", letterSpacing: "3px", color: "#4a4abf", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>Job Search Intelligence</span>
            </div>
            <div style={{ fontSize: "12px", color: "#3a3858", fontFamily: "system-ui, sans-serif", marginTop: "3px" }}>
              {PROFILE.name} · {PROFILE.title}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontFamily: "system-ui, sans-serif" }}>
            {/* Session cost */}
            {sessionCost > 0 && (
              <div style={{ fontSize: "11px", color: "#3a3858", textAlign: "right" }}>
                <span style={{ color: "#4a4860" }}>~${sessionCost.toFixed(4)}</span> session
              </div>
            )}

            {/* JD save toggle */}
            <button onClick={() => setSaveJD(!saveJD)} title={saveJD?"JD is being saved across sessions — click to disable":"JD is not being saved"} style={{ background: "transparent", border: `1px solid ${saveJD?"#2a2a4a":"#2a2a2a"}`, borderRadius: "4px", padding: "4px 10px", fontSize: "11px", color: saveJD?"#5858a0":"#3a3848", cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>
              {saveJD?"💾 JD saving on":"💾 JD saving off"}
            </button>

            {/* API lock indicator */}
            {apiLocked && <div style={{ fontSize: "11px", color: "#c9a84c", display: "flex", alignItems: "center", gap: "6px" }}><Spinner size={10} />AI running…</div>}

            {(proceeded || resumeOnly) && (
              <button onClick={handleNewJD} style={{ background: "transparent", border: "1px solid #2a2a3a", color: "#4a4860", borderRadius: "4px", padding: "5px 12px", fontSize: "11px", fontFamily: "system-ui, sans-serif", cursor: "pointer" }}>↺ New Application</button>
            )}
            <span style={{ fontSize: "12px", color: "#3a3858" }}>{stories.length} stories · {starredCount} starred</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginTop: "20px", flexWrap: "wrap" }}>
          {tabConfig.map(({ name, unlocked }) => {
            const isActive = activeTab === name;
            const done = (name==="Resume"&&resumeDownloaded)||(name==="Cover Letter"&&coverDownloaded);
            return (
              <button key={name} onClick={() => unlocked && setActiveTab(name)} style={{ background: isActive?"rgba(99,140,255,0.15)":"transparent", color: isActive?"#8aacff":unlocked?"#4a4860":"#2a2840", border: `1px solid ${isActive?"#4a6abf":"transparent"}`, borderBottom: isActive?"1px solid #0a0b14":"1px solid transparent", borderRadius: "4px 4px 0 0", padding: "8px 16px", fontSize: "13px", fontFamily: "system-ui, sans-serif", cursor: unlocked?"pointer":"default", marginBottom: isActive?"-1px":"0", display: "flex", alignItems: "center", gap: "5px" }}>
                {name}
                {!unlocked && <span style={{ fontSize: "10px", opacity: 0.4 }}>🔒</span>}
                {done && <span style={{ fontSize: "10px", color: "#7adf8a" }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 40px", maxWidth: "900px" }}>
        {!loaded ? (
          <div style={{ color: "#3a3858", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", gap: "10px" }}><Spinner />Loading…</div>
        ) : (
          <>
            {activeTab === "Library" && <LibraryTab stories={stories} setStories={setStories} />}
            {activeTab === "Analyze JD" && (
              <AnalyzeTab
                jd={jd} setJd={setJd} stories={stories}
                corrections={corrections} onSaveCorrections={setCorrections}
                onBuildResume={company => { setResearchCompany(company); setProceeded(true); setActiveTab("Resume"); }}
                onResumeOnly={company => { setResearchCompany(company); setResumeOnly(true); setActiveTab("Resume"); }}
                onNewJD={handleNewJD}
              />
            )}
            {activeTab === "Resume" && (proceeded || resumeOnly) && (
              <ResumeTab jd={jd} setJd={setJd} resumeOnly={resumeOnly} onDownloaded={() => setResumeDownloaded(true)} />
            )}
            {activeTab === "Cover Letter" && resumeDownloaded && !resumeOnly && (
              <CoverLetterTab jd={jd} setJd={setJd} onDownloaded={() => setCoverDownloaded(true)} />
            )}
            {activeTab === "Interview Prep" && materialsComplete && (
              <InterviewPrepTab jd={jd} setJd={setJd} stories={stories} />
            )}
            {activeTab === "Research" && materialsComplete && (
              <ResearchTab company={researchCompany} triggered={researchTriggered} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
