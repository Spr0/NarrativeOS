import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SYSTEM — multi-user, upload-driven
// ─────────────────────────────────────────────────────────────────────────────

// Seed profiles — contact info populated from resume upload, resume text from upload
// Scott's profile has hardcoded AI context fields that don't come from a resume
const SEED_PROFILES = {
  scott: {
    id: "scott",
    displayName: "Scott Henderson",
    title: "Enterprise Transformation Leader",
    // Contact fields — populated from resume upload; these are fallbacks
    name: "Scott Henderson",
    phone: "520-490-4797",
    email: "scott23henderson@gmail.com",
    address: "Bellingham, WA",
    linkedin: "LinkedIn.com/in/mrscotthenderson",
    website: "hendersonsolution.com",
    // Resume text — populated from upload
    resumeText: "",
    resumeUploaded: false,
    // AI context — Scott-specific, not parsed from resume
    background: `Senior transformation leader with 15+ years driving enterprise-scale change at grid-scale renewable energy companies and Fortune 500 technology organizations. VP of Technology at EDF Renewables and Cypress Creek Renewables with full P&L ownership — budget, revenue forecasting, margin management, and board/C-suite reporting. Earlier career as enterprise agile coach at Nike and Intel.`,
    proofPoints: [
      "$28M annualized EBITDA improvement at EDF Renewables through platform consolidation",
      "27% reduction in compliance-related fines at CCR via AI governance implementation",
      "$13M SaaS catalog identified through ledger mining → 15% OPEX reduction",
      "Full P&L ownership at both CCR and EDF — budget, forecasting, margin, board reporting",
      "Enterprise agile coach at Nike and Intel — transformation at scale",
    ],
    certifications: [
      "PMP — Project Management Professional (VERIFIED)",
      "SAFe SPC — SAFe Program Consultant (VERIFIED)",
      "CSM — Certified Scrum Master (VERIFIED)",
      "CSPO — Certified Scrum Product Owner (VERIFIED)",
      "PMI-ACP — PMI Agile Certified Practitioner (VERIFIED)",
      "Lean Six Sigma Black Belt — Intel internal + LinkedIn Learning (VERIFIED — do not flag as gap)",
      "ITIL v4 Foundation (VERIFIED)",
      "Certified Chief AI Officer — 2025 (VERIFIED)",
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
      "Nike B2B Supply Chain Platform (OIA — Oregon International Airfreight) — full product lifecycle from whiteboard to production. B2B platform for factories to order airbags and manage supply chain. ~$600M revenue impact in first year. Led OCM and global factory adoption. Still in active use. (VERIFIED PRODUCT/PLATFORM EXPERIENCE — not inspection, ordering and supply chain)",
    ],
    industries: [
      "Renewable energy (grid-scale solar, wind, storage) — EDF Renewables, Cypress Creek Renewables",
      "Consumer products / global manufacturing — Nike (factory ops, airbag inspection platform)",
      "Semiconductor / technology manufacturing — Intel",
      "Regulated, capital-intensive, compliance-heavy industries across all roles",
    ],
    security: ["US Citizen — no impediments to security clearance. Can commence process immediately upon offer."],
  },
  joshua: {
    id: "joshua",
    displayName: "Joshua Henderson",
    title: "QA / Manufacturing Inspections",
    name: "Joshua Henderson",
    phone: "", email: "", address: "", linkedin: "", website: "",
    resumeText: "", resumeUploaded: false,
    background: "QA and inspections professional in manufacturing settings.",
    proofPoints: [], certifications: [], implementations: [], products: [], industries: [], security: [],
  },
  aaron: {
    id: "aaron",
    displayName: "Aaron Henderson",
    title: "IT / Networking — MSP Help Desk",
    name: "Aaron Henderson",
    phone: "", email: "", address: "", linkedin: "", website: "",
    resumeText: "", resumeUploaded: false,
    background: "IT professional with help desk experience at an MSP, pursuing networking certifications.",
    proofPoints: [], certifications: [], implementations: [], products: [], industries: [], security: [],
  },
};

const SEED_STORIES_BY_PROFILE = {
  scott: [
    { id: "story-001", title: "$28M EBITDA Improvement — EDF Renewables", company: "EDF Renewables", role: "VP Technology", competencies: ["Financial Impact","Transformation","Technical"], situation: "EDF Renewables had a fragmented technology landscape — redundant platforms, siloed data, no consolidated view of asset performance or cost.", task: "Identify and execute a platform consolidation strategy to reduce operational cost while improving data quality and board-level reporting.", action: "Led cross-functional audit of full tech stack, identified $13M in redundant SaaS spend via ledger mining, rationalized vendor portfolio, rearchitected core platforms. Built business case and presented to C-suite and board. Owned execution through go-live.", result: "$28M annualized EBITDA improvement. 15% OPEX reduction. Improved board reporting accuracy.", tags: ["P&L","platform consolidation","cost reduction","board reporting","enterprise architecture"], starred: true },
    { id: "story-002", title: "27% Reduction in Compliance Fines — CCR AI Governance", company: "Cypress Creek Renewables", role: "Senior Director, Enterprise Applications", competencies: ["Governance","Technical","Financial Impact"], situation: "CCR faced escalating compliance fines due to inconsistent data governance and manual audit processes.", task: "Design and implement an AI-assisted governance framework to reduce compliance risk.", action: "Architected AI governance implementation covering automated compliance monitoring, audit trail generation, and exception flagging. Built stakeholder alignment. Managed vendor selection and implementation.", result: "27% reduction in compliance-related fines. Repeatable framework adopted across portfolio. ~40% reduction in manual audit burden.", tags: ["AI governance","compliance","risk reduction","regulatory","automation"], starred: true },
    { id: "story-003", title: "$13M SaaS Catalog via Ledger Mining", company: "EDF Renewables", role: "VP Technology", competencies: ["Financial Impact","Vendor Management","Strategy"], situation: "No single owner had visibility into total SaaS spend across EDF's U.S. operations.", task: "Surface total SaaS exposure, identify redundancy, build a rationalization roadmap.", action: "Designed and executed ledger mining process with finance. Built vendor catalog, mapped redundancies, developed phased rationalization plan.", result: "$13M SaaS catalog identified. 15% OPEX reduction. Established ongoing SaaS governance.", tags: ["SaaS","spend analysis","vendor management","OPEX","ledger mining"], starred: false },
    { id: "story-004", title: "Nike OIA Supply Chain Platform — Full Product Lifecycle", company: "Nike / Percipio", role: "Program Manager & Scrum Master", competencies: ["Transformation","Leadership","Technical"], situation: "Nike needed a B2B supply chain platform for OIA (Oregon International Airfreight) to enable factories to order airbags and manage supply chain — starting from whiteboard.", task: "Lead product development from concept to global production deployment and drive factory adoption.", action: "Led full product lifecycle as program PM and Scrum Master across distributed teams. Managed sprint cadence, backlog health, dependency tracking from MVP through production scale. Designed and led OCM for global factory adoption.", result: "Platform deployed to production. ~$600M revenue impact in first year. Still in active use globally.", tags: ["product","supply chain","B2B","OIA","Nike","OCM"], starred: false },
  ],
  joshua: [],
  aaron: [],
};

const COMPETENCIES = ["Transformation","Financial Impact","Leadership","Technical","Agile/Delivery","Governance","Vendor Management","Strategy","Stakeholder"];
const TABS = ["Library","Analyze JD","Resume","Cover Letter","Interview Prep","Research","Settings"];

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT EXTRACTION — parse resume text via AI into structured contact fields
// ─────────────────────────────────────────────────────────────────────────────

async function extractContactFromResume(resumeText) {
  const text = await callClaude(
    `Extract contact information from a resume. Return ONLY a JSON object with these exact keys:
{"name":"","phone":"","email":"","address":"","linkedin":"","website":"","title":""}
For linkedin: extract just the path like "linkedin.com/in/username". For website: just the domain.
For title: extract their most recent job title or professional headline.
If a field is not found, use empty string. Return ONLY the JSON, no other text.`,
    resumeText.slice(0, 3000),
    400
  );
  const m = text.match(/\{[\s\S]*?\}/);
  if (!m) throw new Error("Could not parse contact info from resume");
  return JSON.parse(m[0]);
}


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

// Builds a clean ATS-ready final resume from base + tailoring recommendations
async function buildFinalResumeText(baseResume, tailoringNotes, jd) {
  const system = `You are an expert resume writer. You will be given:
1. A base resume
2. Tailoring recommendations for a specific role
3. The job description

Produce a FINAL, SUBMISSION-READY resume that incorporates the recommendations. Output ONLY the clean resume text — no commentary, no "why this works" explanations, no strategy notes, no markdown headers, no section labels like "REVISED:" or "CURRENT:".

Format rules:
- Name on first line in ALL CAPS
- Contact line second: City, ST  |  phone  |  email  |  linkedin  |  website
- Section headers in ALL CAPS (SUMMARY, EXPERIENCE, CERTIFICATIONS, SKILLS)
- Job entries: Title | Company | Years (on one line)
- Bullet points starting with a dash (-)
- Em dashes (—) for separators within bullets
- No tables, no markdown, no asterisks, no pound signs
- Clean plain text that will render properly in Word

The output should read as a polished, human-written executive resume ready to submit to an ATS and a hiring manager.`;

  return callClaude(system,
    `Base Resume:\n${baseResume}\n\nTailoring Recommendations:\n${tailoringNotes}\n\nJob Description:\n${jd}`,
    3000
  );
}

async function downloadResumeDocx(finalResumeText, company, profile) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, UnderlineType } = await import("https://esm.sh/docx@8.5.0");

  const children = [];
  const lines = finalResumeText.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) { children.push(new Paragraph({ text: "", spacing: { after: 60 } })); continue; }

    // Name — first non-empty line, ALL CAPS
    if (i === 0 || (children.length === 0)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 32, color: "1a1a4a", font: "Calibri" })],
        alignment: AlignmentType.CENTER, spacing: { after: 80 }
      }));

    // Contact line — contains | and email
    } else if (t.includes("|") && t.includes("@") && children.length <= 2) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, size: 19, color: "444444", font: "Calibri" })],
        alignment: AlignmentType.CENTER, spacing: { after: 160 }
      }));
      // Accent rule below contact
      children.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "2F2B8F" } },
        spacing: { after: 180 }
      }));

    // Section headers — ALL CAPS, no special chars, standalone line
    } else if (t === t.toUpperCase() && t.length > 2 && t.length < 40 && !t.includes("|") && !t.includes("@") && !t.includes("—")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 22, color: "1a1a4a", font: "Calibri" })],
        spacing: { before: 240, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2F2B8F" } }
      }));

    // Job title lines — contain | separator (Title | Company | Years)
    } else if (t.includes("|") && !t.includes("@") && t.split("|").length >= 2 && t.split("|").length <= 4) {
      const parts = t.split("|").map(p => p.trim());
      children.push(new Paragraph({
        children: [
          new TextRun({ text: parts[0], bold: true, size: 21, color: "111111", font: "Calibri" }),
          new TextRun({ text: "  |  ", size: 21, color: "888888", font: "Calibri" }),
          new TextRun({ text: parts.slice(1).join("  |  "), size: 21, color: "444444", font: "Calibri" }),
        ],
        spacing: { before: 180, after: 60 }
      }));

    // Bullet points
    } else if (t.startsWith("-") || t.startsWith("•")) {
      const bulletText = t.replace(/^[-•]\s*/, "");
      // Handle em dashes within bullet text
      children.push(new Paragraph({
        children: [new TextRun({ text: bulletText, size: 20, color: "111111", font: "Calibri" })],
        bullet: { level: 0 },
        spacing: { after: 60 }
      }));

    // Regular paragraph text
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, size: 20, color: "111111", font: "Calibri" })],
        spacing: { after: 80 }
      }));
    }
  }

  // AI stamp
  children.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: "EEEEEE" } }, spacing: { before: 480 } }));
  children.push(new Paragraph({
    children: [new TextRun({ text: AI_STAMP, size: 16, color: "AAAAAA", italics: true, font: "Calibri" })],
    alignment: AlignmentType.CENTER
  }));

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }],
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } }
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Scott_Henderson_Resume${company ? "_" + company.replace(/\s+/g,"_") : ""}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadCoverLetterDocx(letterText, company, role, profile) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("https://esm.sh/docx@8.5.0");

  // Strip any AI-generated contact blocks from the letter body
  // (remove lines that look like "[Phone]", "[Email]", or duplicate contact info)
  const cleanedLines = letterText.split("\n").filter(line => {
    const t = line.trim();
    if (!t) return true;
    if (t.match(/^\[.*\]$/) || t.match(/^\[.*\]\s*\|/)) return false; // [Phone] | [Email] etc
    if (t === profile.email || t === profile.phone) return false;
    if (t.toLowerCase().includes("scott henderson") && t.length < 30) return false; // standalone name line
    return true;
  });
  const cleanLetter = cleanedLines.join("\n");

  const contactLine = `${profile.address}  |  ${profile.phone}  |  ${profile.email}  |  ${profile.website}`;

  const children = [
    // Letterhead name
    new Paragraph({
      children: [new TextRun({ text: profile.name.toUpperCase(), bold: true, size: 30, color: "1a1a4a", font: "Calibri" })],
      spacing: { after: 60 }
    }),
    // Full contact line with phone
    new Paragraph({
      children: [new TextRun({ text: contactLine, size: 18, color: "555555", font: "Calibri" })],
      spacing: { after: 80 }
    }),
    // Accent rule
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "2F2B8F" } },
      spacing: { after: 320 }
    }),
    // Date
    new Paragraph({
      children: [new TextRun({ text: TODAY, size: 20, color: "555555", font: "Calibri" })],
      spacing: { after: 320 }
    }),
  ];

  // Addressee block
  if (company) children.push(new Paragraph({ children: [new TextRun({ text: company, size: 20, bold: true, font: "Calibri" })], spacing: { after: 40 } }));
  if (role) children.push(new Paragraph({ children: [new TextRun({ text: role, size: 20, color: "444444", font: "Calibri" })], spacing: { after: 320 } }));

  // Letter body — skip blank lines at start
  let bodyStarted = false;
  for (const line of cleanLetter.split("\n")) {
    const t = line.trim();
    if (!t && !bodyStarted) continue;
    bodyStarted = true;
    if (!t) { children.push(new Paragraph({ text: "", spacing: { after: 140 } })); continue; }
    children.push(new Paragraph({
      children: [new TextRun({ text: t, size: 22, color: "111111", font: "Calibri" })],
      spacing: { after: 80 },
      alignment: AlignmentType.JUSTIFIED
    }));
  }

  // Closing signature block
  children.push(new Paragraph({ text: "", spacing: { after: 160 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: profile.name, size: 22, bold: true, font: "Calibri" })], spacing: { after: 40 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: profile.phone, size: 20, color: "555555", font: "Calibri" })], spacing: { after: 40 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: profile.email, size: 20, color: "555555", font: "Calibri" })], spacing: { after: 40 } }));

  // AI stamp
  children.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: "EEEEEE" } }, spacing: { before: 480 } }));
  children.push(new Paragraph({
    children: [new TextRun({ text: AI_STAMP, size: 16, color: "AAAAAA", italics: true, font: "Calibri" })],
    alignment: AlignmentType.CENTER
  }));

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } }, children }],
    styles: { default: { document: { run: { font: "Calibri" } } } }
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Scott_Henderson_CoverLetter${company ? "_" + company.replace(/\s+/g,"_") : ""}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}


// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  input: {
    width: "100%",
    background: "#1e2035",
    border: "1px solid #3a3d5c",
    borderRadius: "6px",
    color: "#e8e4f8",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "14px",
    padding: "10px 14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  textarea: {
    width: "100%",
    background: "#1e2035",
    border: "1px solid #3a3d5c",
    borderRadius: "6px",
    color: "#e8e4f8",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "14px",
    lineHeight: "1.75",
    padding: "14px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
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
    transition: "background 0.15s, transform 0.1s",
    letterSpacing: "0.2px",
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
    transition: "border-color 0.15s, color 0.15s",
  },
  label: {
    display: "block",
    fontSize: "11px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "#8880b8",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: "600",
    marginBottom: "8px",
  },
  section: {
    background: "#181a2e",
    border: "1px solid #2e3050",
    borderRadius: "10px",
    padding: "24px",
    marginBottom: "20px",
  },
  resultBox: {
    background: "#1a1c30",
    border: "1px solid #2e3050",
    borderRadius: "8px",
    padding: "20px 24px",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "14px",
    lineHeight: "1.85",
    color: "#d8d4f0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
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
      <label style={S.label}>Job Description</label>
      <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the full job description here…" rows={6} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY GATE
// ─────────────────────────────────────────────────────────────────────────────

function PrivacyGate({ onAccept }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}>
      <div style={{ background: "#181a2e", border: "1px solid #2a2a3a", borderRadius: "12px", width: "100%", maxWidth: "540px", padding: "36px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", textTransform: "uppercase", color: "#4a4abf", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "12px" }}>Before You Begin</div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "20px", letterSpacing: "-0.5px" }}>CareerForge</div>
        <div style={{ fontSize: "13px", color: "#a8a0c8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.8", marginBottom: "24px", whiteSpace: "pre-line" }}>{PRIVACY_NOTICE}</div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e2e", borderRadius: "6px", padding: "12px 16px", marginBottom: "24px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px", color: "#8880b8", lineHeight: "1.6" }}>
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
    score >= 8 ? {
      label: "Excellent Match! 🎯",
      color: "#4ade80",
      bg: "rgba(74,222,128,0.08)",
      border: "rgba(74,222,128,0.25)",
      rec: "This role was made for you. Your background aligns strongly with what they're looking for — let's build materials that make this a no-brainer hire.",
      cta: "Build tailored resume + cover letter",
    } :
    score >= 6 ? {
      label: "Strong Contender ✅",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.08)",
      border: "rgba(251,191,36,0.25)",
      rec: "You have the core experience this role needs. A few gaps to address, but nothing that should stop you — let's sharpen your materials and get you in the room.",
      cta: "Build tailored resume + cover letter",
    } :
    score >= 4 ? {
      label: "Possible Fit 🤔",
      color: "#fb923c",
      bg: "rgba(251,146,60,0.08)",
      border: "rgba(251,146,60,0.25)",
      rec: "There are real gaps here, but your background has transferable strengths. Consider whether a targeted approach is worth the investment — or correct any gaps the AI may have missed.",
      cta: "Build tailored resume anyway",
    } : {
      label: "Tough Road Ahead 💪",
      color: "#f87171",
      bg: "rgba(248,113,113,0.08)",
      border: "rgba(248,113,113,0.25)",
      rec: "This role has significant gaps from your current profile — and that's okay. If you still want to apply, a clean base resume is your best move. Check if the AI missed anything before deciding.",
      cta: "Apply with base resume",
    };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "#181a2e", border: `1px solid ${verdict.border}`, borderRadius: "14px", width: "100%", maxWidth: "620px", maxHeight: "88vh", overflowY: "auto", padding: "36px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>

        {/* Score */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "80px", fontWeight: "800", lineHeight: 1, color: verdict.color, fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-2px" }}>
            {score}<span style={{ fontSize: "32px", color: "#6060a0", fontWeight: "400" }}>/10</span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: verdict.color, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "10px" }}>
            {verdict.label}
          </div>
          <div style={{ fontSize: "15px", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "12px", lineHeight: "1.65", maxWidth: "480px", margin: "12px auto 0" }}>
            {verdict.rec}
          </div>
          <div style={{ fontSize: "13px", color: "#7870a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "8px", fontStyle: "italic" }}>
            {rationale}
          </div>
        </div>

        {/* Bias note */}
        <div style={{ background: "rgba(80,80,160,0.12)", border: "1px solid rgba(80,80,160,0.25)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px", color: "#9890c8", lineHeight: "1.55" }}>
          Score reflects keyword and experience alignment — not your full potential. Your judgment supersedes this. If a gap looks wrong, correct it below and we'll re-score.
        </div>

        {/* Gaps */}
        {gaps.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "12px" }}>
              Gaps to Review ({gaps.length})
            </div>
            {gaps.map((gap, i) => (
              <div key={i} style={{ background: "#1e2035", border: "1px solid #2e3050", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>{gap.title}</div>
                <div style={{ fontSize: "13px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6" }}>{gap.assessment}</div>
              </div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "12px" }}>
          What would you like to do?
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={onBuildResume} style={{ background: verdict.color === "#4ade80" ? "#2d7d46" : "#4f6ef7", color: "#ffffff", border: "none", borderRadius: "8px", padding: "15px 20px", fontSize: "15px", fontWeight: "600", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{verdict.cta}</span>
            <span style={{ fontSize: "13px", opacity: 0.8 }}>→ Resume tab</span>
          </button>
          <button onClick={onResumeOnly} style={{ background: "rgba(160,140,220,0.12)", color: "#e8e4f8", border: "1px solid rgba(160,140,220,0.3)", borderRadius: "8px", padding: "13px 20px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Apply with source-of-truth resume only</span>
            <span style={{ fontSize: "12px", opacity: 0.6 }}>no tailoring</span>
          </button>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button onClick={onCorrect} style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "8px", padding: "11px 16px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", flex: 1 }}>
              Correct a gap → re-score
            </button>
            <button onClick={onNewJD} style={{ background: "rgba(74,222,128,0.08)", color: "#6ab8a8", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", padding: "11px 16px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", flex: 1 }}>
              Try a different role
            </button>
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
    <div style={{ background: "#1e2035", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "24px", marginBottom: "24px" }}>
      <div style={{ fontSize: "14px", fontWeight: "600", color: "#e0dcf4", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>Correct the Gaps</div>
      <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Flag any gap the AI got wrong and explain why. Corrections are saved to your profile and will prevent the same gap from appearing in future analyses.</div>
      <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "4px", padding: "8px 12px", marginBottom: "16px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "11px", color: "#8a7040", lineHeight: "1.5" }}>
        ✓ Saved corrections become part of your verified profile. The AI will treat them as facts and never re-flag them. You can view all active corrections in Settings.
      </div>
      {local.map((gap, i) => (
        <div key={i} style={{ border: `1px solid ${gap.flagged ? "rgba(201,168,76,0.4)" : "#2e3050"}`, borderRadius: "6px", padding: "14px 16px", marginBottom: "10px", background: gap.flagged ? "rgba(201,168,76,0.04)" : "rgba(255,255,255,0.01)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <button onClick={() => toggle(i)} style={{ background: gap.flagged ? "#c9a84c" : "transparent", border: `1px solid ${gap.flagged ? "#c9a84c" : "#6860a0"}`, borderRadius: "3px", width: "18px", height: "18px", cursor: "pointer", flexShrink: 0, marginTop: "2px", fontSize: "11px", color: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center" }}>{gap.flagged ? "✓" : ""}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#c0b0d8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "3px" }}>{gap.title}</div>
              <div style={{ fontSize: "12px", color: "#4a4060", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.5" }}>{gap.assessment}</div>
              {gap.flagged && (
                <div style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a7040", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>Your Correction</div>
                  <textarea value={gap.userCorrection} onChange={e => update(i, e.target.value)} placeholder="e.g. I DO have LSSBB — Intel internal certification plus LinkedIn Learning." rows={3} style={{ ...S.textarea, border: "1px solid #c9a84c" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button onClick={handleSave} style={{ background: "#c9a84c", color: "#0f1117", border: "none", borderRadius: "4px", padding: "10px 24px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer" }}>Save Corrections</button>
        <button onClick={onDone} style={S.btnGhost}>Done</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYZE JD TAB
// ─────────────────────────────────────────────────────────────────────────────

function buildAnalysisSystem(corrections, profile) {
  const correctionText = Object.keys(corrections).length > 0
    ? `\n\nUSER CORRECTIONS — treat as verified facts, do NOT re-flag:\n${Object.entries(corrections).map(([k,v]) => `- "${k}": ${v}`).join("\n")}`
    : "";
  return `You are a senior career strategist for ${profile.name}, ${profile.title}.

BACKGROUND: ${profile.background}
PROOF POINTS: ${profile.proofPoints.join("; ")}
CERTIFICATIONS (VERIFIED): ${profile.certifications.join("; ")}
IMPLEMENTATIONS (VERIFIED, hands-on lead): ${profile.implementations.join("; ")}
PRODUCT EXPERIENCE (VERIFIED): ${profile.products.join("; ")}
INDUSTRIES: ${profile.industries.join("; ")}
SECURITY: ${profile.security.join("; ")}

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

function AnalyzeTab({ jd, setJd, stories, corrections, onSaveCorrections, onBuildResume, onResumeOnly, onNewJD, profile }) {
  const [parsedScore, setParsedScore] = useState(null);
  const [parsedRationale, setParsedRationale] = useState("");
  const [parsedGaps, setParsedGaps] = useState([]);
  const [parsedCompany, setParsedCompany] = useState("");
  const [fullResult, setFullResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [reScoring, setReScoring] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const apiLocked = useApiLock();

  const runWithCorrections = async (activeCorrections) => {
    if (!jd.trim()) return;
    const storyList = stories.map((s,i) => `${i+1}. "${s.title}" — ${s.competencies.join(", ")} | Result: ${s.result}`).join("\n");
    const text = await callClaude(buildAnalysisSystem(activeCorrections, profile), `Stories:\n${storyList}\n\nJob Description:\n${jd}`, 3000);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Could not parse analysis response");
    const p = JSON.parse(m[0]);
    setParsedScore(p.score); setParsedRationale(p.rationale);
    setParsedGaps(p.gaps || []); setParsedCompany(p.company || "");
    setFullResult(formatFull(p));
    return p;
  };

  const run = async () => {
    setLoading(true); setError(null); setShowFull(false); setShowModal(false);
    try {
      await runWithCorrections(corrections);
      setShowModal(true);
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

  const handleSaveCorrections = async (nc) => {
    const merged = { ...corrections, ...nc };
    onSaveCorrections(merged);
    setShowCorrections(false);
    // Re-score with updated corrections
    setReScoring(true);
    try {
      await runWithCorrections(merged);
      setShowModal(true);
    } catch (e) { setError(`Re-scoring failed: ${e.message}`); }
    finally { setReScoring(false); }
  };

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
      {reScoring && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#181a2e", border: "1px solid #2a2a3a", borderRadius: "10px", padding: "32px 40px", textAlign: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div style={{ marginBottom: "16px" }}><Spinner size={24} /></div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", marginBottom: "8px" }}>Re-scoring with your corrections…</div>
            <div style={{ fontSize: "13px", color: "#9890b8" }}>Applying your profile updates and recalculating fit</div>
          </div>
        </div>
      )}
      <JDInput jd={jd} setJd={setJd} />
      {Object.keys(corrections).length > 0 && (
        <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "4px", padding: "10px 14px", marginBottom: "16px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px", color: "#8a7040", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✓ {Object.keys(corrections).length} gap correction{Object.keys(corrections).length > 1?"s":""} saved to your profile — AI will not re-flag these</span>
          <button onClick={() => setShowCorrections(true)} style={{ background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: "12px" }}>View / edit</button>
        </div>
      )}
      <button onClick={run} disabled={!jd.trim() || loading || reScoring || apiLocked} style={{ ...S.btn, opacity: !jd.trim() || loading || reScoring || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner /> Analyzing…</> : reScoring ? <><Spinner /> Re-scoring…</> : "Analyze JD"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px", wordBreak: "break-word" }}>{error}</div>}
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

function ResumeTab({ jd, setJd, resumeOnly, onDownloaded, profile }) {
  const [resume, setResume] = useState(profile.resumeText || "");
  // Sync if profile changes (e.g. after upload gate completes)
  useEffect(() => { if (profile.resumeText) setResume(profile.resumeText); }, [profile.resumeText]);
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
      const system = `You are a senior executive resume strategist for ${profile.name}, ${profile.title}.
Background: ${profile.background}
Certifications: ${profile.certifications.join("; ")}
Implementations: ${profile.implementations.join("; ")}
Proof points: ${profile.proofPoints.join("; ")}

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
      const company = m ? m[1].trim() : "";
      // Build clean final resume from base + tailoring notes via second AI call
      const finalText = await buildFinalResumeText(resume, result, jd);
      await downloadResumeDocx(finalText, company, profile);
      if (onDownloaded) onDownloaded();
    } catch (e) { setError(`Download failed: ${e.message}`); }
    finally { setDownloading(false); }
  };

  return (
    <div>
      {resumeOnly && (
        <div style={{ background: "rgba(180,140,255,0.08)", border: "1px solid rgba(180,140,255,0.2)", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", color: "#b090d8" }}>
          Source-of-truth path — use your base resume as-is or make minimal edits. Tailoring optional.
        </div>
      )}
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ ...S.label, margin: 0 }}>Resume Baseline</label>
          <button onClick={() => setShowResume(!showResume)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>{showResume ? "Hide" : "Edit baseline"}</button>
        </div>
        {showResume && <textarea value={resume} onChange={e => setResume(e.target.value)} rows={12} style={S.textarea} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#3a3d5c"} />}
      </div>
      <button onClick={run} disabled={!jd.trim() || loading || apiLocked} style={{ ...S.btn, opacity: !jd.trim()||loading||apiLocked?0.5:1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner />Tailoring…</> : "Tailor Resume"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Resume Tailoring Strategy</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={result} />
              <button onClick={handleDownload} disabled={downloading} style={{ ...S.btn, padding: "5px 14px", fontSize: "11px", background: downloading?"#3a3d5c":"#3a5abf", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading?<><Spinner />Building resume…</>:"⬇ Build Final Resume .docx"}
              </button>
            </div>
          </div>
          <div style={S.resultBox}>{result}</div>
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#6060a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>
            The strategy above is for your review. Download runs a second AI pass to produce a clean, submission-ready resume incorporating these recommendations.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER LETTER TAB
// ─────────────────────────────────────────────────────────────────────────────

function CoverLetterTab({ jd, setJd, onDownloaded, profile }) {
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
      const system = `You are writing a cover letter for ${profile.name}, ${profile.title}.
Background: ${profile.background}
Proof points: ${profile.proofPoints.join("; ")}
Voice: Direct, confident, not sycophantic. Lead with business impact. Specific proof points over generic claims.
One strong opening hook — not "I am writing to apply for…"
3 tight paragraphs maximum. Close with forward momentum.

CRITICAL FORMATTING RULES:
- Do NOT include any contact information, addresses, phone numbers, or email addresses
- Do NOT include a name line, letterhead, or header — the document template handles this
- Do NOT include a salutation line (Dear Hiring Manager etc) unless you know the name
- Do NOT include a closing signature block — the template adds this
- Output ONLY the body paragraphs of the letter, nothing else
- No placeholders like [Phone] or [Email]`;
      const text = await callClaude(system, `Company: ${company||"the company"}\nRole: ${role||"this position"}\n${notes?`Context: ${notes}\n`:""}\nJD:\n${jd}`, 1500);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadCoverLetterDocx(result, company, role, profile); if (onDownloaded) onDownloaded(); }
    catch (e) { setError(`Download failed: ${e.message}`); }
    finally { setDownloading(false); }
  };

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div>
          <label style={S.label}>Company Name {extracting && <span style={{ color: "#4a4abf", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>extracting…</span>}</label>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" style={S.input} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#3a3d5c"} />
        </div>
        <div>
          <label style={S.label}>Role Title</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. VP of Technology" style={S.input} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#3a3d5c"} />
        </div>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Additional Context <span style={{ color: "#6860a0", textTransform: "none", letterSpacing: 0 }}>optional</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Referred by John Smith. Emphasize CCR governance work…" rows={3} style={S.textarea} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#3a3d5c"} />
      </div>
      <button onClick={run} disabled={!jd.trim()||loading||apiLocked} style={{ ...S.btn, opacity: !jd.trim()||loading||apiLocked?0.5:1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading?<><Spinner />Drafting…</>:"Draft Cover Letter"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Cover Letter Draft</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={result} />
              <button onClick={handleDownload} disabled={downloading} style={{ ...S.btn, padding: "5px 14px", fontSize: "11px", background: downloading?"#3a3d5c":"#3a5abf", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading?<><Spinner />…</>:"⬇ Download .docx"}
              </button>
            </div>
          </div>
          <div style={S.resultBox}>{result}</div>
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#6060a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>
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

function InterviewPrepTab({ jd, setJd, stories, profile }) {
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
      const system = `You are an executive interview coach preparing ${profile.name} for a ${round} interview.
Background: ${profile.background}
Proof points: ${profile.proofPoints.join("; ")}
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
            <button key={r} onClick={() => setRound(r)} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", textTransform: "capitalize", background: round===r?"rgba(99,140,255,0.15)":"transparent", color: round===r?"#8aacff":"#5a5870", borderColor: round===r?"#4a6abf":"#3a3d5c" }}>{r}</button>
          ))}
        </div>
      </div>
      <button onClick={run} disabled={!jd.trim()||loading||apiLocked} style={{ ...S.btn, opacity: !jd.trim()||loading||apiLocked?0.5:1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading?<><Spinner />Preparing…</>:`Prep for ${round} interview`}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
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
        <div style={{ fontSize: "14px", lineHeight: "1.8", fontFamily: "Georgia, serif", color: steps[step.key]==="error"?"#c06060":"#d0ccee", marginBottom: src.length?"12px":0 }}>{body}</div>
        {src.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "10px", borderTop: "1px solid #1a1a2a" }}>
            <span style={{ fontSize: "10px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "1px", textTransform: "uppercase", alignSelf: "center" }}>Sources</span>
            {src.map((url, i) => {
              let host = url;
              try { host = new URL(url).hostname.replace("www.", ""); } catch {}
              return <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: "#4a4abf", fontFamily: "'DM Sans', system-ui, sans-serif", textDecoration: "none", background: "rgba(74,74,191,0.08)", padding: "2px 8px", borderRadius: "3px", border: "1px solid rgba(74,74,191,0.2)" }}>{host} ↗</a>;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Safety scope note */}
      <div style={{ background: "rgba(74,74,191,0.06)", border: "1px solid rgba(74,74,191,0.18)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px", color: "#5858a0", lineHeight: "1.6" }}>
        <strong style={{ color: "#6868b0" }}>Scope:</strong> Only company name is used in search queries — no personal information or resume content is included. Results are AI-synthesized from public sources. Verify all claims before use in interviews.
      </div>

      {/* Confirm gate */}
      {confirmPending && !hasRun && (
        <div style={{ ...S.section, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.04)", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#c9a84c", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Ready to research: {effective}</div>
          <div style={{ fontSize: "13px", color: "#6a6040", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "16px" }}>
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
          <input value={override} onChange={e => setOverride(e.target.value)} placeholder={company || "Enter company name…"} style={{ ...S.input, flex: 1 }} onFocus={e => e.target.style.borderColor="#4a4abf"} onBlur={e => e.target.style.borderColor="#3a3d5c"} />
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
              <div key={step.key} style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px" }}>
                <span style={{ width: "16px", textAlign: "center", flexShrink: 0, color: steps[step.key]==="done"?"#7adf8a":steps[step.key]==="error"?"#df7a7a":steps[step.key]==="loading"?"#c9a84c":"#6860a0" }}>
                  {steps[step.key]==="loading"?<Spinner size={10}/>:steps[step.key]==="done"?"✓":steps[step.key]==="error"?"✗":"○"}
                </span>
                <span style={{ color: steps[step.key]==="done"?"#8888b8":"#6860a0" }}>{step.label}</span>
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
        <div style={{ padding: "48px", textAlign: "center", border: "1px dashed #1e1e2e", borderRadius: "8px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px" }}>
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

function Tag({ label, color="#3a3d5c", textColor="#8880a0" }) {
  return <span style={{ background: color, color: textColor, borderRadius: "3px", padding: "2px 8px", fontSize: "11px", fontFamily: "'DM Sans', system-ui, sans-serif", whiteSpace: "nowrap" }}>{label}</span>;
}

function CompBadge({ label, active, onClick }) {
  return <button onClick={onClick} style={{ background: active?"rgba(99,140,255,0.18)":"rgba(255,255,255,0.03)", color: active?"#8aacff":"#5a5870", border: `1px solid ${active?"#4a6abf":"#3a3d5c"}`, borderRadius: "4px", padding: "5px 12px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer" }}>{label}</button>;
}

function StoryCard({ story, onEdit, onDelete, onStar }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${story.starred?"rgba(99,140,255,0.3)":"#2e3050"}`, borderRadius: "8px", marginBottom: "12px", overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", background: expanded?"rgba(99,140,255,0.04)":"transparent" }}>
        <button onClick={e => { e.stopPropagation(); onStar(story.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0", marginTop: "1px", flexShrink: 0 }}>{story.starred?"⭐":"☆"}</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#d8d0f0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>{story.title}</div>
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
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: c, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "6px" }}>{l}</div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#b0a8c0", fontFamily: "Georgia, serif" }}>{story[k]}</div>
            </div>
          ))}
          {story.tags?.length > 0 && <div style={{ marginTop: "16px", display: "flex", gap: "6px", flexWrap: "wrap" }}>{story.tags.map(t => <Tag key={t} label={`#${t}`} color="rgba(255,255,255,0.04)" textColor="#8880b8" />)}</div>}
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
      {multi ? <textarea value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} rows={4} style={S.textarea} onFocus={e=>e.target.style.borderColor="#4a4abf"} onBlur={e=>e.target.style.borderColor="#3a3d5c"} /> : <input type="text" value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} style={S.input} onFocus={e=>e.target.style.borderColor="#4a4abf"} onBlur={e=>e.target.style.borderColor="#3a3d5c"} />}
    </div>
  );
  return (
    <div style={{ background: "#1e2035", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "28px" }}>
      <div style={{ fontSize: "16px", fontWeight: "600", color: "#e0dcf4", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>{story?"Edit Story":"Add New Story"}</div>
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
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stories…" style={{ ...S.input, width: "200px" }} onFocus={e=>e.target.style.borderColor="#4a4abf"} onBlur={e=>e.target.style.borderColor="#3a3d5c"} />
        <button onClick={()=>setFilterStarred(!filterStarred)} style={{ ...S.btnGhost, fontSize: "12px", background: filterStarred?"rgba(99,140,255,0.15)":"transparent", color: filterStarred?"#8aacff":"#8880b8", borderColor: filterStarred?"#4a6abf":"#3a3d5c" }}>⭐ Starred</button>
        <button onClick={()=>setEditing("new")} style={{ ...S.btn, marginLeft: "auto", padding: "8px 18px" }}>+ Add Story</button>
      </div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        <CompBadge label="All" active={!filterComp} onClick={()=>setFilterComp(null)} />
        {COMPETENCIES.map(c=><CompBadge key={c} label={c} active={filterComp===c} onClick={()=>setFilterComp(filterComp===c?null:c)} />)}
      </div>
      {filtered.length===0?(
        <div style={{ color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px", padding: "40px", textAlign: "center", border: "1px dashed #1e1e2e", borderRadius: "8px" }}>
          No stories match.{" "}<button onClick={()=>{setFilterComp(null);setFilterStarred(false);setSearch("");}} style={{ background: "none", border: "none", color: "#5a5aaf", cursor: "pointer", fontSize: "14px" }}>Clear filters</button>
        </div>
      ) : filtered.map(s=><StoryCard key={s.id} story={s} onEdit={setEditing} onDelete={handleDelete} onStar={handleStar} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSelector({ profiles, activeId, onSelect, onAdd }) {
  const colors = { scott: "#4a4abf", joshua: "#3a8a6a", aaron: "#8a4abf" };
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
      {Object.values(profiles).map(p => {
        const isActive = p.id === activeId;
        const color = colors[p.id] || "#5a5870";
        return (
          <button key={p.id} onClick={() => onSelect(p.id)} style={{
            background: isActive ? `${color}22` : "transparent",
            border: `1px solid ${isActive ? color : "#3a3d5c"}`,
            borderRadius: "20px", padding: "5px 14px",
            fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif",
            cursor: "pointer",
            color: isActive ? "#e8e4f8" : "#5a5870",
            display: "flex", alignItems: "center", gap: "6px"
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isActive ? color : "#6860a0", flexShrink: 0 }} />
            {p.displayName}
            {!p.resumeUploaded && <span style={{ fontSize: "9px", color: "#6a5040" }}>no resume</span>}
          </button>
        );
      })}
      <button onClick={onAdd} style={{ background: "transparent", border: "1px dashed #2a2a3a", borderRadius: "20px", padding: "5px 14px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", color: "#6860a0" }}>
        + Add Profile
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUME UPLOAD GATE
// ─────────────────────────────────────────────────────────────────────────────

function ResumeUploadGate({ profile, onComplete, onSkip }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = async (file) => {
    setFileName(file.name); setError(null);
    try {
      if (file.name.endsWith(".docx") || file.type.includes("wordprocessing")) {
        const { default: mammoth } = await import("https://esm.sh/mammoth@1.7.0");
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        setText(result.value);
      } else if (file.type === "application/pdf") {
        setError("PDF upload: paste the resume text below as a fallback for now.");
      } else {
        const t = await file.text();
        setText(t);
      }
    } catch (e) { setError(`Read failed: ${e.message}`); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); };
  const handleFile = (e) => { const f = e.target.files[0]; if (f) processFile(f); };

  const handleContinue = async () => {
    if (!text.trim()) return;
    setExtracting(true); setError(null);
    try {
      const contact = await extractContactFromResume(text);
      onComplete({
        ...profile,
        name: contact.name || profile.name,
        phone: contact.phone || profile.phone,
        email: contact.email || profile.email,
        address: contact.address || profile.address,
        linkedin: contact.linkedin || profile.linkedin,
        website: contact.website || profile.website,
        title: contact.title || profile.title,
        resumeText: text,
        resumeUploaded: true,
      });
    } catch (e) { setError(`Extraction failed: ${e.message}`); setExtracting(false); }
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ fontSize: "18px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>
        Set up {profile.displayName}'s profile
      </div>
      <div style={{ fontSize: "13px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "28px" }}>
        Upload or paste your resume. CareerForge will extract your contact info and use your resume as the baseline for tailoring. Your data stays in your browser.
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`upload-${profile.id}`).click()}
        style={{
          border: `1.5px dashed ${dragOver ? "#4a4abf" : "#2e2e42"}`,
          borderRadius: "6px", padding: "24px", textAlign: "center",
          marginBottom: "16px", cursor: "pointer",
          background: dragOver ? "rgba(74,74,191,0.05)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s"
        }}
      >
        <input id={`upload-${profile.id}`} type="file" accept=".docx,.txt" style={{ display: "none" }} onChange={handleFile} />
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
        {fileName
          ? <div style={{ color: "#4a4abf", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px" }}>✓ {fileName}</div>
          : <div style={{ color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px" }}>Drop DOCX here, or click to browse<br /><span style={{ fontSize: "11px", color: "#6060a0" }}>or paste text below</span></div>
        }
      </div>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setFileName(""); }}
        placeholder="Paste resume text here…"
        rows={8}
        style={{ ...S.textarea, marginBottom: "16px" }}
        onFocus={e => e.target.style.borderColor = "#4a4abf"}
        onBlur={e => e.target.style.borderColor = "#3a3d5c"}
      />

      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleContinue} disabled={!text.trim() || extracting} style={{ ...S.btn, opacity: !text.trim() || extracting ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
          {extracting ? <><Spinner />Extracting contact info…</> : "Set Up Profile"}
        </button>
        <button onClick={onSkip} style={{ ...S.btnGhost, color: "#9890b8" }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab({ profile, onUpdateProfile, saveJD, setSaveJD, onDeleteProfile, isOnlyProfile, corrections, onUpdateCorrections }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...profile });
  const [reupload, setReupload] = useState(false);

  const field = (key, label) => (
    <div style={{ marginBottom: "16px" }}>
      <label style={S.label}>{label}</label>
      <input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={S.input}
        onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
    </div>
  );

  return (
    <div>
      {/* Contact info */}
      <div style={{ ...S.section, marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ ...S.label, margin: 0 }}>Contact Information</div>
          <button onClick={() => { setEditing(!editing); setForm({ ...profile }); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>{field("name", "Full Name")}</div>
              <div>{field("phone", "Phone")}</div>
              <div>{field("email", "Email")}</div>
              <div>{field("address", "City, State")}</div>
              <div>{field("linkedin", "LinkedIn URL")}</div>
              <div>{field("website", "Website")}</div>
            </div>
            {field("title", "Professional Title")}
            <button onClick={() => { onUpdateProfile(form); setEditing(false); }} style={S.btn}>Save Changes</button>
          </>
        ) : (
          <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", color: "#7a7090", lineHeight: "2" }}>
            {[["Name", profile.name], ["Phone", profile.phone || "—"], ["Email", profile.email || "—"], ["Address", profile.address || "—"], ["LinkedIn", profile.linkedin || "—"], ["Website", profile.website || "—"]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", gap: "16px" }}>
                <span style={{ color: "#8880b8", width: "80px", flexShrink: 0 }}>{l}</span>
                <span style={{ color: v === "—" ? "#2a2a38" : "#a0a0b8" }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume */}
      <div style={{ ...S.section, marginBottom: "24px" }}>
        <div style={{ ...S.label, marginBottom: "12px" }}>Resume Baseline</div>
        {profile.resumeUploaded ? (
          <>
            <div style={{ fontSize: "12px", color: "#5a9a7a", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "12px" }}>
              ✓ Resume uploaded — {profile.resumeText?.length?.toLocaleString()} characters
            </div>
            <button onClick={() => setReupload(!reupload)} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", marginBottom: reupload ? "16px" : 0 }}>
              {reupload ? "Cancel re-upload" : "Re-upload resume"}
            </button>
          </>
        ) : (
          <div style={{ fontSize: "12px", color: "#8a6040", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "16px" }}>
            ⚠ No resume uploaded — contact info will use defaults and tailoring will use a generic baseline.
          </div>
        )}
        {(!profile.resumeUploaded || reupload) && (
          <ResumeUploadGate
            profile={profile}
            onComplete={updated => { onUpdateProfile(updated); setReupload(false); }}
            onSkip={() => setReupload(false)}
          />
        )}
      </div>

      {/* Preferences */}
      <div style={{ ...S.section, marginBottom: "24px" }}>
        <div style={{ ...S.label, marginBottom: "16px" }}>Preferences</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", color: "#7a7090" }}>
          <button onClick={() => setSaveJD(!saveJD)} style={{ background: saveJD ? "rgba(74,74,191,0.2)" : "rgba(255,255,255,0.03)", border: `1px solid ${saveJD ? "#4a4abf" : "#3a3d5c"}`, borderRadius: "4px", padding: "6px 14px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", color: saveJD ? "#8aacff" : "#5a5870" }}>
            {saveJD ? "💾 JD saved across sessions" : "💾 JD not saved"}
          </button>
          <span style={{ fontSize: "12px", color: "#6860a0" }}>Toggle to control whether your JD persists between sessions</span>
        </div>
      </div>

      {/* Saved corrections */}
      {Object.keys(corrections).length > 0 && (
        <div style={{ ...S.section, marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Saved Profile Corrections ({Object.keys(corrections).length})</div>
            <button onClick={() => { if (window.confirm("Clear all corrections?")) onUpdateCorrections({}); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px", color: "#6a3a3a", borderColor: "#2e1e1e" }}>Clear all</button>
          </div>
          <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "12px", lineHeight: "1.5" }}>
            These corrections are injected into every JD analysis and override AI-generated gap assessments.
          </div>
          {Object.entries(corrections).map(([title, correction]) => (
            <div key={title} style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "4px", padding: "12px 14px", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#c0b0a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>{title}</div>
                  <div style={{ fontSize: "11px", color: "#7a6a50", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.5" }}>{correction}</div>
                </div>
                <button onClick={() => { const updated = { ...corrections }; delete updated[title]; onUpdateCorrections(updated); }} style={{ background: "none", border: "none", color: "#6a3a3a", cursor: "pointer", fontSize: "14px", flexShrink: 0 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Danger zone */}
      {!isOnlyProfile && (
        <div style={{ ...S.section, border: "1px solid #3a1a1a" }}>
          <div style={{ ...S.label, color: "#6a3a3a", marginBottom: "12px" }}>Danger Zone</div>
          <button onClick={() => { if (window.confirm(`Delete ${profile.displayName}'s profile? This cannot be undone.`)) onDeleteProfile(profile.id); }}
            style={{ background: "rgba(180,60,60,0.1)", border: "1px solid #6a2a2a", color: "#c06060", borderRadius: "4px", padding: "8px 16px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer" }}>
            Delete {profile.displayName}'s Profile
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function CareerForge() {
  const [activeTab, setActiveTab] = useState("Library");
  const [loaded, setLoaded] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [saveJD, setSaveJD] = useState(true);

  // Multi-profile state
  const [profiles, setProfiles] = useState(SEED_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState("scott");
  const [showUploadGate, setShowUploadGate] = useState(false);

  // Per-profile data (keyed by profile id)
  const [allStories, setAllStories] = useState({});
  const [allCorrections, setAllCorrections] = useState({});
  const [allJDs, setAllJDs] = useState({});

  // Derived — active profile data
  const profile = profiles[activeProfileId] || profiles.scott;
  const stories = allStories[activeProfileId] || [];
  const corrections = allCorrections[activeProfileId] || {};
  const jd = allJDs[activeProfileId] || "";

  const setStories = (val) => setAllStories(p => ({ ...p, [activeProfileId]: typeof val === "function" ? val(p[activeProfileId] || []) : val }));
  const setCorrections = (val) => setAllCorrections(p => ({ ...p, [activeProfileId]: typeof val === "function" ? val(p[activeProfileId] || {}) : val }));
  const setJd = (val) => setAllJDs(p => ({ ...p, [activeProfileId]: typeof val === "function" ? val(p[activeProfileId] || "") : val }));

  // Flow gates
  const [proceeded, setProceeded] = useState(false);
  const [resumeOnly, setResumeOnly] = useState(false);
  const [resumeDownloaded, setResumeDownloaded] = useState(false);
  const [coverDownloaded, setCoverDownloaded] = useState(false);

  const materialsComplete = resumeDownloaded && (coverDownloaded || resumeOnly);
  const sessionCost = useSessionCost();
  const apiLocked = useApiLock();

  // Load all data on mount
  useEffect(() => {
    if (sessionStorage.getItem("cf:privacy")) setPrivacyAccepted(true);
    Promise.all([
      storageGet("careerforge:profiles"),
      storageGet("careerforge:activeProfile"),
      storageGet("careerforge:allStories"),
      storageGet("careerforge:allCorrections"),
      storageGet("careerforge:allJDs"),
      storageGet("careerforge:saveJD"),
    ]).then(([p, ap, s, c, j, sj]) => {
      if (p) setProfiles(p);
      if (ap) setActiveProfileId(ap);
      if (s) setAllStories(s); else setAllStories({ scott: SEED_STORIES_BY_PROFILE.scott, joshua: [], aaron: [] });
      if (c) setAllCorrections(c);
      if (j) setAllJDs(j);
      const pref = sj !== null ? sj : true;
      setSaveJD(pref);
      setLoaded(true);
    });
  }, []);

  // Persist on change
  useEffect(() => { if (loaded) storageSet("careerforge:profiles", profiles); }, [profiles, loaded]);
  useEffect(() => { if (loaded) storageSet("careerforge:activeProfile", activeProfileId); }, [activeProfileId, loaded]);
  useEffect(() => { if (loaded) storageSet("careerforge:allStories", allStories); }, [allStories, loaded]);
  useEffect(() => { if (loaded) storageSet("careerforge:allCorrections", allCorrections); }, [allCorrections, loaded]);
  useEffect(() => { if (loaded) storageSet("careerforge:saveJD", saveJD); }, [saveJD, loaded]);
  useEffect(() => {
    if (loaded) {
      if (saveJD) storageSet("careerforge:allJDs", allJDs);
    }
  }, [allJDs, loaded, saveJD]);

  // Show upload gate for new profile with no resume
  useEffect(() => {
    if (loaded && profile && !profile.resumeUploaded) {
      setShowUploadGate(true);
    } else {
      setShowUploadGate(false);
    }
  }, [activeProfileId, loaded]);

  // Reset flow gates on profile switch
  useEffect(() => {
    setProceeded(false); setResumeOnly(false);
    setResumeDownloaded(false); setCoverDownloaded(false);
  }, [activeProfileId]);

  // Auto-navigate on gate changes
  useEffect(() => { if (resumeDownloaded && !coverDownloaded && !resumeOnly) setActiveTab("Cover Letter"); }, [resumeDownloaded]);
  useEffect(() => { if (materialsComplete) { /* research tab unlocks */ } }, [materialsComplete]);

  const handleNewJD = () => {
    setJd(""); setProceeded(false); setResumeOnly(false);
    setResumeDownloaded(false); setCoverDownloaded(false);
    setActiveTab("Analyze JD");
  };

  const handleProfileSwitch = (id) => {
    setActiveProfileId(id);
    setActiveTab("Library");
  };

  const handleAddProfile = () => {
    const id = `user_${Date.now()}`;
    const newProfile = {
      id, displayName: "New Profile", title: "", name: "", phone: "", email: "",
      address: "", linkedin: "", website: "", resumeText: "", resumeUploaded: false,
      background: "", proofPoints: [], certifications: [], implementations: [],
      products: [], industries: [], security: [],
    };
    setProfiles(p => ({ ...p, [id]: newProfile }));
    setAllStories(s => ({ ...s, [id]: [] }));
    setActiveProfileId(id);
    setShowUploadGate(true);
    setActiveTab("Library");
  };

  const handleUpdateProfile = (updated) => {
    setProfiles(p => ({ ...p, [updated.id]: updated }));
    setShowUploadGate(!updated.resumeUploaded);
  };

  const handleDeleteProfile = (id) => {
    const remaining = { ...profiles };
    delete remaining[id];
    setProfiles(remaining);
    setActiveProfileId(Object.keys(remaining)[0]);
  };

  const [researchCompany, setResearchCompany] = useState("");
  const [researchTriggered, setResearchTriggered] = useState(false);

  const tabConfig = [
    { name: "Library",        status: "ready" },
    { name: "Analyze JD",     status: "ready" },
    { name: "Resume",         status: proceeded || resumeOnly ? "active" : "suggested" },
    { name: "Cover Letter",   status: coverDownloaded ? "done" : resumeDownloaded ? "active" : "suggested" },
    { name: "Interview Prep", status: materialsComplete ? "active" : "suggested" },
    { name: "Research",       status: materialsComplete ? "active" : "suggested" },
    { name: "Settings",       status: "ready" },
  ];

  const starredCount = stories.filter(s => s.starred).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e8e4f8", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {!privacyAccepted && <PrivacyGate onAccept={() => { sessionStorage.setItem("cf:privacy","1"); setPrivacyAccepted(true); }} />}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #131528 0%, #181a30 100%)", borderBottom: "1px solid #2e3050", padding: "20px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700", color: "#e8e4f8", letterSpacing: "-0.5px" }}>CareerForge</span>
              <span style={{ fontSize: "10px", letterSpacing: "3px", color: "#4a4abf", textTransform: "uppercase", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600" }}>Job Search Intelligence</span>
            </div>
            <div style={{ marginTop: "10px" }}>
              <ProfileSelector
                profiles={profiles}
                activeId={activeProfileId}
                onSelect={handleProfileSwitch}
                onAdd={handleAddProfile}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {sessionCost > 0 && <span style={{ fontSize: "11px", color: "#8880b8" }}>~${sessionCost.toFixed(4)} session</span>}
            {apiLocked && <div style={{ fontSize: "11px", color: "#c9a84c", display: "flex", alignItems: "center", gap: "6px" }}><Spinner size={10} />AI running…</div>}
            {(proceeded || resumeOnly) && (
              <button onClick={handleNewJD} style={{ background: "transparent", border: "1px solid #2a2a3a", color: "#8880b8", borderRadius: "4px", padding: "5px 12px", fontSize: "11px", cursor: "pointer" }}>↺ New Application</button>
            )}
            <span style={{ fontSize: "11px", color: "#6860a0" }}>{stories.length} stories · {starredCount} ⭐</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginTop: "16px", flexWrap: "wrap" }}>
          {tabConfig.map(({ name, status }) => {
            const isActive = activeTab === name;
            const done = (name === "Resume" && resumeDownloaded) || (name === "Cover Letter" && coverDownloaded);
            return (
              <button key={name} onClick={() => setActiveTab(name)} style={{
                background: isActive ? "rgba(120,160,255,0.18)" : "transparent",
                color: isActive ? "#c8d8ff" : status === "suggested" ? "#5a5878" : "#a8a0c8",
                border: `1px solid ${isActive ? "#6080df" : "transparent"}`,
                borderBottom: isActive ? "1px solid #0f1117" : "1px solid transparent",
                borderRadius: "4px 4px 0 0", padding: "7px 14px", fontSize: "12px",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                cursor: "pointer",
                marginBottom: isActive ? "-1px" : "0",
                display: "flex", alignItems: "center", gap: "4px",
                transition: "color 0.15s"
              }}>
                {name}
                {done && <span style={{ fontSize: "9px", color: "#6adf9a" }}>✓</span>}
                {status === "suggested" && !done && name !== "Library" && name !== "Settings" && (
                  <span style={{ fontSize: "9px", color: "#4a4868", marginLeft: "1px" }}>·</span>
                )}
                {name === "Settings" && <span style={{ fontSize: "10px", opacity: 0.5 }}>⚙</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px 40px", maxWidth: "900px" }}>
        {!loaded ? (
          <div style={{ color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", gap: "10px" }}><Spinner />Loading…</div>
        ) : showUploadGate && activeTab !== "Settings" ? (
          <ResumeUploadGate
            profile={profile}
            onComplete={handleUpdateProfile}
            onSkip={() => setShowUploadGate(false)}
          />
        ) : (
          <>
            {/* No-resume warning banner */}
            {!profile.resumeUploaded && !showUploadGate && (activeTab === "Resume" || activeTab === "Cover Letter") && (
              <div style={{ background: "rgba(180,120,40,0.1)", border: "1px solid rgba(180,120,40,0.3)", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", color: "#b08040", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>⚠ No resume uploaded — outputs will use a generic baseline and may not have your contact info.</span>
                <button onClick={() => setShowUploadGate(true)} style={{ background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}>Upload now</button>
              </div>
            )}

            {activeTab === "Library" && <LibraryTab stories={stories} setStories={setStories} />}
            {activeTab === "Analyze JD" && (
              <AnalyzeTab
                jd={jd} setJd={setJd} stories={stories} profile={profile}
                corrections={corrections} onSaveCorrections={setCorrections}
                onBuildResume={company => { setResearchCompany(company); setResearchTriggered(true); setProceeded(true); setActiveTab("Resume"); }}
                onResumeOnly={company => { setResearchCompany(company); setResumeOnly(true); setActiveTab("Resume"); }}
                onNewJD={handleNewJD}
              />
            )}
            {activeTab === "Resume" && (
              <ResumeTab jd={jd} setJd={setJd} resumeOnly={resumeOnly} onDownloaded={() => setResumeDownloaded(true)} profile={profile} />
            )}
            {activeTab === "Cover Letter" && (
              <CoverLetterTab jd={jd} setJd={setJd} onDownloaded={() => setCoverDownloaded(true)} profile={profile} />
            )}
            {activeTab === "Interview Prep" && (
              <InterviewPrepTab jd={jd} setJd={setJd} stories={stories} profile={profile} />
            )}
            {activeTab === "Research" && (
              <ResearchTab company={researchCompany} triggered={researchTriggered} />
            )}
            {activeTab === "Settings" && (
              <SettingsTab
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
                saveJD={saveJD}
                setSaveJD={setSaveJD}
                onDeleteProfile={handleDeleteProfile}
                isOnlyProfile={Object.keys(profiles).length === 1}
                corrections={corrections}
                onUpdateCorrections={setCorrections}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
