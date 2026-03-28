// NarrativeOS v20 — Clean rebuild
// Sections (in order):
//   1. Constants & Config
//   2. Global State (session cost, API lock)
//   3. Storage
//   4. API (callClaude, callClaudeSearch, extractContactFromResume)
//   5. Drive Integration
//   6. DOCX Generation
//   7. Shared Styles
//   8. Utility Components
//   9. Auth (useNetlifyAuth, LoginGate)// NarrativeOS v20 — Clean rebuild
// Sections (in order):
//   1. Constants & Config
//   2. Global State (session cost, API lock)
//   3. Storage
//   4. API (callClaude, callClaudeSearch, extractContactFromResume)
//   5. Drive Integration
//   6. DOCX Generation
//   7. Shared Styles
//   8. Utility Components
//   9. Auth (useNetlifyAuth, LoginGate)
//  10. Board Components (RoleCard, Board)
//  11. Job Search (scoreJobsAgainstProfile, JobResultCard, JobSearchTab)
//  12. JD Analysis (JDInput, buildAnalysisSystem, AnalysisModal, GapCorrectionPanel, AnalyzeTab)
//  13. Resume Tools (ResumeTab, CoverLetterTab, InterviewPrepTab)
//  14. Research (ResearchTab)
//  15. Stories (StoryCard, StoryEditor, MyStoriesTab)
//  16. Profile (ResumeUploadGate, ProfileTab)
//  17. Role Workspace (RoleWorkspace)
//  18. App Shell (BottomNav, NarrativeOS)

import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTS & CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const COMPETENCIES = [
  "Transformation","Financial Impact","Leadership","Technical",
  "Agile/Delivery","Governance","Vendor Management","Strategy","Stakeholder",
];

const STAGES = ["Radar","Applied","Screening","Interview","Offer","Pass"];

const STAGE_COLORS = {
  Radar:     { bg: "rgba(99,140,255,0.12)",  border: "#4f6ef7", text: "#8aacff" },
  Applied:   { bg: "rgba(251,191,36,0.10)",  border: "#d97706", text: "#fbbf24" },
  Screening: { bg: "rgba(168,85,247,0.10)",  border: "#9333ea", text: "#c084fc" },
  Interview: { bg: "rgba(34,197,94,0.10)",   border: "#16a34a", text: "#4ade80" },
  Offer:     { bg: "rgba(20,184,166,0.10)",  border: "#0d9488", text: "#2dd4bf" },
  Pass:      { bg: "rgba(100,116,139,0.10)", border: "#475569", text: "#94a3b8" },
};

function getToday() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const DEFAULT_PROFILE = {
  name: "", displayName: "", email: "", phone: "",
  address: "Bellingham, WA", linkedin: "", website: "",
  title: "", background: "", resumeText: "", resumeUploaded: false,
  profileTier: "senior",
  resumeVariants: [],
  activeResumeId: null,
};

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

function tierContext(profile) {
  const tier = profile.profileTier || "senior";
  const map = {
    student: {
      voice:        "Use encouraging, coaching tone. Avoid jargon. Explain industry norms briefly when relevant.",
      scope:        "Focus on internships, academic projects, transferable skills, and early-career potential.",
      expectations: "Do not expect P&L ownership, large team leadership, or deep domain expertise. Highlight growth trajectory.",
      questions:    "Interview questions should focus on behavioral basics, learning mindset, and role-specific skills.",
    },
    midlevel: {
      voice:        "Professional, direct tone. Assume familiarity with core business concepts.",
      scope:        "Focus on individual contribution, team collaboration, and early leadership.",
      expectations: "Expect 3-8 years of experience. Some management experience may be present but not required.",
      questions:    "Interview questions should probe execution quality, stakeholder navigation, and growth into leadership.",
    },
    senior: {
      voice:        "Peer-level, direct tone. Skip basics. Lead with impact and strategic framing.",
      scope:        "Focus on program/portfolio ownership, cross-functional influence, and measurable outcomes.",
      expectations: "Expect 8-15 years. Director or senior manager scope. P&L exposure likely but may not be full ownership.",
      questions:    "Interview questions should probe leadership under ambiguity, organizational influence, and business outcomes.",
    },
    executive: {
      voice:        "Boardroom-level, concise, commercially framed. No hand-holding.",
      scope:        "Focus on P&L ownership, organizational transformation, C-suite and board relationships, and enterprise outcomes.",
      expectations: "Expect VP+ scope. Full P&L, revenue accountability, and multi-year transformation programs are baseline.",
      questions:    "Interview questions should probe strategic vision, enterprise risk, talent philosophy, and financial stewardship.",
    },
  };
  return map[tier] || map.senior;
}

const PROMPTS = {

  contactExtract: () =>
    `Extract contact information from a resume. Return ONLY a JSON object with these fields (empty string if not found):
{"name":"","phone":"","email":"","address":"","linkedin":"","website":"","title":""}
- name: full legal name
- phone: phone number
- email: email address
- address: city and state only (e.g. "Seattle, WA")
- linkedin: LinkedIn URL or username
- website: personal website URL
- title: current or most recent job title
Return only the JSON, no other text.`,

  coverLetterExtract: () =>
    `Extract company name and job title from a job description. Return ONLY JSON: {"company":"...","role":"..."}. Empty string if not found.`,

  searchQueries: (profile) => {
    const tier = profile?.profileTier || "senior";
    const levelHint = {
      student:   "Target entry-level, associate, junior, coordinator, and internship roles.",
      midlevel:  "Target manager, specialist, lead, and senior individual contributor roles.",
      senior:    "Target senior manager, director, and senior director roles.",
      executive: "Target VP, SVP, EVP, Chief, and Head-of roles.",
    }[tier] || "Target senior director and VP roles.";
    return `Generate 4 concise job board search queries for this candidate.
Each query: 3-6 words, targets appropriately leveled roles, includes "remote" where appropriate.
${levelHint}
Return ONLY a JSON array of strings.`;
  },

  jobScoring: (jobCount) =>
    `You are a senior recruiter evaluating candidate fit. Score each job 1-10 based ONLY on must-have requirements — ignore preferred/nice-to-have.

Score HIGH when candidate has:
- Required certifications match (PMP, SAFe, CPA, specific platforms listed as required)
- Required domain/industry experience (e.g. "manufacturing experience required", "energy sector")
- Required hands-on tool experience (e.g. "must have NetSuite", "Salesforce admin required")
- Required org size or leadership scope match

Score LOW when candidate is missing:
- Explicitly required certifications or licenses
- Required industry experience they lack
- Required technical platform hands-on experience

The "reason" field must be specific — name the actual requirement gap or match.
Example good reasons: "Lacks required SAP hands-on", "PMP + NetSuite match required certs and ERP", "Requires manufacturing domain — not in background"
Example bad reasons: "Good fit", "Some gaps"

Return ONLY a JSON array: [{"index":0,"score":8,"reason":"specific one sentence"},...]
Score all ${jobCount} jobs. No preamble.`,

  jdAnalyzer: (profile, stories, corrections) => {
    const tc = tierContext(profile);
    const correctionText = Object.keys(corrections).length > 0
      ? `\n\nUSER CORRECTIONS — treat as verified facts, do NOT re-flag:\n${Object.entries(corrections).map(([k, v]) => `- "${k}": ${v}`).join("\n")}`
      : "";
    const resumeText = (profile.resumeText || "").slice(0, 1200);
    const hasStories = stories && stories.length > 0;
    const profileContext = hasStories
      ? `RESUME BASELINE:\n${resumeText}`
      : `RESUME (no interview stories added yet — evaluate from resume only):\n${resumeText}`;
    return `You are a senior career strategist evaluating fit for ${profile.name || "this candidate"}.

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.scope}
${tc.expectations}

${profileContext}${correctionText}

EVALUATION PHILOSOPHY:
You are assessing the whole person — their career arc, demonstrated impact, and transferable experience — not just keyword matching.
A 10/10 is reserved for near-perfect alignment across role requirements, domain, scope, and certifications. It should be rare but genuinely achievable.
A 9/10 means exceptional fit with only the most minor gaps — the kind a strong cover letter resolves.
Score honestly. If the JD lacks hard requirements or is vague, score generously on fit.
Only flag gaps that are explicitly required in the JD and clearly absent from the candidate's background.
CRITICAL: Before flagging any gap, check the resume above. Only flag genuine verified gaps.

Return ONLY a valid JSON object — no markdown, no backticks, no commentary:
{
  "score": <1-10>,
  "company": "<company name from JD>",
  "rationale": "<one energizing sentence that leads with the candidate's strongest angle for this role>",
  "keyRequirements": ["<req>","<req>","<req>","<req>","<req>"],
  "strongestAngles": [{"angle":"<angle>","why":"<1 sentence why this matters for THIS role>"}],
  "topStories": [{"story":"<story title or resume achievement>","useFor":"<interview question type>"}],
  "gaps": [{"title":"<gap>","assessment":"<honest 1-sentence>","framing":"<how to address it confidently>"}],
  "keywords": ["<kw>"]
}`;
  },

  resumeStrategy: (profile) => {
    const tc = tierContext(profile);
    const profileContext = [
      profile.title && `Title: ${profile.title}`,
      profile.background && `Background: ${profile.background}`,
      profile.resumeText && `Resume (first 800 chars): ${profile.resumeText.slice(0, 800)}`,
    ].filter(Boolean).join("\n");
    return `You are a senior executive resume strategist for ${profile.name || "this candidate"}.
${profileContext}

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.scope}
${tc.expectations}
${tc.voice}

SCOPE: Analyze only roles from Intel Corporation (Apr 2013) forward. Roles prior to Intel (Proudcloud, Bookmans) are excluded from this candidate's resume and should not be referenced.

Analyze the resume against the job description and return ONLY a valid JSON object — no markdown, no backticks:
{
  "summaryRewrite": "<complete 3-sentence summary rewritten for this role, calibrated to candidate level>",
  "bulletEdits": [
    {"original": "<exact bullet from resume>", "revised": "<stronger version>", "reason": "<one sentence why>"}
  ],
  "bulletsToPromote": ["<bullet text to move higher>"],
  "keywordsToAdd": ["<keyword or phrase missing from resume but in JD>"],
  "toDeEmphasize": ["<experience or section to minimize for this application>"]
}
Return only the JSON. bulletEdits should include the 4-5 highest-impact changes only.`;
  },

  resumeRender: () =>
    `You are an expert resume writer producing a final, submission-ready resume.
Apply ALL the approved edits from the strategy. Produce clean resume text only.
Rules:
- No commentary, no markdown, no asterisks
- Name on first line ALL CAPS
- Contact line second with | separators
- Section headers ALL CAPS with no punctuation
- Job entries: Title | Company | Years
- Bullets starting with dash (-)
- Quantified achievements where present in the source
- Do not invent facts — only use what exists in the base resume and strategy
PAGE LIMIT — STRICT 2 PAGES:
- Total bullet count across all roles: 14–16 maximum. Senior/recent roles get more bullets; older roles get fewer.
- Roles before Intel Corporation (Apr 2013) must be EXCLUDED entirely — do not include Proudcloud or Bookmans Entertainment Exchange.
- Certifications section: output as a single compact line using pipe separators, e.g. "PMP | SAFe SPC | LSSBB | CSM | CSPO | PMI-ACP | ITIL v4 | Cynefin CAP"
- Keep section spacing tight. Every line must earn its place.
PROJECTS SECTION:
- After PROFESSIONAL EXPERIENCE and before EDUCATION, insert a section titled SELECTED PROJECTS
- Include exactly these three entries, each as a single dash bullet:
  - HendersonSolution.com — Executive advisory platform; AI-assisted positioning and portfolio storytelling for senior transformation leaders
  - CareerForge — AI-powered job search platform (React/Netlify); multi-profile support, STAR story library, ATS optimization, and DOCX resume generation
  - ClauseLens — AI contract analysis tool; clause-level risk identification and redlining with safety and compliance guardrails`,

  coverLetter: (profile, company, role, notes, toneOverride) => {
    const tc = tierContext(profile);
    const profileContext = [
      profile.title && `Title: ${profile.title}`,
      profile.background && `Background: ${profile.background}`,
      profile.resumeText && `Key experience: ${profile.resumeText.slice(0, 600)}`,
    ].filter(Boolean).join("\n");
    const TONES = {
      executive: "Boardroom-level voice. Commercially framed. Lead with enterprise impact and financial outcomes. No warmth padding.",
      warm:      "Warm, collaborative tone. Lead with mission alignment and team contribution. Genuine enthusiasm without being sycophantic.",
      concise:   "Extremely tight. Every sentence earns its place. No setup paragraphs. Results first, always. 2 paragraphs maximum.",
      narrative: "Open with a brief situational story or insight that reframes the candidate's angle. Then pivot to credentials. Memorable over safe.",
    };
    const voiceInstruction = toneOverride && TONES[toneOverride]
      ? `TONE OVERRIDE: ${TONES[toneOverride]}`
      : `VOICE GUIDANCE: ${tc.voice}`;
    return `You are writing a cover letter for ${profile.name || "this candidate"}.
${profileContext}

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${voiceInstruction}
${tc.scope}

One strong opening hook — not "I am writing to apply for…"
3 tight paragraphs maximum. Close with forward momentum.

CRITICAL FORMATTING RULES:
- Do NOT include any contact information, addresses, phone numbers, or email addresses
- Do NOT include a name line, letterhead, or header — the document template handles this
- Do NOT include a salutation line (Dear Hiring Manager etc) unless you know the name
- Do NOT include a closing signature block — the template adds this
- Output ONLY the body paragraphs of the letter, nothing else
- No placeholders like [Phone] or [Email]`;
  },

  interviewPrep: (profile, stories, round) => {
    const tc = tierContext(profile);
    const storyCtx = stories.length > 0
      ? stories.map(s => `"${s.title}": ${s.result}`).join("\n")
      : "No interview stories added yet — prep from resume context.";
    const profileCtx = [
      profile.title && `Title: ${profile.title}`,
      profile.background && `Background: ${profile.background}`,
      profile.resumeText && `Resume context: ${profile.resumeText.slice(0, 600)}`,
    ].filter(Boolean).join("\n");
    return `You are an interview coach preparing ${profile.name || "this candidate"} for a ${round} interview.
${profileCtx}

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.voice}
${tc.questions}

Stories: ${storyCtx}

Generate:
1. LIKELY QUESTIONS — 8 questions this interviewer will probably ask, calibrated to candidate level and round
2. ANGLE FOR EACH — the specific story or proof point to lead with, and the key message to land
3. TRICKY QUESTIONS — 3 harder questions (gaps, concerns, failures) with suggested honest framings
4. QUESTIONS TO ASK — 4 sharp questions the candidate should ask the interviewer

Be specific to this candidate's background. No generic advice.`;
  },

  storyExtract: (profile) =>
    `You are an expert career coach helping ${profile.name || "this candidate"} build a STAR story library.

Analyze the resume and extract 4-6 significant achievements that would make strong interview stories.

Return ONLY a valid JSON array. Critical rules for valid JSON:
- Use straight double quotes only (no curly quotes)
- No em dashes (use a hyphen instead)
- No unescaped apostrophes inside strings
- Keep all string values on a single line (no line breaks inside strings)
- No trailing commas

[{
  "title": "Brief title leading with the outcome or metric",
  "company": "company name",
  "role": "job title at that company",
  "competencies": ["one or two from: Transformation, Financial Impact, Leadership, Technical, Agile/Delivery, Governance, Vendor Management, Strategy, Stakeholder"],
  "hook": "One sentence leading with the result. Use hyphens not em dashes.",
  "situation": "2-3 sentences describing the context and problem.",
  "task": "1-2 sentences describing what you were responsible for.",
  "action": "2-3 sentences describing what you specifically did.",
  "result": "1-2 sentences with quantified outcomes where possible.",
  "tags": ["keyword1", "keyword2", "keyword3"],
  "starred": false
}]

Only extract stories with clear actions and outcomes. Return ONLY the JSON array, nothing else.`,

  storyExtractOnboard: (profile) =>
    `You are an expert career coach helping ${profile.name || "this candidate"} build a STAR story library.

Analyze the resume and extract 3-5 significant achievements that would make strong interview stories.
Focus on results with numbers, scope, or clear before/after impact.

Return ONLY a valid JSON array. Critical rules:
- Straight double quotes only
- No em dashes (use hyphen)
- No unescaped apostrophes
- All string values on a single line
- No trailing commas

[{
  "title": "Brief title leading with the outcome or metric",
  "company": "company name",
  "role": "job title at that company",
  "competencies": ["one or two from: Transformation, Financial Impact, Leadership, Technical, Agile/Delivery, Governance, Vendor Management, Strategy, Stakeholder"],
  "hook": "One sentence leading with the result.",
  "situation": "2-3 sentences describing the context and problem.",
  "task": "1-2 sentences describing responsibility.",
  "action": "2-3 sentences describing specific actions taken.",
  "result": "1-2 sentences with quantified outcomes.",
  "tags": ["keyword1","keyword2","keyword3"],
  "starred": false
}]

Return ONLY the JSON array, nothing else.`,

  storyInterview: (profile, story) =>
    `You are a warm, encouraging career coach helping ${profile.name || "this candidate"} build a STAR interview story.

STAR FORMAT:
- Situation: "Tell me about a time when…"
- Task: "What were you responsible for?"
- Action: "Walk me through what you did."
- Result: "What was the outcome?"

When asking each section, briefly remind the user what interviewers are listening for. Keep it natural.
If the user gives a vague answer, ask for a specific number, timeline, or concrete example.

Current story being built:
${JSON.stringify(story, null, 2)}

Rules:
- Ask ONE focused question at a time
- Be warm, conversational, and encouraging
- When all four STAR fields are reasonably complete, respond with ONLY a JSON object:
{"complete": true, "situation": "...", "task": "...", "action": "...", "result": "...", "hook": "One powerful sentence leading with the result, executive voice"}
- Otherwise respond with just your coaching + question as plain text — no JSON`,

  storyMatch: (stories) => {
    const storyList = stories.map((s, i) =>
      `${i}: "${s.title}" [${s.competencies?.join(", ") || ""}] — ${s.result || s.hook || ""}`
    ).join("\n");
    return `You are matching interview stories to a job description.

Stories available:
${storyList}

Return ONLY a JSON array of the 3 most relevant stories — ordered by relevance:
[{"index": <number>, "useFor": "<specific interview question type this story answers best>", "why": "<one sentence on why this story fits this role>"}]

No preamble. Only the JSON array.`;
  },

  followUp: (profile, card, type) => {
    const tc = tierContext(profile);
    const typeInstructions = {
      "thank-you": `Write a post-interview thank you email.
- Send within 24 hours of the interview
- Reference one specific topic discussed — use the notes for context
- Reaffirm genuine interest and one key proof point relevant to the role
- 3 short paragraphs maximum, warm but professional close`,
      "recruiter-follow-up": `Write a recruiter follow-up email for an application in progress.
- Polite, brief, not desperate
- Reference the specific role and when it was applied for
- Express continued strong interest
- Ask for a clear next step
- 2 paragraphs maximum`,
      "check-in": `Write a check-in email for a role where the candidate has gone quiet after an interview.
- Professional, not needy
- Acknowledge their timeline
- Restate interest and one differentiating value point
- Open door for any update they can share
- 2 tight paragraphs`,
      "offer-response": `Write an email responding to a job offer.
- Acknowledge and express genuine enthusiasm
- If accepting: confirm start date and express excitement
- If negotiating: professional framing around one ask only
- Warm, decisive, forward-looking tone`,
    };
    return `You are writing a professional email for ${profile.name || "this candidate"}.
${tc.voice}

Role: ${card.title || "this position"} at ${card.company || "this company"}
Stage: ${card.stage || "unknown"}

${typeInstructions[type] || typeInstructions["thank-you"]}

RULES:
- Subject line on first line, prefixed with "Subject: "
- Then a blank line
- Then the email body
- No placeholders like [Name] or [Date]
- Do not include a closing signature block`;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GLOBAL STATE — session cost + API lock
// ─────────────────────────────────────────────────────────────────────────────

let _sessionCost = 0;
const _costListeners = new Set();
function trackCost(inChars, outChars) {
  _sessionCost += (inChars / 1_000_000) * 0.25 + (outChars / 1_000_000) * 1.25;
  _costListeners.forEach(cb => cb(_sessionCost));
}
function useSessionCost() {
  const [cost, setCost] = useState(_sessionCost);
  useEffect(() => {
    _costListeners.add(setCost);
    return () => _costListeners.delete(setCost);
  }, []);
  return cost;
}

let _apiLocked = false;
const _lockListeners = new Set();
function setApiLock(v) { _apiLocked = v; _lockListeners.forEach(cb => cb(v)); }
function useApiLock() {
  const [locked, setLocked] = useState(_apiLocked);
  useEffect(() => {
    _lockListeners.add(setLocked);
    return () => _lockListeners.delete(setLocked);
  }, []);
  return locked;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STORAGE
// ─────────────────────────────────────────────────────────────────────────────

function storageGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function getActiveResume(profile) {
  if (!profile.resumeVariants?.length) return profile.resumeText || "";
  const active = profile.resumeVariants.find(v => v.id === profile.activeResumeId)
    || profile.resumeVariants[0];
  return active?.text || "";
}
function getActiveResumeVariant(profile) {
  if (!profile.resumeVariants?.length) {
    return profile.resumeText
      ? { id: "v1", name: "Base Resume", text: profile.resumeText, createdAt: null }
      : null;
  }
  return profile.resumeVariants.find(v => v.id === profile.activeResumeId)
    || profile.resumeVariants[0] || null;
}

// Strip roles predating Intel (Proudcloud, Bookmans) from any resume text block.
// Detects role-header lines (Title | Company | Dates) and removes the entire
// block — header + all following bullets/lines — for the excluded companies.
const PRE_INTEL_COMPANIES = ["proudcloud", "bookmans", "bookman's"];

function stripPreIntelRoles(text) {
  if (!text) return text;
  const lines = text.split("\n");
  const result = [];
  let skipping = false;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i];
    const lower = t.toLowerCase();

    // Detect a role-header line: contains "|" but not "@", 2-4 pipe-segments
    const isRoleHeader = t.includes("|") && !t.includes("@") && t.split("|").length >= 2 && t.split("|").length <= 4;

    if (isRoleHeader) {
      const isExcluded = PRE_INTEL_COMPANIES.some(c => lower.includes(c));
      skipping = isExcluded;
      if (!skipping) result.push(t);
      continue;
    }

    // A new ALL-CAPS section header (EDUCATION, CERTIFICATIONS, etc.) ends any skip
    const isSectionHeader = t === t.toUpperCase() && t.trim().length > 2 && t.trim().length < 40 && !t.includes("|") && !t.includes("@");
    if (isSectionHeader) {
      skipping = false;
    }

    if (!skipping) result.push(t);
  }

  return result.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. API
// ─────────────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const APIFY_TOKEN       = import.meta.env.VITE_APIFY_TOKEN || "";

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
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `API ${res.status}`);
    const text = data.content?.find(b => b.type === "text")?.text || "";
    trackCost((system + user).length, text.length);
    return text;
  } finally { setApiLock(false); }
}

async function callClaudeSearch(company, query) {
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
Scope is limited to public information about the company.`,
        messages: [{ role: "user", content: query }],
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `API ${res.status}`);
    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    trackCost(query.length, (text || "").length);
    return text || "No information found.";
  } finally { setApiLock(false); }
}

// Extracts contact fields from raw resume text via AI
async function extractContactFromResume(resumeText) {
  try {
    const text = await callClaude(PROMPTS.contactExtract(), resumeText.slice(0, 3000), 400);
    const m = text.match(/\{[\s\S]*?\}/);
    if (!m) return {};
    return JSON.parse(m[0]);
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GOOGLE DRIVE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

const DRIVE_FOLDER_NAME = "NarrativeOS";

function getDriveToken(userKey) {
  const legacy = localStorage.getItem("cf:google_token:drive");
  const scoped  = userKey ? localStorage.getItem(`${userKey}:google_token:drive`) : null;
  if (legacy && userKey && !scoped) {
    localStorage.setItem(`${userKey}:google_token:drive`, legacy);
    localStorage.removeItem("cf:google_token:drive");
  }
  return userKey
    ? localStorage.getItem(`${userKey}:google_token:drive`)
    : localStorage.getItem("cf:google_token:drive");
}

async function getOrCreateDriveFolder(token) {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files?.length > 0) return searchData.files[0].id;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const folder = await createRes.json();
  return folder.id;
}

async function saveToDrive(blob, filename, token) {
  const folderId = await getOrCreateDriveFolder(token);
  const metadata = { name: filename, parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  return await res.json(); // { id, webViewLink }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DOCX GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let _docxLib = null;
async function getDocxLib() {
  if (!_docxLib) _docxLib = await import("https://esm.sh/docx@8.5.0");
  return _docxLib;
}

async function buildResumeDocxBlob(finalResumeText, company, profile) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } =
    await getDocxLib();
  const children = [];
  const lines = stripPreIntelRoles(finalResumeText).split("\n");

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) {
      children.push(new Paragraph({ text: "", spacing: { after: 40 } }));
      continue;
    }
    if (i === 0 || children.length === 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 28, color: "1a1a4a", font: "Calibri" })],
        alignment: AlignmentType.CENTER, spacing: { after: 60 },
      }));
    } else if (t.includes("|") && t.includes("@") && children.length <= 2) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, size: 18, color: "444444", font: "Calibri" })],
        alignment: AlignmentType.CENTER, spacing: { after: 160 },
      }));
    } else if (
      t === t.toUpperCase() && t.length > 2 && t.length < 40 &&
      !t.includes("|") && !t.includes("@") && !t.includes("—")
    ) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 20, color: "1a1a4a", font: "Calibri" })],
        spacing: { before: 180, after: 60 },
      }));
    } else if (t.includes("|") && !t.includes("@") && t.split("|").length >= 2 && t.split("|").length <= 4) {
      const parts = t.split("|").map(p => p.trim());
      children.push(new Paragraph({
        children: [
          new TextRun({ text: parts[0], bold: true, size: 19, color: "111111", font: "Calibri" }),
          new TextRun({ text: "  |  ", size: 19, color: "888888", font: "Calibri" }),
          new TextRun({ text: parts.slice(1).join("  |  "), size: 19, color: "444444", font: "Calibri" }),
        ],
        spacing: { before: 140, after: 40 },
      }));
    } else if (t.startsWith("-") || t.startsWith("•")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t.replace(/^[-•]\s*/, ""), size: 19, color: "111111", font: "Calibri" })],
        bullet: { level: 0 }, spacing: { after: 40 },
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, size: 19, color: "111111", font: "Calibri" })],
        spacing: { after: 60 },
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 504, bottom: 504, left: 720, right: 720 } } },
      children,
    }],
    styles: { default: { document: { run: { font: "Calibri", size: 19 } } } },
  });
  return await Packer.toBlob(doc);
}

async function buildCoverLetterDocxBlob(letterText, company, role, profile) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } =
    await getDocxLib();

  const contactLine = `${profile.address}  |  ${profile.phone}  |  ${profile.email}  |  ${profile.website}`;
  const cleanLines = letterText.split("\n").filter(l => {
    const t = l.trim();
    if (!t) return true;
    if (t.match(/^\[.*\]$/) || t === profile.email || t === profile.phone) return false;
    if (t.toLowerCase().includes(profile.name?.toLowerCase()) && t.length < 30) return false;
    return true;
  });

  const children = [
    new Paragraph({
      children: [new TextRun({ text: (profile.name || "").toUpperCase(), bold: true, size: 30, color: "1a1a4a", font: "Calibri" })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: contactLine, size: 18, color: "555555", font: "Calibri" })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "2F2B8F" } },
      spacing: { after: 320 },
    }),
    new Paragraph({
      children: [new TextRun({ text: getToday(), size: 20, color: "555555", font: "Calibri" })],
      spacing: { after: 320 },
    }),
  ];
  if (company) children.push(new Paragraph({
    children: [new TextRun({ text: company, size: 20, bold: true, font: "Calibri" })],
    spacing: { after: 40 },
  }));
  if (role) children.push(new Paragraph({
    children: [new TextRun({ text: role, size: 20, color: "444444", font: "Calibri" })],
    spacing: { after: 320 },
  }));

  let bodyStarted = false;
  for (const line of cleanLines.join("\n").split("\n")) {
    const t = line.trim();
    if (!t && !bodyStarted) continue;
    bodyStarted = true;
    if (!t) {
      children.push(new Paragraph({ text: "", spacing: { after: 140 } }));
      continue;
    }
    children.push(new Paragraph({
      children: [new TextRun({ text: t, size: 22, color: "111111", font: "Calibri" })],
      spacing: { after: 80 },
      alignment: AlignmentType.JUSTIFIED,
    }));
  }

  children.push(new Paragraph({ text: "", spacing: { after: 160 } }));
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.name || "", size: 22, bold: true, font: "Calibri" })],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.phone || "", size: 20, color: "555555", font: "Calibri" })],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.email || "", size: 20, color: "555555", font: "Calibri" })],
    spacing: { after: 40 },
  }));

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } },
      children,
    }],
    styles: { default: { document: { run: { font: "Calibri" } } } },
  });
  return await Packer.toBlob(doc);
}

async function buildFinalResumeText(baseResume, strategy, jd) {
  return callClaude(
    PROMPTS.resumeRender(),
    `Base Resume:\n${stripPreIntelRoles(baseResume)}\n\nApproved Strategy:\n${JSON.stringify(strategy, null, 2)}\n\nJob Description:\n${jd}`,
    2000
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  input: {
    width: "100%", background: "#1e2240", border: "1px solid #3a3d5c",
    borderRadius: "6px", padding: "10px 14px", fontSize: "14px",
    fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e8e4f8",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
  },
  textarea: {
    width: "100%", background: "#1e2240", border: "1px solid #3a3d5c",
    borderRadius: "6px", padding: "12px 14px", fontSize: "14px",
    fontFamily: "Georgia, serif", color: "#e8e4f8", outline: "none",
    boxSizing: "border-box", resize: "vertical", lineHeight: "1.6",
  },
  btn: {
    background: "#4f6ef7", color: "#ffffff", border: "none", borderRadius: "6px",
    padding: "10px 20px", fontSize: "14px", fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: "600", cursor: "pointer", transition: "opacity 0.15s",
  },
  btnGhost: {
    background: "transparent", color: "#8880b8", border: "1px solid #3a3d5c",
    borderRadius: "6px", padding: "8px 16px", fontSize: "13px",
    fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer",
  },
  section: {
    background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px",
    padding: "20px 24px",
  },
  label: {
    display: "block", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase",
    color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: "600", marginBottom: "10px",
  },
  resultBox: {
    fontSize: "14px", color: "#c8c4e8", fontFamily: "Georgia, serif",
    lineHeight: "1.8", whiteSpace: "pre-wrap", maxHeight: "480px",
    overflowY: "auto", padding: "16px", background: "#1a1c2e",
    borderRadius: "6px", border: "1px solid #2e3050",
  },
};

// Hoist keyframe so it's injected once, not per-Spinner render
const _spinStyle = document.createElement("style");
_spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(_spinStyle);

// ─────────────────────────────────────────────────────────────────────────────
// 8. UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="#4f6ef7"
        strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Tag({ label, color = "#3a3d5c", textColor = "#8880a0" }) {
  return (
    <span style={{
      background: color, color: textColor, borderRadius: "3px",
      padding: "2px 8px", fontSize: "11px",
      fontFamily: "'DM Sans', system-ui, sans-serif", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function CompBadge({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(99,140,255,0.18)" : "rgba(255,255,255,0.03)",
      color: active ? "#8aacff" : "#5a5870",
      border: `1px solid ${active ? "#4a6abf" : "#3a3d5c"}`,
      borderRadius: "4px", padding: "5px 12px", fontSize: "12px",
      fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer",
    }}>{label}</button>
  );
}

function generateId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function StagePill({ stage, onClick, small }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS.Radar;
  return (
    <button onClick={onClick} style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: "12px", padding: small ? "2px 8px" : "4px 12px",
      fontSize: small ? "11px" : "12px",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: "600", cursor: onClick ? "pointer" : "default",
    }}>
      {stage}
    </button>
  );
}

function SaveToDriveBtn({ blob, filename, onSaved, disabled }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  const handle = async () => {
    setSaving(true); setErr(null);
    try {
      const token = await getDriveToken();
      if (!token) { setErr("Connect Google Drive in Profile first"); setSaving(false); return; }
      const result = await saveToDrive(blob, filename, token);
      if (result.webViewLink) { setSaved(true); onSaved?.(result); }
      else setErr("Upload failed");
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  if (saved) return <span style={{ fontSize: "12px", color: "#4ade80", fontFamily: "'DM Sans', system-ui, sans-serif" }}>✓ Saved to Drive</span>;
  return (
    <div>
      <button onClick={handle} disabled={disabled || saving}
        style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px", opacity: disabled || saving ? 0.5 : 1 }}>
        {saving ? <><Spinner size={12} />Saving…</> : "📁 Save to Drive"}
      </button>
      {err && <div style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>{err}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. AUTH — Netlify Identity
// ─────────────────────────────────────────────────────────────────────────────

function useNetlifyAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const ni = window.netlifyIdentity;
    if (!ni) { setAuthLoading(false); return; }

    const onInit   = (u) => { setUser(u); setAuthLoading(false); };
    const onLogin  = (u) => { setUser(u); setAuthLoading(false); ni.close(); };
    const onLogout = ()  => { setUser(null); setAuthLoading(false); };

    ni.on("init",   onInit);
    ni.on("login",  onLogin);
    ni.on("logout", onLogout);

    // Resolve immediately if already logged in
    if (ni.currentUser) { setUser(ni.currentUser()); setAuthLoading(false); }

    // Safety net — if Identity never fires init (e.g. slow network on first OAuth
    // callback), stop showing the loading spinner after 4 seconds
    const timeout = setTimeout(() => setAuthLoading(false), 4000);

    return () => {
      ni.off("init",   onInit);
      ni.off("login",  onLogin);
      ni.off("logout", onLogout);
      clearTimeout(timeout);
    };
  }, []);

  const login  = () => window.netlifyIdentity?.open("login");
  const logout = () => window.netlifyIdentity?.logout();
  return { user, authLoading, login, logout };
}

function LoginGate() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "32px", fontWeight: "800", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-1px", marginBottom: "8px" }}>NarrativeOS</div>
          <div style={{ fontSize: "14px", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "0.5px", marginBottom: "4px", fontStyle: "italic" }}>Your story. Your signal.</div>
          <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "1px" }}>Rise above the noise.</div>
        </div>
        <div style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "16px", padding: "40px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Sign in to continue</div>
          <div style={{ fontSize: "14px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "32px" }}>
            Your profile, stories, and applications are private to your account.
          </div>
          <button onClick={() => window.netlifyIdentity?.open("login")}
            style={{ width: "100%", background: "#ffffff", color: "#1a1a2e", border: "none", borderRadius: "8px", padding: "13px 20px", fontSize: "15px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "12px" }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
          <button onClick={() => window.netlifyIdentity?.open("login")}
            style={{ width: "100%", background: "transparent", color: "#a8a0c8", border: "1px solid #2e3050", borderRadius: "8px", padding: "13px 20px", fontSize: "15px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            ✉ Continue with email
          </button>
          <div style={{ marginTop: "24px", fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: "center" }}>
            Your data stays in your browser. AI uses the Anthropic API.{" "}
            <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#5a5abf" }}>Privacy →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. BOARD COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function RoleCard({ card, onClick, onStageChange, onRemove }) {
  const [showStageMenu, setShowStageMenu] = useState(false);
  const scoreColor = !card.fitScore ? "#6860a0"
    : card.fitScore >= 8 ? "#4ade80"
    : card.fitScore >= 6 ? "#fbbf24"
    : card.fitScore >= 4 ? "#fb923c" : "#f87171";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px",
        padding: "14px 16px", marginBottom: "8px", cursor: "pointer",
        transition: "border-color 0.15s, transform 0.1s", position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f6ef7"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3050"; e.currentTarget.style.transform = "none"; }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {card.title || "Untitled Role"}
          </div>
          <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {card.company || "Unknown Company"}
          </div>
        </div>
        {card.fitScore && (
          <div style={{ flexShrink: 0, width: "34px", height: "34px", borderRadius: "6px", background: `${scoreColor}18`, border: `1.5px solid ${scoreColor}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "800", color: scoreColor, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.fitScore}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {card.resumeDriveLink   && <span style={{ fontSize: "11px", color: "#4ade80" }} title="Resume saved">📄</span>}
          {card.coverLetterDriveLink && <span style={{ fontSize: "11px", color: "#4ade80" }} title="Cover letter saved">✉️</span>}
          {card.notes             && <span style={{ fontSize: "11px", color: "#6860a0" }} title="Has notes">📝</span>}
        </div>
        <div style={{ position: "relative" }}>
          {showStageMenu && (
            <div style={{ position: "fixed", inset: 0, zIndex: 99 }}
              onClick={e => { e.stopPropagation(); setShowStageMenu(false); }} />
          )}
          <div onClick={e => { e.stopPropagation(); setShowStageMenu(!showStageMenu); }}>
            <StagePill stage={card.stage || "Radar"} small />
          </div>
          {showStageMenu && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "4px", background: "#1e2240", border: "1px solid #3a3d5c", borderRadius: "8px", padding: "4px", zIndex: 100, minWidth: "110px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              {STAGES.map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); onStageChange(s); setShowStageMenu(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", color: s === card.stage ? "#8aacff" : "#a8a0c8", borderRadius: "4px" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(79,110,247,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {s}
                </button>
              ))}
              <div style={{ borderTop: "1px solid #2e3050", margin: "4px 0" }} />
              <button onClick={e => { e.stopPropagation(); onRemove(); setShowStageMenu(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", color: "#f87171", borderRadius: "4px" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {card.addedAt && (
        <div style={{ fontSize: "10px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "6px" }}>
          Added {new Date(card.addedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function Board({ cards, onOpenCard, onStageChange, onAddCard, onOpenSearch, onRemoveCard }) {
  const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s]: cards.filter(c => (c.stage || "Radar") === s) }), {});
  const total = cards.length;

  return (
    <div style={{ flex: 1, overflowX: "auto", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Applications</div>
          <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2px" }}>
            {total === 0 ? "No active applications" : `${total} role${total !== 1 ? "s" : ""} tracked`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onOpenSearch} style={{ ...S.btnGhost, display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>🔍 Search Jobs</button>
          <button onClick={() => onAddCard({ title: "", company: "", stage: "Radar", jd: "", notes: "", addedAt: Date.now() })} style={{ ...S.btn, fontSize: "13px", padding: "8px 16px" }}>+ Add Role</button>
        </div>
      </div>

      {total === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6860a0" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎯</div>
          <div style={{ fontSize: "18px", fontWeight: "600", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Your search campaign starts here</div>
          <div style={{ fontSize: "14px", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px", maxWidth: "360px", margin: "0 auto 24px" }}>
            Find a role with Job Search, paste a JD to analyze it, or add a role manually. Every application lives here.
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onOpenSearch} style={{ ...S.btn }}>🔍 Search Jobs</button>
            <button onClick={() => onAddCard({ title: "", company: "", stage: "Radar", jd: "", notes: "", addedAt: Date.now() })} style={{ ...S.btnGhost }}>+ Add manually</button>
          </div>
        </div>
      )}

      {total > 0 && (
        <div style={{ display: "flex", gap: "12px", minWidth: "900px" }}>
          {STAGES.map(stage => {
            const stageCards = byStage[stage] || [];
            const c = STAGE_COLORS[stage];
            return (
              <div key={stage} style={{ flex: 1, minWidth: "160px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", padding: "6px 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.border }} />
                    <span style={{ fontSize: "12px", fontWeight: "600", color: c.text, fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>{stage}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{stageCards.length}</span>
                </div>
                <div style={{ minHeight: "100px" }}>
                  {stageCards.map(card => (
                    <RoleCard key={card.id} card={card}
                      onClick={() => onOpenCard(card.id)}
                      onStageChange={s => onStageChange(card.id, s)}
                      onRemove={() => onRemoveCard(card.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. JOB SEARCH
// ─────────────────────────────────────────────────────────────────────────────

async function scoreJobsAgainstProfile(jobs, profile) {
  const resumeSnippet = (profile.resumeText || profile.background || "").slice(0, 600);
  const profileSummary = `Title: ${profile.title || "Enterprise Transformation Leader"}\nResume: ${resumeSnippet}`;

  const jobsToScore = jobs.slice(0, 50);
  const jobList = jobsToScore.map((j, i) => {
    const raw = (j.job_description || j.description || "")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
    return `${i}: ${j.job_title || j.title || "Unknown"} at ${j.company_name || j.company || "Unknown"} | ${raw}`;
  }).join("\n");

  const text = await callClaude(
    PROMPTS.jobScoring(jobsToScore.length),
    `Candidate:\n${profileSummary}\n\nJobs:\n${jobList}`,
    3000
  );

  const m = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!m) return jobs.map(j => ({ ...j, fitScore: 5, fitReason: "" }));
  try {
    const scores = JSON.parse(m[0]);
    return jobsToScore.map((j, i) => {
      const s = scores.find(x => x.index === i);
      return { ...j, fitScore: s?.score || 5, fitReason: s?.reason || "" };
    });
  } catch { return jobs.map(j => ({ ...j, fitScore: 5, fitReason: "" })); }
}

function JobResultCard({ job, onAnalyze }) {
  const [fetchingJD, setFetchingJD] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const score   = job.fitScore || 0;
  const scoreColor = score >= 8 ? "#4ade80" : score >= 6 ? "#fbbf24" : score >= 4 ? "#fb923c" : "#f87171";
  const title   = job.job_title || job.title || "Unknown Role";
  const company = job.company_name || job.company || "Unknown";
  const location = job.location || job.job_location || "";
  const salary  = job.salary || job.compensation || "";
  const url     = job.job_url || job.url || job.apply_url || "";
  const jdText  = job.job_description || job.description || job.jobDescription || job.snippet || job.fullDescription || "";
  const remote  = (job.workplace_type || "").toLowerCase().includes("remote") || (location || "").toLowerCase().includes("remote");

  return (
    <div style={{ ...S.section, marginBottom: "10px", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flexShrink: 0, width: "42px", height: "42px", borderRadius: "8px", background: `${scoreColor}15`, border: `1.5px solid ${scoreColor}50`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {job.fitScore === null
            ? <Spinner size={14} />
            : <>
                <span style={{ fontSize: "15px", fontWeight: "800", color: scoreColor, fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: "9px", color: scoreColor, fontFamily: "'DM Sans', system-ui, sans-serif" }}>/10</span>
              </>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{title}</div>
              <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {company}
                {location && <span style={{ color: "#6860a0" }}> · {location}</span>}
                {remote   && <span style={{ color: "#4ade80", marginLeft: "6px" }}>Remote</span>}
                {salary   && <span style={{ color: "#fbbf24", marginLeft: "8px" }}>{salary}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px", textDecoration: "none" }}>Apply ↗</a>}
              <button
                onClick={async () => {
                  if (!url) { onAnalyze(jdText, title, company, job.fitScore, job.fitReason); return; }
                  setFetchingJD(true);
                  try {
                    const trigRes = await fetch("/.netlify/functions/fetchJD", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ jobUrl: url }),
                    });
                    const { runId, datasetId } = await trigRes.json();
                    let fullJD = jdText;
                    for (let i = 0; i < 12; i++) {
                      await new Promise(r => setTimeout(r, 6000));
                      try {
                        const st = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
                        const sd = await st.json();
                        if (["SUCCEEDED","FAILED","ABORTED"].includes(sd?.data?.status)) {
                          const dr = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true&limit=1`);
                          const items = await dr.json();
                          if (Array.isArray(items) && items[0]) {
                            const j = items[0];
                            fullJD = j.description || j.jobDescription || j.job_description || j.fullDescription || jdText;
                          }
                          break;
                        }
                      } catch {}
                    }
                    onAnalyze(fullJD, title, company, job.fitScore, job.fitReason);
                  } catch {
                    onAnalyze(jdText, title, company, job.fitScore, job.fitReason);
                  } finally { setFetchingJD(false); }
                }}
                disabled={fetchingJD}
                style={{ ...S.btn, fontSize: "11px", padding: "4px 12px", opacity: fetchingJD ? 0.7 : 1, display: "flex", alignItems: "center", gap: "5px" }}>
                {fetchingJD ? <><Spinner size={10} />Fetching JD…</> : "Analyze"}
              </button>
            </div>
          </div>
          {job.fitReason && (
            <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic", marginBottom: "4px" }}>{job.fitReason}</div>
          )}
          <button onClick={() => setExpanded(!expanded)}
            style={{ background: "none", border: "none", color: "#4f6ef7", cursor: "pointer", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", padding: 0 }}>
            {expanded ? "▲ Hide" : "▼ Preview JD"}
          </button>
          {expanded && jdText && (
            <div
              style={{ marginTop: "10px", fontSize: "13px", color: "#c8c4e8", fontFamily: "Georgia, serif", lineHeight: "1.7", background: "#1e2240", borderRadius: "6px", padding: "12px", maxHeight: "200px", overflowY: "auto" }}
              dangerouslySetInnerHTML={{ __html:
                jdText.slice(0, 1500)
                  .replace(/<script[\s\S]*?<\/script>/gi, "")
                  .replace(/<style[\s\S]*?<\/style>/gi, "")
                  .replace(/<(?!\/?(b|strong|i|em|ul|ol|li|p|br|h[1-6])\b)[^>]+>/gi, " ")
                  .replace(/\s{2,}/g, " ")
                + (jdText.length > 1500 ? "<br/><em style='color:#6860a0'>… click Analyze for full description</em>" : "")
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function JobSearchTab({ profile, onAnalyzeJD, savedJobs, onSaveJobs, savedQueries, onSaveQueries }) {
  const [queries, setQueriesLocal] = useState(savedQueries?.length ? savedQueries : []);
  const setQueries = (q) => {
    const val = typeof q === "function" ? q(queries) : q;
    setQueriesLocal(val);
    onSaveQueries?.(val);
  };
  const [customQuery, setCustomQuery] = useState("");
  const [days, setDays] = useState(3);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [status, setStatus] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [jobs, setJobsLocal] = useState(savedJobs || []);
  const setJobs = (j) => { setJobsLocal(j); onSaveJobs?.(j); };
  const [error, setError] = useState(null);
  const [generatingQueries, setGeneratingQueries] = useState(false);
  const apiLocked = useApiLock();

  useEffect(() => {
    if (!running) { setElapsed(0); return; }
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const cancelSearch = () => {
    setRunning(false);
    setStatus("Running in background — results will appear when ready");
  };

  const generateQueries = async () => {
    setGeneratingQueries(true);
    try {
      const text = await callClaude(
        PROMPTS.searchQueries(profile),
        `Profile: ${profile.title || "Enterprise Transformation Leader"}\n${(profile.resumeText || "").slice(0, 300)}`,
        300
      );
      const m = text.match(/\[[\s\S]*?\]/);
      if (m) setQueries(JSON.parse(m[0]).slice(0, 5));
    } catch {}
    finally { setGeneratingQueries(false); }
  };

  const runSearch = async () => {
    if (running || runningRef.current) return;
    runningRef.current = true;
    setRunning(true); setError(null); setJobs([]);
    const activeQuery = customQuery.trim() || queries[0] || "transformation director";
    setStatus(`Starting search for "${activeQuery}"…`);
    try {
      const triggerRes = await fetch("/.netlify/functions/searchJobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: activeQuery, days, maxItems: 50 }),
      });
      const triggerText = await triggerRes.text();
      if (!triggerRes.ok || triggerText.startsWith("<")) {
        throw new Error(`Function not found (${triggerRes.status}). Check netlify/functions/searchJobs.js is deployed.`);
      }
      const { runId, datasetId, error: triggerErr } = JSON.parse(triggerText);
      if (triggerErr) throw new Error(triggerErr);
      if (!runId) throw new Error("No runId returned");
      if (!APIFY_TOKEN) throw new Error("VITE_APIFY_TOKEN not set in Netlify env vars");

      let lastCount = 0;
      let allRaw = [];
      let runDone = false;
      const startTime = Date.now();

      while (!runDone) {
        await new Promise(r => setTimeout(r, 10000));
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);

        try {
          const st = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
          if (st.ok) {
            const sd = await st.json();
            const s = sd?.data?.status;
            if (s === "SUCCEEDED" || s === "FAILED" || s === "ABORTED") runDone = true;
          }
        } catch {}

        try {
          const dr = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true&limit=100`
          );
          if (dr.ok) {
            const raw = await dr.json();
            const batch = Array.isArray(raw) ? raw : [];
            if (batch.length > lastCount) {
              const normalized = batch.map(j => {
                const description = j.description || j.jobDescription || j.job_description || j.fullDescription || j.snippet || "";
                const title = j.positionName || j.title || j.jobTitle || j.job_title || "";
                const company = j.company || j.companyName || j.company_name || "";
                const location = j.location || j.jobLocation || j.job_location || "";
                const salary = j.salary || j.salaryRange || j.salaryText || "";
                const url = j.externalApplyLink || j.applyLink || j.url || j.job_url || j.jobUrl || j.link || "";
                return { title, company, location, salary, url, description,
                  job_title: title, company_name: company, job_description: description, job_url: url };
              });
              allRaw = normalized;
              lastCount = batch.length;
              const unscored = normalized.slice(0, 15).map(j => ({ ...j, fitScore: null }));
              setJobs(unscored);
              setStatus(runDone
                ? `${batch.length} jobs found — scoring…`
                : `${batch.length} jobs so far… (${elapsedSec}s)`
              );
            } else {
              setStatus(`Scraping… ${elapsedSec}s (${lastCount} found)`);
            }
          }
        } catch {}

        if (Date.now() - startTime > 480000) break;
      }

      if (allRaw.length === 0) { setStatus("No results found"); setRunning(false); return; }

      const seen = new Set();
      const deduped = allRaw.filter(j => {
        const key = `${(j.job_title || j.title || "").toLowerCase()}|${(j.company_name || j.company || "").toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });

      setStatus(`Scoring ${deduped.length} jobs against your profile…`);
      const scored = await scoreJobsAgainstProfile(deduped, profile);
      const top15 = scored.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0)).slice(0, 15);
      setJobs(top15);
      setStatus(`${top15.length} matches — scored and ranked`);
    } catch (e) {
      setError(e.message);
      setStatus("Search failed");
    } finally { setRunning(false); runningRef.current = false; }
  };

  return (
    <div>
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ ...S.label, margin: 0 }}>
            Search Queries{" "}
            <span style={{ fontSize: "10px", color: "#4a4868", textTransform: "none", letterSpacing: 0, fontWeight: "400" }}>(top query runs per search)</span>
          </div>
          <button onClick={generateQueries} disabled={generatingQueries || apiLocked}
            style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
            {generatingQueries ? <><Spinner size={10} />Generating…</> : "✦ Generate from profile"}
          </button>
        </div>
        {queries.length === 0 && (
          <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "10px 0", marginBottom: "8px" }}>
            No search queries yet — click "Generate from profile" to create personalized queries based on your resume.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
          {queries.map((q, i) => (
            <div key={i} style={{ display: "flex", gap: "8px" }}>
              <input value={q} onChange={e => setQueries(qs => qs.map((x, j) => j === i ? e.target.value : x))}
                style={{ ...S.input, flex: 1 }}
                onFocus={e => e.target.style.borderColor = "#4f6ef7"}
                onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
              <button onClick={() => setQueries(qs => qs.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "#6860a0", cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={() => setQueries(qs => [...qs, ""])}
          style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", marginBottom: "16px" }}>+ Add query</button>

        <div style={{ marginBottom: "14px" }}>
          <label style={S.label}>One-time override</label>
          <input value={customQuery} onChange={e => setCustomQuery(e.target.value)}
            placeholder="e.g. VP Technology AI startup remote"
            style={S.input}
            onFocus={e => e.target.style.borderColor = "#4f6ef7"}
            onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ ...S.label, margin: 0 }}>Freshness</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[1, 3, 7, 14].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", background: days === d ? "rgba(79,110,247,0.2)" : "transparent", color: days === d ? "#8aacff" : "#6860a0", borderColor: days === d ? "#4f6ef7" : "#3a3d5c" }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px", flexWrap: "wrap" }}>
        <button onClick={runSearch} disabled={running || apiLocked}
          style={{ ...S.btn, opacity: running || apiLocked ? 0.6 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
          {running ? <><Spinner />Searching…</> : "🔍 Search Jobs"}
        </button>
        {running && (
          <button onClick={cancelSearch}
            style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", color: "#f87171", borderColor: "#6a2a2a" }}>
            ✕ Cancel
          </button>
        )}
        {running && elapsed > 0 && (
          <div style={{ fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {elapsed}s — scraper running, typically 1–3 min
          </div>
        )}
        {status && !running && (
          <div style={{ fontSize: "13px", color: error ? "#f87171" : "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {status}
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: "#f87171", fontSize: "13px", padding: "10px 14px", background: "rgba(248,113,113,0.08)", borderRadius: "6px", border: "1px solid rgba(248,113,113,0.2)", marginBottom: "16px" }}>{error}</div>
      )}

      {jobs.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ ...S.label, margin: 0 }}>Top {jobs.length} matches</div>
            <button onClick={() => { setJobs([]); setStatus(""); setError(null); }}
              style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>✕ Clear results</button>
          </div>
          {jobs.map((job, i) => (
            <JobResultCard key={i} job={job} onAnalyze={onAnalyzeJD} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. JD ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

function JDInput({ jd, setJd }) {
  // Compute cleaned version once for display — do NOT call setJd during render
  const cleanJd = jd
    ? jd.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s{2,}/g, " ").trim()
    : "";
  const hasHtml = jd && jd !== cleanJd && jd.includes("<");

  // Clean HTML out of the stored value on first mount if needed
  useEffect(() => {
    if (hasHtml) setJd(cleanJd);
  }, []); // intentionally run only once on mount

  return (
    <div style={{ marginBottom: "24px" }}>
      <label style={S.label}>Job Description</label>
      <textarea
        value={hasHtml ? cleanJd : jd}
        onChange={e => setJd(e.target.value)}
        rows={8}
        style={S.textarea}
        onFocus={e => e.target.style.borderColor = "#4a4abf"}
        onBlur={e => e.target.style.borderColor = "#3a3d5c"}
      />
    </div>
  );
}

function buildAnalysisSystem(corrections, profile, stories) {
  return PROMPTS.jdAnalyzer(profile, stories, corrections);
}

function AnalysisModal({ score, rationale, gaps, onBuildResume, onResumeOnly, onCorrect, onNewJD, onDismiss }) {
  const verdict =
    score >= 8 ? {
      label: "Excellent Match! 🎯",
      color: "#4ade80",
      border: "rgba(74,222,128,0.25)",
      rec: "This role was made for you. Your background aligns strongly with what they're looking for — let's build materials that make this a no-brainer hire.",
      cta: "Build tailored resume + cover letter",
    } :
    score >= 6 ? {
      label: "Strong Contender ✅",
      color: "#fbbf24",
      border: "rgba(251,191,36,0.25)",
      rec: "You have the core experience this role needs. A few gaps to address, but nothing that should stop you — let's sharpen your materials and get you in the room.",
      cta: "Build tailored resume + cover letter",
    } :
    score >= 4 ? {
      label: "Possible Fit 🤔",
      color: "#fb923c",
      border: "rgba(251,146,60,0.25)",
      rec: "There are real gaps here, but your background has transferable strengths. Consider whether a targeted approach is worth the investment — or correct any gaps the AI may have missed.",
      cta: "Build tailored resume anyway",
    } : {
      label: "Tough Road Ahead 💪",
      color: "#f87171",
      border: "rgba(248,113,113,0.25)",
      rec: "This role has significant gaps from your current profile — and that's okay. If you still want to apply, a clean base resume is your best move. Check if the AI missed anything before deciding.",
      cta: "Apply with base resume",
    };

  return (
    <div
      onClick={onDismiss}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#181a2e", border: `1px solid ${verdict.border}`, borderRadius: "14px", width: "100%", maxWidth: "620px", maxHeight: "88vh", overflowY: "auto", padding: "36px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)", position: "relative" }}>
        <button onClick={onDismiss}
          style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "#a0a0c0", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "80px", fontWeight: "800", lineHeight: 1, color: verdict.color, fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-2px" }}>
            {score}<span style={{ fontSize: "32px", color: "#6060a0", fontWeight: "400" }}>/10</span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: verdict.color, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "10px" }}>{verdict.label}</div>
          <div style={{ fontSize: "15px", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "12px", lineHeight: "1.65", maxWidth: "480px", margin: "12px auto 0" }}>{verdict.rec}</div>
          <div style={{ fontSize: "13px", color: "#7870a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "8px", fontStyle: "italic" }}>{rationale}</div>
        </div>

        <div style={{ background: "rgba(80,80,160,0.12)", border: "1px solid rgba(80,80,160,0.25)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px", color: "#9890c8", lineHeight: "1.55" }}>
          Score reflects keyword and experience alignment — not your full potential. Your judgment supersedes this. If a gap looks wrong, correct it below and we'll re-score.
        </div>

        {gaps.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "12px" }}>Gaps to Review ({gaps.length})</div>
            {gaps.map((gap, i) => (
              <div key={i} style={{ background: "#1e2035", border: "1px solid #2e3050", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>{gap.title}</div>
                <div style={{ fontSize: "13px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6" }}>{gap.assessment}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "12px" }}>What would you like to do?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={onBuildResume}
            style={{ background: verdict.color === "#4ade80" ? "#2d7d46" : "#4f6ef7", color: "#ffffff", border: "none", borderRadius: "8px", padding: "15px 20px", fontSize: "15px", fontWeight: "600", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{verdict.cta}</span>
            <span style={{ fontSize: "13px", opacity: 0.8 }}>→ Resume tab</span>
          </button>
          <button onClick={onResumeOnly}
            style={{ background: "rgba(160,140,220,0.12)", color: "#e8e4f8", border: "1px solid rgba(160,140,220,0.3)", borderRadius: "8px", padding: "13px 20px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Apply with source-of-truth resume only</span>
            <span style={{ fontSize: "12px", opacity: 0.6 }}>no tailoring</span>
          </button>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button onClick={onCorrect}
              style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "8px", padding: "11px 16px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", flex: 1 }}>
              Correct a gap → re-score
            </button>
            <button onClick={onNewJD}
              style={{ background: "rgba(74,222,128,0.08)", color: "#6ab8a8", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", padding: "11px 16px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", flex: 1 }}>
              Try a different role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
            <button onClick={() => toggle(i)}
              style={{ background: gap.flagged ? "#c9a84c" : "transparent", border: `1px solid ${gap.flagged ? "#c9a84c" : "#6860a0"}`, borderRadius: "3px", width: "18px", height: "18px", cursor: "pointer", flexShrink: 0, marginTop: "2px", fontSize: "11px", color: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {gap.flagged ? "✓" : ""}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#c0b0d8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "3px" }}>{gap.title}</div>
              <div style={{ fontSize: "12px", color: "#4a4060", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.5" }}>{gap.assessment}</div>
              {gap.flagged && (
                <div style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a7040", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>Your Correction</div>
                  <textarea value={gap.userCorrection} onChange={e => update(i, e.target.value)}
                    placeholder="e.g. I DO have LSSBB — Intel internal certification plus LinkedIn Learning."
                    rows={3} style={{ ...S.textarea, border: "1px solid #c9a84c" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button onClick={handleSave}
          style={{ background: "#c9a84c", color: "#0f1117", border: "none", borderRadius: "4px", padding: "10px 24px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer" }}>
          Save Corrections
        </button>
        <button onClick={onDone} style={S.btnGhost}>Done</button>
      </div>
    </div>
  );
}

function AnalyzeTab({ jd, setJd, stories, corrections, onSaveCorrections, onBuildResume, onResumeOnly, onNewJD, profile, onAddToTracker }) {
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

  const formatFull = (p) => [
    `FIT SCORE: ${p.score}/10\n${p.rationale}\n`,
    `KEY REQUIREMENTS:\n${p.keyRequirements?.map(r => `• ${r}`).join("\n") || ""}\n`,
    `STRONGEST ANGLES:\n${p.strongestAngles?.map(a => `• ${a.angle}\n  → ${a.why}`).join("\n") || ""}\n`,
    `TOP STORIES:\n${p.topStories?.map(s => `• "${s.story}"\n  → ${s.useFor}`).join("\n") || ""}\n`,
    p.gaps?.length ? `GAPS:\n${p.gaps.map(g => `• ${g.title}\n  ${g.assessment}\n  Framing: ${g.framing}`).join("\n\n")}\n` : "GAPS: None identified.\n",
    `KEYWORDS: ${p.keywords?.join(", ") || ""}`,
  ].join("\n");

  const runWithCorrections = async (activeCorrections) => {
    if (!jd.trim()) return;
    const hasStories = stories && stories.length > 0;
    const storyList = hasStories
      ? stories.map((s, i) => `${i + 1}. "${s.title}" — ${s.competencies.join(", ")} | Result: ${s.result}`).join("\n")
      : "";
    const userCtx = hasStories ? `INTERVIEW STORIES:\n${storyList}\n\n` : "";
    const text = await callClaude(
      buildAnalysisSystem(activeCorrections, profile, stories),
      `${userCtx}Job Description:\n${jd}`,
      3000
    );
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

  const handleSaveCorrections = async (nc) => {
    const merged = { ...corrections, ...nc };
    onSaveCorrections(merged);
    setShowCorrections(false);
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
          onDismiss={() => setShowModal(false)}
        />
      )}

      {/* Score summary retained after modal dismiss */}
      {!showModal && parsedScore !== null && !showCorrections && (
        <div
          onClick={() => setShowModal(true)}
          style={{
            background: parsedScore >= 8 ? "rgba(74,222,128,0.08)" : parsedScore >= 6 ? "rgba(251,191,36,0.08)" : parsedScore >= 4 ? "rgba(251,146,60,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${parsedScore >= 8 ? "rgba(74,222,128,0.3)" : parsedScore >= 6 ? "rgba(251,191,36,0.3)" : parsedScore >= 4 ? "rgba(251,146,60,0.3)" : "rgba(248,113,113,0.3)"}`,
            borderRadius: "8px", padding: "12px 18px", marginBottom: "20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "26px", fontWeight: "800", color: parsedScore >= 8 ? "#4ade80" : parsedScore >= 6 ? "#fbbf24" : parsedScore >= 4 ? "#fb923c" : "#f87171", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {parsedScore}/10
            </span>
            <span style={{ fontSize: "14px", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{parsedRationale}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onAddToTracker && (
              <button
                onClick={e => { e.stopPropagation(); onAddToTracker(); }}
                style={{ ...S.btn, fontSize: "11px", padding: "5px 12px", background: "rgba(79,110,247,0.2)", color: "#8aacff", border: "1px solid #4f6ef7" }}>
                ＋ Add to Tracker
              </button>
            )}
            <span style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>View details →</span>
          </div>
        </div>
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
          <span>✓ {Object.keys(corrections).length} gap correction{Object.keys(corrections).length > 1 ? "s" : ""} saved to your profile — AI will not re-flag these</span>
          <button onClick={() => setShowCorrections(true)} style={{ background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: "12px" }}>View / edit</button>
        </div>
      )}

      {stories.length === 0 && jd.trim() && (
        <div style={{ background: "rgba(79,110,247,0.08)", border: "1px solid rgba(79,110,247,0.2)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#8aacff", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          💡 You're more than your resume — add interview stories in the Stories tab for a deeper, more accurate match. Gap analysis will run on your resume for now.
        </div>
      )}

      <button onClick={run} disabled={!jd.trim() || loading || reScoring || apiLocked}
        style={{ ...S.btn, opacity: !jd.trim() || loading || reScoring || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner /> Analyzing…</> : reScoring ? <><Spinner /> Re-scoring…</> : "Run Gap Analysis"}
      </button>

      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px", wordBreak: "break-word" }}>{error}</div>}
      {showCorrections && parsedGaps.length > 0 && <GapCorrectionPanel gaps={parsedGaps} corrections={corrections} onSave={handleSaveCorrections} onDone={() => setShowCorrections(false)} />}
      {showFull && fullResult && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Full Analysis</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={fullResult} />
              {parsedGaps.length > 0 && (
                <button onClick={() => setShowCorrections(!showCorrections)}
                  style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px", color: "#c9a84c", borderColor: "rgba(201,168,76,0.3)" }}>Correct gaps</button>
              )}
            </div>
          </div>
          <div style={S.resultBox}>{fullResult}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. RESUME TOOLS
// ─────────────────────────────────────────────────────────────────────────────

function ResumeTab({ jd, setJd, resumeOnly, onDownloaded, onSaveToDrive, profile }) {
  const [resume, setResume] = useState(() => getActiveResume(profile));
  useEffect(() => { setResume(getActiveResume(profile)); }, [profile.activeResumeId, profile.resumeVariants, profile.resumeText]);
  const activeVariant = getActiveResumeVariant(profile);

  const [phase, setPhase]                   = useState("idle");
  const [strategy, setStrategy]             = useState(null);
  const [editedStrategy, setEditedStrategy] = useState(null);
  const [finalText, setFinalText]           = useState("");
  const [showResume, setShowResume]         = useState(false);
  const [showPreview, setShowPreview]       = useState(false);
  const [error, setError]                   = useState(null);
  const [downloading, setDownloading]       = useState(false);
  const [saving, setSaving]                 = useState(false);
  const apiLocked = useApiLock();

  const runStrategy = async () => {
    if (!jd.trim()) return;
    setPhase("strategizing"); setError(null); setStrategy(null); setFinalText("");
    try {
      const text = await callClaude(PROMPTS.resumeStrategy(profile), `Job Description:\n${jd}\n\nResume:\n${stripPreIntelRoles(resume)}`, 2500);
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Strategy parse failed — unexpected response format.");
      const parsed = JSON.parse(m[0]);
      setStrategy(parsed);
      setEditedStrategy(JSON.parse(JSON.stringify(parsed)));
      setPhase("review");
    } catch (e) { setError(`Strategy failed: ${e.message}`); setPhase("idle"); }
  };

  const runRender = async () => {
    if (!editedStrategy) return;
    setPhase("rendering"); setError(null);
    try {
      const text = await buildFinalResumeText(resume, editedStrategy, jd);
      setFinalText(text);
      setPhase("done");
    } catch (e) { setError(`Render failed: ${e.message}`); setPhase("review"); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const m = jd.match(/(?:at|for|with|joining)\s+([A-Z][A-Za-z\s&,.]+?)(?:\s+is|\s+are|\s+we|\.|,)/);
      const company = m ? m[1].trim() : "";
      const blob = await buildResumeDocxBlob(finalText, company, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${profile.name || "Resume"}_${company || "Resume"}.docx`;
      a.click(); URL.revokeObjectURL(url);
      if (onDownloaded) onDownloaded(blob);
    } catch (e) { setError(`Download failed: ${e.message}`); }
    finally { setDownloading(false); }
  };

  const handleSaveToDriveBtn = async () => {
    setSaving(true);
    try {
      const m = jd.match(/(?:at|for|with|joining)\s+([A-Z][A-Za-z\s&,.]+?)(?:\s+is|\s+are|\s+we|\.|,)/);
      const company = m ? m[1].trim() : "";
      const blob = await buildResumeDocxBlob(finalText, company, profile);
      if (onSaveToDrive) await onSaveToDrive(blob);
    } catch (e) { setError(`Save failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  const reset = () => { setPhase("idle"); setStrategy(null); setEditedStrategy(null); setFinalText(""); setError(null); };

  return (
    <div>
      {resumeOnly && (
        <div style={{ background: "rgba(180,140,255,0.08)", border: "1px solid rgba(180,140,255,0.2)", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", color: "#b090d8" }}>
          Source-of-truth path — base resume as-is, minimal edits only.
        </div>
      )}
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div>
            <label style={{ ...S.label, margin: 0 }}>Resume Baseline</label>
            {activeVariant && (
              <span style={{ fontSize: "11px", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", marginLeft: "8px" }}>{activeVariant.name}</span>
            )}
          </div>
          <button onClick={() => setShowResume(!showResume)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>{showResume ? "Hide" : "Edit baseline"}</button>
        </div>
        {showResume && <textarea value={resume} onChange={e => setResume(e.target.value)} rows={12} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />}
      </div>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}

      {phase === "idle" && (
        <button onClick={runStrategy} disabled={!jd.trim() || apiLocked}
          style={{ ...S.btn, opacity: !jd.trim() || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
          ✦ Build Resume Strategy
        </button>
      )}
      {phase === "strategizing" && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px" }}>
          <Spinner /> Analyzing JD against your resume…
        </div>
      )}
      {(phase === "review" || phase === "rendering") && editedStrategy && (
        <div style={{ ...S.section, marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ ...S.label, margin: 0 }}>Resume Strategy — Review & Edit</div>
            <button onClick={reset} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>✕ Start over</button>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "8px" }}>Summary Rewrite</div>
            <textarea value={editedStrategy.summaryRewrite || ""}
              onChange={e => setEditedStrategy(s => ({ ...s, summaryRewrite: e.target.value }))}
              rows={4} style={{ ...S.textarea, fontSize: "13px" }}
              onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          </div>
          {editedStrategy.bulletEdits?.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "10px" }}>
                Bullet Edits ({editedStrategy.bulletEdits.length})
              </div>
              {editedStrategy.bulletEdits.map((edit, i) => (
                <div key={i} style={{ background: "#1a1c30", border: "1px solid #2a2c40", borderRadius: "6px", padding: "12px 14px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px", fontStyle: "italic" }}>
                    Original: {edit.original?.slice(0, 80)}{edit.original?.length > 80 ? "…" : ""}
                  </div>
                  <textarea value={edit.revised || ""}
                    onChange={e => setEditedStrategy(s => ({ ...s, bulletEdits: s.bulletEdits.map((b, j) => j === i ? { ...b, revised: e.target.value } : b) }))}
                    rows={2} style={{ ...S.textarea, fontSize: "13px", marginBottom: "4px" }}
                    onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
                  <div style={{ fontSize: "11px", color: "#4ade80", fontFamily: "'DM Sans', system-ui, sans-serif" }}>↑ {edit.reason}</div>
                </div>
              ))}
            </div>
          )}
          {editedStrategy.keywordsToAdd?.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "8px" }}>Keywords to Add</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {editedStrategy.keywordsToAdd.map((kw, i) => (
                  <span key={i} style={{ background: "rgba(79,110,247,0.12)", color: "#8aacff", border: "1px solid rgba(79,110,247,0.3)", borderRadius: "4px", padding: "3px 10px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{kw}</span>
                ))}
              </div>
            </div>
          )}
          {editedStrategy.toDeEmphasize?.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#fb923c", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "8px" }}>De-emphasize</div>
              {editedStrategy.toDeEmphasize.map((item, i) => (
                <div key={i} style={{ fontSize: "13px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "4px 0", borderBottom: "1px solid #1e2030" }}>{item}</div>
              ))}
            </div>
          )}
          <button onClick={runRender} disabled={phase === "rendering" || apiLocked}
            style={{ ...S.btn, opacity: phase === "rendering" || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
            {phase === "rendering" ? <><Spinner />Building resume…</> : "⬇ Render Final Resume"}
          </button>
        </div>
      )}
      {phase === "done" && finalText && (
        <div style={{ ...S.section, marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Final Resume — Ready</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => setShowPreview(!showPreview)} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>{showPreview ? "Hide preview" : "Preview text"}</button>
              <CopyBtn text={finalText} />
              <button onClick={handleDownload} disabled={downloading}
                style={{ ...S.btn, padding: "5px 14px", fontSize: "12px", background: "#3a5abf", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading ? <><Spinner size={12} />…</> : "⬇ Download .docx"}
              </button>
              {onSaveToDrive && (
                <button onClick={handleSaveToDriveBtn} disabled={saving}
                  style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {saving ? <><Spinner size={12} />Saving…</> : "📁 Save to Drive"}
                </button>
              )}
            </div>
          </div>
          {showPreview && <div style={S.resultBox}>{finalText}</div>}
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button onClick={() => setPhase("review")} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>← Revise strategy</button>
            <button onClick={reset} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>Start over</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CoverLetterTab({ jd, setJd, onDownloaded, onSaveToDrive, profile }) {
  const [company, setCompany]         = useState("");
  const [role, setRole]               = useState("");
  const [notes, setNotes]             = useState("");
  const [tone, setTone]               = useState("");
  const [result, setResult]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [extracting, setExtracting]   = useState(false);
  const [error, setError]             = useState(null);
  const apiLocked = useApiLock();

  useEffect(() => {
    if (!jd.trim() || (company && role)) return;
    const t = setTimeout(async () => {
      setExtracting(true);
      try {
        const text = await callClaude(PROMPTS.coverLetterExtract(), jd.slice(0, 1500), 200);
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
      const text = await callClaude(
        PROMPTS.coverLetter(profile, company, role, notes, tone || null),
        `Company: ${company || "the company"}\nRole: ${role || "this position"}\n${notes ? `Context: ${notes}\n` : ""}\nJD:\n${jd}`,
        1500
      );
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await buildCoverLetterDocxBlob(result, company, role, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${profile.name || "CoverLetter"}_${company || "Cover"}.docx`;
      a.click(); URL.revokeObjectURL(url);
      if (onDownloaded) onDownloaded(blob);
    } catch (e) { setError(`Download failed: ${e.message}`); }
    finally { setDownloading(false); }
  };

  const handleSaveToDriveBtn = async () => {
    setSaving(true);
    try {
      const blob = await buildCoverLetterDocxBlob(result, company, role, profile);
      if (onSaveToDrive) await onSaveToDrive(blob);
    } catch (e) { setError(`Save failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  const TONE_OPTIONS = [
    { id: "",          label: "Auto",      desc: "Matches your profile tier" },
    { id: "executive", label: "Executive", desc: "Commercial, boardroom-framed" },
    { id: "warm",      label: "Warm",      desc: "Collaborative, mission-aligned" },
    { id: "concise",   label: "Concise",   desc: "Tight, results-first, 2 paragraphs" },
    { id: "narrative", label: "Narrative", desc: "Opens with a story or insight" },
  ];
  const tierLabels = { student: "student", midlevel: "mid-level", senior: "senior", executive: "executive" };
  const activeTierLabel = tierLabels[profile.profileTier] || "senior";

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div>
          <label style={S.label}>Company Name {extracting && <span style={{ color: "#4a4abf", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>extracting…</span>}</label>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" style={S.input} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        </div>
        <div>
          <label style={S.label}>Role Title</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. VP of Technology" style={S.input} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        </div>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label style={S.label}>Tone</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {TONE_OPTIONS.map(t => (
            <button key={t.id} onClick={() => setTone(t.id)}
              style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", background: tone === t.id ? "rgba(79,110,247,0.15)" : "transparent", color: tone === t.id ? "#8aacff" : "#6860a0", borderColor: tone === t.id ? "#4f6ef7" : "#3a3d5c" }}
              title={t.id === "" ? `Uses ${activeTierLabel}-tier voice by default` : t.desc}>
              {t.label}{t.id === "" && <span style={{ fontSize: "10px", color: tone === "" ? "#6a8ae0" : "#4a4868", marginLeft: "4px" }}>({activeTierLabel})</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Additional Context <span style={{ color: "#6860a0", textTransform: "none", letterSpacing: 0 }}>optional</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Referred by John Smith. Emphasize CCR governance work…" rows={3} style={S.textarea}
          onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
      </div>
      <button onClick={run} disabled={!jd.trim() || loading || apiLocked}
        style={{ ...S.btn, opacity: !jd.trim() || loading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner />Drafting…</> : "Draft Cover Letter"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ ...S.label, margin: 0 }}>Cover Letter Draft</div>
              {tone && <span style={{ fontSize: "11px", color: "#4f6ef7", background: "rgba(79,110,247,0.1)", padding: "2px 8px", borderRadius: "3px" }}>{TONE_OPTIONS.find(t => t.id === tone)?.label}</span>}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={result} />
              <button onClick={handleDownload} disabled={downloading}
                style={{ ...S.btn, padding: "5px 14px", fontSize: "11px", background: downloading ? "#3a3d5c" : "#3a5abf", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading ? <><Spinner size={12} />…</> : "⬇ Download .docx"}
              </button>
              {onSaveToDrive && (
                <button onClick={handleSaveToDriveBtn} disabled={saving}
                  style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {saving ? <><Spinner size={12} />Saving…</> : "📁 Save to Drive"}
                </button>
              )}
            </div>
          </div>
          <div style={S.resultBox}>{result}</div>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button onClick={() => setResult("")} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>↺ Redraft</button>
            <button onClick={() => { setResult(""); setTone(""); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>↺ Change tone</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StoryMatchPanel({ jd, stories }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan]         = useState(false);
  const [error, setError]     = useState(null);
  const apiLocked = useApiLock();

  const run = async () => {
    if (!jd.trim() || stories.length === 0) return;
    setLoading(true); setError(null);
    try {
      const text = await callClaude(PROMPTS.storyMatch(stories), `Job Description:\n${jd.slice(0, 2000)}`, 500);
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error("Could not parse story matches.");
      const parsed = JSON.parse(m[0]);
      setMatches(parsed.map(r => ({ ...r, story: stories[r.index] })).filter(r => r.story));
      setRan(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (stories.length === 0) return null;

  return (
    <div style={{ ...S.section, marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ran ? "14px" : 0 }}>
        <div style={{ ...S.label, margin: 0 }}>Story Match</div>
        {!ran ? (
          <button onClick={run} disabled={!jd.trim() || loading || apiLocked}
            style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px", opacity: !jd.trim() || loading || apiLocked ? 0.5 : 1 }}>
            {loading ? <><Spinner size={10} />Matching…</> : "✦ Match stories to JD"}
          </button>
        ) : (
          <button onClick={() => { setRan(false); setMatches([]); run(); }} disabled={loading || apiLocked}
            style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>↺ Rematch</button>
        )}
      </div>
      {error && <div style={{ fontSize: "12px", color: "#f87171", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "8px" }}>{error}</div>}
      {!ran && !loading && (
        <div style={{ fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "8px" }}>
          Surface the 3 most relevant stories for this role before generating questions.
        </div>
      )}
      {ran && matches.length > 0 && (
        <div>
          {matches.map((m, i) => (
            <div key={i} style={{ background: "#1a1c2e", border: "1px solid #2e3050", borderRadius: "8px", padding: "14px 16px", marginBottom: "8px", display: "flex", gap: "12px" }}>
              <div style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%", background: "rgba(79,110,247,0.15)", border: "1px solid #4f6ef7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#8aacff", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "3px" }}>{m.story.title}</div>
                <div style={{ fontSize: "11px", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "4px" }}>Use for: {m.useFor}</div>
                <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>{m.why}</div>
                {m.story.competencies?.length > 0 && (
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "6px" }}>
                    {m.story.competencies.map(c => (
                      <span key={c} style={{ background: "rgba(180,140,255,0.1)", color: "#b090d0", borderRadius: "3px", padding: "1px 7px", fontSize: "10px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      const text = await callClaude(PROMPTS.interviewPrep(profile, stories, round), `Round: ${round}\n\nJD:\n${jd}`, 3000);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />
      {stories.length > 0 && jd.trim() && (
        <StoryMatchPanel jd={jd} stories={stories} />
      )}
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Interview Round</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["screening","hiring manager","panel","executive","final"].map(r => (
            <button key={r} onClick={() => setRound(r)}
              style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", textTransform: "capitalize", background: round === r ? "rgba(99,140,255,0.15)" : "transparent", color: round === r ? "#8aacff" : "#5a5870", borderColor: round === r ? "#4a6abf" : "#3a3d5c" }}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <button onClick={run} disabled={!jd.trim() || loading || apiLocked}
        style={{ ...S.btn, opacity: !jd.trim() || loading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner />Preparing…</> : `Prep for ${round} interview`}
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
// 14. RESEARCH
// ─────────────────────────────────────────────────────────────────────────────

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
  const anyLoading  = Object.values(steps).some(s => s === "loading");

  const ResultCard = ({ step }) => {
    const src  = parseSources(results[step.key] || "");
    const body = (results[step.key] || "").replace(/Sources?:.*$/is, "").trim();
    return (
      <div style={{ ...S.section, marginBottom: "16px" }}>
        <div style={{ ...S.label, color: "#5858a0", marginBottom: "12px" }}>{step.label}</div>
        <div style={{ fontSize: "14px", lineHeight: "1.8", fontFamily: "Georgia, serif", color: steps[step.key] === "error" ? "#c06060" : "#d0ccee", marginBottom: src.length ? "12px" : 0 }}>{body}</div>
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
      <div style={{ background: "rgba(74,74,191,0.06)", border: "1px solid rgba(74,74,191,0.18)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px", color: "#5858a0", lineHeight: "1.6" }}>
        <strong style={{ color: "#6868b0" }}>Scope:</strong> Only company name is used in search queries — no personal information or resume content is included. Results are AI-synthesized from public sources. Verify all claims before use in interviews.
      </div>

      {confirmPending && !hasRun && (
        <div style={{ ...S.section, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.04)", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#c9a84c", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Ready to research: {effective}</div>
          <div style={{ fontSize: "13px", color: "#6a6040", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "16px" }}>
            The agent will run {RESEARCH_STEPS.length} web searches: overview, leadership, financials, and transformation initiatives. Each result will be sourced and cited.
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={runAll} disabled={apiLocked} style={{ ...S.btn, display: "flex", alignItems: "center", gap: "8px" }}>
              {apiLocked ? <><Spinner />Running…</> : "Confirm — Run Research"}
            </button>
            <button onClick={() => setConfirmPending(false)} style={S.btnGhost}>Not now</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <label style={S.label}>Company {company && !override && <span style={{ color: "#4a4abf", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>from JD: {company}</span>}</label>
        <div style={{ display: "flex", gap: "10px" }}>
          <input value={override} onChange={e => setOverride(e.target.value)} placeholder={company || "Enter company name…"}
            style={{ ...S.input, flex: 1 }} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          <button
            onClick={() => { setResults({}); setSteps({}); setHasRun(false); setConfirmPending(false); setTimeout(runAll, 50); }}
            disabled={!effective || anyLoading || apiLocked}
            style={{ ...S.btn, opacity: !effective || anyLoading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            {anyLoading ? <><Spinner />Researching…</> : hasRun ? "Re-run" : "Run Research"}
          </button>
        </div>
      </div>

      {hasRun && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ ...S.label, marginBottom: "10px" }}>Agent Steps</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {RESEARCH_STEPS.map(step => (
              <div key={step.key} style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px" }}>
                <span style={{ width: "16px", textAlign: "center", flexShrink: 0, color: steps[step.key] === "done" ? "#7adf8a" : steps[step.key] === "error" ? "#df7a7a" : steps[step.key] === "loading" ? "#c9a84c" : "#6860a0" }}>
                  {steps[step.key] === "loading" ? <Spinner size={10} /> : steps[step.key] === "done" ? "✓" : steps[step.key] === "error" ? "✗" : "○"}
                </span>
                <span style={{ color: steps[step.key] === "done" ? "#8888b8" : "#6860a0" }}>{step.label}</span>
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
              <button key={step.key}
                onClick={() => runStep(step)}
                disabled={steps[step.key] === "loading" || steps[step.key] === "done" || apiLocked}
                style={{ ...S.btnGhost, fontSize: "12px", background: steps[step.key] === "done" ? "rgba(99,140,255,0.1)" : "transparent", color: steps[step.key] === "done" ? "#8aacff" : steps[step.key] === "loading" ? "#c9a84c" : "#6ab8a8", borderColor: steps[step.key] === "done" ? "#4a6abf" : "rgba(99,180,160,0.4)", display: "flex", alignItems: "center", gap: "6px" }}>
                {steps[step.key] === "loading" ? <><Spinner size={10} />Loading…</> : step.label}
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
// 15. STORIES
// ─────────────────────────────────────────────────────────────────────────────

function StoryCard({ story, onEdit, onDelete, onStar }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${story.starred ? "rgba(99,140,255,0.3)" : "#2e3050"}`, borderRadius: "8px", marginBottom: "12px", overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", background: expanded ? "rgba(99,140,255,0.04)" : "transparent" }}>
        <button onClick={e => { e.stopPropagation(); onStar(story.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0", marginTop: "1px", flexShrink: 0 }}>
          {story.starred ? "⭐" : "☆"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#d8d0f0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>{story.title}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Tag label={story.company} color="rgba(99,140,255,0.12)" textColor="#7a9aef" />
            <Tag label={story.role} />
            {story.competencies.map(c => <Tag key={c} label={c} color="rgba(180,140,255,0.1)" textColor="#b090d0" />)}
          </div>
        </div>
        <div style={{ color: "#3e3a4e", fontSize: "18px", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</div>
      </div>
      {expanded && (
        <div style={{ padding: "0 20px 20px 48px", borderTop: "1px solid #1a1a2a" }}>
          {[
            { l: "S — Situation", k: "situation", c: "#6b8080" },
            { l: "T — Task",      k: "task",      c: "#6b7a80" },
            { l: "A — Action",    k: "action",    c: "#6b6880" },
            { l: "R — Result",    k: "result",    c: "#7a8060" },
          ].map(({ l, k, c }) => (
            <div key={k} style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: c, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "6px" }}>{l}</div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#b0a8c0", fontFamily: "Georgia, serif" }}>{story[k]}</div>
            </div>
          ))}
          {story.tags?.length > 0 && (
            <div style={{ marginTop: "16px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {story.tags.map(t => <Tag key={t} label={`#${t}`} color="rgba(255,255,255,0.04)" textColor="#8880b8" />)}
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

function StoryEditor({ story, onSave, onCancel }) {
  const blank = { id: generateId(), title: "", company: "", role: "", competencies: [], situation: "", task: "", action: "", result: "", tags: "", starred: false };
  const [form, setForm] = useState(story ? { ...story, tags: story.tags?.join(", ") || "" } : blank);
  const field = (key, label, multi = false, hint = "") => (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ ...S.label, color: "#6860a0" }}>
        {label}
        {hint && <span style={{ color: "#3e3a50", marginLeft: "8px", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>{hint}</span>}
      </label>
      {multi
        ? <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={4} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        : <input type="text" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={S.input} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
      }
    </div>
  );
  return (
    <div style={{ background: "#1e2035", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "28px" }}>
      <div style={{ fontSize: "16px", fontWeight: "600", color: "#e0dcf4", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>
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
            <CompBadge key={c} label={c} active={form.competencies.includes(c)}
              onClick={() => setForm(f => ({ ...f, competencies: f.competencies.includes(c) ? f.competencies.filter(x => x !== c) : [...f.competencies, c] }))} />
          ))}
        </div>
      </div>
      {field("situation", "S — Situation", true, "Context")}
      {field("task",      "T — Task",      true, "Your responsibility")}
      {field("action",    "A — Action",    true, "What you did")}
      {field("result",    "R — Result",    true, "Quantified outcomes")}
      {field("tags", "Tags", false, "comma-separated")}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={() => {
          if (!form.title.trim()) return;
          onSave({ ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) });
        }} style={S.btn}>Save Story</button>
        <button onClick={onCancel} style={S.btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

function MyStoriesTab({ profile, stories, setStories }) {
  const [mode, setMode] = useState("view"); // view | edit | extract | interview-pick | interview-chat | interview-review
  const [editing, setEditing] = useState(null);
  const [filterComp, setFilterComp] = useState(null);
  const [filterStarred, setFilterStarred] = useState(false);
  const [search, setSearch] = useState("");

  // Extract state
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [extractError, setExtractError] = useState(null);

  // Interview state
  const [bulletPoints, setBulletPoints] = useState([]);
  const [activeBullet, setActiveBullet] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [builtStory, setBuiltStory] = useState(null);
  const [customBullet, setCustomBullet] = useState("");

  const apiLocked = useApiLock();
  const sub = { fontSize: "13px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.65" };

  // Library handlers
  const handleSave   = s  => { setStories(p => p.find(x => x.id === s.id) ? p.map(x => x.id === s.id ? s : x) : [...p, s]); setMode("view"); setEditing(null); };
  const handleDelete = id => { if (window.confirm("Delete this story?")) setStories(p => p.filter(s => s.id !== id)); };
  const handleStar   = id => setStories(p => p.map(s => s.id === id ? { ...s, starred: !s.starred } : s));

  const filtered = stories.filter(s => {
    if (filterStarred && !s.starred) return false;
    if (filterComp && !s.competencies.includes(filterComp)) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.company.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)) || s.result.toLowerCase().includes(q);
    }
    return true;
  });

  const repairJSON = (str) => {
    // Remove control characters inside strings (the main culprit)
    let s = str
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")  // control chars except \t \n \r
      .replace(/\t/g, " ")                                // tabs → space
      .replace(/\r?\n/g, " ")                             // newlines → space (inside strings)
      .replace(/[\u2018\u2019]/g, "'")                    // curly single quotes → straight
      .replace(/[\u201c\u201d]/g, '"')                    // curly double quotes → straight
      .replace(/\u2014/g, " - ")                          // em dash → hyphen (safe in JSON)
      .replace(/\u2013/g, "-")                            // en dash
      .replace(/\\'/g, "'")                               // escaped single quotes (invalid in JSON)
      .replace(/,\s*([}\]])/g, "$1");                     // trailing commas
    return s;
  };

  const handleExtract = async () => {
    setMode("extract"); setExtracting(true); setExtractError(null); setExtracted([]);
    try {
      const resumeSlice = (profile.resumeText || "").slice(0, 4000);
      const text = await callClaude(PROMPTS.storyExtract(profile), resumeSlice, 3000);

      // Extract the JSON array from the response
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error("No stories found in resume — try adding more detail to your resume text");

      let parsed;
      // First attempt: raw parse
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        // Second attempt: repair then parse
        try {
          parsed = JSON.parse(repairJSON(m[0]));
        } catch (e2) {
          // Third attempt: extract individual story objects and parse each separately
          const objects = m[0].match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g);
          if (objects && objects.length > 0) {
            parsed = objects.map(o => {
              try { return JSON.parse(repairJSON(o)); }
              catch { return null; }
            }).filter(Boolean);
            if (parsed.length === 0) throw new Error("Could not parse any stories — try again");
          } else {
            throw new Error("Resume extraction returned malformed data — try again");
          }
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("No stories could be extracted — ensure your resume text is pasted correctly");
      }

      const withIds = parsed.map(s => ({ ...s, id: generateId(), starred: false, tags: s.tags || [] }));
      setExtracted(withIds);
      setSelectedIds(new Set(withIds.map(s => s.id)));
    } catch (e) { setExtractError(`Extraction failed: ${e.message}`); }
    finally { setExtracting(false); }
  };

  const parseBullets = async () => {
    if (!profile.resumeText) return;
    setChatLoading(true);
    try {
      const text = await callClaude(
        `Extract 6-10 achievement bullet points from this resume. Return ONLY a JSON array of strings — each a single bullet mentioning a result, metric, or notable action. No preamble.`,
        profile.resumeText.slice(0, 4000),
        800
      );
      const m = text.match(/\[[\s\S]*\]/);
      if (m) setBulletPoints(JSON.parse(m[0]));
    } catch {}
    finally { setChatLoading(false); }
  };

  const saveExtracted = () => {
    const toAdd = extracted.filter(s => selectedIds.has(s.id));
    const existingIds = new Set(stories.map(s => s.id));
    setStories(p => [...p, ...toAdd.filter(s => !existingIds.has(s.id))]);
    setExtracted([]); setSelectedIds(new Set()); setMode("view");
  };

  const startInterview = (bullet) => {
    setActiveBullet(bullet);
    setBuiltStory({ situation: "", task: "", action: "", result: "", hook: "", title: "", company: "", role: "", competencies: [], tags: [] });
    const opener = `Let's turn this into a polished interview story:

"${bullet}"

I'll walk you through the **STAR format** — the structure most interviewers use to evaluate behavioral answers:

- **S — Situation:** Sets the scene. Answers *"Tell me about a time when…"*
- **T — Task:** Your specific responsibility. Answers *"What were you accountable for?"*
- **A — Action:** What YOU did. Answers *"Walk me through your approach."*
- **R — Result:** The outcome. Answers *"What was the impact?"*

We'll also build a **Hook** — a one-sentence opener leading with the result, for when you only have 30 seconds on a phone screen.

Let's start with **Situation**. What was going on in the organization — what was the problem, challenge, or context that made this work necessary?`;
    setMessages([{ role: "assistant", content: opener }]);
    setMode("interview-chat");
  };

  const handleSend = async () => {
    if (!userInput.trim() || chatLoading) return;
    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages); setUserInput(""); setChatLoading(true);
    try {
      const history = newMessages.map(m => `${m.role === "user" ? "Candidate" : "Coach"}: ${m.content}`).join("\n\n");
      const response = await callClaude(
        PROMPTS.storyInterview(profile, builtStory),
        `Conversation so far:\n${history}\n\nBullet point being developed: "${activeBullet}"`,
        1000
      );
      const jsonMatch = response.match(/\{"complete":\s*true[\s\S]*?\}/);
      if (jsonMatch) {
        const completed = JSON.parse(jsonMatch[0]);
        setBuiltStory(prev => ({
          ...prev, id: generateId(),
          situation: completed.situation || prev.situation,
          task:      completed.task      || prev.task,
          action:    completed.action    || prev.action,
          result:    completed.result    || prev.result,
          hook:      completed.hook      || prev.hook,
          title: completed.result?.split(".")[0]?.slice(0, 60) || activeBullet.slice(0, 60),
          starred: false, tags: [],
        }));
        setMode("interview-review");
        setMessages(m => [...m, { role: "assistant", content: "Perfect — I have everything I need. Here's your complete story. Review and edit below before saving." }]);
      } else {
        setMessages(m => [...m, { role: "assistant", content: response }]);
      }
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Sorry, something went wrong: ${e.message}` }]);
    }
    finally { setChatLoading(false); }
  };

  const saveBuilt = () => {
    if (builtStory) {
      const existingIds = new Set(stories.map(s => s.id));
      if (!existingIds.has(builtStory.id)) setStories(p => [...p, builtStory]);
      setBuiltStory(null); setMessages([]); setActiveBullet(null); setMode("view");
    }
  };

  const backToView = () => { setMode("view"); setEditing(null); setExtracted([]); setMessages([]); setBuiltStory(null); };

  // ── EDIT mode ──
  if (mode === "edit") return (
    <div>
      <button onClick={backToView} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px", marginBottom: "20px" }}>← Back to My Stories</button>
      <StoryEditor story={editing === "new" ? null : editing} onSave={handleSave} onCancel={backToView} />
    </div>
  );

  // ── EXTRACT mode ──
  if (mode === "extract") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={backToView} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>← Back</button>
        <div style={{ fontSize: "18px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Extract from Resume</div>
      </div>
      {extracting ? (
        <div style={{ ...S.section, textAlign: "center", padding: "48px" }}>
          <div style={{ marginBottom: "16px" }}><Spinner size={28} /></div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Reading your resume…</div>
          <div style={sub}>Identifying your strongest achievements and building STAR stories</div>
        </div>
      ) : extractError ? (
        <div style={S.section}>
          <div style={{ color: "#f87171", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "16px" }}>{extractError}</div>
          <button onClick={handleExtract} style={S.btn}>Try again</button>
        </div>
      ) : extracted.length > 0 ? (
        <div>
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={sub}>{extracted.length} stories found — select which to add to your library</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setSelectedIds(new Set(extracted.map(s => s.id)))} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>All</button>
              <button onClick={() => setSelectedIds(new Set())} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>None</button>
              <button onClick={saveExtracted} disabled={selectedIds.size === 0}
                style={{ ...S.btn, opacity: selectedIds.size === 0 ? 0.5 : 1, padding: "8px 18px" }}>
                Add {selectedIds.size} to Library
              </button>
            </div>
          </div>
          {extracted.map(story => {
            const selected = selectedIds.has(story.id);
            return (
              <div key={story.id}
                onClick={() => setSelectedIds(prev => { const n = new Set(prev); selected ? n.delete(story.id) : n.add(story.id); return n; })}
                style={{ ...S.section, border: `1px solid ${selected ? "#4f6ef7" : "#2e3050"}`, cursor: "pointer", marginBottom: "12px", transition: "border-color 0.15s" }}>
                <div style={{ display: "flex", gap: "14px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "4px", border: `2px solid ${selected ? "#4f6ef7" : "#3a3d5c"}`, background: selected ? "#4f6ef7" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                    {selected && <span style={{ color: "#fff", fontSize: "12px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>{story.title}</div>
                    <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>{story.company} · {story.role}</div>
                    {story.hook && (
                      <div style={{ fontSize: "13px", color: "#fbbf24", fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: "10px", padding: "8px 12px", background: "rgba(251,191,36,0.06)", borderLeft: "3px solid rgba(251,191,36,0.4)", borderRadius: "0 4px 4px 0" }}>"{story.hook}"</div>
                    )}
                    {[["S", story.situation], ["T", story.task], ["A", story.action], ["R", story.result]].map(([l, v]) => v && (
                      <div key={l} style={{ marginBottom: "5px" }}>
                        <span style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600" }}>{l} </span>
                        <span style={{ fontSize: "13px", color: "#c8c4e8", fontFamily: "Georgia, serif", lineHeight: "1.6" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  // ── INTERVIEW PICK ──
  if (mode === "interview-pick") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={backToView} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>← Back</button>
        <div style={{ fontSize: "18px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Build a Story</div>
      </div>

      <div style={{ ...S.section, border: "1px solid rgba(79,110,247,0.3)", marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "10px" }}>How STAR stories work in interviews</div>
        <div style={{ ...sub, marginBottom: "14px" }}>Behavioral questions — "Tell me about a time when…", "Walk me through how you handled…" — are designed to hear STAR stories. Interviewers probe each layer.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
          {[
            { l: "S", name: "Situation", desc: "Context and challenge",          color: "#6080ef" },
            { l: "T", name: "Task",      desc: "Your specific accountability",   color: "#8b5cf6" },
            { l: "A", name: "Action",    desc: "What YOU did — specific, active",color: "#4f6ef7" },
            { l: "R", name: "Result",    desc: "Quantified outcomes",             color: "#10b981" },
          ].map(({ l, name, desc, color }) => (
            <div key={l} style={{ background: "#1e2240", borderRadius: "6px", padding: "10px", border: `1px solid ${color}33` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginBottom: "4px" }}>
                <span style={{ fontSize: "16px", fontWeight: "800", color, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{l}</span>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{name}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#7870a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {chatLoading && bulletPoints.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "20px" }}>
          <Spinner />Reading your resume for achievements…
        </div>
      )}

      {bulletPoints.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ ...S.label, marginBottom: "10px" }}>Achievements from your resume — click one to develop</div>
          {bulletPoints.map((b, i) => (
            <div key={i} onClick={() => startInterview(b)}
              style={{ ...S.section, cursor: "pointer", padding: "14px 18px", marginBottom: "8px", transition: "border-color 0.15s, background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f6ef7"; e.currentTarget.style.background = "#1e2240"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3050"; e.currentTarget.style.background = "#181a2e"; }}>
              <div style={{ fontSize: "14px", color: "#d8d4f0", fontFamily: "Georgia, serif", lineHeight: "1.6" }}>{b}</div>
              <div style={{ fontSize: "11px", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "5px" }}>Click to build this story →</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...S.label, marginBottom: "8px" }}>Or describe your own achievement</div>
      <textarea value={customBullet} onChange={e => setCustomBullet(e.target.value)}
        placeholder="e.g. Led migration to NetSuite, delivered on time and under budget…" rows={3}
        style={S.textarea} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
      <button onClick={() => { if (customBullet.trim()) startInterview(customBullet.trim()); }}
        disabled={!customBullet.trim()}
        style={{ ...S.btn, marginTop: "12px", opacity: !customBullet.trim() ? 0.5 : 1 }}>
        Build this story
      </button>
    </div>
  );

  // ── INTERVIEW CHAT ──
  if (mode === "interview-chat") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <button onClick={() => setMode("interview-pick")} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>← Back</button>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Building your story</div>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { letter: "S", label: "Situation", q: "\"Tell me about a time when…\"", color: "#6080ef" },
          { letter: "T", label: "Task",      q: "\"What were you responsible for?\"", color: "#8b5cf6" },
          { letter: "A", label: "Action",    q: "\"Walk me through your approach.\"", color: "#4f6ef7" },
          { letter: "R", label: "Result",    q: "\"What was the impact?\"",           color: "#10b981" },
        ].map(({ letter, label, q, color }) => (
          <div key={letter} style={{ flex: "1", minWidth: "110px", background: "#181a2e", border: `1px solid ${color}44`, borderRadius: "6px", padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginBottom: "2px" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{letter}</span>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</span>
            </div>
            <div style={{ fontSize: "10px", color: "#5860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>{q}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px", padding: "20px", marginBottom: "14px", maxHeight: "380px", overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "14px", display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? "#4f6ef7" : "#1e2240", color: m.role === "user" ? "#fff" : "#d8d4f0", fontSize: "14px", fontFamily: m.role === "user" ? "'DM Sans', system-ui, sans-serif" : "Georgia, serif", lineHeight: "1.65", whiteSpace: "pre-line" }}>
              {m.content}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px" }}>
            <Spinner />Thinking…
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <textarea value={userInput} onChange={e => setUserInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type your answer… (Enter to send, Shift+Enter for new line)" rows={3}
          style={{ ...S.textarea, flex: 1 }} disabled={chatLoading}
          onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        <button onClick={handleSend} disabled={!userInput.trim() || chatLoading || apiLocked}
          style={{ ...S.btn, alignSelf: "flex-end", padding: "12px 20px" }}>Send</button>
      </div>
    </div>
  );

  // ── INTERVIEW REVIEW ──
  if (mode === "interview-review" && builtStory) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button onClick={() => setMode("interview-pick")} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>← Build another</button>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Review your story</div>
      </div>
      <div style={{ ...sub, marginBottom: "20px" }}>Edit anything before saving to your library.</div>
      {[
        { key: "title",     label: "Story Title" },
        { key: "company",   label: "Company" },
        { key: "role",      label: "Role / Title" },
        { key: "hook",      label: "Hook — one powerful sentence leading with the result" },
        { key: "situation", label: "S — Situation", multi: true },
        { key: "task",      label: "T — Task",      multi: true },
        { key: "action",    label: "A — Action",    multi: true },
        { key: "result",    label: "R — Result",    multi: true },
      ].map(({ key, label, multi }) => (
        <div key={key} style={{ marginBottom: "16px" }}>
          <label style={S.label}>{label}</label>
          {multi
            ? <textarea value={builtStory[key] || ""} onChange={e => setBuiltStory(s => ({ ...s, [key]: e.target.value }))} rows={3} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            : <input type="text" value={builtStory[key] || ""} onChange={e => setBuiltStory(s => ({ ...s, [key]: e.target.value }))} style={S.input} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          }
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={saveBuilt} style={S.btn}>Save to Library</button>
        <button onClick={() => setMode("interview-pick")} style={S.btnGhost}>Start another</button>
      </div>
    </div>
  );

  // ── MAIN VIEW ──
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #1e2240 0%, #1a1e38 100%)", border: "1px solid rgba(79,110,247,0.3)", borderRadius: "12px", padding: "24px 28px", marginBottom: "28px" }}>
        <div style={{ fontSize: "17px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "10px" }}>
          Your stories are your competitive edge 🏆
        </div>
        <div style={{ fontSize: "14px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.7", marginBottom: "18px" }}>
          Strong STAR stories power every part of NarrativeOS — they sharpen your JD fit analysis, strengthen your cover letter, and prepare you for behavioral interviews. Don't limit yourself to your resume.
          <strong style={{ color: "#c8c4e8" }}> Share a success that isn't on paper yet.</strong> A promotion you drove, a team you turned around, a result that surprised even you.
        </div>
        <div style={{ fontSize: "13px", color: "#7870a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "18px" }}>
          💡 <em>Tip: Stories with specific numbers — "$X saved", "Y% improvement", "Z people impacted" — are 3× more memorable in interviews.</em>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => { setMode("interview-pick"); if (profile.resumeText && bulletPoints.length === 0) parseBullets(); }}
            style={{ ...S.btn, fontSize: "13px", padding: "9px 18px", display: "flex", alignItems: "center", gap: "8px" }}>
            💬 Tell me a success story
          </button>
          {profile.resumeText && (
            <button onClick={handleExtract}
              style={{ ...S.btn, background: "#2d4a8a", fontSize: "13px", padding: "9px 18px", display: "flex", alignItems: "center", gap: "8px" }}>
              📄 Extract from my resume
            </button>
          )}
          <button onClick={() => { setEditing("new"); setMode("edit"); }}
            style={{ ...S.btnGhost, fontSize: "13px", padding: "9px 18px" }}>
            ✏️ Write a story manually
          </button>
        </div>
      </div>

      {stories.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories…"
              style={{ ...S.input, width: "200px" }}
              onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            <button onClick={() => setFilterStarred(!filterStarred)}
              style={{ ...S.btnGhost, fontSize: "12px", padding: "7px 12px", background: filterStarred ? "rgba(99,140,255,0.15)" : "transparent", color: filterStarred ? "#8aacff" : "#8880b8", borderColor: filterStarred ? "#4a6abf" : "#3a3d5c" }}>
              ⭐ Starred
            </button>
            <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginLeft: "auto" }}>
              {stories.length} {stories.length === 1 ? "story" : "stories"} · {stories.filter(s => s.starred).length} starred
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
            <CompBadge label="All" active={!filterComp} onClick={() => setFilterComp(null)} />
            {COMPETENCIES.map(c => <CompBadge key={c} label={c} active={filterComp === c} onClick={() => setFilterComp(filterComp === c ? null : c)} />)}
          </div>
          {filtered.length === 0 ? (
            <div style={{ color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px", padding: "32px", textAlign: "center", border: "1px dashed #2e3050", borderRadius: "8px" }}>
              No stories match.{" "}
              <button onClick={() => { setFilterComp(null); setFilterStarred(false); setSearch(""); }} style={{ background: "none", border: "none", color: "#4f6ef7", cursor: "pointer", fontSize: "14px" }}>Clear filters</button>
            </div>
          ) : (
            filtered.map(s => <StoryCard key={s.id} story={s} onEdit={s => { setEditing(s); setMode("edit"); }} onDelete={handleDelete} onStar={handleStar} />)
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📖</div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#9890b8", marginBottom: "8px" }}>Your story library is empty</div>
          <div style={{ fontSize: "13px", color: "#6860a0" }}>Use the buttons above to add your first story — it takes less than 5 minutes.</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. PROFILE
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
        name:     contact.name     || profile.name,
        phone:    contact.phone    || profile.phone,
        email:    contact.email    || profile.email,
        address:  contact.address  || profile.address,
        linkedin: contact.linkedin || profile.linkedin,
        website:  contact.website  || profile.website,
        title:    contact.title    || profile.title,
        resumeText: text,
        resumeUploaded: true,
      });
    } catch (e) { setError(`Extraction failed: ${e.message}`); setExtracting(false); }
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ fontSize: "18px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>
        Set up {profile.displayName || profile.name || "your"} profile
      </div>
      <div style={{ fontSize: "13px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "28px" }}>
        Upload or paste your resume. NarrativeOS will extract your contact info and use your resume as the baseline for tailoring. Your data stays in your browser.
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("resume-upload-input").click()}
        style={{
          border: `1.5px dashed ${dragOver ? "#4a4abf" : "#2e2e42"}`,
          borderRadius: "6px", padding: "24px", textAlign: "center",
          marginBottom: "16px", cursor: "pointer",
          background: dragOver ? "rgba(74,74,191,0.05)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s",
        }}>
        <input id="resume-upload-input" type="file" accept=".docx,.txt" style={{ display: "none" }} onChange={handleFile} />
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
        {fileName
          ? <div style={{ color: "#4a4abf", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px" }}>✓ {fileName}</div>
          : <div style={{ color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px" }}>Drop DOCX here, or click to browse<br /><span style={{ fontSize: "11px", color: "#6060a0" }}>or paste text below</span></div>
        }
      </div>

      <textarea value={text} onChange={e => { setText(e.target.value); setFileName(""); }}
        placeholder="Paste resume text here…" rows={8}
        style={{ ...S.textarea, marginBottom: "16px" }}
        onFocus={e => e.target.style.borderColor = "#4a4abf"}
        onBlur={e => e.target.style.borderColor = "#3a3d5c"} />

      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleContinue} disabled={!text.trim() || extracting}
          style={{ ...S.btn, opacity: !text.trim() || extracting ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
          {extracting ? <><Spinner />Extracting contact info…</> : "Set Up Profile"}
        </button>
        <button onClick={onSkip} style={{ ...S.btnGhost, color: "#9890b8" }}>Skip for now</button>
      </div>
    </div>
  );
}

function ResumeVariantManager({ profile, onUpdateProfile }) {
  const [adding, setAdding]       = useState(false);
  const [newName, setNewName]     = useState("");
  const [newText, setNewText]     = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");

  const variants = (() => {
    if (profile.resumeVariants?.length) return profile.resumeVariants;
    if (profile.resumeText) return [{ id: "v1", name: "Base Resume", text: profile.resumeText, createdAt: Date.now() }];
    return [];
  })();
  const activeId = profile.activeResumeId || variants[0]?.id || null;

  const saveVariants = (updated, newActiveId) => {
    onUpdateProfile({ ...profile, resumeVariants: updated, activeResumeId: newActiveId ?? activeId });
  };
  const setActive = (id) => onUpdateProfile({ ...profile, activeResumeId: id });
  const addVariant = () => {
    if (!newName.trim() || !newText.trim()) return;
    const v = { id: generateId(), name: newName.trim(), text: newText.trim(), createdAt: Date.now() };
    saveVariants([...variants, v], v.id);
    setNewName(""); setNewText(""); setAdding(false);
  };
  const renameVariant = (id) => {
    saveVariants(variants.map(v => v.id === id ? { ...v, name: editName.trim() || v.name } : v), activeId);
    setEditingId(null); setEditName("");
  };
  const deleteVariant = (id) => {
    if (variants.length === 1) return;
    if (!window.confirm("Delete this resume variant?")) return;
    const updated = variants.filter(v => v.id !== id);
    saveVariants(updated, id === activeId ? updated[0]?.id : activeId);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ ...S.label, margin: 0 }}>Resume Variants ({variants.length})</div>
        <button onClick={() => setAdding(!adding)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>{adding ? "Cancel" : "+ Add variant"}</button>
      </div>
      {variants.map(v => (
        <div key={v.id} style={{ background: v.id === activeId ? "rgba(79,110,247,0.08)" : "#1a1c2e", border: `1px solid ${v.id === activeId ? "#4f6ef7" : "#2e3050"}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingId === v.id ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...S.input, fontSize: "13px", padding: "4px 8px" }} autoFocus onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
                <button onClick={() => renameVariant(v.id)} style={{ ...S.btn, fontSize: "11px", padding: "4px 10px" }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>Cancel</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: v.id === activeId ? "#c8d8ff" : "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {v.name}{v.id === activeId && <span style={{ fontSize: "10px", color: "#4f6ef7", marginLeft: "8px", fontWeight: "400" }}>ACTIVE</span>}
                </div>
                <div style={{ fontSize: "11px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2px" }}>
                  {v.text.length.toLocaleString()} chars{v.createdAt && ` · ${new Date(v.createdAt).toLocaleDateString()}`}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {v.id !== activeId && <button onClick={() => setActive(v.id)} style={{ ...S.btn, fontSize: "11px", padding: "4px 12px" }}>Use</button>}
            <button onClick={() => { setEditingId(v.id); setEditName(v.name); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>Rename</button>
            {variants.length > 1 && <button onClick={() => deleteVariant(v.id)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px", color: "#f87171", borderColor: "#6a2a2a" }}>✕</button>}
          </div>
        </div>
      ))}
      {adding && (
        <div style={{ ...S.section, marginTop: "12px" }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={S.label}>Variant Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Transformation Focus, Technical Lead, Startup" style={S.input} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <label style={S.label}>Resume Text</label>
            <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Paste this variant's resume text here…" rows={10} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={addVariant} disabled={!newName.trim() || !newText.trim()} style={{ ...S.btn, opacity: !newName.trim() || !newText.trim() ? 0.5 : 1 }}>Save variant</button>
            <button onClick={() => { setAdding(false); setNewName(""); setNewText(""); }} style={{ ...S.btnGhost, color: "#6860a0" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingFlow({ user, profile, onComplete }) {
  const [step, setStep]                     = useState(1);
  const [uploadedProfile, setUploadedProfile] = useState(null);
  const [form, setForm]                     = useState({});
  const [tier, setTier]                     = useState("senior");
  const [extractingStories, setExtractingStories] = useState(false);
  const [stories, setStories]               = useState([]);
  const [storyError, setStoryError]         = useState(null);

  const handleUploadComplete = (p) => {
    setUploadedProfile(p);
    setForm({
      name: p.name || user?.user_metadata?.full_name || "",
      phone: p.phone || "", email: p.email || user?.email || "",
      address: p.address || "Bellingham, WA", linkedin: p.linkedin || "",
      website: p.website || "", title: p.title || "", background: p.background || "",
    });
    setStep(2);
  };

  const handleSelectTier = async (selectedTier) => {
    setTier(selectedTier); setStep(4);
    setExtractingStories(true); setStoryError(null);
    try {
      const profileForExtract = { ...uploadedProfile, ...form, profileTier: selectedTier };
      const text = await callClaude(
        PROMPTS.storyExtractOnboard(profileForExtract),
        `Resume:\n${(uploadedProfile?.resumeText || "").slice(0, 4000)}`,
        2500
      );
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error("Could not parse stories from resume.");
      const parsed = JSON.parse(m[0]);
      setStories(parsed.map(s => ({ ...s, id: generateId(), starred: false, tags: Array.isArray(s.tags) ? s.tags : [] })));
    } catch (e) { setStoryError(e.message); }
    finally { setExtractingStories(false); }
  };

  const handleFinish = (keepStories) => {
    const newVariant = uploadedProfile?.resumeText
      ? { id: generateId(), name: "Base Resume", text: uploadedProfile.resumeText, createdAt: Date.now() }
      : null;
    const finalProfile = {
      ...uploadedProfile, ...form, profileTier: tier, resumeUploaded: true,
      resumeVariants: newVariant ? [newVariant] : [],
      activeResumeId: newVariant?.id || null,
    };
    onComplete(finalProfile, keepStories ? stories : []);
  };

  const field = (key, label) => (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}</label>
      <input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={S.input} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
    </div>
  );

  const TIERS = [
    { id: "student",   label: "Student / Entry",   desc: "First job, internship, or career pivot" },
    { id: "midlevel",  label: "Mid-level",          desc: "3–8 years, individual contributor or first-time manager" },
    { id: "senior",    label: "Senior / Director",  desc: "8–15 years, leading teams or programs" },
    { id: "executive", label: "VP / Executive",     desc: "15+ years, P&L, C-suite, board exposure" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "580px" }}>
        <div style={{ display: "flex", gap: "6px", marginBottom: "36px" }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{ flex: 1, height: "3px", borderRadius: "2px", background: n <= step ? "#4f6ef7" : "#2e3050", transition: "background 0.3s" }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>Welcome to NarrativeOS</div>
            <div style={{ fontSize: "14px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "32px" }}>Let's get your profile set up. Upload your resume and we'll do the rest.</div>
            <ResumeUploadGate profile={profile} onComplete={handleUploadComplete}
              onSkip={() => { setUploadedProfile({ ...profile }); setForm({ name: profile.name || "", email: user?.email || "", address: "Bellingham, WA" }); setStep(2); }} />
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>Confirm your profile</div>
            <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>We extracted this from your resume — fix anything that's off.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>{field("name","Full Name")}</div><div>{field("phone","Phone")}</div>
              <div>{field("email","Email")}</div><div>{field("address","City, State")}</div>
              <div>{field("linkedin","LinkedIn")}</div><div>{field("website","Website")}</div>
            </div>
            {field("title","Professional Title")}
            <div style={{ marginBottom: "20px" }}>
              <label style={S.label}>Background</label>
              <textarea value={form.background || ""} onChange={e => setForm(f => ({ ...f, background: e.target.value }))}
                rows={3} style={S.textarea} placeholder="Brief summary of your experience and what you're known for…"
                onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setStep(3)} style={S.btn}>Looks good →</button>
              <button onClick={() => setStep(1)} style={{ ...S.btnGhost, color: "#6860a0" }}>← Back</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>What best describes your level?</div>
            <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>This shapes how AI tools talk to you — tone, depth, and expectations.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
              {TIERS.map(t => (
                <button key={t.id} onClick={() => handleSelectTier(t.id)}
                  style={{ background: "#181a2e", border: `1px solid ${tier === t.id ? "#4f6ef7" : "#2e3050"}`, borderRadius: "10px", padding: "16px 20px", textAlign: "left", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#4f6ef7"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = tier === t.id ? "#4f6ef7" : "#2e3050"}>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "3px" }}>{t.label}</div>
                  <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={{ ...S.btnGhost, color: "#6860a0", fontSize: "12px" }}>← Back</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>
              {extractingStories ? "Extracting your stories…" : storyError ? "Story extraction failed" : `Found ${stories.length} stories`}
            </div>
            <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>
              {extractingStories ? "Reading your resume for interview-ready achievements…" : storyError ? "You can add stories manually in the Stories tab." : "We pulled these from your resume. Edit them anytime in the Stories tab."}
            </div>
            {extractingStories && <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}><Spinner size={32} /></div>}
            {!extractingStories && stories.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                {stories.map((s, i) => (
                  <div key={i} style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "8px", padding: "14px 18px", marginBottom: "10px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>{s.title}</div>
                    <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>{s.company} · {s.role}</div>
                    <div style={{ fontSize: "13px", color: "#9890b8", fontFamily: "Georgia, serif", lineHeight: "1.6" }}>{s.hook}</div>
                  </div>
                ))}
              </div>
            )}
            {!extractingStories && (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={() => handleFinish(true)} style={S.btn}>
                  {stories.length > 0 ? `Add ${stories.length} stories & finish` : "Finish setup"}
                </button>
                {stories.length > 0 && (
                  <button onClick={() => handleFinish(false)} style={{ ...S.btnGhost, color: "#6860a0" }}>Skip stories for now</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ profile, onUpdateProfile, saveJD, setSaveJD, corrections, onUpdateCorrections, user, logout, stories }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...profile });
  const [reupload, setReupload] = useState(false);
  const [driveConnected, setDriveConnected] = useState(!!localStorage.getItem("cf:google_token:drive"));
  const [gmailConnected, setGmailConnected] = useState(!!localStorage.getItem("cf:google_token:gmail"));

  const field = (key, label) => (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}</label>
      <input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={S.input}
        onFocus={e => e.target.style.borderColor = "#4f6ef7"}
        onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
    </div>
  );

  const connectGoogle = (scopeKey, scope, onConnected) => {
    if (!window.google?.accounts?.oauth2) {
      alert("Google services not loaded. Check VITE_GOOGLE_CLIENT_ID in Netlify env vars.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
      scope,
      callback: (r) => {
        if (r.access_token) {
          localStorage.setItem(`cf:google_token:${scopeKey}`, r.access_token);
          onConnected(true);
        }
      },
    });
    client.requestAccessToken();
  };

  return (
    <div style={{ padding: "24px" }}>
      {/* Account */}
      <div style={{ ...S.section, marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{ width: "50px", height: "50px", borderRadius: "50%", border: "2px solid #3a3d5c" }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{profile.name || user?.email}</div>
          <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{user?.email}</div>
          <div style={{ fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2px" }}>
            {stories.length} stories{profile.resumeUploaded && <span style={{ color: "#4ade80", marginLeft: "10px" }}>✓ Resume uploaded</span>}
          </div>
        </div>
        <button onClick={logout} style={{
          ...S.btnGhost, fontSize: "12px", color: "#f87171", borderColor: "#6a2a2a",
          flexShrink: 0, // never gets squeezed off screen
        }}>Sign out</button>
      </div>

      {/* Contact */}
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ ...S.label, margin: 0 }}>Contact Information</div>
          <button onClick={() => { setEditing(!editing); setForm({ ...profile }); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>{editing ? "Cancel" : "Edit"}</button>
        </div>
        {editing ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>{field("name",    "Full Name")}</div>
              <div>{field("phone",   "Phone")}</div>
              <div>{field("email",   "Email")}</div>
              <div>{field("address", "City, State")}</div>
              <div>{field("linkedin","LinkedIn URL")}</div>
              <div>{field("website", "Website")}</div>
            </div>
            {field("title", "Professional Title")}
            <div style={{ marginBottom: "14px" }}>
              <label style={S.label}>Background / Summary <span style={{ color: "#6860a0", textTransform: "none", letterSpacing: 0 }}>used in AI prompts</span></label>
              <textarea value={form.background || ""} onChange={e => setForm(f => ({ ...f, background: e.target.value }))}
                rows={4} style={S.textarea}
                placeholder="Brief professional summary — experience, domain, what you're known for…"
                onFocus={e => e.target.style.borderColor = "#4f6ef7"}
                onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            </div>
            <button onClick={() => { onUpdateProfile(form); setEditing(false); }} style={S.btn}>Save</button>
          </>
        ) : (
          <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", lineHeight: "2.2" }}>
            {[
              ["Name",       profile.name],
              ["Phone",      profile.phone],
              ["Email",      profile.email],
              ["Address",    profile.address],
              ["LinkedIn",   profile.linkedin],
              ["Website",    profile.website],
              ["Title",      profile.title],
              ["Background", profile.background],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", gap: "16px" }}>
                <span style={{ color: "#6860a0", width: "90px", flexShrink: 0 }}>{l}</span>
                <span style={{ color: v ? "#c8c4e8" : "#3a3848" }}>{v || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume */}
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ ...S.label, marginBottom: "12px" }}>Resume Baseline</div>
        {profile.resumeUploaded ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: reupload ? "16px" : "16px" }}>
            <div>
              <div style={{ fontSize: "13px", color: "#4ade80", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "2px" }}>✓ Resume uploaded</div>
              <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{(profile.resumeText?.length || 0).toLocaleString()} characters</div>
            </div>
            <button onClick={() => setReupload(!reupload)} style={{ ...S.btnGhost, fontSize: "12px" }}>{reupload ? "Cancel" : "Replace"}</button>
          </div>
        ) : (
          <div style={{ fontSize: "13px", color: "#fb923c", marginBottom: "12px" }}>⚠ No resume uploaded</div>
        )}
        {(!profile.resumeUploaded || reupload) && (
          <div style={{ marginTop: "12px" }}>
            <ResumeUploadGate profile={profile} onComplete={p => { onUpdateProfile(p); setReupload(false); }} onSkip={() => setReupload(false)} />
          </div>
        )}
        {profile.resumeUploaded && !reupload && (
          <div style={{ marginTop: "16px", borderTop: "1px solid #2e3050", paddingTop: "16px" }}>
            <ResumeVariantManager profile={profile} onUpdateProfile={onUpdateProfile} />
          </div>
        )}
      </div>

      {/* Integrations */}
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ ...S.label, marginBottom: "14px" }}>Integrations</div>
        {[
          { key: "drive", icon: "📁", name: "Google Drive", desc: driveConnected ? "✓ Connected — save documents directly to Drive" : "Save resumes and cover letters to your Drive", scope: "https://www.googleapis.com/auth/drive.file", connected: driveConnected, setConnected: setDriveConnected },
          { key: "gmail", icon: "✉️", name: "Gmail",        desc: gmailConnected ? "✓ Connected — recruiter detection enabled"       : "Detect recruiter emails and draft follow-ups",  scope: "https://www.googleapis.com/auth/gmail.readonly", connected: gmailConnected, setConnected: setGmailConnected },
        ].map(({ key, icon, name, desc, scope, connected, setConnected }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#1e2240", borderRadius: "8px", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>{icon}</span>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{name}</div>
                <div style={{ fontSize: "12px", color: connected ? "#4ade80" : "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{desc}</div>
              </div>
            </div>
            <button onClick={() => !connected && connectGoogle(key, scope, setConnected)}
              style={{ ...S.btn, padding: "7px 16px", fontSize: "12px", background: connected ? "#1a3a1a" : "#4f6ef7", cursor: connected ? "default" : "pointer" }}>
              {connected ? "Connected ✓" : "Connect"}
            </button>
          </div>
        ))}
      </div>

      {/* Preferences */}
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ ...S.label, marginBottom: "12px" }}>Preferences</div>
        <button onClick={() => setSaveJD(!saveJD)}
          style={{ ...S.btnGhost, fontSize: "13px", background: saveJD ? "rgba(79,110,247,0.15)" : "transparent", color: saveJD ? "#8aacff" : "#6860a0", borderColor: saveJD ? "#4f6ef7" : "#3a3d5c" }}>
          {saveJD ? "💾 JD saved across sessions" : "💾 JD not saved"}
        </button>
      </div>

      {/* Corrections */}
      {Object.keys(corrections).length > 0 && (
        <div style={{ ...S.section }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ ...S.label, margin: 0 }}>Saved Corrections ({Object.keys(corrections).length})</div>
            <button onClick={() => { if (window.confirm("Clear all?")) onUpdateCorrections({}); }}
              style={{ ...S.btnGhost, fontSize: "11px", padding: "3px 8px", color: "#f87171", borderColor: "#6a2a2a" }}>Clear all</button>
          </div>
          {Object.entries(corrections).map(([title, correction]) => (
            <div key={title} style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: "6px", padding: "10px 14px", marginBottom: "8px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#c8b890", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{title}</div>
                <div style={{ fontSize: "11px", color: "#7a6a50", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{correction}</div>
              </div>
              <button onClick={() => { const u = { ...corrections }; delete u[title]; onUpdateCorrections(u); }}
                style={{ background: "none", border: "none", color: "#6a3a3a", cursor: "pointer", fontSize: "14px" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. ROLE WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────

function FollowUpTab({ card, profile }) {
  const [type, setType]       = useState("thank-you");
  const [result, setResult]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [copied, setCopied]   = useState(false);
  const apiLocked = useApiLock();

  const EMAIL_TYPES = [
    { id: "thank-you",           label: "Thank You",      icon: "✉️", desc: "Post-interview, within 24hrs" },
    { id: "recruiter-follow-up", label: "Follow Up",      icon: "📬", desc: "Application status check-in" },
    { id: "check-in",            label: "Check In",       icon: "🔔", desc: "Gone quiet after interview" },
    { id: "offer-response",      label: "Offer Response", icon: "🎯", desc: "Accepting or negotiating" },
  ];

  const run = async () => {
    setLoading(true); setError(null); setResult("");
    try {
      const text = await callClaude(
        PROMPTS.followUp(profile, card, type),
        `JD context:\n${(card.jd || "").slice(0, 800)}\n\nInterview notes:\n${card.notes || "No notes recorded."}`,
        800
      );
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const subjectMatch = result.match(/^Subject:\s*(.+)/m);
  const subject = subjectMatch ? subjectMatch[1].trim() : null;
  const body = result.replace(/^Subject:.*\n?/m, "").trim();

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ ...S.label, marginBottom: "12px" }}>Email Type</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
          {EMAIL_TYPES.map(t => (
            <button key={t.id} onClick={() => { setType(t.id); setResult(""); }}
              style={{ background: type === t.id ? "rgba(79,110,247,0.12)" : "#181a2e", border: `1px solid ${type === t.id ? "#4f6ef7" : "#2e3050"}`, borderRadius: "8px", padding: "14px 16px", textAlign: "left", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#4f6ef7"}
              onMouseLeave={e => e.currentTarget.style.borderColor = type === t.id ? "#4f6ef7" : "#2e3050"}>
              <div style={{ fontSize: "18px", marginBottom: "6px" }}>{t.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: type === t.id ? "#c8d8ff" : "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "2px" }}>{t.label}</div>
              <div style={{ fontSize: "11px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
      {!card.notes?.trim() && (
        <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#c8a84c", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          💡 Add interview notes in the Overview tab for a more personalized email.
        </div>
      )}
      <button onClick={run} disabled={loading || apiLocked}
        style={{ ...S.btn, opacity: loading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner />Drafting…</> : `Draft ${EMAIL_TYPES.find(t => t.id === type)?.label}`}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          {subject && (
            <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#1a1c2e", borderRadius: "6px", border: "1px solid #2e3050" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "4px" }}>Subject</div>
              <div style={{ fontSize: "13px", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600" }}>{subject}</div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ ...S.label, margin: 0 }}>{EMAIL_TYPES.find(t => t.id === type)?.label} Email</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleCopy} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>{copied ? "✓ Copied" : "Copy all"}</button>
              <button onClick={run} disabled={loading || apiLocked} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>↺ Redraft</button>
            </div>
          </div>
          <div style={{ ...S.resultBox, whiteSpace: "pre-wrap" }}>{body}</div>
        </div>
      )}
    </div>
  );
}

function RoleWorkspace({ card, profile, stories, corrections, initialTab, onUpdateCard, onUpdateCorrections, onClose, onRemove }) {
  const [activeTab, setActiveTab] = useState(initialTab || "Overview");
  const [proceeded, setProceeded] = useState(false);
  const [resumeOnly, setResumeOnly] = useState(false);
  const [resumeDownloaded, setResumeDownloaded] = useState(false);
  const [coverDownloaded, setCoverDownloaded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(!card.company);
  const [resumeBlob, setResumeBlob] = useState(null);
  const [coverBlob, setCoverBlob] = useState(null);

  const userKey = profile.email ? `cf:${profile.email}` : "cf:local";
  const materialsComplete = resumeDownloaded && (coverDownloaded || resumeOnly);

  const setJd    = (jd)    => onUpdateCard({ ...card, jd });
  const setNotes = (notes) => onUpdateCard({ ...card, notes });

  const workspaceTabs = [
    { name: "Overview" },
    { name: "Analyze JD" },
    { name: "Resume",         dim: !proceeded && !resumeOnly },
    { name: "Cover Letter",   dim: !resumeDownloaded },
    { name: "Interview Prep", dim: !materialsComplete },
    { name: "Research",       dim: !materialsComplete },
    { name: "Follow Up" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0f1117", zIndex: 200, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Workspace header */}
      <div style={{ background: "#131528", borderBottom: "1px solid #2e3050", padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6860a0", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>←</button>
          <div style={{ flex: 1 }}>
            {editingTitle ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input defaultValue={card.title} placeholder="Role title"
                  style={{ ...S.input, fontSize: "16px", fontWeight: "600", padding: "6px 10px", width: "200px" }}
                  onBlur={e => { onUpdateCard({ ...card, title: e.target.value }); setEditingTitle(false); }}
                  autoFocus />
                <input defaultValue={card.company} placeholder="Company"
                  style={{ ...S.input, fontSize: "14px", padding: "6px 10px", width: "160px" }}
                  onBlur={e => onUpdateCard({ ...card, company: e.target.value })} />
              </div>
            ) : (
              <div onClick={() => setEditingTitle(true)} style={{ cursor: "text" }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.title || "Untitled Role"}</div>
                <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.company || "Unknown Company"} · click to edit</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {card.fitScore && (
              <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                Fit: <span style={{ color: card.fitScore >= 8 ? "#4ade80" : card.fitScore >= 6 ? "#fbbf24" : "#fb923c", fontWeight: "700" }}>{card.fitScore}/10</span>
              </div>
            )}
            <div style={{ position: "relative" }}>
              {STAGES.map(s => s === (card.stage || "Radar") && (
                <select key={s} value={card.stage || "Radar"}
                  onChange={e => { if (e.target.value === "__REMOVE__") { onRemove?.(); onClose(); } else onUpdateCard({ ...card, stage: e.target.value }); }}
                  style={{ background: STAGE_COLORS[card.stage || "Radar"].bg, color: STAGE_COLORS[card.stage || "Radar"].text, border: `1px solid ${STAGE_COLORS[card.stage || "Radar"].border}`, borderRadius: "12px", padding: "4px 10px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer", outline: "none" }}>
                  {STAGES.map(st => <option key={st} value={st} style={{ background: "#1e2240", color: "#e8e4f8" }}>{st}</option>)}
                  <option value="__REMOVE__" style={{ background: "#1e2240", color: "#f87171" }}>Remove from board</option>
                </select>
              ))}
            </div>
          </div>
        </div>

        {/* Workspace tabs */}
        <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
          {workspaceTabs.map(({ name, dim }) => {
            const isActive = activeTab === name;
            const done = (name === "Resume" && resumeDownloaded) || (name === "Cover Letter" && coverDownloaded);
            return (
              <button key={name} onClick={() => setActiveTab(name)} style={{
                background: isActive ? "rgba(79,110,247,0.18)" : "transparent",
                color: isActive ? "#c8d8ff" : dim ? "#4a4868" : "#9890b8",
                border: `1px solid ${isActive ? "#4f6ef7" : "transparent"}`,
                borderRadius: "4px 4px 0 0", padding: "6px 14px", fontSize: "12px",
                fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                {name}{done && <span style={{ fontSize: "9px", color: "#4ade80" }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace content */}
      <div style={{ padding: "28px 32px", maxWidth: "860px", paddingBottom: "60px" }}>

        {activeTab === "Overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Stage",     value: card.stage || "Radar" },
                { label: "Fit Score", value: card.fitScore ? `${card.fitScore}/10` : "—" },
                { label: "Added",     value: card.addedAt ? new Date(card.addedAt).toLocaleDateString() : "—" },
                { label: "Materials", value: resumeDownloaded ? (coverDownloaded ? "Both ready" : "Resume ready") : "None yet" },
              ].map(({ label, value }) => (
                <div key={label} style={{ ...S.section, padding: "14px 16px" }}>
                  <div style={{ ...S.label, marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{value}</div>
                </div>
              ))}
            </div>

            {(() => {
              const history = card.stageHistory?.length
                ? card.stageHistory
                : card.addedAt ? [{ stage: card.stage || "Radar", at: card.addedAt }] : [];
              if (history.length === 0) return null;
              const now = Date.now();
              const daysSince = (ts) => { const d = Math.floor((now - ts) / 86400000); return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`; };
              return (
                <div style={{ ...S.section, marginBottom: "20px" }}>
                  <div style={{ ...S.label, marginBottom: "16px" }}>Timeline</div>
                  <div style={{ position: "relative", paddingLeft: "24px" }}>
                    <div style={{ position: "absolute", left: "7px", top: "8px", bottom: "8px", width: "1px", background: "#2e3050" }} />
                    {history.map((entry, i) => {
                      const c = STAGE_COLORS[entry.stage] || STAGE_COLORS.Radar;
                      const isLatest = i === history.length - 1;
                      const duration = i < history.length - 1 ? Math.floor((history[i + 1].at - entry.at) / 86400000) : null;
                      return (
                        <div key={i} style={{ position: "relative", marginBottom: "16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ position: "absolute", left: "-20px", top: "4px", width: "9px", height: "9px", borderRadius: "50%", background: isLatest ? c.border : "#2e3050", border: `2px solid ${c.border}` }} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                              <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: "10px", padding: "2px 9px", fontSize: "11px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600" }}>{entry.stage}</span>
                              {isLatest && <span style={{ fontSize: "10px", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif" }}>current</span>}
                            </div>
                            <div style={{ fontSize: "11px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                              {new Date(entry.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {daysSince(entry.at)}
                              {duration !== null && duration >= 0 && <span style={{ color: "#3a3848" }}> · {duration === 0 ? "same day" : `${duration}d in stage`}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {card.addedAt && (
                    <div style={{ marginTop: "4px", paddingTop: "12px", borderTop: "1px solid #1e2030", fontSize: "11px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      {Math.floor((now - card.addedAt) / 86400000)} days in pipeline
                    </div>
                  )}
                </div>
              );
            })()}

            {(card.resumeDriveLink || card.coverLetterDriveLink) && (
              <div style={{ ...S.section, marginBottom: "20px" }}>
                <div style={{ ...S.label, marginBottom: "12px" }}>Saved Documents</div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {card.resumeDriveLink      && <a href={card.resumeDriveLink}      target="_blank" rel="noopener noreferrer" style={{ color: "#4f6ef7", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>📄 Resume in Drive ↗</a>}
                  {card.coverLetterDriveLink && <a href={card.coverLetterDriveLink} target="_blank" rel="noopener noreferrer" style={{ color: "#4f6ef7", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>✉️ Cover Letter in Drive ↗</a>}
                </div>
              </div>
            )}

            <div style={{ ...S.section }}>
              <div style={{ ...S.label, marginBottom: "10px" }}>Notes</div>
              <textarea value={card.notes || ""} onChange={e => setNotes(e.target.value)}
                placeholder="Recruiter contact, next steps, interview notes, anything relevant to this role…"
                rows={6} style={{ ...S.textarea, width: "100%" }}
                onFocus={e => e.target.style.borderColor = "#4f6ef7"}
                onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            </div>
          </div>
        )}

        {activeTab === "Analyze JD" && (
          <>
            {card.jd && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                <button onClick={() => { setJd(""); setProceeded(false); setResumeOnly(false); setResumeDownloaded(false); setCoverDownloaded(false); }}
                  style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>✕ Clear JD</button>
              </div>
            )}
            <AnalyzeTab
              jd={card.jd || ""} setJd={setJd}
              stories={stories} profile={profile}
              corrections={corrections} onSaveCorrections={onUpdateCorrections}
              onBuildResume={() => { setProceeded(true); setActiveTab("Resume"); }}
              onResumeOnly={() => { setResumeOnly(true); setActiveTab("Resume"); }}
              onNewJD={() => { setJd(""); setProceeded(false); setResumeOnly(false); setResumeDownloaded(false); setCoverDownloaded(false); }}
            />
          </>
        )}

        {activeTab === "Resume" && (
          <ResumeTab
            jd={card.jd || ""} setJd={setJd} resumeOnly={resumeOnly}
            profile={profile}
            onDownloaded={(blob) => { setResumeDownloaded(true); setResumeBlob(blob); }}
            onSaveToDrive={async (blob) => {
              const token = getDriveToken(userKey);
              if (!token) return;
              const filename = `${(card.company || "Company").replace(/\s+/g, "_")}_${(card.title || "Role").replace(/\s+/g, "_")}_Resume.docx`;
              const result = await saveToDrive(blob, filename, token);
              if (result.webViewLink) onUpdateCard({ ...card, resumeDriveLink: result.webViewLink });
            }}
          />
        )}

        {activeTab === "Cover Letter" && (
          <CoverLetterTab
            jd={card.jd || ""} setJd={setJd}
            profile={profile}
            onDownloaded={(blob) => { setCoverDownloaded(true); setCoverBlob(blob); }}
            onSaveToDrive={async (blob) => {
              const token = getDriveToken(userKey);
              if (!token) return;
              const filename = `${(card.company || "Company").replace(/\s+/g, "_")}_${(card.title || "Role").replace(/\s+/g, "_")}_CoverLetter.docx`;
              const result = await saveToDrive(blob, filename, token);
              if (result.webViewLink) onUpdateCard({ ...card, coverLetterDriveLink: result.webViewLink });
            }}
          />
        )}

        {activeTab === "Interview Prep" && (
          <InterviewPrepTab jd={card.jd || ""} setJd={setJd} stories={stories} profile={profile} />
        )}

        {activeTab === "Research" && (
          <ResearchTab company={card.company || ""} triggered={true} />
        )}

        {activeTab === "Follow Up" && (
          <FollowUpTab card={card} profile={profile} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. APP SHELL
// ─────────────────────────────────────────────────────────────────────────────

function BottomNav({ active, onSelect }) {
  const items = [
    { id: "board",   icon: "⊞", label: "Board" },
    { id: "search",  icon: "🔍", label: "Search" },
    { id: "analyze", icon: "✦",  label: "Analyze" },
    { id: "stories", icon: "📖", label: "Stories" },
    { id: "profile", icon: "⚙",  label: "Profile" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#131528", borderTop: "1px solid #2e3050", display: "flex", zIndex: 50 }}>
      {items.map(({ id, icon, label }) => (
        <button key={id} onClick={() => onSelect(id)}
          style={{ flex: 1, background: "none", border: "none", padding: "10px 0 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "20px" }}>{icon}</span>
          <span style={{ fontSize: "10px", fontFamily: "'DM Sans', system-ui, sans-serif", color: active === id ? "#8aacff" : "#4a4868", fontWeight: active === id ? "700" : "400" }}>{label}</span>
          {active === id && <div style={{ width: "20px", height: "2px", background: "#4f6ef7", borderRadius: "1px" }} />}
        </button>
      ))}
    </div>
  );
}

export default function NarrativeOS() {
  const { user, authLoading, logout } = useNetlifyAuth();
  const [loaded, setLoaded] = useState(false);
  const [activeScreen, setActiveScreen] = useState("board");
  const [openCardId, setOpenCardId] = useState(null);
  const _pendingCard = useRef(null);
  const _pendingTab  = useRef(null);
  const [saveJD, setSaveJD] = useState(true);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const userKey = user?.email ? `cf:${user.email}` : "cf:local";

  const [profile,      setProfile]      = useState(DEFAULT_PROFILE);
  const [cards,        setCards]        = useState([]);
  const [searchJobs,   setSearchJobs]   = useState([]);
  const [searchQueries,setSearchQueries]= useState([]);
  const [pendingAnalysis, setPendingAnalysis] = useState(null);
  const [stories,      setStories]      = useState([]);
  const [corrections,  setCorrections]  = useState({});

  const sessionCost = useSessionCost();
  const apiLocked   = useApiLock();

  // Load on auth
  useEffect(() => {
    if (authLoading || !user) { setLoaded(false); return; }
    const p  = storageGet(`${userKey}:profile`);
    const c  = storageGet(`${userKey}:cards`);
    const s  = storageGet(`${userKey}:stories`);
    const cr = storageGet(`${userKey}:corrections`);
    const sj = storageGet(`${userKey}:saveJD`);
    const sq = storageGet(`${userKey}:searchQueries`);
    const jobs = storageGet(`${userKey}:searchJobs`);
    if (sq)   setSearchQueries(sq);
    if (jobs) setSearchJobs(jobs);
    if (p)  setProfile(p);
    else    setProfile({ ...DEFAULT_PROFILE, name: user.user_metadata?.full_name || user.email.split("@")[0], email: user.email, displayName: user.user_metadata?.full_name || user.email });
    if (c)  setCards(c);
    if (s)  setStories(s);
    if (cr) setCorrections(cr);
    setSaveJD(sj !== null ? sj : true);
    setLoaded(true);
  }, [user, authLoading]);

  // Persist
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:profile`,       profile);       }, [profile,       loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:cards`,         cards);         }, [cards,         loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:stories`,       stories);       }, [stories,       loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:corrections`,   corrections);   }, [corrections,   loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:saveJD`,        saveJD);        }, [saveJD,        loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:searchQueries`, searchQueries); }, [searchQueries, loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:searchJobs`,    searchJobs);    }, [searchJobs,    loaded]);

  // Card operations
  const addCard = (cardData) => {
    const now = Date.now();
    const newCard = {
      id: generateId(), stage: "Radar", addedAt: now,
      stageHistory: [{ stage: "Radar", at: now }],
      ...cardData,
    };
    setCards(prev => [newCard, ...prev]);
    return newCard.id;
  };
  const updateCard  = (updated) => setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
  const updateStage = (id, stage) => setCards(prev => prev.map(c => {
    if (c.id !== id) return c;
    const entry = { stage, at: Date.now() };
    const history = [...(c.stageHistory || [{ stage: c.stage || "Radar", at: c.addedAt || Date.now() }]), entry];
    return { ...c, stage, stageHistory: history };
  }));
  const removeCard  = (id) => setCards(prev => prev.filter(c => c.id !== id));

  const buildPendingCard = (pa) => ({
    id: generateId(), stage: "Radar", addedAt: Date.now(),
    stageHistory: [{ stage: "Radar", at: Date.now() }],
    title: pa.title, company: pa.company, jd: pa.jdText,
    fitScore: pa.fitScore || null, fitReason: pa.fitReason || "",
  });
  const addPendingToCards = (prev, newCard) => {
    const exists = prev.find(c => c.title === newCard.title && c.company === newCard.company);
    return exists ? prev : [newCard, ...prev];
  };

  const handleAnalyzeFromSearch = (jdText, title, company, fitScore, fitReason) => {
    setPendingAnalysis({ jdText, title, company, fitScore, fitReason });
    setActiveScreen("analyze");
  };

  // Resolve open card — fallback to pending ref while setCards async settles
  const openCard = cards.find(c => c.id === openCardId) ||
    (_pendingCard.current?.id === openCardId ? _pendingCard.current : null);
  if (openCard && _pendingCard.current?.id === openCard.id) _pendingCard.current = null;

  // Auth loading spinner
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", gap: "12px" }}>
          <Spinner size={20} /> Loading…
        </div>
      </div>
    );
  }

  if (!user) return <LoginGate />;

  // Onboarding — first-time users with no resume
  const handleOnboardingComplete = (finalProfile, extractedStories) => {
    setProfile(finalProfile);
    if (extractedStories?.length > 0) setStories(prev => [...prev, ...extractedStories]);
  };
  if (loaded && !profile.resumeUploaded && !profile.resumeVariants?.length) {
    return <OnboardingFlow user={user} profile={profile} onComplete={handleOnboardingComplete} />;
  }

  // Role workspace overlay — full-screen, bypasses main layout
  if (openCardId && openCard) {
    const initialTab = _pendingTab.current || "Overview";
    _pendingTab.current = null;
    return (
      <RoleWorkspace
        card={openCard}
        profile={profile}
        stories={stories}
        corrections={corrections}
        initialTab={initialTab}
        onUpdateCard={updateCard}
        onUpdateCorrections={setCorrections}
        onClose={() => setOpenCardId(null)}
        onRemove={() => { removeCard(openCard.id); setOpenCardId(null); }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e8e4f8", display: "flex", flexDirection: "column", paddingBottom: isMobile ? "60px" : 0 }}>

      {/* Header */}
      <div style={{ background: "#131528", borderBottom: "1px solid #2e3050", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontSize: "18px", fontWeight: "800", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-0.5px" }}>NarrativeOS</span>
          <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>Your story. Your signal.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {sessionCost > 0 && <span style={{ fontSize: "11px", color: "#4a4868" }}>~${sessionCost.toFixed(4)}</span>}
          {apiLocked && <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#fbbf24" }}><Spinner size={10} />Running…</div>}
          {!isMobile && (
            <div style={{ display: "flex", gap: "4px" }}>
              {[["board","Board"],["search","Search"],["analyze","Analyze JD"],["stories","Stories"],["profile","Profile"]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveScreen(id)}
                  style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", background: activeScreen === id ? "rgba(79,110,247,0.15)" : "transparent", color: activeScreen === id ? "#8aacff" : "#6860a0", borderColor: activeScreen === id ? "#4f6ef7" : "transparent" }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {user.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid #3a3d5c", cursor: "pointer" }} onClick={() => setActiveScreen("profile")} />
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {!loaded ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", gap: "10px" }}>
            <Spinner />Loading your workspace…
          </div>
        ) : (
          <>
            {activeScreen === "board" && (
              <Board
                cards={cards}
                onOpenCard={setOpenCardId}
                onStageChange={updateStage}
                onAddCard={addCard}
                onOpenSearch={() => setActiveScreen("search")}
                onRemoveCard={removeCard}
              />
            )}

            {activeScreen === "search" && (
              <div style={{ padding: "24px", maxWidth: "860px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <button onClick={() => setActiveScreen("board")} style={{ background: "none", border: "none", color: "#6860a0", cursor: "pointer", fontSize: "18px" }}>←</button>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Job Search</div>
                </div>
                <JobSearchTab
                  profile={profile}
                  onAnalyzeJD={handleAnalyzeFromSearch}
                  savedJobs={searchJobs}       onSaveJobs={setSearchJobs}
                  savedQueries={searchQueries} onSaveQueries={setSearchQueries}
                />
              </div>
            )}

            {activeScreen === "analyze" && (
              <div style={{ padding: "24px", maxWidth: "860px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <button onClick={() => setActiveScreen("search")} style={{ background: "none", border: "none", color: "#6860a0", cursor: "pointer", fontSize: "18px" }}>←</button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      {pendingAnalysis?.title || "Analyze JD"}
                    </div>
                    {pendingAnalysis?.company && (
                      <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{pendingAnalysis.company}</div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (!pendingAnalysis) return;
                      const newCard = buildPendingCard(pendingAnalysis);
                      setCards(prev => [newCard, ...prev]);
                      _pendingCard.current = newCard;
                      setOpenCardId(newCard.id);
                      setActiveScreen("board");
                    }}
                    style={{ ...S.btn, fontSize: "12px", padding: "7px 16px" }}>
                    ＋ Add to Tracker
                  </button>
                </div>
                <AnalyzeTab
                  jd={pendingAnalysis?.jdText || ""}
                  setJd={(jd) => setPendingAnalysis(p => ({ ...(p || {}), jdText: jd }))}
                  stories={stories} profile={profile}
                  corrections={corrections} onSaveCorrections={setCorrections}
                  onAddToTracker={() => {
                    if (!pendingAnalysis) return;
                    const newCard = buildPendingCard(pendingAnalysis);
                    setCards(prev => addPendingToCards(prev, newCard));
                    _pendingCard.current = newCard;
                    setOpenCardId(newCard.id);
                    setActiveScreen("board");
                  }}
                  onBuildResume={() => {
                    if (!pendingAnalysis) return;
                    const newCard = buildPendingCard(pendingAnalysis);
                    setCards(prev => addPendingToCards(prev, newCard));
                    _pendingCard.current = newCard;
                    _pendingTab.current = "Resume";
                    setOpenCardId(newCard.id);
                    setActiveScreen("board");
                  }}
                  onResumeOnly={() => {
                    if (!pendingAnalysis) return;
                    const newCard = buildPendingCard(pendingAnalysis);
                    setCards(prev => addPendingToCards(prev, newCard));
                    _pendingCard.current = newCard;
                    _pendingTab.current = "Resume";
                    setOpenCardId(newCard.id);
                    setActiveScreen("board");
                  }}
                  onNewJD={() => { setPendingAnalysis(null); setActiveScreen("search"); }}
                />
              </div>
            )}

            {activeScreen === "stories" && (
              <div style={{ padding: "24px", maxWidth: "860px" }}>
                <MyStoriesTab profile={profile} stories={stories} setStories={setStories} />
              </div>
            )}

            {activeScreen === "profile" && (
              <ProfileTab
                profile={profile} onUpdateProfile={setProfile}
                saveJD={saveJD} setSaveJD={setSaveJD}
                corrections={corrections} onUpdateCorrections={setCorrections}
                user={user} logout={logout}
                stories={stories}
              />
            )}
          </>
        )}
      </div>

      {isMobile && <BottomNav active={activeScreen} onSelect={setActiveScreen} />}
    </div>
  );
}

//  10. Board Components (RoleCard, Board)
//  11. Job Search (scoreJobsAgainstProfile, JobResultCard, JobSearchTab)
//  12. JD Analysis (JDInput, buildAnalysisSystem, AnalysisModal, GapCorrectionPanel, AnalyzeTab)
//  13. Resume Tools (ResumeTab, CoverLetterTab, InterviewPrepTab)
//  14. Research (ResearchTab)
//  15. Stories (StoryCard, StoryEditor, MyStoriesTab)
//  16. Profile (ResumeUploadGate, ProfileTab)
//  17. Role Workspace (RoleWorkspace)
//  18. App Shell (BottomNav, NarrativeOS)

import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTS & CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const COMPETENCIES = [
  "Transformation","Financial Impact","Leadership","Technical",
  "Agile/Delivery","Governance","Vendor Management","Strategy","Stakeholder",
];

const STAGES = ["Radar","Applied","Screening","Interview","Offer","Pass"];

const STAGE_COLORS = {
  Radar:     { bg: "rgba(99,140,255,0.12)",  border: "#4f6ef7", text: "#8aacff" },
  Applied:   { bg: "rgba(251,191,36,0.10)",  border: "#d97706", text: "#fbbf24" },
  Screening: { bg: "rgba(168,85,247,0.10)",  border: "#9333ea", text: "#c084fc" },
  Interview: { bg: "rgba(34,197,94,0.10)",   border: "#16a34a", text: "#4ade80" },
  Offer:     { bg: "rgba(20,184,166,0.10)",  border: "#0d9488", text: "#2dd4bf" },
  Pass:      { bg: "rgba(100,116,139,0.10)", border: "#475569", text: "#94a3b8" },
};

function getToday() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const DEFAULT_PROFILE = {
  name: "", displayName: "", email: "", phone: "",
  address: "Bellingham, WA", linkedin: "", website: "",
  title: "", background: "", resumeText: "", resumeUploaded: false,
  profileTier: "senior",
  resumeVariants: [],
  activeResumeId: null,
};

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

function tierContext(profile) {
  const tier = profile.profileTier || "senior";
  const map = {
    student: {
      voice:        "Use encouraging, coaching tone. Avoid jargon. Explain industry norms briefly when relevant.",
      scope:        "Focus on internships, academic projects, transferable skills, and early-career potential.",
      expectations: "Do not expect P&L ownership, large team leadership, or deep domain expertise. Highlight growth trajectory.",
      questions:    "Interview questions should focus on behavioral basics, learning mindset, and role-specific skills.",
    },
    midlevel: {
      voice:        "Professional, direct tone. Assume familiarity with core business concepts.",
      scope:        "Focus on individual contribution, team collaboration, and early leadership.",
      expectations: "Expect 3-8 years of experience. Some management experience may be present but not required.",
      questions:    "Interview questions should probe execution quality, stakeholder navigation, and growth into leadership.",
    },
    senior: {
      voice:        "Peer-level, direct tone. Skip basics. Lead with impact and strategic framing.",
      scope:        "Focus on program/portfolio ownership, cross-functional influence, and measurable outcomes.",
      expectations: "Expect 8-15 years. Director or senior manager scope. P&L exposure likely but may not be full ownership.",
      questions:    "Interview questions should probe leadership under ambiguity, organizational influence, and business outcomes.",
    },
    executive: {
      voice:        "Boardroom-level, concise, commercially framed. No hand-holding.",
      scope:        "Focus on P&L ownership, organizational transformation, C-suite and board relationships, and enterprise outcomes.",
      expectations: "Expect VP+ scope. Full P&L, revenue accountability, and multi-year transformation programs are baseline.",
      questions:    "Interview questions should probe strategic vision, enterprise risk, talent philosophy, and financial stewardship.",
    },
  };
  return map[tier] || map.senior;
}

const PROMPTS = {

  contactExtract: () =>
    `Extract contact information from a resume. Return ONLY a JSON object with these fields (empty string if not found):
{"name":"","phone":"","email":"","address":"","linkedin":"","website":"","title":""}
- name: full legal name
- phone: phone number
- email: email address
- address: city and state only (e.g. "Seattle, WA")
- linkedin: LinkedIn URL or username
- website: personal website URL
- title: current or most recent job title
Return only the JSON, no other text.`,

  coverLetterExtract: () =>
    `Extract company name and job title from a job description. Return ONLY JSON: {"company":"...","role":"..."}. Empty string if not found.`,

  searchQueries: (profile) => {
    const tier = profile?.profileTier || "senior";
    const levelHint = {
      student:   "Target entry-level, associate, junior, coordinator, and internship roles.",
      midlevel:  "Target manager, specialist, lead, and senior individual contributor roles.",
      senior:    "Target senior manager, director, and senior director roles.",
      executive: "Target VP, SVP, EVP, Chief, and Head-of roles.",
    }[tier] || "Target senior director and VP roles.";
    return `Generate 4 concise job board search queries for this candidate.
Each query: 3-6 words, targets appropriately leveled roles, includes "remote" where appropriate.
${levelHint}
Return ONLY a JSON array of strings.`;
  },

  jobScoring: (jobCount) =>
    `You are a senior recruiter evaluating candidate fit. Score each job 1-10 based ONLY on must-have requirements — ignore preferred/nice-to-have.

Score HIGH when candidate has:
- Required certifications match (PMP, SAFe, CPA, specific platforms listed as required)
- Required domain/industry experience (e.g. "manufacturing experience required", "energy sector")
- Required hands-on tool experience (e.g. "must have NetSuite", "Salesforce admin required")
- Required org size or leadership scope match

Score LOW when candidate is missing:
- Explicitly required certifications or licenses
- Required industry experience they lack
- Required technical platform hands-on experience

The "reason" field must be specific — name the actual requirement gap or match.
Example good reasons: "Lacks required SAP hands-on", "PMP + NetSuite match required certs and ERP", "Requires manufacturing domain — not in background"
Example bad reasons: "Good fit", "Some gaps"

Return ONLY a JSON array: [{"index":0,"score":8,"reason":"specific one sentence"},...]
Score all ${jobCount} jobs. No preamble.`,

  jdAnalyzer: (profile, stories, corrections) => {
    const tc = tierContext(profile);
    const correctionText = Object.keys(corrections).length > 0
      ? `\n\nUSER CORRECTIONS — treat as verified facts, do NOT re-flag:\n${Object.entries(corrections).map(([k, v]) => `- "${k}": ${v}`).join("\n")}`
      : "";
    const resumeText = (profile.resumeText || "").slice(0, 1200);
    const hasStories = stories && stories.length > 0;
    const profileContext = hasStories
      ? `RESUME BASELINE:\n${resumeText}`
      : `RESUME (no interview stories added yet — evaluate from resume only):\n${resumeText}`;
    return `You are a senior career strategist evaluating fit for ${profile.name || "this candidate"}.

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.scope}
${tc.expectations}

${profileContext}${correctionText}

EVALUATION PHILOSOPHY:
You are assessing the whole person — their career arc, demonstrated impact, and transferable experience — not just keyword matching.
A 10/10 is reserved for near-perfect alignment across role requirements, domain, scope, and certifications. It should be rare but genuinely achievable.
A 9/10 means exceptional fit with only the most minor gaps — the kind a strong cover letter resolves.
Score honestly. If the JD lacks hard requirements or is vague, score generously on fit.
Only flag gaps that are explicitly required in the JD and clearly absent from the candidate's background.
CRITICAL: Before flagging any gap, check the resume above. Only flag genuine verified gaps.

Return ONLY a valid JSON object — no markdown, no backticks, no commentary:
{
  "score": <1-10>,
  "company": "<company name from JD>",
  "rationale": "<one energizing sentence that leads with the candidate's strongest angle for this role>",
  "keyRequirements": ["<req>","<req>","<req>","<req>","<req>"],
  "strongestAngles": [{"angle":"<angle>","why":"<1 sentence why this matters for THIS role>"}],
  "topStories": [{"story":"<story title or resume achievement>","useFor":"<interview question type>"}],
  "gaps": [{"title":"<gap>","assessment":"<honest 1-sentence>","framing":"<how to address it confidently>"}],
  "keywords": ["<kw>"]
}`;
  },

  resumeStrategy: (profile) => {
    const tc = tierContext(profile);
    const profileContext = [
      profile.title && `Title: ${profile.title}`,
      profile.background && `Background: ${profile.background}`,
      profile.resumeText && `Resume (first 800 chars): ${profile.resumeText.slice(0, 800)}`,
    ].filter(Boolean).join("\n");
    return `You are a senior executive resume strategist for ${profile.name || "this candidate"}.
${profileContext}

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.scope}
${tc.expectations}
${tc.voice}

Analyze the resume against the job description and return ONLY a valid JSON object — no markdown, no backticks:
{
  "summaryRewrite": "<complete 3-sentence summary rewritten for this role, calibrated to candidate level>",
  "bulletEdits": [
    {"original": "<exact bullet from resume>", "revised": "<stronger version>", "reason": "<one sentence why>"}
  ],
  "bulletsToPromote": ["<bullet text to move higher>"],
  "keywordsToAdd": ["<keyword or phrase missing from resume but in JD>"],
  "toDeEmphasize": ["<experience or section to minimize for this application>"]
}
Return only the JSON. bulletEdits should include the 4-5 highest-impact changes only.`;
  },

  resumeRender: () =>
    `You are an expert resume writer producing a final, submission-ready resume.
Apply ALL the approved edits from the strategy. Produce clean resume text only.
Rules:
- No commentary, no markdown, no asterisks
- Name on first line ALL CAPS
- Contact line second with | separators
- Section headers ALL CAPS with no punctuation
- Job entries: Title | Company | Years
- Bullets starting with dash (-)
- Quantified achievements where present in the source
- Do not invent facts — only use what exists in the base resume and strategy`,

  coverLetter: (profile, company, role, notes, toneOverride) => {
    const tc = tierContext(profile);
    const profileContext = [
      profile.title && `Title: ${profile.title}`,
      profile.background && `Background: ${profile.background}`,
      profile.resumeText && `Key experience: ${profile.resumeText.slice(0, 600)}`,
    ].filter(Boolean).join("\n");
    const TONES = {
      executive: "Boardroom-level voice. Commercially framed. Lead with enterprise impact and financial outcomes. No warmth padding.",
      warm:      "Warm, collaborative tone. Lead with mission alignment and team contribution. Genuine enthusiasm without being sycophantic.",
      concise:   "Extremely tight. Every sentence earns its place. No setup paragraphs. Results first, always. 2 paragraphs maximum.",
      narrative: "Open with a brief situational story or insight that reframes the candidate's angle. Then pivot to credentials. Memorable over safe.",
    };
    const voiceInstruction = toneOverride && TONES[toneOverride]
      ? `TONE OVERRIDE: ${TONES[toneOverride]}`
      : `VOICE GUIDANCE: ${tc.voice}`;
    return `You are writing a cover letter for ${profile.name || "this candidate"}.
${profileContext}

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${voiceInstruction}
${tc.scope}

One strong opening hook — not "I am writing to apply for…"
3 tight paragraphs maximum. Close with forward momentum.

CRITICAL FORMATTING RULES:
- Do NOT include any contact information, addresses, phone numbers, or email addresses
- Do NOT include a name line, letterhead, or header — the document template handles this
- Do NOT include a salutation line (Dear Hiring Manager etc) unless you know the name
- Do NOT include a closing signature block — the template adds this
- Output ONLY the body paragraphs of the letter, nothing else
- No placeholders like [Phone] or [Email]`;
  },

  interviewPrep: (profile, stories, round) => {
    const tc = tierContext(profile);
    const storyCtx = stories.length > 0
      ? stories.map(s => `"${s.title}": ${s.result}`).join("\n")
      : "No interview stories added yet — prep from resume context.";
    const profileCtx = [
      profile.title && `Title: ${profile.title}`,
      profile.background && `Background: ${profile.background}`,
      profile.resumeText && `Resume context: ${profile.resumeText.slice(0, 600)}`,
    ].filter(Boolean).join("\n");
    return `You are an interview coach preparing ${profile.name || "this candidate"} for a ${round} interview.
${profileCtx}

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.voice}
${tc.questions}

Stories: ${storyCtx}

Generate:
1. LIKELY QUESTIONS — 8 questions this interviewer will probably ask, calibrated to candidate level and round
2. ANGLE FOR EACH — the specific story or proof point to lead with, and the key message to land
3. TRICKY QUESTIONS — 3 harder questions (gaps, concerns, failures) with suggested honest framings
4. QUESTIONS TO ASK — 4 sharp questions the candidate should ask the interviewer

Be specific to this candidate's background. No generic advice.`;
  },

  storyExtract: (profile) =>
    `You are an expert career coach helping ${profile.name || "this candidate"} build a STAR story library.

Analyze the resume and extract 4-6 significant achievements that would make strong interview stories.

Return ONLY a valid JSON array. Critical rules for valid JSON:
- Use straight double quotes only (no curly quotes)
- No em dashes (use a hyphen instead)
- No unescaped apostrophes inside strings
- Keep all string values on a single line (no line breaks inside strings)
- No trailing commas

[{
  "title": "Brief title leading with the outcome or metric",
  "company": "company name",
  "role": "job title at that company",
  "competencies": ["one or two from: Transformation, Financial Impact, Leadership, Technical, Agile/Delivery, Governance, Vendor Management, Strategy, Stakeholder"],
  "hook": "One sentence leading with the result. Use hyphens not em dashes.",
  "situation": "2-3 sentences describing the context and problem.",
  "task": "1-2 sentences describing what you were responsible for.",
  "action": "2-3 sentences describing what you specifically did.",
  "result": "1-2 sentences with quantified outcomes where possible.",
  "tags": ["keyword1", "keyword2", "keyword3"],
  "starred": false
}]

Only extract stories with clear actions and outcomes. Return ONLY the JSON array, nothing else.`,

  storyExtractOnboard: (profile) =>
    `You are an expert career coach helping ${profile.name || "this candidate"} build a STAR story library.

Analyze the resume and extract 3-5 significant achievements that would make strong interview stories.
Focus on results with numbers, scope, or clear before/after impact.

Return ONLY a valid JSON array. Critical rules:
- Straight double quotes only
- No em dashes (use hyphen)
- No unescaped apostrophes
- All string values on a single line
- No trailing commas

[{
  "title": "Brief title leading with the outcome or metric",
  "company": "company name",
  "role": "job title at that company",
  "competencies": ["one or two from: Transformation, Financial Impact, Leadership, Technical, Agile/Delivery, Governance, Vendor Management, Strategy, Stakeholder"],
  "hook": "One sentence leading with the result.",
  "situation": "2-3 sentences describing the context and problem.",
  "task": "1-2 sentences describing responsibility.",
  "action": "2-3 sentences describing specific actions taken.",
  "result": "1-2 sentences with quantified outcomes.",
  "tags": ["keyword1","keyword2","keyword3"],
  "starred": false
}]

Return ONLY the JSON array, nothing else.`,

  storyInterview: (profile, story) =>
    `You are a warm, encouraging career coach helping ${profile.name || "this candidate"} build a STAR interview story.

STAR FORMAT:
- Situation: "Tell me about a time when…"
- Task: "What were you responsible for?"
- Action: "Walk me through what you did."
- Result: "What was the outcome?"

When asking each section, briefly remind the user what interviewers are listening for. Keep it natural.
If the user gives a vague answer, ask for a specific number, timeline, or concrete example.

Current story being built:
${JSON.stringify(story, null, 2)}

Rules:
- Ask ONE focused question at a time
- Be warm, conversational, and encouraging
- When all four STAR fields are reasonably complete, respond with ONLY a JSON object:
{"complete": true, "situation": "...", "task": "...", "action": "...", "result": "...", "hook": "One powerful sentence leading with the result, executive voice"}
- Otherwise respond with just your coaching + question as plain text — no JSON`,

  storyMatch: (stories) => {
    const storyList = stories.map((s, i) =>
      `${i}: "${s.title}" [${s.competencies?.join(", ") || ""}] — ${s.result || s.hook || ""}`
    ).join("\n");
    return `You are matching interview stories to a job description.

Stories available:
${storyList}

Return ONLY a JSON array of the 3 most relevant stories — ordered by relevance:
[{"index": <number>, "useFor": "<specific interview question type this story answers best>", "why": "<one sentence on why this story fits this role>"}]

No preamble. Only the JSON array.`;
  },

  followUp: (profile, card, type) => {
    const tc = tierContext(profile);
    const typeInstructions = {
      "thank-you": `Write a post-interview thank you email.
- Send within 24 hours of the interview
- Reference one specific topic discussed — use the notes for context
- Reaffirm genuine interest and one key proof point relevant to the role
- 3 short paragraphs maximum, warm but professional close`,
      "recruiter-follow-up": `Write a recruiter follow-up email for an application in progress.
- Polite, brief, not desperate
- Reference the specific role and when it was applied for
- Express continued strong interest
- Ask for a clear next step
- 2 paragraphs maximum`,
      "check-in": `Write a check-in email for a role where the candidate has gone quiet after an interview.
- Professional, not needy
- Acknowledge their timeline
- Restate interest and one differentiating value point
- Open door for any update they can share
- 2 tight paragraphs`,
      "offer-response": `Write an email responding to a job offer.
- Acknowledge and express genuine enthusiasm
- If accepting: confirm start date and express excitement
- If negotiating: professional framing around one ask only
- Warm, decisive, forward-looking tone`,
    };
    return `You are writing a professional email for ${profile.name || "this candidate"}.
${tc.voice}

Role: ${card.title || "this position"} at ${card.company || "this company"}
Stage: ${card.stage || "unknown"}

${typeInstructions[type] || typeInstructions["thank-you"]}

RULES:
- Subject line on first line, prefixed with "Subject: "
- Then a blank line
- Then the email body
- No placeholders like [Name] or [Date]
- Do not include a closing signature block`;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GLOBAL STATE — session cost + API lock
// ─────────────────────────────────────────────────────────────────────────────

let _sessionCost = 0;
const _costListeners = new Set();
function trackCost(inChars, outChars) {
  _sessionCost += (inChars / 1_000_000) * 0.25 + (outChars / 1_000_000) * 1.25;
  _costListeners.forEach(cb => cb(_sessionCost));
}
function useSessionCost() {
  const [cost, setCost] = useState(_sessionCost);
  useEffect(() => {
    _costListeners.add(setCost);
    return () => _costListeners.delete(setCost);
  }, []);
  return cost;
}

let _apiLocked = false;
const _lockListeners = new Set();
function setApiLock(v) { _apiLocked = v; _lockListeners.forEach(cb => cb(v)); }
function useApiLock() {
  const [locked, setLocked] = useState(_apiLocked);
  useEffect(() => {
    _lockListeners.add(setLocked);
    return () => _lockListeners.delete(setLocked);
  }, []);
  return locked;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STORAGE
// ─────────────────────────────────────────────────────────────────────────────

function storageGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function getActiveResume(profile) {
  if (!profile.resumeVariants?.length) return profile.resumeText || "";
  const active = profile.resumeVariants.find(v => v.id === profile.activeResumeId)
    || profile.resumeVariants[0];
  return active?.text || "";
}
function getActiveResumeVariant(profile) {
  if (!profile.resumeVariants?.length) {
    return profile.resumeText
      ? { id: "v1", name: "Base Resume", text: profile.resumeText, createdAt: null }
      : null;
  }
  return profile.resumeVariants.find(v => v.id === profile.activeResumeId)
    || profile.resumeVariants[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. API
// ─────────────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const APIFY_TOKEN       = import.meta.env.VITE_APIFY_TOKEN || "";

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
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `API ${res.status}`);
    const text = data.content?.find(b => b.type === "text")?.text || "";
    trackCost((system + user).length, text.length);
    return text;
  } finally { setApiLock(false); }
}

async function callClaudeSearch(company, query) {
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
Scope is limited to public information about the company.`,
        messages: [{ role: "user", content: query }],
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `API ${res.status}`);
    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    trackCost(query.length, (text || "").length);
    return text || "No information found.";
  } finally { setApiLock(false); }
}

// Extracts contact fields from raw resume text via AI
async function extractContactFromResume(resumeText) {
  try {
    const text = await callClaude(PROMPTS.contactExtract(), resumeText.slice(0, 3000), 400);
    const m = text.match(/\{[\s\S]*?\}/);
    if (!m) return {};
    return JSON.parse(m[0]);
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GOOGLE DRIVE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

const DRIVE_FOLDER_NAME = "NarrativeOS";

function getDriveToken(userKey) {
  const legacy = localStorage.getItem("cf:google_token:drive");
  const scoped  = userKey ? localStorage.getItem(`${userKey}:google_token:drive`) : null;
  if (legacy && userKey && !scoped) {
    localStorage.setItem(`${userKey}:google_token:drive`, legacy);
    localStorage.removeItem("cf:google_token:drive");
  }
  return userKey
    ? localStorage.getItem(`${userKey}:google_token:drive`)
    : localStorage.getItem("cf:google_token:drive");
}

async function getOrCreateDriveFolder(token) {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files?.length > 0) return searchData.files[0].id;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const folder = await createRes.json();
  return folder.id;
}

async function saveToDrive(blob, filename, token) {
  const folderId = await getOrCreateDriveFolder(token);
  const metadata = { name: filename, parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  return await res.json(); // { id, webViewLink }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DOCX GENERATION
// ─────────────────────────────────────────────────────────────────────────────

let _docxLib = null;
async function getDocxLib() {
  if (!_docxLib) _docxLib = await import("https://esm.sh/docx@8.5.0");
  return _docxLib;
}

async function buildResumeDocxBlob(finalResumeText, company, profile) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } =
    await getDocxLib();
  const children = [];
  const lines = finalResumeText.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) {
      children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
      continue;
    }
    if (i === 0 || children.length === 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 32, color: "1a1a4a", font: "Calibri" })],
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
      }));
    } else if (t.includes("|") && t.includes("@") && children.length <= 2) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, size: 19, color: "444444", font: "Calibri" })],
        alignment: AlignmentType.CENTER, spacing: { after: 160 },
      }));
      children.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "2F2B8F" } },
        spacing: { after: 180 },
      }));
    } else if (
      t === t.toUpperCase() && t.length > 2 && t.length < 40 &&
      !t.includes("|") && !t.includes("@") && !t.includes("—")
    ) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 22, color: "1a1a4a", font: "Calibri" })],
        spacing: { before: 240, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2F2B8F" } },
      }));
    } else if (t.includes("|") && !t.includes("@") && t.split("|").length >= 2 && t.split("|").length <= 4) {
      const parts = t.split("|").map(p => p.trim());
      children.push(new Paragraph({
        children: [
          new TextRun({ text: parts[0], bold: true, size: 21, color: "111111", font: "Calibri" }),
          new TextRun({ text: "  |  ", size: 21, color: "888888", font: "Calibri" }),
          new TextRun({ text: parts.slice(1).join("  |  "), size: 21, color: "444444", font: "Calibri" }),
        ],
        spacing: { before: 180, after: 60 },
      }));
    } else if (t.startsWith("-") || t.startsWith("•")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: t.replace(/^[-•]\s*/, ""), size: 20, color: "111111", font: "Calibri" })],
        bullet: { level: 0 }, spacing: { after: 60 },
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: t, size: 20, color: "111111", font: "Calibri" })],
        spacing: { after: 80 },
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children,
    }],
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
  });
  return await Packer.toBlob(doc);
}

async function buildCoverLetterDocxBlob(letterText, company, role, profile) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } =
    await getDocxLib();

  const contactLine = `${profile.address}  |  ${profile.phone}  |  ${profile.email}  |  ${profile.website}`;
  const cleanLines = letterText.split("\n").filter(l => {
    const t = l.trim();
    if (!t) return true;
    if (t.match(/^\[.*\]$/) || t === profile.email || t === profile.phone) return false;
    if (t.toLowerCase().includes(profile.name?.toLowerCase()) && t.length < 30) return false;
    return true;
  });

  const children = [
    new Paragraph({
      children: [new TextRun({ text: (profile.name || "").toUpperCase(), bold: true, size: 30, color: "1a1a4a", font: "Calibri" })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: contactLine, size: 18, color: "555555", font: "Calibri" })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "2F2B8F" } },
      spacing: { after: 320 },
    }),
    new Paragraph({
      children: [new TextRun({ text: getToday(), size: 20, color: "555555", font: "Calibri" })],
      spacing: { after: 320 },
    }),
  ];
  if (company) children.push(new Paragraph({
    children: [new TextRun({ text: company, size: 20, bold: true, font: "Calibri" })],
    spacing: { after: 40 },
  }));
  if (role) children.push(new Paragraph({
    children: [new TextRun({ text: role, size: 20, color: "444444", font: "Calibri" })],
    spacing: { after: 320 },
  }));

  let bodyStarted = false;
  for (const line of cleanLines.join("\n").split("\n")) {
    const t = line.trim();
    if (!t && !bodyStarted) continue;
    bodyStarted = true;
    if (!t) {
      children.push(new Paragraph({ text: "", spacing: { after: 140 } }));
      continue;
    }
    children.push(new Paragraph({
      children: [new TextRun({ text: t, size: 22, color: "111111", font: "Calibri" })],
      spacing: { after: 80 },
      alignment: AlignmentType.JUSTIFIED,
    }));
  }

  children.push(new Paragraph({ text: "", spacing: { after: 160 } }));
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.name || "", size: 22, bold: true, font: "Calibri" })],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.phone || "", size: 20, color: "555555", font: "Calibri" })],
    spacing: { after: 40 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.email || "", size: 20, color: "555555", font: "Calibri" })],
    spacing: { after: 40 },
  }));

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } },
      children,
    }],
    styles: { default: { document: { run: { font: "Calibri" } } } },
  });
  return await Packer.toBlob(doc);
}

async function buildFinalResumeText(baseResume, strategy, jd) {
  return callClaude(
    PROMPTS.resumeRender(),
    `Base Resume:\n${baseResume}\n\nApproved Strategy:\n${JSON.stringify(strategy, null, 2)}\n\nJob Description:\n${jd}`,
    3500
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  input: {
    width: "100%", background: "#1e2240", border: "1px solid #3a3d5c",
    borderRadius: "6px", padding: "10px 14px", fontSize: "14px",
    fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e8e4f8",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
  },
  textarea: {
    width: "100%", background: "#1e2240", border: "1px solid #3a3d5c",
    borderRadius: "6px", padding: "12px 14px", fontSize: "14px",
    fontFamily: "Georgia, serif", color: "#e8e4f8", outline: "none",
    boxSizing: "border-box", resize: "vertical", lineHeight: "1.6",
  },
  btn: {
    background: "#4f6ef7", color: "#ffffff", border: "none", borderRadius: "6px",
    padding: "10px 20px", fontSize: "14px", fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: "600", cursor: "pointer", transition: "opacity 0.15s",
  },
  btnGhost: {
    background: "transparent", color: "#8880b8", border: "1px solid #3a3d5c",
    borderRadius: "6px", padding: "8px 16px", fontSize: "13px",
    fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer",
  },
  section: {
    background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px",
    padding: "20px 24px",
  },
  label: {
    display: "block", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase",
    color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: "600", marginBottom: "10px",
  },
  resultBox: {
    fontSize: "14px", color: "#c8c4e8", fontFamily: "Georgia, serif",
    lineHeight: "1.8", whiteSpace: "pre-wrap", maxHeight: "480px",
    overflowY: "auto", padding: "16px", background: "#1a1c2e",
    borderRadius: "6px", border: "1px solid #2e3050",
  },
};

// Hoist keyframe so it's injected once, not per-Spinner render
const _spinStyle = document.createElement("style");
_spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(_spinStyle);

// ─────────────────────────────────────────────────────────────────────────────
// 8. UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="#4f6ef7"
        strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Tag({ label, color = "#3a3d5c", textColor = "#8880a0" }) {
  return (
    <span style={{
      background: color, color: textColor, borderRadius: "3px",
      padding: "2px 8px", fontSize: "11px",
      fontFamily: "'DM Sans', system-ui, sans-serif", whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function CompBadge({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(99,140,255,0.18)" : "rgba(255,255,255,0.03)",
      color: active ? "#8aacff" : "#5a5870",
      border: `1px solid ${active ? "#4a6abf" : "#3a3d5c"}`,
      borderRadius: "4px", padding: "5px 12px", fontSize: "12px",
      fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer",
    }}>{label}</button>
  );
}

function generateId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function StagePill({ stage, onClick, small }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS.Radar;
  return (
    <button onClick={onClick} style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: "12px", padding: small ? "2px 8px" : "4px 12px",
      fontSize: small ? "11px" : "12px",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontWeight: "600", cursor: onClick ? "pointer" : "default",
    }}>
      {stage}
    </button>
  );
}

function SaveToDriveBtn({ blob, filename, onSaved, disabled }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  const handle = async () => {
    setSaving(true); setErr(null);
    try {
      const token = await getDriveToken();
      if (!token) { setErr("Connect Google Drive in Profile first"); setSaving(false); return; }
      const result = await saveToDrive(blob, filename, token);
      if (result.webViewLink) { setSaved(true); onSaved?.(result); }
      else setErr("Upload failed");
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  if (saved) return <span style={{ fontSize: "12px", color: "#4ade80", fontFamily: "'DM Sans', system-ui, sans-serif" }}>✓ Saved to Drive</span>;
  return (
    <div>
      <button onClick={handle} disabled={disabled || saving}
        style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px", opacity: disabled || saving ? 0.5 : 1 }}>
        {saving ? <><Spinner size={12} />Saving…</> : "📁 Save to Drive"}
      </button>
      {err && <div style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>{err}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. AUTH — Netlify Identity
// ─────────────────────────────────────────────────────────────────────────────

function useNetlifyAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const ni = window.netlifyIdentity;
    if (!ni) { setAuthLoading(false); return; }

    const onInit   = (u) => { setUser(u); setAuthLoading(false); };
    const onLogin  = (u) => { setUser(u); setAuthLoading(false); ni.close(); };
    const onLogout = ()  => { setUser(null); setAuthLoading(false); };

    ni.on("init",   onInit);
    ni.on("login",  onLogin);
    ni.on("logout", onLogout);

    // Resolve immediately if already logged in
    if (ni.currentUser) { setUser(ni.currentUser()); setAuthLoading(false); }

    // Safety net — if Identity never fires init (e.g. slow network on first OAuth
    // callback), stop showing the loading spinner after 4 seconds
    const timeout = setTimeout(() => setAuthLoading(false), 4000);

    return () => {
      ni.off("init",   onInit);
      ni.off("login",  onLogin);
      ni.off("logout", onLogout);
      clearTimeout(timeout);
    };
  }, []);

  const login  = () => window.netlifyIdentity?.open("login");
  const logout = () => window.netlifyIdentity?.logout();
  return { user, authLoading, login, logout };
}

function LoginGate() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "32px", fontWeight: "800", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-1px", marginBottom: "8px" }}>NarrativeOS</div>
          <div style={{ fontSize: "14px", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "0.5px", marginBottom: "4px", fontStyle: "italic" }}>Your story. Your signal.</div>
          <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "1px" }}>Rise above the noise.</div>
        </div>
        <div style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "16px", padding: "40px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Sign in to continue</div>
          <div style={{ fontSize: "14px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "32px" }}>
            Your profile, stories, and applications are private to your account.
          </div>
          <button onClick={() => window.netlifyIdentity?.open("login")}
            style={{ width: "100%", background: "#ffffff", color: "#1a1a2e", border: "none", borderRadius: "8px", padding: "13px 20px", fontSize: "15px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "12px" }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
          <button onClick={() => window.netlifyIdentity?.open("login")}
            style={{ width: "100%", background: "transparent", color: "#a8a0c8", border: "1px solid #2e3050", borderRadius: "8px", padding: "13px 20px", fontSize: "15px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            ✉ Continue with email
          </button>
          <div style={{ marginTop: "24px", fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: "center" }}>
            Your data stays in your browser. AI uses the Anthropic API.{" "}
            <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#5a5abf" }}>Privacy →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. BOARD COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function RoleCard({ card, onClick, onStageChange, onRemove }) {
  const [showStageMenu, setShowStageMenu] = useState(false);
  const scoreColor = !card.fitScore ? "#6860a0"
    : card.fitScore >= 8 ? "#4ade80"
    : card.fitScore >= 6 ? "#fbbf24"
    : card.fitScore >= 4 ? "#fb923c" : "#f87171";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px",
        padding: "14px 16px", marginBottom: "8px", cursor: "pointer",
        transition: "border-color 0.15s, transform 0.1s", position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f6ef7"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3050"; e.currentTarget.style.transform = "none"; }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {card.title || "Untitled Role"}
          </div>
          <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {card.company || "Unknown Company"}
          </div>
        </div>
        {card.fitScore && (
          <div style={{ flexShrink: 0, width: "34px", height: "34px", borderRadius: "6px", background: `${scoreColor}18`, border: `1.5px solid ${scoreColor}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "800", color: scoreColor, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.fitScore}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {card.resumeDriveLink   && <span style={{ fontSize: "11px", color: "#4ade80" }} title="Resume saved">📄</span>}
          {card.coverLetterDriveLink && <span style={{ fontSize: "11px", color: "#4ade80" }} title="Cover letter saved">✉️</span>}
          {card.notes             && <span style={{ fontSize: "11px", color: "#6860a0" }} title="Has notes">📝</span>}
        </div>
        <div style={{ position: "relative" }}>
          {showStageMenu && (
            <div style={{ position: "fixed", inset: 0, zIndex: 99 }}
              onClick={e => { e.stopPropagation(); setShowStageMenu(false); }} />
          )}
          <div onClick={e => { e.stopPropagation(); setShowStageMenu(!showStageMenu); }}>
            <StagePill stage={card.stage || "Radar"} small />
          </div>
          {showStageMenu && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: "4px", background: "#1e2240", border: "1px solid #3a3d5c", borderRadius: "8px", padding: "4px", zIndex: 100, minWidth: "110px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              {STAGES.map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); onStageChange(s); setShowStageMenu(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", color: s === card.stage ? "#8aacff" : "#a8a0c8", borderRadius: "4px" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(79,110,247,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {s}
                </button>
              ))}
              <div style={{ borderTop: "1px solid #2e3050", margin: "4px 0" }} />
              <button onClick={e => { e.stopPropagation(); onRemove(); setShowStageMenu(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", color: "#f87171", borderRadius: "4px" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {card.addedAt && (
        <div style={{ fontSize: "10px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "6px" }}>
          Added {new Date(card.addedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function Board({ cards, onOpenCard, onStageChange, onAddCard, onOpenSearch, onRemoveCard }) {
  const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s]: cards.filter(c => (c.stage || "Radar") === s) }), {});
  const total = cards.length;

  return (
    <div style={{ flex: 1, overflowX: "auto", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Applications</div>
          <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2px" }}>
            {total === 0 ? "No active applications" : `${total} role${total !== 1 ? "s" : ""} tracked`}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onOpenSearch} style={{ ...S.btnGhost, display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>🔍 Search Jobs</button>
          <button onClick={() => onAddCard({ title: "", company: "", stage: "Radar", jd: "", notes: "", addedAt: Date.now() })} style={{ ...S.btn, fontSize: "13px", padding: "8px 16px" }}>+ Add Role</button>
        </div>
      </div>

      {total === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6860a0" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎯</div>
          <div style={{ fontSize: "18px", fontWeight: "600", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Your search campaign starts here</div>
          <div style={{ fontSize: "14px", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px", maxWidth: "360px", margin: "0 auto 24px" }}>
            Find a role with Job Search, paste a JD to analyze it, or add a role manually. Every application lives here.
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onOpenSearch} style={{ ...S.btn }}>🔍 Search Jobs</button>
            <button onClick={() => onAddCard({ title: "", company: "", stage: "Radar", jd: "", notes: "", addedAt: Date.now() })} style={{ ...S.btnGhost }}>+ Add manually</button>
          </div>
        </div>
      )}

      {total > 0 && (
        <div style={{ display: "flex", gap: "12px", minWidth: "900px" }}>
          {STAGES.map(stage => {
            const stageCards = byStage[stage] || [];
            const c = STAGE_COLORS[stage];
            return (
              <div key={stage} style={{ flex: 1, minWidth: "160px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", padding: "6px 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: c.border }} />
                    <span style={{ fontSize: "12px", fontWeight: "600", color: c.text, fontFamily: "'DM Sans', system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>{stage}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{stageCards.length}</span>
                </div>
                <div style={{ minHeight: "100px" }}>
                  {stageCards.map(card => (
                    <RoleCard key={card.id} card={card}
                      onClick={() => onOpenCard(card.id)}
                      onStageChange={s => onStageChange(card.id, s)}
                      onRemove={() => onRemoveCard(card.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. JOB SEARCH
// ─────────────────────────────────────────────────────────────────────────────

async function scoreJobsAgainstProfile(jobs, profile) {
  const resumeSnippet = (profile.resumeText || profile.background || "").slice(0, 600);
  const profileSummary = `Title: ${profile.title || "Enterprise Transformation Leader"}\nResume: ${resumeSnippet}`;

  const jobsToScore = jobs.slice(0, 50);
  const jobList = jobsToScore.map((j, i) => {
    const raw = (j.job_description || j.description || "")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
    return `${i}: ${j.job_title || j.title || "Unknown"} at ${j.company_name || j.company || "Unknown"} | ${raw}`;
  }).join("\n");

  const text = await callClaude(
    PROMPTS.jobScoring(jobsToScore.length),
    `Candidate:\n${profileSummary}\n\nJobs:\n${jobList}`,
    3000
  );

  const m = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!m) return jobs.map(j => ({ ...j, fitScore: 5, fitReason: "" }));
  try {
    const scores = JSON.parse(m[0]);
    return jobsToScore.map((j, i) => {
      const s = scores.find(x => x.index === i);
      return { ...j, fitScore: s?.score || 5, fitReason: s?.reason || "" };
    });
  } catch { return jobs.map(j => ({ ...j, fitScore: 5, fitReason: "" })); }
}

function JobResultCard({ job, onAnalyze }) {
  const [fetchingJD, setFetchingJD] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const score   = job.fitScore || 0;
  const scoreColor = score >= 8 ? "#4ade80" : score >= 6 ? "#fbbf24" : score >= 4 ? "#fb923c" : "#f87171";
  const title   = job.job_title || job.title || "Unknown Role";
  const company = job.company_name || job.company || "Unknown";
  const location = job.location || job.job_location || "";
  const salary  = job.salary || job.compensation || "";
  const url     = job.job_url || job.url || job.apply_url || "";
  const jdText  = job.job_description || job.description || job.jobDescription || job.snippet || job.fullDescription || "";
  const remote  = (job.workplace_type || "").toLowerCase().includes("remote") || (location || "").toLowerCase().includes("remote");

  return (
    <div style={{ ...S.section, marginBottom: "10px", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flexShrink: 0, width: "42px", height: "42px", borderRadius: "8px", background: `${scoreColor}15`, border: `1.5px solid ${scoreColor}50`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {job.fitScore === null
            ? <Spinner size={14} />
            : <>
                <span style={{ fontSize: "15px", fontWeight: "800", color: scoreColor, fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: "9px", color: scoreColor, fontFamily: "'DM Sans', system-ui, sans-serif" }}>/10</span>
              </>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{title}</div>
              <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {company}
                {location && <span style={{ color: "#6860a0" }}> · {location}</span>}
                {remote   && <span style={{ color: "#4ade80", marginLeft: "6px" }}>Remote</span>}
                {salary   && <span style={{ color: "#fbbf24", marginLeft: "8px" }}>{salary}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px", textDecoration: "none" }}>Apply ↗</a>}
              <button
                onClick={async () => {
                  if (!url) { onAnalyze(jdText, title, company, job.fitScore, job.fitReason); return; }
                  setFetchingJD(true);
                  try {
                    const trigRes = await fetch("/.netlify/functions/fetchJD", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ jobUrl: url }),
                    });
                    const { runId, datasetId } = await trigRes.json();
                    let fullJD = jdText;
                    for (let i = 0; i < 12; i++) {
                      await new Promise(r => setTimeout(r, 6000));
                      try {
                        const st = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
                        const sd = await st.json();
                        if (["SUCCEEDED","FAILED","ABORTED"].includes(sd?.data?.status)) {
                          const dr = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true&limit=1`);
                          const items = await dr.json();
                          if (Array.isArray(items) && items[0]) {
                            const j = items[0];
                            fullJD = j.description || j.jobDescription || j.job_description || j.fullDescription || jdText;
                          }
                          break;
                        }
                      } catch {}
                    }
                    onAnalyze(fullJD, title, company, job.fitScore, job.fitReason);
                  } catch {
                    onAnalyze(jdText, title, company, job.fitScore, job.fitReason);
                  } finally { setFetchingJD(false); }
                }}
                disabled={fetchingJD}
                style={{ ...S.btn, fontSize: "11px", padding: "4px 12px", opacity: fetchingJD ? 0.7 : 1, display: "flex", alignItems: "center", gap: "5px" }}>
                {fetchingJD ? <><Spinner size={10} />Fetching JD…</> : "Analyze"}
              </button>
            </div>
          </div>
          {job.fitReason && (
            <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic", marginBottom: "4px" }}>{job.fitReason}</div>
          )}
          <button onClick={() => setExpanded(!expanded)}
            style={{ background: "none", border: "none", color: "#4f6ef7", cursor: "pointer", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", padding: 0 }}>
            {expanded ? "▲ Hide" : "▼ Preview JD"}
          </button>
          {expanded && jdText && (
            <div
              style={{ marginTop: "10px", fontSize: "13px", color: "#c8c4e8", fontFamily: "Georgia, serif", lineHeight: "1.7", background: "#1e2240", borderRadius: "6px", padding: "12px", maxHeight: "200px", overflowY: "auto" }}
              dangerouslySetInnerHTML={{ __html:
                jdText.slice(0, 1500)
                  .replace(/<script[\s\S]*?<\/script>/gi, "")
                  .replace(/<style[\s\S]*?<\/style>/gi, "")
                  .replace(/<(?!\/?(b|strong|i|em|ul|ol|li|p|br|h[1-6])\b)[^>]+>/gi, " ")
                  .replace(/\s{2,}/g, " ")
                + (jdText.length > 1500 ? "<br/><em style='color:#6860a0'>… click Analyze for full description</em>" : "")
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function JobSearchTab({ profile, onAnalyzeJD, savedJobs, onSaveJobs, savedQueries, onSaveQueries }) {
  const [queries, setQueriesLocal] = useState(savedQueries?.length ? savedQueries : []);
  const setQueries = (q) => {
    const val = typeof q === "function" ? q(queries) : q;
    setQueriesLocal(val);
    onSaveQueries?.(val);
  };
  const [customQuery, setCustomQuery] = useState("");
  const [days, setDays] = useState(3);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [status, setStatus] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [jobs, setJobsLocal] = useState(savedJobs || []);
  const setJobs = (j) => { setJobsLocal(j); onSaveJobs?.(j); };
  const [error, setError] = useState(null);
  const [generatingQueries, setGeneratingQueries] = useState(false);
  const apiLocked = useApiLock();

  useEffect(() => {
    if (!running) { setElapsed(0); return; }
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const cancelSearch = () => {
    setRunning(false);
    setStatus("Running in background — results will appear when ready");
  };

  const generateQueries = async () => {
    setGeneratingQueries(true);
    try {
      const text = await callClaude(
        PROMPTS.searchQueries(profile),
        `Profile: ${profile.title || "Enterprise Transformation Leader"}\n${(profile.resumeText || "").slice(0, 300)}`,
        300
      );
      const m = text.match(/\[[\s\S]*?\]/);
      if (m) setQueries(JSON.parse(m[0]).slice(0, 5));
    } catch {}
    finally { setGeneratingQueries(false); }
  };

  const runSearch = async () => {
    if (running || runningRef.current) return;
    runningRef.current = true;
    setRunning(true); setError(null); setJobs([]);
    const activeQuery = customQuery.trim() || queries[0] || "transformation director";
    setStatus(`Starting search for "${activeQuery}"…`);
    try {
      const triggerRes = await fetch("/.netlify/functions/searchJobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: activeQuery, days, maxItems: 50 }),
      });
      const triggerText = await triggerRes.text();
      if (!triggerRes.ok || triggerText.startsWith("<")) {
        throw new Error(`Function not found (${triggerRes.status}). Check netlify/functions/searchJobs.js is deployed.`);
      }
      const { runId, datasetId, error: triggerErr } = JSON.parse(triggerText);
      if (triggerErr) throw new Error(triggerErr);
      if (!runId) throw new Error("No runId returned");
      if (!APIFY_TOKEN) throw new Error("VITE_APIFY_TOKEN not set in Netlify env vars");

      let lastCount = 0;
      let allRaw = [];
      let runDone = false;
      const startTime = Date.now();

      while (!runDone) {
        await new Promise(r => setTimeout(r, 10000));
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);

        try {
          const st = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
          if (st.ok) {
            const sd = await st.json();
            const s = sd?.data?.status;
            if (s === "SUCCEEDED" || s === "FAILED" || s === "ABORTED") runDone = true;
          }
        } catch {}

        try {
          const dr = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true&limit=100`
          );
          if (dr.ok) {
            const raw = await dr.json();
            const batch = Array.isArray(raw) ? raw : [];
            if (batch.length > lastCount) {
              const normalized = batch.map(j => {
                const description = j.description || j.jobDescription || j.job_description || j.fullDescription || j.snippet || "";
                const title = j.positionName || j.title || j.jobTitle || j.job_title || "";
                const company = j.company || j.companyName || j.company_name || "";
                const location = j.location || j.jobLocation || j.job_location || "";
                const salary = j.salary || j.salaryRange || j.salaryText || "";
                const url = j.externalApplyLink || j.applyLink || j.url || j.job_url || j.jobUrl || j.link || "";
                return { title, company, location, salary, url, description,
                  job_title: title, company_name: company, job_description: description, job_url: url };
              });
              allRaw = normalized;
              lastCount = batch.length;
              const unscored = normalized.slice(0, 15).map(j => ({ ...j, fitScore: null }));
              setJobs(unscored);
              setStatus(runDone
                ? `${batch.length} jobs found — scoring…`
                : `${batch.length} jobs so far… (${elapsedSec}s)`
              );
            } else {
              setStatus(`Scraping… ${elapsedSec}s (${lastCount} found)`);
            }
          }
        } catch {}

        if (Date.now() - startTime > 480000) break;
      }

      if (allRaw.length === 0) { setStatus("No results found"); setRunning(false); return; }

      const seen = new Set();
      const deduped = allRaw.filter(j => {
        const key = `${(j.job_title || j.title || "").toLowerCase()}|${(j.company_name || j.company || "").toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });

      setStatus(`Scoring ${deduped.length} jobs against your profile…`);
      const scored = await scoreJobsAgainstProfile(deduped, profile);
      const top15 = scored.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0)).slice(0, 15);
      setJobs(top15);
      setStatus(`${top15.length} matches — scored and ranked`);
    } catch (e) {
      setError(e.message);
      setStatus("Search failed");
    } finally { setRunning(false); runningRef.current = false; }
  };

  return (
    <div>
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ ...S.label, margin: 0 }}>
            Search Queries{" "}
            <span style={{ fontSize: "10px", color: "#4a4868", textTransform: "none", letterSpacing: 0, fontWeight: "400" }}>(top query runs per search)</span>
          </div>
          <button onClick={generateQueries} disabled={generatingQueries || apiLocked}
            style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
            {generatingQueries ? <><Spinner size={10} />Generating…</> : "✦ Generate from profile"}
          </button>
        </div>
        {queries.length === 0 && (
          <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "10px 0", marginBottom: "8px" }}>
            No search queries yet — click "Generate from profile" to create personalized queries based on your resume.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
          {queries.map((q, i) => (
            <div key={i} style={{ display: "flex", gap: "8px" }}>
              <input value={q} onChange={e => setQueries(qs => qs.map((x, j) => j === i ? e.target.value : x))}
                style={{ ...S.input, flex: 1 }}
                onFocus={e => e.target.style.borderColor = "#4f6ef7"}
                onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
              <button onClick={() => setQueries(qs => qs.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "#6860a0", cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={() => setQueries(qs => [...qs, ""])}
          style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", marginBottom: "16px" }}>+ Add query</button>

        <div style={{ marginBottom: "14px" }}>
          <label style={S.label}>One-time override</label>
          <input value={customQuery} onChange={e => setCustomQuery(e.target.value)}
            placeholder="e.g. VP Technology AI startup remote"
            style={S.input}
            onFocus={e => e.target.style.borderColor = "#4f6ef7"}
            onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ ...S.label, margin: 0 }}>Freshness</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[1, 3, 7, 14].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", background: days === d ? "rgba(79,110,247,0.2)" : "transparent", color: days === d ? "#8aacff" : "#6860a0", borderColor: days === d ? "#4f6ef7" : "#3a3d5c" }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px", flexWrap: "wrap" }}>
        <button onClick={runSearch} disabled={running || apiLocked}
          style={{ ...S.btn, opacity: running || apiLocked ? 0.6 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
          {running ? <><Spinner />Searching…</> : "🔍 Search Jobs"}
        </button>
        {running && (
          <button onClick={cancelSearch}
            style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", color: "#f87171", borderColor: "#6a2a2a" }}>
            ✕ Cancel
          </button>
        )}
        {running && elapsed > 0 && (
          <div style={{ fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {elapsed}s — scraper running, typically 1–3 min
          </div>
        )}
        {status && !running && (
          <div style={{ fontSize: "13px", color: error ? "#f87171" : "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {status}
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: "#f87171", fontSize: "13px", padding: "10px 14px", background: "rgba(248,113,113,0.08)", borderRadius: "6px", border: "1px solid rgba(248,113,113,0.2)", marginBottom: "16px" }}>{error}</div>
      )}

      {jobs.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ ...S.label, margin: 0 }}>Top {jobs.length} matches</div>
            <button onClick={() => { setJobs([]); setStatus(""); setError(null); }}
              style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>✕ Clear results</button>
          </div>
          {jobs.map((job, i) => (
            <JobResultCard key={i} job={job} onAnalyze={onAnalyzeJD} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. JD ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

function JDInput({ jd, setJd }) {
  // Compute cleaned version once for display — do NOT call setJd during render
  const cleanJd = jd
    ? jd.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s{2,}/g, " ").trim()
    : "";
  const hasHtml = jd && jd !== cleanJd && jd.includes("<");

  // Clean HTML out of the stored value on first mount if needed
  useEffect(() => {
    if (hasHtml) setJd(cleanJd);
  }, []); // intentionally run only once on mount

  return (
    <div style={{ marginBottom: "24px" }}>
      <label style={S.label}>Job Description</label>
      <textarea
        value={hasHtml ? cleanJd : jd}
        onChange={e => setJd(e.target.value)}
        rows={8}
        style={S.textarea}
        onFocus={e => e.target.style.borderColor = "#4a4abf"}
        onBlur={e => e.target.style.borderColor = "#3a3d5c"}
      />
    </div>
  );
}

function buildAnalysisSystem(corrections, profile, stories) {
  return PROMPTS.jdAnalyzer(profile, stories, corrections);
}

function AnalysisModal({ score, rationale, gaps, onBuildResume, onResumeOnly, onCorrect, onNewJD, onDismiss }) {
  const verdict =
    score >= 8 ? {
      label: "Excellent Match! 🎯",
      color: "#4ade80",
      border: "rgba(74,222,128,0.25)",
      rec: "This role was made for you. Your background aligns strongly with what they're looking for — let's build materials that make this a no-brainer hire.",
      cta: "Build tailored resume + cover letter",
    } :
    score >= 6 ? {
      label: "Strong Contender ✅",
      color: "#fbbf24",
      border: "rgba(251,191,36,0.25)",
      rec: "You have the core experience this role needs. A few gaps to address, but nothing that should stop you — let's sharpen your materials and get you in the room.",
      cta: "Build tailored resume + cover letter",
    } :
    score >= 4 ? {
      label: "Possible Fit 🤔",
      color: "#fb923c",
      border: "rgba(251,146,60,0.25)",
      rec: "There are real gaps here, but your background has transferable strengths. Consider whether a targeted approach is worth the investment — or correct any gaps the AI may have missed.",
      cta: "Build tailored resume anyway",
    } : {
      label: "Tough Road Ahead 💪",
      color: "#f87171",
      border: "rgba(248,113,113,0.25)",
      rec: "This role has significant gaps from your current profile — and that's okay. If you still want to apply, a clean base resume is your best move. Check if the AI missed anything before deciding.",
      cta: "Apply with base resume",
    };

  return (
    <div
      onClick={onDismiss}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#181a2e", border: `1px solid ${verdict.border}`, borderRadius: "14px", width: "100%", maxWidth: "620px", maxHeight: "88vh", overflowY: "auto", padding: "36px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)", position: "relative" }}>
        <button onClick={onDismiss}
          style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "#a0a0c0", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "80px", fontWeight: "800", lineHeight: 1, color: verdict.color, fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-2px" }}>
            {score}<span style={{ fontSize: "32px", color: "#6060a0", fontWeight: "400" }}>/10</span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: verdict.color, fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "10px" }}>{verdict.label}</div>
          <div style={{ fontSize: "15px", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "12px", lineHeight: "1.65", maxWidth: "480px", margin: "12px auto 0" }}>{verdict.rec}</div>
          <div style={{ fontSize: "13px", color: "#7870a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "8px", fontStyle: "italic" }}>{rationale}</div>
        </div>

        <div style={{ background: "rgba(80,80,160,0.12)", border: "1px solid rgba(80,80,160,0.25)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px", color: "#9890c8", lineHeight: "1.55" }}>
          Score reflects keyword and experience alignment — not your full potential. Your judgment supersedes this. If a gap looks wrong, correct it below and we'll re-score.
        </div>

        {gaps.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "12px" }}>Gaps to Review ({gaps.length})</div>
            {gaps.map((gap, i) => (
              <div key={i} style={{ background: "#1e2035", border: "1px solid #2e3050", borderRadius: "8px", padding: "12px 16px", marginBottom: "8px" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>{gap.title}</div>
                <div style={{ fontSize: "13px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6" }}>{gap.assessment}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "12px" }}>What would you like to do?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={onBuildResume}
            style={{ background: verdict.color === "#4ade80" ? "#2d7d46" : "#4f6ef7", color: "#ffffff", border: "none", borderRadius: "8px", padding: "15px 20px", fontSize: "15px", fontWeight: "600", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{verdict.cta}</span>
            <span style={{ fontSize: "13px", opacity: 0.8 }}>→ Resume tab</span>
          </button>
          <button onClick={onResumeOnly}
            style={{ background: "rgba(160,140,220,0.12)", color: "#e8e4f8", border: "1px solid rgba(160,140,220,0.3)", borderRadius: "8px", padding: "13px 20px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Apply with source-of-truth resume only</span>
            <span style={{ fontSize: "12px", opacity: 0.6 }}>no tailoring</span>
          </button>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button onClick={onCorrect}
              style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "8px", padding: "11px 16px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", flex: 1 }}>
              Correct a gap → re-score
            </button>
            <button onClick={onNewJD}
              style={{ background: "rgba(74,222,128,0.08)", color: "#6ab8a8", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", padding: "11px 16px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", flex: 1 }}>
              Try a different role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
            <button onClick={() => toggle(i)}
              style={{ background: gap.flagged ? "#c9a84c" : "transparent", border: `1px solid ${gap.flagged ? "#c9a84c" : "#6860a0"}`, borderRadius: "3px", width: "18px", height: "18px", cursor: "pointer", flexShrink: 0, marginTop: "2px", fontSize: "11px", color: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {gap.flagged ? "✓" : ""}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#c0b0d8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "3px" }}>{gap.title}</div>
              <div style={{ fontSize: "12px", color: "#4a4060", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.5" }}>{gap.assessment}</div>
              {gap.flagged && (
                <div style={{ marginTop: "10px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#8a7040", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>Your Correction</div>
                  <textarea value={gap.userCorrection} onChange={e => update(i, e.target.value)}
                    placeholder="e.g. I DO have LSSBB — Intel internal certification plus LinkedIn Learning."
                    rows={3} style={{ ...S.textarea, border: "1px solid #c9a84c" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button onClick={handleSave}
          style={{ background: "#c9a84c", color: "#0f1117", border: "none", borderRadius: "4px", padding: "10px 24px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer" }}>
          Save Corrections
        </button>
        <button onClick={onDone} style={S.btnGhost}>Done</button>
      </div>
    </div>
  );
}

function AnalyzeTab({ jd, setJd, stories, corrections, onSaveCorrections, onBuildResume, onResumeOnly, onNewJD, profile, onAddToTracker }) {
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

  const formatFull = (p) => [
    `FIT SCORE: ${p.score}/10\n${p.rationale}\n`,
    `KEY REQUIREMENTS:\n${p.keyRequirements?.map(r => `• ${r}`).join("\n") || ""}\n`,
    `STRONGEST ANGLES:\n${p.strongestAngles?.map(a => `• ${a.angle}\n  → ${a.why}`).join("\n") || ""}\n`,
    `TOP STORIES:\n${p.topStories?.map(s => `• "${s.story}"\n  → ${s.useFor}`).join("\n") || ""}\n`,
    p.gaps?.length ? `GAPS:\n${p.gaps.map(g => `• ${g.title}\n  ${g.assessment}\n  Framing: ${g.framing}`).join("\n\n")}\n` : "GAPS: None identified.\n",
    `KEYWORDS: ${p.keywords?.join(", ") || ""}`,
  ].join("\n");

  const runWithCorrections = async (activeCorrections) => {
    if (!jd.trim()) return;
    const hasStories = stories && stories.length > 0;
    const storyList = hasStories
      ? stories.map((s, i) => `${i + 1}. "${s.title}" — ${s.competencies.join(", ")} | Result: ${s.result}`).join("\n")
      : "";
    const userCtx = hasStories ? `INTERVIEW STORIES:\n${storyList}\n\n` : "";
    const text = await callClaude(
      buildAnalysisSystem(activeCorrections, profile, stories),
      `${userCtx}Job Description:\n${jd}`,
      3000
    );
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

  const handleSaveCorrections = async (nc) => {
    const merged = { ...corrections, ...nc };
    onSaveCorrections(merged);
    setShowCorrections(false);
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
          onDismiss={() => setShowModal(false)}
        />
      )}

      {/* Score summary retained after modal dismiss */}
      {!showModal && parsedScore !== null && !showCorrections && (
        <div
          onClick={() => setShowModal(true)}
          style={{
            background: parsedScore >= 8 ? "rgba(74,222,128,0.08)" : parsedScore >= 6 ? "rgba(251,191,36,0.08)" : parsedScore >= 4 ? "rgba(251,146,60,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${parsedScore >= 8 ? "rgba(74,222,128,0.3)" : parsedScore >= 6 ? "rgba(251,191,36,0.3)" : parsedScore >= 4 ? "rgba(251,146,60,0.3)" : "rgba(248,113,113,0.3)"}`,
            borderRadius: "8px", padding: "12px 18px", marginBottom: "20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "26px", fontWeight: "800", color: parsedScore >= 8 ? "#4ade80" : parsedScore >= 6 ? "#fbbf24" : parsedScore >= 4 ? "#fb923c" : "#f87171", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {parsedScore}/10
            </span>
            <span style={{ fontSize: "14px", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{parsedRationale}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onAddToTracker && (
              <button
                onClick={e => { e.stopPropagation(); onAddToTracker(); }}
                style={{ ...S.btn, fontSize: "11px", padding: "5px 12px", background: "rgba(79,110,247,0.2)", color: "#8aacff", border: "1px solid #4f6ef7" }}>
                ＋ Add to Tracker
              </button>
            )}
            <span style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>View details →</span>
          </div>
        </div>
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
          <span>✓ {Object.keys(corrections).length} gap correction{Object.keys(corrections).length > 1 ? "s" : ""} saved to your profile — AI will not re-flag these</span>
          <button onClick={() => setShowCorrections(true)} style={{ background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: "12px" }}>View / edit</button>
        </div>
      )}

      {stories.length === 0 && jd.trim() && (
        <div style={{ background: "rgba(79,110,247,0.08)", border: "1px solid rgba(79,110,247,0.2)", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#8aacff", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          💡 You're more than your resume — add interview stories in the Stories tab for a deeper, more accurate match. Gap analysis will run on your resume for now.
        </div>
      )}

      <button onClick={run} disabled={!jd.trim() || loading || reScoring || apiLocked}
        style={{ ...S.btn, opacity: !jd.trim() || loading || reScoring || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner /> Analyzing…</> : reScoring ? <><Spinner /> Re-scoring…</> : "Run Gap Analysis"}
      </button>

      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px", wordBreak: "break-word" }}>{error}</div>}
      {showCorrections && parsedGaps.length > 0 && <GapCorrectionPanel gaps={parsedGaps} corrections={corrections} onSave={handleSaveCorrections} onDone={() => setShowCorrections(false)} />}
      {showFull && fullResult && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Full Analysis</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={fullResult} />
              {parsedGaps.length > 0 && (
                <button onClick={() => setShowCorrections(!showCorrections)}
                  style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px", color: "#c9a84c", borderColor: "rgba(201,168,76,0.3)" }}>Correct gaps</button>
              )}
            </div>
          </div>
          <div style={S.resultBox}>{fullResult}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. RESUME TOOLS
// ─────────────────────────────────────────────────────────────────────────────

function ResumeTab({ jd, setJd, resumeOnly, onDownloaded, onSaveToDrive, profile }) {
  const [resume, setResume] = useState(() => getActiveResume(profile));
  useEffect(() => { setResume(getActiveResume(profile)); }, [profile.activeResumeId, profile.resumeVariants, profile.resumeText]);
  const activeVariant = getActiveResumeVariant(profile);

  const [phase, setPhase]                   = useState("idle");
  const [strategy, setStrategy]             = useState(null);
  const [editedStrategy, setEditedStrategy] = useState(null);
  const [finalText, setFinalText]           = useState("");
  const [showResume, setShowResume]         = useState(false);
  const [showPreview, setShowPreview]       = useState(false);
  const [error, setError]                   = useState(null);
  const [downloading, setDownloading]       = useState(false);
  const [saving, setSaving]                 = useState(false);
  const apiLocked = useApiLock();

  const runStrategy = async () => {
    if (!jd.trim()) return;
    setPhase("strategizing"); setError(null); setStrategy(null); setFinalText("");
    try {
      const text = await callClaude(PROMPTS.resumeStrategy(profile), `Job Description:\n${jd}\n\nResume:\n${resume}`, 2500);
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Strategy parse failed — unexpected response format.");
      const parsed = JSON.parse(m[0]);
      setStrategy(parsed);
      setEditedStrategy(JSON.parse(JSON.stringify(parsed)));
      setPhase("review");
    } catch (e) { setError(`Strategy failed: ${e.message}`); setPhase("idle"); }
  };

  const runRender = async () => {
    if (!editedStrategy) return;
    setPhase("rendering"); setError(null);
    try {
      const text = await buildFinalResumeText(resume, editedStrategy, jd);
      setFinalText(text);
      setPhase("done");
    } catch (e) { setError(`Render failed: ${e.message}`); setPhase("review"); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const m = jd.match(/(?:at|for|with|joining)\s+([A-Z][A-Za-z\s&,.]+?)(?:\s+is|\s+are|\s+we|\.|,)/);
      const company = m ? m[1].trim() : "";
      const blob = await buildResumeDocxBlob(finalText, company, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${profile.name || "Resume"}_${company || "Resume"}.docx`;
      a.click(); URL.revokeObjectURL(url);
      if (onDownloaded) onDownloaded(blob);
    } catch (e) { setError(`Download failed: ${e.message}`); }
    finally { setDownloading(false); }
  };

  const handleSaveToDriveBtn = async () => {
    setSaving(true);
    try {
      const m = jd.match(/(?:at|for|with|joining)\s+([A-Z][A-Za-z\s&,.]+?)(?:\s+is|\s+are|\s+we|\.|,)/);
      const company = m ? m[1].trim() : "";
      const blob = await buildResumeDocxBlob(finalText, company, profile);
      if (onSaveToDrive) await onSaveToDrive(blob);
    } catch (e) { setError(`Save failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  const reset = () => { setPhase("idle"); setStrategy(null); setEditedStrategy(null); setFinalText(""); setError(null); };

  return (
    <div>
      {resumeOnly && (
        <div style={{ background: "rgba(180,140,255,0.08)", border: "1px solid rgba(180,140,255,0.2)", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", color: "#b090d8" }}>
          Source-of-truth path — base resume as-is, minimal edits only.
        </div>
      )}
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div>
            <label style={{ ...S.label, margin: 0 }}>Resume Baseline</label>
            {activeVariant && (
              <span style={{ fontSize: "11px", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", marginLeft: "8px" }}>{activeVariant.name}</span>
            )}
          </div>
          <button onClick={() => setShowResume(!showResume)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>{showResume ? "Hide" : "Edit baseline"}</button>
        </div>
        {showResume && <textarea value={resume} onChange={e => setResume(e.target.value)} rows={12} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />}
      </div>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}

      {phase === "idle" && (
        <button onClick={runStrategy} disabled={!jd.trim() || apiLocked}
          style={{ ...S.btn, opacity: !jd.trim() || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
          ✦ Build Resume Strategy
        </button>
      )}
      {phase === "strategizing" && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px" }}>
          <Spinner /> Analyzing JD against your resume…
        </div>
      )}
      {(phase === "review" || phase === "rendering") && editedStrategy && (
        <div style={{ ...S.section, marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ ...S.label, margin: 0 }}>Resume Strategy — Review & Edit</div>
            <button onClick={reset} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>✕ Start over</button>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "8px" }}>Summary Rewrite</div>
            <textarea value={editedStrategy.summaryRewrite || ""}
              onChange={e => setEditedStrategy(s => ({ ...s, summaryRewrite: e.target.value }))}
              rows={4} style={{ ...S.textarea, fontSize: "13px" }}
              onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          </div>
          {editedStrategy.bulletEdits?.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "10px" }}>
                Bullet Edits ({editedStrategy.bulletEdits.length})
              </div>
              {editedStrategy.bulletEdits.map((edit, i) => (
                <div key={i} style={{ background: "#1a1c30", border: "1px solid #2a2c40", borderRadius: "6px", padding: "12px 14px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px", fontStyle: "italic" }}>
                    Original: {edit.original?.slice(0, 80)}{edit.original?.length > 80 ? "…" : ""}
                  </div>
                  <textarea value={edit.revised || ""}
                    onChange={e => setEditedStrategy(s => ({ ...s, bulletEdits: s.bulletEdits.map((b, j) => j === i ? { ...b, revised: e.target.value } : b) }))}
                    rows={2} style={{ ...S.textarea, fontSize: "13px", marginBottom: "4px" }}
                    onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
                  <div style={{ fontSize: "11px", color: "#4ade80", fontFamily: "'DM Sans', system-ui, sans-serif" }}>↑ {edit.reason}</div>
                </div>
              ))}
            </div>
          )}
          {editedStrategy.keywordsToAdd?.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "8px" }}>Keywords to Add</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {editedStrategy.keywordsToAdd.map((kw, i) => (
                  <span key={i} style={{ background: "rgba(79,110,247,0.12)", color: "#8aacff", border: "1px solid rgba(79,110,247,0.3)", borderRadius: "4px", padding: "3px 10px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{kw}</span>
                ))}
              </div>
            </div>
          )}
          {editedStrategy.toDeEmphasize?.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#fb923c", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "8px" }}>De-emphasize</div>
              {editedStrategy.toDeEmphasize.map((item, i) => (
                <div key={i} style={{ fontSize: "13px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "4px 0", borderBottom: "1px solid #1e2030" }}>{item}</div>
              ))}
            </div>
          )}
          <button onClick={runRender} disabled={phase === "rendering" || apiLocked}
            style={{ ...S.btn, opacity: phase === "rendering" || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
            {phase === "rendering" ? <><Spinner />Building resume…</> : "⬇ Render Final Resume"}
          </button>
        </div>
      )}
      {phase === "done" && finalText && (
        <div style={{ ...S.section, marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ ...S.label, margin: 0 }}>Final Resume — Ready</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => setShowPreview(!showPreview)} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>{showPreview ? "Hide preview" : "Preview text"}</button>
              <CopyBtn text={finalText} />
              <button onClick={handleDownload} disabled={downloading}
                style={{ ...S.btn, padding: "5px 14px", fontSize: "12px", background: "#3a5abf", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading ? <><Spinner size={12} />…</> : "⬇ Download .docx"}
              </button>
              {onSaveToDrive && (
                <button onClick={handleSaveToDriveBtn} disabled={saving}
                  style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {saving ? <><Spinner size={12} />Saving…</> : "📁 Save to Drive"}
                </button>
              )}
            </div>
          </div>
          {showPreview && <div style={S.resultBox}>{finalText}</div>}
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button onClick={() => setPhase("review")} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>← Revise strategy</button>
            <button onClick={reset} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>Start over</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CoverLetterTab({ jd, setJd, onDownloaded, onSaveToDrive, profile }) {
  const [company, setCompany]         = useState("");
  const [role, setRole]               = useState("");
  const [notes, setNotes]             = useState("");
  const [tone, setTone]               = useState("");
  const [result, setResult]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [extracting, setExtracting]   = useState(false);
  const [error, setError]             = useState(null);
  const apiLocked = useApiLock();

  useEffect(() => {
    if (!jd.trim() || (company && role)) return;
    const t = setTimeout(async () => {
      setExtracting(true);
      try {
        const text = await callClaude(PROMPTS.coverLetterExtract(), jd.slice(0, 1500), 200);
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
      const text = await callClaude(
        PROMPTS.coverLetter(profile, company, role, notes, tone || null),
        `Company: ${company || "the company"}\nRole: ${role || "this position"}\n${notes ? `Context: ${notes}\n` : ""}\nJD:\n${jd}`,
        1500
      );
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await buildCoverLetterDocxBlob(result, company, role, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${profile.name || "CoverLetter"}_${company || "Cover"}.docx`;
      a.click(); URL.revokeObjectURL(url);
      if (onDownloaded) onDownloaded(blob);
    } catch (e) { setError(`Download failed: ${e.message}`); }
    finally { setDownloading(false); }
  };

  const handleSaveToDriveBtn = async () => {
    setSaving(true);
    try {
      const blob = await buildCoverLetterDocxBlob(result, company, role, profile);
      if (onSaveToDrive) await onSaveToDrive(blob);
    } catch (e) { setError(`Save failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  const TONE_OPTIONS = [
    { id: "",          label: "Auto",      desc: "Matches your profile tier" },
    { id: "executive", label: "Executive", desc: "Commercial, boardroom-framed" },
    { id: "warm",      label: "Warm",      desc: "Collaborative, mission-aligned" },
    { id: "concise",   label: "Concise",   desc: "Tight, results-first, 2 paragraphs" },
    { id: "narrative", label: "Narrative", desc: "Opens with a story or insight" },
  ];
  const tierLabels = { student: "student", midlevel: "mid-level", senior: "senior", executive: "executive" };
  const activeTierLabel = tierLabels[profile.profileTier] || "senior";

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div>
          <label style={S.label}>Company Name {extracting && <span style={{ color: "#4a4abf", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>extracting…</span>}</label>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" style={S.input} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        </div>
        <div>
          <label style={S.label}>Role Title</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. VP of Technology" style={S.input} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        </div>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label style={S.label}>Tone</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {TONE_OPTIONS.map(t => (
            <button key={t.id} onClick={() => setTone(t.id)}
              style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", background: tone === t.id ? "rgba(79,110,247,0.15)" : "transparent", color: tone === t.id ? "#8aacff" : "#6860a0", borderColor: tone === t.id ? "#4f6ef7" : "#3a3d5c" }}
              title={t.id === "" ? `Uses ${activeTierLabel}-tier voice by default` : t.desc}>
              {t.label}{t.id === "" && <span style={{ fontSize: "10px", color: tone === "" ? "#6a8ae0" : "#4a4868", marginLeft: "4px" }}>({activeTierLabel})</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Additional Context <span style={{ color: "#6860a0", textTransform: "none", letterSpacing: 0 }}>optional</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Referred by John Smith. Emphasize CCR governance work…" rows={3} style={S.textarea}
          onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
      </div>
      <button onClick={run} disabled={!jd.trim() || loading || apiLocked}
        style={{ ...S.btn, opacity: !jd.trim() || loading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner />Drafting…</> : "Draft Cover Letter"}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ ...S.label, margin: 0 }}>Cover Letter Draft</div>
              {tone && <span style={{ fontSize: "11px", color: "#4f6ef7", background: "rgba(79,110,247,0.1)", padding: "2px 8px", borderRadius: "3px" }}>{TONE_OPTIONS.find(t => t.id === tone)?.label}</span>}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={result} />
              <button onClick={handleDownload} disabled={downloading}
                style={{ ...S.btn, padding: "5px 14px", fontSize: "11px", background: downloading ? "#3a3d5c" : "#3a5abf", display: "flex", alignItems: "center", gap: "6px" }}>
                {downloading ? <><Spinner size={12} />…</> : "⬇ Download .docx"}
              </button>
              {onSaveToDrive && (
                <button onClick={handleSaveToDriveBtn} disabled={saving}
                  style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {saving ? <><Spinner size={12} />Saving…</> : "📁 Save to Drive"}
                </button>
              )}
            </div>
          </div>
          <div style={S.resultBox}>{result}</div>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button onClick={() => setResult("")} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>↺ Redraft</button>
            <button onClick={() => { setResult(""); setTone(""); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>↺ Change tone</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StoryMatchPanel({ jd, stories }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan]         = useState(false);
  const [error, setError]     = useState(null);
  const apiLocked = useApiLock();

  const run = async () => {
    if (!jd.trim() || stories.length === 0) return;
    setLoading(true); setError(null);
    try {
      const text = await callClaude(PROMPTS.storyMatch(stories), `Job Description:\n${jd.slice(0, 2000)}`, 500);
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error("Could not parse story matches.");
      const parsed = JSON.parse(m[0]);
      setMatches(parsed.map(r => ({ ...r, story: stories[r.index] })).filter(r => r.story));
      setRan(true);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (stories.length === 0) return null;

  return (
    <div style={{ ...S.section, marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ran ? "14px" : 0 }}>
        <div style={{ ...S.label, margin: 0 }}>Story Match</div>
        {!ran ? (
          <button onClick={run} disabled={!jd.trim() || loading || apiLocked}
            style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", display: "flex", alignItems: "center", gap: "6px", opacity: !jd.trim() || loading || apiLocked ? 0.5 : 1 }}>
            {loading ? <><Spinner size={10} />Matching…</> : "✦ Match stories to JD"}
          </button>
        ) : (
          <button onClick={() => { setRan(false); setMatches([]); run(); }} disabled={loading || apiLocked}
            style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>↺ Rematch</button>
        )}
      </div>
      {error && <div style={{ fontSize: "12px", color: "#f87171", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "8px" }}>{error}</div>}
      {!ran && !loading && (
        <div style={{ fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "8px" }}>
          Surface the 3 most relevant stories for this role before generating questions.
        </div>
      )}
      {ran && matches.length > 0 && (
        <div>
          {matches.map((m, i) => (
            <div key={i} style={{ background: "#1a1c2e", border: "1px solid #2e3050", borderRadius: "8px", padding: "14px 16px", marginBottom: "8px", display: "flex", gap: "12px" }}>
              <div style={{ flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%", background: "rgba(79,110,247,0.15)", border: "1px solid #4f6ef7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#8aacff", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "3px" }}>{m.story.title}</div>
                <div style={{ fontSize: "11px", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "4px" }}>Use for: {m.useFor}</div>
                <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>{m.why}</div>
                {m.story.competencies?.length > 0 && (
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "6px" }}>
                    {m.story.competencies.map(c => (
                      <span key={c} style={{ background: "rgba(180,140,255,0.1)", color: "#b090d0", borderRadius: "3px", padding: "1px 7px", fontSize: "10px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      const text = await callClaude(PROMPTS.interviewPrep(profile, stories, round), `Round: ${round}\n\nJD:\n${jd}`, 3000);
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <JDInput jd={jd} setJd={setJd} />
      {stories.length > 0 && jd.trim() && (
        <StoryMatchPanel jd={jd} stories={stories} />
      )}
      <div style={{ marginBottom: "20px" }}>
        <label style={S.label}>Interview Round</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["screening","hiring manager","panel","executive","final"].map(r => (
            <button key={r} onClick={() => setRound(r)}
              style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", textTransform: "capitalize", background: round === r ? "rgba(99,140,255,0.15)" : "transparent", color: round === r ? "#8aacff" : "#5a5870", borderColor: round === r ? "#4a6abf" : "#3a3d5c" }}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <button onClick={run} disabled={!jd.trim() || loading || apiLocked}
        style={{ ...S.btn, opacity: !jd.trim() || loading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner />Preparing…</> : `Prep for ${round} interview`}
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
// 14. RESEARCH
// ─────────────────────────────────────────────────────────────────────────────

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
  const anyLoading  = Object.values(steps).some(s => s === "loading");

  const ResultCard = ({ step }) => {
    const src  = parseSources(results[step.key] || "");
    const body = (results[step.key] || "").replace(/Sources?:.*$/is, "").trim();
    return (
      <div style={{ ...S.section, marginBottom: "16px" }}>
        <div style={{ ...S.label, color: "#5858a0", marginBottom: "12px" }}>{step.label}</div>
        <div style={{ fontSize: "14px", lineHeight: "1.8", fontFamily: "Georgia, serif", color: steps[step.key] === "error" ? "#c06060" : "#d0ccee", marginBottom: src.length ? "12px" : 0 }}>{body}</div>
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
      <div style={{ background: "rgba(74,74,191,0.06)", border: "1px solid rgba(74,74,191,0.18)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px", color: "#5858a0", lineHeight: "1.6" }}>
        <strong style={{ color: "#6868b0" }}>Scope:</strong> Only company name is used in search queries — no personal information or resume content is included. Results are AI-synthesized from public sources. Verify all claims before use in interviews.
      </div>

      {confirmPending && !hasRun && (
        <div style={{ ...S.section, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.04)", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#c9a84c", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Ready to research: {effective}</div>
          <div style={{ fontSize: "13px", color: "#6a6040", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "16px" }}>
            The agent will run {RESEARCH_STEPS.length} web searches: overview, leadership, financials, and transformation initiatives. Each result will be sourced and cited.
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={runAll} disabled={apiLocked} style={{ ...S.btn, display: "flex", alignItems: "center", gap: "8px" }}>
              {apiLocked ? <><Spinner />Running…</> : "Confirm — Run Research"}
            </button>
            <button onClick={() => setConfirmPending(false)} style={S.btnGhost}>Not now</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <label style={S.label}>Company {company && !override && <span style={{ color: "#4a4abf", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>from JD: {company}</span>}</label>
        <div style={{ display: "flex", gap: "10px" }}>
          <input value={override} onChange={e => setOverride(e.target.value)} placeholder={company || "Enter company name…"}
            style={{ ...S.input, flex: 1 }} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          <button
            onClick={() => { setResults({}); setSteps({}); setHasRun(false); setConfirmPending(false); setTimeout(runAll, 50); }}
            disabled={!effective || anyLoading || apiLocked}
            style={{ ...S.btn, opacity: !effective || anyLoading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
            {anyLoading ? <><Spinner />Researching…</> : hasRun ? "Re-run" : "Run Research"}
          </button>
        </div>
      </div>

      {hasRun && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ ...S.label, marginBottom: "10px" }}>Agent Steps</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {RESEARCH_STEPS.map(step => (
              <div key={step.key} style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "12px" }}>
                <span style={{ width: "16px", textAlign: "center", flexShrink: 0, color: steps[step.key] === "done" ? "#7adf8a" : steps[step.key] === "error" ? "#df7a7a" : steps[step.key] === "loading" ? "#c9a84c" : "#6860a0" }}>
                  {steps[step.key] === "loading" ? <Spinner size={10} /> : steps[step.key] === "done" ? "✓" : steps[step.key] === "error" ? "✗" : "○"}
                </span>
                <span style={{ color: steps[step.key] === "done" ? "#8888b8" : "#6860a0" }}>{step.label}</span>
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
              <button key={step.key}
                onClick={() => runStep(step)}
                disabled={steps[step.key] === "loading" || steps[step.key] === "done" || apiLocked}
                style={{ ...S.btnGhost, fontSize: "12px", background: steps[step.key] === "done" ? "rgba(99,140,255,0.1)" : "transparent", color: steps[step.key] === "done" ? "#8aacff" : steps[step.key] === "loading" ? "#c9a84c" : "#6ab8a8", borderColor: steps[step.key] === "done" ? "#4a6abf" : "rgba(99,180,160,0.4)", display: "flex", alignItems: "center", gap: "6px" }}>
                {steps[step.key] === "loading" ? <><Spinner size={10} />Loading…</> : step.label}
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
// 15. STORIES
// ─────────────────────────────────────────────────────────────────────────────

function StoryCard({ story, onEdit, onDelete, onStar }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${story.starred ? "rgba(99,140,255,0.3)" : "#2e3050"}`, borderRadius: "8px", marginBottom: "12px", overflow: "hidden" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", background: expanded ? "rgba(99,140,255,0.04)" : "transparent" }}>
        <button onClick={e => { e.stopPropagation(); onStar(story.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0", marginTop: "1px", flexShrink: 0 }}>
          {story.starred ? "⭐" : "☆"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#d8d0f0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>{story.title}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Tag label={story.company} color="rgba(99,140,255,0.12)" textColor="#7a9aef" />
            <Tag label={story.role} />
            {story.competencies.map(c => <Tag key={c} label={c} color="rgba(180,140,255,0.1)" textColor="#b090d0" />)}
          </div>
        </div>
        <div style={{ color: "#3e3a4e", fontSize: "18px", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</div>
      </div>
      {expanded && (
        <div style={{ padding: "0 20px 20px 48px", borderTop: "1px solid #1a1a2a" }}>
          {[
            { l: "S — Situation", k: "situation", c: "#6b8080" },
            { l: "T — Task",      k: "task",      c: "#6b7a80" },
            { l: "A — Action",    k: "action",    c: "#6b6880" },
            { l: "R — Result",    k: "result",    c: "#7a8060" },
          ].map(({ l, k, c }) => (
            <div key={k} style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: c, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "6px" }}>{l}</div>
              <div style={{ fontSize: "14px", lineHeight: "1.7", color: "#b0a8c0", fontFamily: "Georgia, serif" }}>{story[k]}</div>
            </div>
          ))}
          {story.tags?.length > 0 && (
            <div style={{ marginTop: "16px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {story.tags.map(t => <Tag key={t} label={`#${t}`} color="rgba(255,255,255,0.04)" textColor="#8880b8" />)}
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

function StoryEditor({ story, onSave, onCancel }) {
  const blank = { id: generateId(), title: "", company: "", role: "", competencies: [], situation: "", task: "", action: "", result: "", tags: "", starred: false };
  const [form, setForm] = useState(story ? { ...story, tags: story.tags?.join(", ") || "" } : blank);
  const field = (key, label, multi = false, hint = "") => (
    <div style={{ marginBottom: "18px" }}>
      <label style={{ ...S.label, color: "#6860a0" }}>
        {label}
        {hint && <span style={{ color: "#3e3a50", marginLeft: "8px", letterSpacing: 0, textTransform: "none", fontSize: "11px" }}>{hint}</span>}
      </label>
      {multi
        ? <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={4} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        : <input type="text" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={S.input} onFocus={e => e.target.style.borderColor = "#4a4abf"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
      }
    </div>
  );
  return (
    <div style={{ background: "#1e2035", border: "1px solid #2a2a3a", borderRadius: "8px", padding: "28px" }}>
      <div style={{ fontSize: "16px", fontWeight: "600", color: "#e0dcf4", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>
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
            <CompBadge key={c} label={c} active={form.competencies.includes(c)}
              onClick={() => setForm(f => ({ ...f, competencies: f.competencies.includes(c) ? f.competencies.filter(x => x !== c) : [...f.competencies, c] }))} />
          ))}
        </div>
      </div>
      {field("situation", "S — Situation", true, "Context")}
      {field("task",      "T — Task",      true, "Your responsibility")}
      {field("action",    "A — Action",    true, "What you did")}
      {field("result",    "R — Result",    true, "Quantified outcomes")}
      {field("tags", "Tags", false, "comma-separated")}
      <div style={{ display: "flex", gap: "12px" }}>
        <button onClick={() => {
          if (!form.title.trim()) return;
          onSave({ ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) });
        }} style={S.btn}>Save Story</button>
        <button onClick={onCancel} style={S.btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

function MyStoriesTab({ profile, stories, setStories }) {
  const [mode, setMode] = useState("view"); // view | edit | extract | interview-pick | interview-chat | interview-review
  const [editing, setEditing] = useState(null);
  const [filterComp, setFilterComp] = useState(null);
  const [filterStarred, setFilterStarred] = useState(false);
  const [search, setSearch] = useState("");

  // Extract state
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [extractError, setExtractError] = useState(null);

  // Interview state
  const [bulletPoints, setBulletPoints] = useState([]);
  const [activeBullet, setActiveBullet] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [builtStory, setBuiltStory] = useState(null);
  const [customBullet, setCustomBullet] = useState("");

  const apiLocked = useApiLock();
  const sub = { fontSize: "13px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.65" };

  // Library handlers
  const handleSave   = s  => { setStories(p => p.find(x => x.id === s.id) ? p.map(x => x.id === s.id ? s : x) : [...p, s]); setMode("view"); setEditing(null); };
  const handleDelete = id => { if (window.confirm("Delete this story?")) setStories(p => p.filter(s => s.id !== id)); };
  const handleStar   = id => setStories(p => p.map(s => s.id === id ? { ...s, starred: !s.starred } : s));

  const filtered = stories.filter(s => {
    if (filterStarred && !s.starred) return false;
    if (filterComp && !s.competencies.includes(filterComp)) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.company.toLowerCase().includes(q) || s.tags?.some(t => t.toLowerCase().includes(q)) || s.result.toLowerCase().includes(q);
    }
    return true;
  });

  const repairJSON = (str) => {
    // Remove control characters inside strings (the main culprit)
    let s = str
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")  // control chars except \t \n \r
      .replace(/\t/g, " ")                                // tabs → space
      .replace(/\r?\n/g, " ")                             // newlines → space (inside strings)
      .replace(/[\u2018\u2019]/g, "'")                    // curly single quotes → straight
      .replace(/[\u201c\u201d]/g, '"')                    // curly double quotes → straight
      .replace(/\u2014/g, " - ")                          // em dash → hyphen (safe in JSON)
      .replace(/\u2013/g, "-")                            // en dash
      .replace(/\\'/g, "'")                               // escaped single quotes (invalid in JSON)
      .replace(/,\s*([}\]])/g, "$1");                     // trailing commas
    return s;
  };

  const handleExtract = async () => {
    setMode("extract"); setExtracting(true); setExtractError(null); setExtracted([]);
    try {
      const resumeSlice = (profile.resumeText || "").slice(0, 4000);
      const text = await callClaude(PROMPTS.storyExtract(profile), resumeSlice, 3000);

      // Extract the JSON array from the response
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error("No stories found in resume — try adding more detail to your resume text");

      let parsed;
      // First attempt: raw parse
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        // Second attempt: repair then parse
        try {
          parsed = JSON.parse(repairJSON(m[0]));
        } catch (e2) {
          // Third attempt: extract individual story objects and parse each separately
          const objects = m[0].match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g);
          if (objects && objects.length > 0) {
            parsed = objects.map(o => {
              try { return JSON.parse(repairJSON(o)); }
              catch { return null; }
            }).filter(Boolean);
            if (parsed.length === 0) throw new Error("Could not parse any stories — try again");
          } else {
            throw new Error("Resume extraction returned malformed data — try again");
          }
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("No stories could be extracted — ensure your resume text is pasted correctly");
      }

      const withIds = parsed.map(s => ({ ...s, id: generateId(), starred: false, tags: s.tags || [] }));
      setExtracted(withIds);
      setSelectedIds(new Set(withIds.map(s => s.id)));
    } catch (e) { setExtractError(`Extraction failed: ${e.message}`); }
    finally { setExtracting(false); }
  };

  const parseBullets = async () => {
    if (!profile.resumeText) return;
    setChatLoading(true);
    try {
      const text = await callClaude(
        `Extract 6-10 achievement bullet points from this resume. Return ONLY a JSON array of strings — each a single bullet mentioning a result, metric, or notable action. No preamble.`,
        profile.resumeText.slice(0, 4000),
        800
      );
      const m = text.match(/\[[\s\S]*\]/);
      if (m) setBulletPoints(JSON.parse(m[0]));
    } catch {}
    finally { setChatLoading(false); }
  };

  const saveExtracted = () => {
    const toAdd = extracted.filter(s => selectedIds.has(s.id));
    const existingIds = new Set(stories.map(s => s.id));
    setStories(p => [...p, ...toAdd.filter(s => !existingIds.has(s.id))]);
    setExtracted([]); setSelectedIds(new Set()); setMode("view");
  };

  const startInterview = (bullet) => {
    setActiveBullet(bullet);
    setBuiltStory({ situation: "", task: "", action: "", result: "", hook: "", title: "", company: "", role: "", competencies: [], tags: [] });
    const opener = `Let's turn this into a polished interview story:

"${bullet}"

I'll walk you through the **STAR format** — the structure most interviewers use to evaluate behavioral answers:

- **S — Situation:** Sets the scene. Answers *"Tell me about a time when…"*
- **T — Task:** Your specific responsibility. Answers *"What were you accountable for?"*
- **A — Action:** What YOU did. Answers *"Walk me through your approach."*
- **R — Result:** The outcome. Answers *"What was the impact?"*

We'll also build a **Hook** — a one-sentence opener leading with the result, for when you only have 30 seconds on a phone screen.

Let's start with **Situation**. What was going on in the organization — what was the problem, challenge, or context that made this work necessary?`;
    setMessages([{ role: "assistant", content: opener }]);
    setMode("interview-chat");
  };

  const handleSend = async () => {
    if (!userInput.trim() || chatLoading) return;
    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages); setUserInput(""); setChatLoading(true);
    try {
      const history = newMessages.map(m => `${m.role === "user" ? "Candidate" : "Coach"}: ${m.content}`).join("\n\n");
      const response = await callClaude(
        PROMPTS.storyInterview(profile, builtStory),
        `Conversation so far:\n${history}\n\nBullet point being developed: "${activeBullet}"`,
        1000
      );
      const jsonMatch = response.match(/\{"complete":\s*true[\s\S]*?\}/);
      if (jsonMatch) {
        const completed = JSON.parse(jsonMatch[0]);
        setBuiltStory(prev => ({
          ...prev, id: generateId(),
          situation: completed.situation || prev.situation,
          task:      completed.task      || prev.task,
          action:    completed.action    || prev.action,
          result:    completed.result    || prev.result,
          hook:      completed.hook      || prev.hook,
          title: completed.result?.split(".")[0]?.slice(0, 60) || activeBullet.slice(0, 60),
          starred: false, tags: [],
        }));
        setMode("interview-review");
        setMessages(m => [...m, { role: "assistant", content: "Perfect — I have everything I need. Here's your complete story. Review and edit below before saving." }]);
      } else {
        setMessages(m => [...m, { role: "assistant", content: response }]);
      }
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Sorry, something went wrong: ${e.message}` }]);
    }
    finally { setChatLoading(false); }
  };

  const saveBuilt = () => {
    if (builtStory) {
      const existingIds = new Set(stories.map(s => s.id));
      if (!existingIds.has(builtStory.id)) setStories(p => [...p, builtStory]);
      setBuiltStory(null); setMessages([]); setActiveBullet(null); setMode("view");
    }
  };

  const backToView = () => { setMode("view"); setEditing(null); setExtracted([]); setMessages([]); setBuiltStory(null); };

  // ── EDIT mode ──
  if (mode === "edit") return (
    <div>
      <button onClick={backToView} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px", marginBottom: "20px" }}>← Back to My Stories</button>
      <StoryEditor story={editing === "new" ? null : editing} onSave={handleSave} onCancel={backToView} />
    </div>
  );

  // ── EXTRACT mode ──
  if (mode === "extract") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={backToView} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>← Back</button>
        <div style={{ fontSize: "18px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Extract from Resume</div>
      </div>
      {extracting ? (
        <div style={{ ...S.section, textAlign: "center", padding: "48px" }}>
          <div style={{ marginBottom: "16px" }}><Spinner size={28} /></div>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Reading your resume…</div>
          <div style={sub}>Identifying your strongest achievements and building STAR stories</div>
        </div>
      ) : extractError ? (
        <div style={S.section}>
          <div style={{ color: "#f87171", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "16px" }}>{extractError}</div>
          <button onClick={handleExtract} style={S.btn}>Try again</button>
        </div>
      ) : extracted.length > 0 ? (
        <div>
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={sub}>{extracted.length} stories found — select which to add to your library</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setSelectedIds(new Set(extracted.map(s => s.id)))} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>All</button>
              <button onClick={() => setSelectedIds(new Set())} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>None</button>
              <button onClick={saveExtracted} disabled={selectedIds.size === 0}
                style={{ ...S.btn, opacity: selectedIds.size === 0 ? 0.5 : 1, padding: "8px 18px" }}>
                Add {selectedIds.size} to Library
              </button>
            </div>
          </div>
          {extracted.map(story => {
            const selected = selectedIds.has(story.id);
            return (
              <div key={story.id}
                onClick={() => setSelectedIds(prev => { const n = new Set(prev); selected ? n.delete(story.id) : n.add(story.id); return n; })}
                style={{ ...S.section, border: `1px solid ${selected ? "#4f6ef7" : "#2e3050"}`, cursor: "pointer", marginBottom: "12px", transition: "border-color 0.15s" }}>
                <div style={{ display: "flex", gap: "14px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "4px", border: `2px solid ${selected ? "#4f6ef7" : "#3a3d5c"}`, background: selected ? "#4f6ef7" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                    {selected && <span style={{ color: "#fff", fontSize: "12px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>{story.title}</div>
                    <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>{story.company} · {story.role}</div>
                    {story.hook && (
                      <div style={{ fontSize: "13px", color: "#fbbf24", fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: "10px", padding: "8px 12px", background: "rgba(251,191,36,0.06)", borderLeft: "3px solid rgba(251,191,36,0.4)", borderRadius: "0 4px 4px 0" }}>"{story.hook}"</div>
                    )}
                    {[["S", story.situation], ["T", story.task], ["A", story.action], ["R", story.result]].map(([l, v]) => v && (
                      <div key={l} style={{ marginBottom: "5px" }}>
                        <span style={{ fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600" }}>{l} </span>
                        <span style={{ fontSize: "13px", color: "#c8c4e8", fontFamily: "Georgia, serif", lineHeight: "1.6" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  // ── INTERVIEW PICK ──
  if (mode === "interview-pick") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={backToView} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>← Back</button>
        <div style={{ fontSize: "18px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Build a Story</div>
      </div>

      <div style={{ ...S.section, border: "1px solid rgba(79,110,247,0.3)", marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "10px" }}>How STAR stories work in interviews</div>
        <div style={{ ...sub, marginBottom: "14px" }}>Behavioral questions — "Tell me about a time when…", "Walk me through how you handled…" — are designed to hear STAR stories. Interviewers probe each layer.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
          {[
            { l: "S", name: "Situation", desc: "Context and challenge",          color: "#6080ef" },
            { l: "T", name: "Task",      desc: "Your specific accountability",   color: "#8b5cf6" },
            { l: "A", name: "Action",    desc: "What YOU did — specific, active",color: "#4f6ef7" },
            { l: "R", name: "Result",    desc: "Quantified outcomes",             color: "#10b981" },
          ].map(({ l, name, desc, color }) => (
            <div key={l} style={{ background: "#1e2240", borderRadius: "6px", padding: "10px", border: `1px solid ${color}33` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginBottom: "4px" }}>
                <span style={{ fontSize: "16px", fontWeight: "800", color, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{l}</span>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{name}</span>
              </div>
              <div style={{ fontSize: "11px", color: "#7870a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {chatLoading && bulletPoints.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "20px" }}>
          <Spinner />Reading your resume for achievements…
        </div>
      )}

      {bulletPoints.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ ...S.label, marginBottom: "10px" }}>Achievements from your resume — click one to develop</div>
          {bulletPoints.map((b, i) => (
            <div key={i} onClick={() => startInterview(b)}
              style={{ ...S.section, cursor: "pointer", padding: "14px 18px", marginBottom: "8px", transition: "border-color 0.15s, background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#4f6ef7"; e.currentTarget.style.background = "#1e2240"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2e3050"; e.currentTarget.style.background = "#181a2e"; }}>
              <div style={{ fontSize: "14px", color: "#d8d4f0", fontFamily: "Georgia, serif", lineHeight: "1.6" }}>{b}</div>
              <div style={{ fontSize: "11px", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "5px" }}>Click to build this story →</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...S.label, marginBottom: "8px" }}>Or describe your own achievement</div>
      <textarea value={customBullet} onChange={e => setCustomBullet(e.target.value)}
        placeholder="e.g. Led migration to NetSuite, delivered on time and under budget…" rows={3}
        style={S.textarea} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
      <button onClick={() => { if (customBullet.trim()) startInterview(customBullet.trim()); }}
        disabled={!customBullet.trim()}
        style={{ ...S.btn, marginTop: "12px", opacity: !customBullet.trim() ? 0.5 : 1 }}>
        Build this story
      </button>
    </div>
  );

  // ── INTERVIEW CHAT ──
  if (mode === "interview-chat") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <button onClick={() => setMode("interview-pick")} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>← Back</button>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Building your story</div>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { letter: "S", label: "Situation", q: "\"Tell me about a time when…\"", color: "#6080ef" },
          { letter: "T", label: "Task",      q: "\"What were you responsible for?\"", color: "#8b5cf6" },
          { letter: "A", label: "Action",    q: "\"Walk me through your approach.\"", color: "#4f6ef7" },
          { letter: "R", label: "Result",    q: "\"What was the impact?\"",           color: "#10b981" },
        ].map(({ letter, label, q, color }) => (
          <div key={letter} style={{ flex: "1", minWidth: "110px", background: "#181a2e", border: `1px solid ${color}44`, borderRadius: "6px", padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginBottom: "2px" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{letter}</span>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</span>
            </div>
            <div style={{ fontSize: "10px", color: "#5860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>{q}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px", padding: "20px", marginBottom: "14px", maxHeight: "380px", overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "14px", display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? "#4f6ef7" : "#1e2240", color: m.role === "user" ? "#fff" : "#d8d4f0", fontSize: "14px", fontFamily: m.role === "user" ? "'DM Sans', system-ui, sans-serif" : "Georgia, serif", lineHeight: "1.65", whiteSpace: "pre-line" }}>
              {m.content}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px" }}>
            <Spinner />Thinking…
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <textarea value={userInput} onChange={e => setUserInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type your answer… (Enter to send, Shift+Enter for new line)" rows={3}
          style={{ ...S.textarea, flex: 1 }} disabled={chatLoading}
          onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
        <button onClick={handleSend} disabled={!userInput.trim() || chatLoading || apiLocked}
          style={{ ...S.btn, alignSelf: "flex-end", padding: "12px 20px" }}>Send</button>
      </div>
    </div>
  );

  // ── INTERVIEW REVIEW ──
  if (mode === "interview-review" && builtStory) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button onClick={() => setMode("interview-pick")} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 12px" }}>← Build another</button>
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Review your story</div>
      </div>
      <div style={{ ...sub, marginBottom: "20px" }}>Edit anything before saving to your library.</div>
      {[
        { key: "title",     label: "Story Title" },
        { key: "company",   label: "Company" },
        { key: "role",      label: "Role / Title" },
        { key: "hook",      label: "Hook — one powerful sentence leading with the result" },
        { key: "situation", label: "S — Situation", multi: true },
        { key: "task",      label: "T — Task",      multi: true },
        { key: "action",    label: "A — Action",    multi: true },
        { key: "result",    label: "R — Result",    multi: true },
      ].map(({ key, label, multi }) => (
        <div key={key} style={{ marginBottom: "16px" }}>
          <label style={S.label}>{label}</label>
          {multi
            ? <textarea value={builtStory[key] || ""} onChange={e => setBuiltStory(s => ({ ...s, [key]: e.target.value }))} rows={3} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            : <input type="text" value={builtStory[key] || ""} onChange={e => setBuiltStory(s => ({ ...s, [key]: e.target.value }))} style={S.input} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          }
        </div>
      ))}
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={saveBuilt} style={S.btn}>Save to Library</button>
        <button onClick={() => setMode("interview-pick")} style={S.btnGhost}>Start another</button>
      </div>
    </div>
  );

  // ── MAIN VIEW ──
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #1e2240 0%, #1a1e38 100%)", border: "1px solid rgba(79,110,247,0.3)", borderRadius: "12px", padding: "24px 28px", marginBottom: "28px" }}>
        <div style={{ fontSize: "17px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "10px" }}>
          Your stories are your competitive edge 🏆
        </div>
        <div style={{ fontSize: "14px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.7", marginBottom: "18px" }}>
          Strong STAR stories power every part of NarrativeOS — they sharpen your JD fit analysis, strengthen your cover letter, and prepare you for behavioral interviews. Don't limit yourself to your resume.
          <strong style={{ color: "#c8c4e8" }}> Share a success that isn't on paper yet.</strong> A promotion you drove, a team you turned around, a result that surprised even you.
        </div>
        <div style={{ fontSize: "13px", color: "#7870a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "18px" }}>
          💡 <em>Tip: Stories with specific numbers — "$X saved", "Y% improvement", "Z people impacted" — are 3× more memorable in interviews.</em>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => { setMode("interview-pick"); if (profile.resumeText && bulletPoints.length === 0) parseBullets(); }}
            style={{ ...S.btn, fontSize: "13px", padding: "9px 18px", display: "flex", alignItems: "center", gap: "8px" }}>
            💬 Tell me a success story
          </button>
          {profile.resumeText && (
            <button onClick={handleExtract}
              style={{ ...S.btn, background: "#2d4a8a", fontSize: "13px", padding: "9px 18px", display: "flex", alignItems: "center", gap: "8px" }}>
              📄 Extract from my resume
            </button>
          )}
          <button onClick={() => { setEditing("new"); setMode("edit"); }}
            style={{ ...S.btnGhost, fontSize: "13px", padding: "9px 18px" }}>
            ✏️ Write a story manually
          </button>
        </div>
      </div>

      {stories.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stories…"
              style={{ ...S.input, width: "200px" }}
              onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            <button onClick={() => setFilterStarred(!filterStarred)}
              style={{ ...S.btnGhost, fontSize: "12px", padding: "7px 12px", background: filterStarred ? "rgba(99,140,255,0.15)" : "transparent", color: filterStarred ? "#8aacff" : "#8880b8", borderColor: filterStarred ? "#4a6abf" : "#3a3d5c" }}>
              ⭐ Starred
            </button>
            <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginLeft: "auto" }}>
              {stories.length} {stories.length === 1 ? "story" : "stories"} · {stories.filter(s => s.starred).length} starred
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
            <CompBadge label="All" active={!filterComp} onClick={() => setFilterComp(null)} />
            {COMPETENCIES.map(c => <CompBadge key={c} label={c} active={filterComp === c} onClick={() => setFilterComp(filterComp === c ? null : c)} />)}
          </div>
          {filtered.length === 0 ? (
            <div style={{ color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px", padding: "32px", textAlign: "center", border: "1px dashed #2e3050", borderRadius: "8px" }}>
              No stories match.{" "}
              <button onClick={() => { setFilterComp(null); setFilterStarred(false); setSearch(""); }} style={{ background: "none", border: "none", color: "#4f6ef7", cursor: "pointer", fontSize: "14px" }}>Clear filters</button>
            </div>
          ) : (
            filtered.map(s => <StoryCard key={s.id} story={s} onEdit={s => { setEditing(s); setMode("edit"); }} onDelete={handleDelete} onStar={handleStar} />)
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📖</div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#9890b8", marginBottom: "8px" }}>Your story library is empty</div>
          <div style={{ fontSize: "13px", color: "#6860a0" }}>Use the buttons above to add your first story — it takes less than 5 minutes.</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. PROFILE
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
        name:     contact.name     || profile.name,
        phone:    contact.phone    || profile.phone,
        email:    contact.email    || profile.email,
        address:  contact.address  || profile.address,
        linkedin: contact.linkedin || profile.linkedin,
        website:  contact.website  || profile.website,
        title:    contact.title    || profile.title,
        resumeText: text,
        resumeUploaded: true,
      });
    } catch (e) { setError(`Extraction failed: ${e.message}`); setExtracting(false); }
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ fontSize: "18px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>
        Set up {profile.displayName || profile.name || "your"} profile
      </div>
      <div style={{ fontSize: "13px", color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "28px" }}>
        Upload or paste your resume. NarrativeOS will extract your contact info and use your resume as the baseline for tailoring. Your data stays in your browser.
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("resume-upload-input").click()}
        style={{
          border: `1.5px dashed ${dragOver ? "#4a4abf" : "#2e2e42"}`,
          borderRadius: "6px", padding: "24px", textAlign: "center",
          marginBottom: "16px", cursor: "pointer",
          background: dragOver ? "rgba(74,74,191,0.05)" : "rgba(255,255,255,0.02)",
          transition: "all 0.2s",
        }}>
        <input id="resume-upload-input" type="file" accept=".docx,.txt" style={{ display: "none" }} onChange={handleFile} />
        <div style={{ fontSize: "24px", marginBottom: "8px" }}>📄</div>
        {fileName
          ? <div style={{ color: "#4a4abf", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "14px" }}>✓ {fileName}</div>
          : <div style={{ color: "#9890b8", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px" }}>Drop DOCX here, or click to browse<br /><span style={{ fontSize: "11px", color: "#6060a0" }}>or paste text below</span></div>
        }
      </div>

      <textarea value={text} onChange={e => { setText(e.target.value); setFileName(""); }}
        placeholder="Paste resume text here…" rows={8}
        style={{ ...S.textarea, marginBottom: "16px" }}
        onFocus={e => e.target.style.borderColor = "#4a4abf"}
        onBlur={e => e.target.style.borderColor = "#3a3d5c"} />

      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleContinue} disabled={!text.trim() || extracting}
          style={{ ...S.btn, opacity: !text.trim() || extracting ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
          {extracting ? <><Spinner />Extracting contact info…</> : "Set Up Profile"}
        </button>
        <button onClick={onSkip} style={{ ...S.btnGhost, color: "#9890b8" }}>Skip for now</button>
      </div>
    </div>
  );
}

function ResumeVariantManager({ profile, onUpdateProfile }) {
  const [adding, setAdding]       = useState(false);
  const [newName, setNewName]     = useState("");
  const [newText, setNewText]     = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");

  const variants = (() => {
    if (profile.resumeVariants?.length) return profile.resumeVariants;
    if (profile.resumeText) return [{ id: "v1", name: "Base Resume", text: profile.resumeText, createdAt: Date.now() }];
    return [];
  })();
  const activeId = profile.activeResumeId || variants[0]?.id || null;

  const saveVariants = (updated, newActiveId) => {
    onUpdateProfile({ ...profile, resumeVariants: updated, activeResumeId: newActiveId ?? activeId });
  };
  const setActive = (id) => onUpdateProfile({ ...profile, activeResumeId: id });
  const addVariant = () => {
    if (!newName.trim() || !newText.trim()) return;
    const v = { id: generateId(), name: newName.trim(), text: newText.trim(), createdAt: Date.now() };
    saveVariants([...variants, v], v.id);
    setNewName(""); setNewText(""); setAdding(false);
  };
  const renameVariant = (id) => {
    saveVariants(variants.map(v => v.id === id ? { ...v, name: editName.trim() || v.name } : v), activeId);
    setEditingId(null); setEditName("");
  };
  const deleteVariant = (id) => {
    if (variants.length === 1) return;
    if (!window.confirm("Delete this resume variant?")) return;
    const updated = variants.filter(v => v.id !== id);
    saveVariants(updated, id === activeId ? updated[0]?.id : activeId);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ ...S.label, margin: 0 }}>Resume Variants ({variants.length})</div>
        <button onClick={() => setAdding(!adding)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>{adding ? "Cancel" : "+ Add variant"}</button>
      </div>
      {variants.map(v => (
        <div key={v.id} style={{ background: v.id === activeId ? "rgba(79,110,247,0.08)" : "#1a1c2e", border: `1px solid ${v.id === activeId ? "#4f6ef7" : "#2e3050"}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingId === v.id ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...S.input, fontSize: "13px", padding: "4px 8px" }} autoFocus onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
                <button onClick={() => renameVariant(v.id)} style={{ ...S.btn, fontSize: "11px", padding: "4px 10px" }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>Cancel</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: v.id === activeId ? "#c8d8ff" : "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {v.name}{v.id === activeId && <span style={{ fontSize: "10px", color: "#4f6ef7", marginLeft: "8px", fontWeight: "400" }}>ACTIVE</span>}
                </div>
                <div style={{ fontSize: "11px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2px" }}>
                  {v.text.length.toLocaleString()} chars{v.createdAt && ` · ${new Date(v.createdAt).toLocaleDateString()}`}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {v.id !== activeId && <button onClick={() => setActive(v.id)} style={{ ...S.btn, fontSize: "11px", padding: "4px 12px" }}>Use</button>}
            <button onClick={() => { setEditingId(v.id); setEditName(v.name); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>Rename</button>
            {variants.length > 1 && <button onClick={() => deleteVariant(v.id)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px", color: "#f87171", borderColor: "#6a2a2a" }}>✕</button>}
          </div>
        </div>
      ))}
      {adding && (
        <div style={{ ...S.section, marginTop: "12px" }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={S.label}>Variant Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Transformation Focus, Technical Lead, Startup" style={S.input} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <label style={S.label}>Resume Text</label>
            <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Paste this variant's resume text here…" rows={10} style={S.textarea} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={addVariant} disabled={!newName.trim() || !newText.trim()} style={{ ...S.btn, opacity: !newName.trim() || !newText.trim() ? 0.5 : 1 }}>Save variant</button>
            <button onClick={() => { setAdding(false); setNewName(""); setNewText(""); }} style={{ ...S.btnGhost, color: "#6860a0" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingFlow({ user, profile, onComplete }) {
  const [step, setStep]                     = useState(1);
  const [uploadedProfile, setUploadedProfile] = useState(null);
  const [form, setForm]                     = useState({});
  const [tier, setTier]                     = useState("senior");
  const [extractingStories, setExtractingStories] = useState(false);
  const [stories, setStories]               = useState([]);
  const [storyError, setStoryError]         = useState(null);

  const handleUploadComplete = (p) => {
    setUploadedProfile(p);
    setForm({
      name: p.name || user?.user_metadata?.full_name || "",
      phone: p.phone || "", email: p.email || user?.email || "",
      address: p.address || "Bellingham, WA", linkedin: p.linkedin || "",
      website: p.website || "", title: p.title || "", background: p.background || "",
    });
    setStep(2);
  };

  const handleSelectTier = async (selectedTier) => {
    setTier(selectedTier); setStep(4);
    setExtractingStories(true); setStoryError(null);
    try {
      const profileForExtract = { ...uploadedProfile, ...form, profileTier: selectedTier };
      const text = await callClaude(
        PROMPTS.storyExtractOnboard(profileForExtract),
        `Resume:\n${(uploadedProfile?.resumeText || "").slice(0, 4000)}`,
        2500
      );
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error("Could not parse stories from resume.");
      const parsed = JSON.parse(m[0]);
      setStories(parsed.map(s => ({ ...s, id: generateId(), starred: false, tags: Array.isArray(s.tags) ? s.tags : [] })));
    } catch (e) { setStoryError(e.message); }
    finally { setExtractingStories(false); }
  };

  const handleFinish = (keepStories) => {
    const newVariant = uploadedProfile?.resumeText
      ? { id: generateId(), name: "Base Resume", text: uploadedProfile.resumeText, createdAt: Date.now() }
      : null;
    const finalProfile = {
      ...uploadedProfile, ...form, profileTier: tier, resumeUploaded: true,
      resumeVariants: newVariant ? [newVariant] : [],
      activeResumeId: newVariant?.id || null,
    };
    onComplete(finalProfile, keepStories ? stories : []);
  };

  const field = (key, label) => (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}</label>
      <input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={S.input} onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
    </div>
  );

  const TIERS = [
    { id: "student",   label: "Student / Entry",   desc: "First job, internship, or career pivot" },
    { id: "midlevel",  label: "Mid-level",          desc: "3–8 years, individual contributor or first-time manager" },
    { id: "senior",    label: "Senior / Director",  desc: "8–15 years, leading teams or programs" },
    { id: "executive", label: "VP / Executive",     desc: "15+ years, P&L, C-suite, board exposure" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "580px" }}>
        <div style={{ display: "flex", gap: "6px", marginBottom: "36px" }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{ flex: 1, height: "3px", borderRadius: "2px", background: n <= step ? "#4f6ef7" : "#2e3050", transition: "background 0.3s" }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>Welcome to NarrativeOS</div>
            <div style={{ fontSize: "14px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "32px" }}>Let's get your profile set up. Upload your resume and we'll do the rest.</div>
            <ResumeUploadGate profile={profile} onComplete={handleUploadComplete}
              onSkip={() => { setUploadedProfile({ ...profile }); setForm({ name: profile.name || "", email: user?.email || "", address: "Bellingham, WA" }); setStep(2); }} />
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>Confirm your profile</div>
            <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>We extracted this from your resume — fix anything that's off.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>{field("name","Full Name")}</div><div>{field("phone","Phone")}</div>
              <div>{field("email","Email")}</div><div>{field("address","City, State")}</div>
              <div>{field("linkedin","LinkedIn")}</div><div>{field("website","Website")}</div>
            </div>
            {field("title","Professional Title")}
            <div style={{ marginBottom: "20px" }}>
              <label style={S.label}>Background</label>
              <textarea value={form.background || ""} onChange={e => setForm(f => ({ ...f, background: e.target.value }))}
                rows={3} style={S.textarea} placeholder="Brief summary of your experience and what you're known for…"
                onFocus={e => e.target.style.borderColor = "#4f6ef7"} onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setStep(3)} style={S.btn}>Looks good →</button>
              <button onClick={() => setStep(1)} style={{ ...S.btnGhost, color: "#6860a0" }}>← Back</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>What best describes your level?</div>
            <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>This shapes how AI tools talk to you — tone, depth, and expectations.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
              {TIERS.map(t => (
                <button key={t.id} onClick={() => handleSelectTier(t.id)}
                  style={{ background: "#181a2e", border: `1px solid ${tier === t.id ? "#4f6ef7" : "#2e3050"}`, borderRadius: "10px", padding: "16px 20px", textAlign: "left", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#4f6ef7"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = tier === t.id ? "#4f6ef7" : "#2e3050"}>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "3px" }}>{t.label}</div>
                  <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={{ ...S.btnGhost, color: "#6860a0", fontSize: "12px" }}>← Back</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>
              {extractingStories ? "Extracting your stories…" : storyError ? "Story extraction failed" : `Found ${stories.length} stories`}
            </div>
            <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "24px" }}>
              {extractingStories ? "Reading your resume for interview-ready achievements…" : storyError ? "You can add stories manually in the Stories tab." : "We pulled these from your resume. Edit them anytime in the Stories tab."}
            </div>
            {extractingStories && <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}><Spinner size={32} /></div>}
            {!extractingStories && stories.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                {stories.map((s, i) => (
                  <div key={i} style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "8px", padding: "14px 18px", marginBottom: "10px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "4px" }}>{s.title}</div>
                    <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "6px" }}>{s.company} · {s.role}</div>
                    <div style={{ fontSize: "13px", color: "#9890b8", fontFamily: "Georgia, serif", lineHeight: "1.6" }}>{s.hook}</div>
                  </div>
                ))}
              </div>
            )}
            {!extractingStories && (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={() => handleFinish(true)} style={S.btn}>
                  {stories.length > 0 ? `Add ${stories.length} stories & finish` : "Finish setup"}
                </button>
                {stories.length > 0 && (
                  <button onClick={() => handleFinish(false)} style={{ ...S.btnGhost, color: "#6860a0" }}>Skip stories for now</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ profile, onUpdateProfile, saveJD, setSaveJD, corrections, onUpdateCorrections, user, logout, stories }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...profile });
  const [reupload, setReupload] = useState(false);
  const [driveConnected, setDriveConnected] = useState(!!localStorage.getItem("cf:google_token:drive"));
  const [gmailConnected, setGmailConnected] = useState(!!localStorage.getItem("cf:google_token:gmail"));

  const field = (key, label) => (
    <div style={{ marginBottom: "14px" }}>
      <label style={S.label}>{label}</label>
      <input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={S.input}
        onFocus={e => e.target.style.borderColor = "#4f6ef7"}
        onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
    </div>
  );

  const connectGoogle = (scopeKey, scope, onConnected) => {
    if (!window.google?.accounts?.oauth2) {
      alert("Google services not loaded. Check VITE_GOOGLE_CLIENT_ID in Netlify env vars.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
      scope,
      callback: (r) => {
        if (r.access_token) {
          localStorage.setItem(`cf:google_token:${scopeKey}`, r.access_token);
          onConnected(true);
        }
      },
    });
    client.requestAccessToken();
  };

  return (
    <div style={{ padding: "24px" }}>
      {/* Account */}
      <div style={{ ...S.section, marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="" style={{ width: "50px", height: "50px", borderRadius: "50%", border: "2px solid #3a3d5c" }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{profile.name || user?.email}</div>
          <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{user?.email}</div>
          <div style={{ fontSize: "12px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: "2px" }}>
            {stories.length} stories{profile.resumeUploaded && <span style={{ color: "#4ade80", marginLeft: "10px" }}>✓ Resume uploaded</span>}
          </div>
        </div>
        <button onClick={logout} style={{
          ...S.btnGhost, fontSize: "12px", color: "#f87171", borderColor: "#6a2a2a",
          flexShrink: 0, // never gets squeezed off screen
        }}>Sign out</button>
      </div>

      {/* Contact */}
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ ...S.label, margin: 0 }}>Contact Information</div>
          <button onClick={() => { setEditing(!editing); setForm({ ...profile }); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>{editing ? "Cancel" : "Edit"}</button>
        </div>
        {editing ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>{field("name",    "Full Name")}</div>
              <div>{field("phone",   "Phone")}</div>
              <div>{field("email",   "Email")}</div>
              <div>{field("address", "City, State")}</div>
              <div>{field("linkedin","LinkedIn URL")}</div>
              <div>{field("website", "Website")}</div>
            </div>
            {field("title", "Professional Title")}
            <div style={{ marginBottom: "14px" }}>
              <label style={S.label}>Background / Summary <span style={{ color: "#6860a0", textTransform: "none", letterSpacing: 0 }}>used in AI prompts</span></label>
              <textarea value={form.background || ""} onChange={e => setForm(f => ({ ...f, background: e.target.value }))}
                rows={4} style={S.textarea}
                placeholder="Brief professional summary — experience, domain, what you're known for…"
                onFocus={e => e.target.style.borderColor = "#4f6ef7"}
                onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            </div>
            <button onClick={() => { onUpdateProfile(form); setEditing(false); }} style={S.btn}>Save</button>
          </>
        ) : (
          <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", lineHeight: "2.2" }}>
            {[
              ["Name",       profile.name],
              ["Phone",      profile.phone],
              ["Email",      profile.email],
              ["Address",    profile.address],
              ["LinkedIn",   profile.linkedin],
              ["Website",    profile.website],
              ["Title",      profile.title],
              ["Background", profile.background],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", gap: "16px" }}>
                <span style={{ color: "#6860a0", width: "90px", flexShrink: 0 }}>{l}</span>
                <span style={{ color: v ? "#c8c4e8" : "#3a3848" }}>{v || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume */}
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ ...S.label, marginBottom: "12px" }}>Resume Baseline</div>
        {profile.resumeUploaded ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: reupload ? "16px" : "16px" }}>
            <div>
              <div style={{ fontSize: "13px", color: "#4ade80", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "2px" }}>✓ Resume uploaded</div>
              <div style={{ fontSize: "12px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{(profile.resumeText?.length || 0).toLocaleString()} characters</div>
            </div>
            <button onClick={() => setReupload(!reupload)} style={{ ...S.btnGhost, fontSize: "12px" }}>{reupload ? "Cancel" : "Replace"}</button>
          </div>
        ) : (
          <div style={{ fontSize: "13px", color: "#fb923c", marginBottom: "12px" }}>⚠ No resume uploaded</div>
        )}
        {(!profile.resumeUploaded || reupload) && (
          <div style={{ marginTop: "12px" }}>
            <ResumeUploadGate profile={profile} onComplete={p => { onUpdateProfile(p); setReupload(false); }} onSkip={() => setReupload(false)} />
          </div>
        )}
        {profile.resumeUploaded && !reupload && (
          <div style={{ marginTop: "16px", borderTop: "1px solid #2e3050", paddingTop: "16px" }}>
            <ResumeVariantManager profile={profile} onUpdateProfile={onUpdateProfile} />
          </div>
        )}
      </div>

      {/* Integrations */}
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ ...S.label, marginBottom: "14px" }}>Integrations</div>
        {[
          { key: "drive", icon: "📁", name: "Google Drive", desc: driveConnected ? "✓ Connected — save documents directly to Drive" : "Save resumes and cover letters to your Drive", scope: "https://www.googleapis.com/auth/drive.file", connected: driveConnected, setConnected: setDriveConnected },
          { key: "gmail", icon: "✉️", name: "Gmail",        desc: gmailConnected ? "✓ Connected — recruiter detection enabled"       : "Detect recruiter emails and draft follow-ups",  scope: "https://www.googleapis.com/auth/gmail.readonly", connected: gmailConnected, setConnected: setGmailConnected },
        ].map(({ key, icon, name, desc, scope, connected, setConnected }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#1e2240", borderRadius: "8px", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>{icon}</span>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{name}</div>
                <div style={{ fontSize: "12px", color: connected ? "#4ade80" : "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{desc}</div>
              </div>
            </div>
            <button onClick={() => !connected && connectGoogle(key, scope, setConnected)}
              style={{ ...S.btn, padding: "7px 16px", fontSize: "12px", background: connected ? "#1a3a1a" : "#4f6ef7", cursor: connected ? "default" : "pointer" }}>
              {connected ? "Connected ✓" : "Connect"}
            </button>
          </div>
        ))}
      </div>

      {/* Preferences */}
      <div style={{ ...S.section, marginBottom: "20px" }}>
        <div style={{ ...S.label, marginBottom: "12px" }}>Preferences</div>
        <button onClick={() => setSaveJD(!saveJD)}
          style={{ ...S.btnGhost, fontSize: "13px", background: saveJD ? "rgba(79,110,247,0.15)" : "transparent", color: saveJD ? "#8aacff" : "#6860a0", borderColor: saveJD ? "#4f6ef7" : "#3a3d5c" }}>
          {saveJD ? "💾 JD saved across sessions" : "💾 JD not saved"}
        </button>
      </div>

      {/* Corrections */}
      {Object.keys(corrections).length > 0 && (
        <div style={{ ...S.section }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ ...S.label, margin: 0 }}>Saved Corrections ({Object.keys(corrections).length})</div>
            <button onClick={() => { if (window.confirm("Clear all?")) onUpdateCorrections({}); }}
              style={{ ...S.btnGhost, fontSize: "11px", padding: "3px 8px", color: "#f87171", borderColor: "#6a2a2a" }}>Clear all</button>
          </div>
          {Object.entries(corrections).map(([title, correction]) => (
            <div key={title} style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: "6px", padding: "10px 14px", marginBottom: "8px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#c8b890", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{title}</div>
                <div style={{ fontSize: "11px", color: "#7a6a50", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{correction}</div>
              </div>
              <button onClick={() => { const u = { ...corrections }; delete u[title]; onUpdateCorrections(u); }}
                style={{ background: "none", border: "none", color: "#6a3a3a", cursor: "pointer", fontSize: "14px" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 17. ROLE WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────

function FollowUpTab({ card, profile }) {
  const [type, setType]       = useState("thank-you");
  const [result, setResult]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [copied, setCopied]   = useState(false);
  const apiLocked = useApiLock();

  const EMAIL_TYPES = [
    { id: "thank-you",           label: "Thank You",      icon: "✉️", desc: "Post-interview, within 24hrs" },
    { id: "recruiter-follow-up", label: "Follow Up",      icon: "📬", desc: "Application status check-in" },
    { id: "check-in",            label: "Check In",       icon: "🔔", desc: "Gone quiet after interview" },
    { id: "offer-response",      label: "Offer Response", icon: "🎯", desc: "Accepting or negotiating" },
  ];

  const run = async () => {
    setLoading(true); setError(null); setResult("");
    try {
      const text = await callClaude(
        PROMPTS.followUp(profile, card, type),
        `JD context:\n${(card.jd || "").slice(0, 800)}\n\nInterview notes:\n${card.notes || "No notes recorded."}`,
        800
      );
      setResult(text);
    } catch (e) { setError(`Failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const subjectMatch = result.match(/^Subject:\s*(.+)/m);
  const subject = subjectMatch ? subjectMatch[1].trim() : null;
  const body = result.replace(/^Subject:.*\n?/m, "").trim();

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ ...S.label, marginBottom: "12px" }}>Email Type</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px" }}>
          {EMAIL_TYPES.map(t => (
            <button key={t.id} onClick={() => { setType(t.id); setResult(""); }}
              style={{ background: type === t.id ? "rgba(79,110,247,0.12)" : "#181a2e", border: `1px solid ${type === t.id ? "#4f6ef7" : "#2e3050"}`, borderRadius: "8px", padding: "14px 16px", textAlign: "left", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#4f6ef7"}
              onMouseLeave={e => e.currentTarget.style.borderColor = type === t.id ? "#4f6ef7" : "#2e3050"}>
              <div style={{ fontSize: "18px", marginBottom: "6px" }}>{t.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: type === t.id ? "#c8d8ff" : "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "2px" }}>{t.label}</div>
              <div style={{ fontSize: "11px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
      {!card.notes?.trim() && (
        <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#c8a84c", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          💡 Add interview notes in the Overview tab for a more personalized email.
        </div>
      )}
      <button onClick={run} disabled={loading || apiLocked}
        style={{ ...S.btn, opacity: loading || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        {loading ? <><Spinner />Drafting…</> : `Draft ${EMAIL_TYPES.find(t => t.id === type)?.label}`}
      </button>
      {error && <div style={{ color: "#c06060", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {result && (
        <div style={S.section}>
          {subject && (
            <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#1a1c2e", borderRadius: "6px", border: "1px solid #2e3050" }}>
              <div style={{ fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "4px" }}>Subject</div>
              <div style={{ fontSize: "13px", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600" }}>{subject}</div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ ...S.label, margin: 0 }}>{EMAIL_TYPES.find(t => t.id === type)?.label} Email</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleCopy} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>{copied ? "✓ Copied" : "Copy all"}</button>
              <button onClick={run} disabled={loading || apiLocked} style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>↺ Redraft</button>
            </div>
          </div>
          <div style={{ ...S.resultBox, whiteSpace: "pre-wrap" }}>{body}</div>
        </div>
      )}
    </div>
  );
}

function RoleWorkspace({ card, profile, stories, corrections, initialTab, onUpdateCard, onUpdateCorrections, onClose, onRemove }) {
  const [activeTab, setActiveTab] = useState(initialTab || "Overview");
  const [proceeded, setProceeded] = useState(false);
  const [resumeOnly, setResumeOnly] = useState(false);
  const [resumeDownloaded, setResumeDownloaded] = useState(false);
  const [coverDownloaded, setCoverDownloaded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(!card.company);
  const [resumeBlob, setResumeBlob] = useState(null);
  const [coverBlob, setCoverBlob] = useState(null);

  const userKey = profile.email ? `cf:${profile.email}` : "cf:local";
  const materialsComplete = resumeDownloaded && (coverDownloaded || resumeOnly);

  const setJd    = (jd)    => onUpdateCard({ ...card, jd });
  const setNotes = (notes) => onUpdateCard({ ...card, notes });

  const workspaceTabs = [
    { name: "Overview" },
    { name: "Analyze JD" },
    { name: "Resume",         dim: !proceeded && !resumeOnly },
    { name: "Cover Letter",   dim: !resumeDownloaded },
    { name: "Interview Prep", dim: !materialsComplete },
    { name: "Research",       dim: !materialsComplete },
    { name: "Follow Up" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0f1117", zIndex: 200, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Workspace header */}
      <div style={{ background: "#131528", borderBottom: "1px solid #2e3050", padding: "14px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6860a0", cursor: "pointer", fontSize: "20px", lineHeight: 1 }}>←</button>
          <div style={{ flex: 1 }}>
            {editingTitle ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input defaultValue={card.title} placeholder="Role title"
                  style={{ ...S.input, fontSize: "16px", fontWeight: "600", padding: "6px 10px", width: "200px" }}
                  onBlur={e => { onUpdateCard({ ...card, title: e.target.value }); setEditingTitle(false); }}
                  autoFocus />
                <input defaultValue={card.company} placeholder="Company"
                  style={{ ...S.input, fontSize: "14px", padding: "6px 10px", width: "160px" }}
                  onBlur={e => onUpdateCard({ ...card, company: e.target.value })} />
              </div>
            ) : (
              <div onClick={() => setEditingTitle(true)} style={{ cursor: "text" }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.title || "Untitled Role"}</div>
                <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{card.company || "Unknown Company"} · click to edit</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {card.fitScore && (
              <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                Fit: <span style={{ color: card.fitScore >= 8 ? "#4ade80" : card.fitScore >= 6 ? "#fbbf24" : "#fb923c", fontWeight: "700" }}>{card.fitScore}/10</span>
              </div>
            )}
            <div style={{ position: "relative" }}>
              {STAGES.map(s => s === (card.stage || "Radar") && (
                <select key={s} value={card.stage || "Radar"}
                  onChange={e => { if (e.target.value === "__REMOVE__") { onRemove?.(); onClose(); } else onUpdateCard({ ...card, stage: e.target.value }); }}
                  style={{ background: STAGE_COLORS[card.stage || "Radar"].bg, color: STAGE_COLORS[card.stage || "Radar"].text, border: `1px solid ${STAGE_COLORS[card.stage || "Radar"].border}`, borderRadius: "12px", padding: "4px 10px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer", outline: "none" }}>
                  {STAGES.map(st => <option key={st} value={st} style={{ background: "#1e2240", color: "#e8e4f8" }}>{st}</option>)}
                  <option value="__REMOVE__" style={{ background: "#1e2240", color: "#f87171" }}>Remove from board</option>
                </select>
              ))}
            </div>
          </div>
        </div>

        {/* Workspace tabs */}
        <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
          {workspaceTabs.map(({ name, dim }) => {
            const isActive = activeTab === name;
            const done = (name === "Resume" && resumeDownloaded) || (name === "Cover Letter" && coverDownloaded);
            return (
              <button key={name} onClick={() => setActiveTab(name)} style={{
                background: isActive ? "rgba(79,110,247,0.18)" : "transparent",
                color: isActive ? "#c8d8ff" : dim ? "#4a4868" : "#9890b8",
                border: `1px solid ${isActive ? "#4f6ef7" : "transparent"}`,
                borderRadius: "4px 4px 0 0", padding: "6px 14px", fontSize: "12px",
                fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "4px",
              }}>
                {name}{done && <span style={{ fontSize: "9px", color: "#4ade80" }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace content */}
      <div style={{ padding: "28px 32px", maxWidth: "860px", paddingBottom: "60px" }}>

        {activeTab === "Overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Stage",     value: card.stage || "Radar" },
                { label: "Fit Score", value: card.fitScore ? `${card.fitScore}/10` : "—" },
                { label: "Added",     value: card.addedAt ? new Date(card.addedAt).toLocaleDateString() : "—" },
                { label: "Materials", value: resumeDownloaded ? (coverDownloaded ? "Both ready" : "Resume ready") : "None yet" },
              ].map(({ label, value }) => (
                <div key={label} style={{ ...S.section, padding: "14px 16px" }}>
                  <div style={{ ...S.label, marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{value}</div>
                </div>
              ))}
            </div>

            {(() => {
              const history = card.stageHistory?.length
                ? card.stageHistory
                : card.addedAt ? [{ stage: card.stage || "Radar", at: card.addedAt }] : [];
              if (history.length === 0) return null;
              const now = Date.now();
              const daysSince = (ts) => { const d = Math.floor((now - ts) / 86400000); return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`; };
              return (
                <div style={{ ...S.section, marginBottom: "20px" }}>
                  <div style={{ ...S.label, marginBottom: "16px" }}>Timeline</div>
                  <div style={{ position: "relative", paddingLeft: "24px" }}>
                    <div style={{ position: "absolute", left: "7px", top: "8px", bottom: "8px", width: "1px", background: "#2e3050" }} />
                    {history.map((entry, i) => {
                      const c = STAGE_COLORS[entry.stage] || STAGE_COLORS.Radar;
                      const isLatest = i === history.length - 1;
                      const duration = i < history.length - 1 ? Math.floor((history[i + 1].at - entry.at) / 86400000) : null;
                      return (
                        <div key={i} style={{ position: "relative", marginBottom: "16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ position: "absolute", left: "-20px", top: "4px", width: "9px", height: "9px", borderRadius: "50%", background: isLatest ? c.border : "#2e3050", border: `2px solid ${c.border}` }} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                              <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: "10px", padding: "2px 9px", fontSize: "11px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600" }}>{entry.stage}</span>
                              {isLatest && <span style={{ fontSize: "10px", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif" }}>current</span>}
                            </div>
                            <div style={{ fontSize: "11px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                              {new Date(entry.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {daysSince(entry.at)}
                              {duration !== null && duration >= 0 && <span style={{ color: "#3a3848" }}> · {duration === 0 ? "same day" : `${duration}d in stage`}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {card.addedAt && (
                    <div style={{ marginTop: "4px", paddingTop: "12px", borderTop: "1px solid #1e2030", fontSize: "11px", color: "#4a4868", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      {Math.floor((now - card.addedAt) / 86400000)} days in pipeline
                    </div>
                  )}
                </div>
              );
            })()}

            {(card.resumeDriveLink || card.coverLetterDriveLink) && (
              <div style={{ ...S.section, marginBottom: "20px" }}>
                <div style={{ ...S.label, marginBottom: "12px" }}>Saved Documents</div>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {card.resumeDriveLink      && <a href={card.resumeDriveLink}      target="_blank" rel="noopener noreferrer" style={{ color: "#4f6ef7", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>📄 Resume in Drive ↗</a>}
                  {card.coverLetterDriveLink && <a href={card.coverLetterDriveLink} target="_blank" rel="noopener noreferrer" style={{ color: "#4f6ef7", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>✉️ Cover Letter in Drive ↗</a>}
                </div>
              </div>
            )}

            <div style={{ ...S.section }}>
              <div style={{ ...S.label, marginBottom: "10px" }}>Notes</div>
              <textarea value={card.notes || ""} onChange={e => setNotes(e.target.value)}
                placeholder="Recruiter contact, next steps, interview notes, anything relevant to this role…"
                rows={6} style={{ ...S.textarea, width: "100%" }}
                onFocus={e => e.target.style.borderColor = "#4f6ef7"}
                onBlur={e => e.target.style.borderColor = "#3a3d5c"} />
            </div>
          </div>
        )}

        {activeTab === "Analyze JD" && (
          <>
            {card.jd && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                <button onClick={() => { setJd(""); setProceeded(false); setResumeOnly(false); setResumeDownloaded(false); setCoverDownloaded(false); }}
                  style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>✕ Clear JD</button>
              </div>
            )}
            <AnalyzeTab
              jd={card.jd || ""} setJd={setJd}
              stories={stories} profile={profile}
              corrections={corrections} onSaveCorrections={onUpdateCorrections}
              onBuildResume={() => { setProceeded(true); setActiveTab("Resume"); }}
              onResumeOnly={() => { setResumeOnly(true); setActiveTab("Resume"); }}
              onNewJD={() => { setJd(""); setProceeded(false); setResumeOnly(false); setResumeDownloaded(false); setCoverDownloaded(false); }}
            />
          </>
        )}

        {activeTab === "Resume" && (
          <ResumeTab
            jd={card.jd || ""} setJd={setJd} resumeOnly={resumeOnly}
            profile={profile}
            onDownloaded={(blob) => { setResumeDownloaded(true); setResumeBlob(blob); }}
            onSaveToDrive={async (blob) => {
              const token = getDriveToken(userKey);
              if (!token) return;
              const filename = `${(card.company || "Company").replace(/\s+/g, "_")}_${(card.title || "Role").replace(/\s+/g, "_")}_Resume.docx`;
              const result = await saveToDrive(blob, filename, token);
              if (result.webViewLink) onUpdateCard({ ...card, resumeDriveLink: result.webViewLink });
            }}
          />
        )}

        {activeTab === "Cover Letter" && (
          <CoverLetterTab
            jd={card.jd || ""} setJd={setJd}
            profile={profile}
            onDownloaded={(blob) => { setCoverDownloaded(true); setCoverBlob(blob); }}
            onSaveToDrive={async (blob) => {
              const token = getDriveToken(userKey);
              if (!token) return;
              const filename = `${(card.company || "Company").replace(/\s+/g, "_")}_${(card.title || "Role").replace(/\s+/g, "_")}_CoverLetter.docx`;
              const result = await saveToDrive(blob, filename, token);
              if (result.webViewLink) onUpdateCard({ ...card, coverLetterDriveLink: result.webViewLink });
            }}
          />
        )}

        {activeTab === "Interview Prep" && (
          <InterviewPrepTab jd={card.jd || ""} setJd={setJd} stories={stories} profile={profile} />
        )}

        {activeTab === "Research" && (
          <ResearchTab company={card.company || ""} triggered={true} />
        )}

        {activeTab === "Follow Up" && (
          <FollowUpTab card={card} profile={profile} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. APP SHELL
// ─────────────────────────────────────────────────────────────────────────────

function BottomNav({ active, onSelect }) {
  const items = [
    { id: "board",   icon: "⊞", label: "Board" },
    { id: "search",  icon: "🔍", label: "Search" },
    { id: "analyze", icon: "✦",  label: "Analyze" },
    { id: "stories", icon: "📖", label: "Stories" },
    { id: "profile", icon: "⚙",  label: "Profile" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#131528", borderTop: "1px solid #2e3050", display: "flex", zIndex: 50 }}>
      {items.map(({ id, icon, label }) => (
        <button key={id} onClick={() => onSelect(id)}
          style={{ flex: 1, background: "none", border: "none", padding: "10px 0 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "20px" }}>{icon}</span>
          <span style={{ fontSize: "10px", fontFamily: "'DM Sans', system-ui, sans-serif", color: active === id ? "#8aacff" : "#4a4868", fontWeight: active === id ? "700" : "400" }}>{label}</span>
          {active === id && <div style={{ width: "20px", height: "2px", background: "#4f6ef7", borderRadius: "1px" }} />}
        </button>
      ))}
    </div>
  );
}

export default function NarrativeOS() {
  const { user, authLoading, logout } = useNetlifyAuth();
  const [loaded, setLoaded] = useState(false);
  const [activeScreen, setActiveScreen] = useState("board");
  const [openCardId, setOpenCardId] = useState(null);
  const _pendingCard = useRef(null);
  const _pendingTab  = useRef(null);
  const [saveJD, setSaveJD] = useState(true);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const userKey = user?.email ? `cf:${user.email}` : "cf:local";

  const [profile,      setProfile]      = useState(DEFAULT_PROFILE);
  const [cards,        setCards]        = useState([]);
  const [searchJobs,   setSearchJobs]   = useState([]);
  const [searchQueries,setSearchQueries]= useState([]);
  const [pendingAnalysis, setPendingAnalysis] = useState(null);
  const [stories,      setStories]      = useState([]);
  const [corrections,  setCorrections]  = useState({});

  const sessionCost = useSessionCost();
  const apiLocked   = useApiLock();

  // Load on auth
  useEffect(() => {
    if (authLoading || !user) { setLoaded(false); return; }
    const p  = storageGet(`${userKey}:profile`);
    const c  = storageGet(`${userKey}:cards`);
    const s  = storageGet(`${userKey}:stories`);
    const cr = storageGet(`${userKey}:corrections`);
    const sj = storageGet(`${userKey}:saveJD`);
    const sq = storageGet(`${userKey}:searchQueries`);
    const jobs = storageGet(`${userKey}:searchJobs`);
    if (sq)   setSearchQueries(sq);
    if (jobs) setSearchJobs(jobs);
    if (p)  setProfile(p);
    else    setProfile({ ...DEFAULT_PROFILE, name: user.user_metadata?.full_name || user.email.split("@")[0], email: user.email, displayName: user.user_metadata?.full_name || user.email });
    if (c)  setCards(c);
    if (s)  setStories(s);
    if (cr) setCorrections(cr);
    setSaveJD(sj !== null ? sj : true);
    setLoaded(true);
  }, [user, authLoading]);

  // Persist
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:profile`,       profile);       }, [profile,       loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:cards`,         cards);         }, [cards,         loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:stories`,       stories);       }, [stories,       loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:corrections`,   corrections);   }, [corrections,   loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:saveJD`,        saveJD);        }, [saveJD,        loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:searchQueries`, searchQueries); }, [searchQueries, loaded]);
  useEffect(() => { if (loaded && user) storageSet(`${userKey}:searchJobs`,    searchJobs);    }, [searchJobs,    loaded]);

  // Card operations
  const addCard = (cardData) => {
    const now = Date.now();
    const newCard = {
      id: generateId(), stage: "Radar", addedAt: now,
      stageHistory: [{ stage: "Radar", at: now }],
      ...cardData,
    };
    setCards(prev => [newCard, ...prev]);
    return newCard.id;
  };
  const updateCard  = (updated) => setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
  const updateStage = (id, stage) => setCards(prev => prev.map(c => {
    if (c.id !== id) return c;
    const entry = { stage, at: Date.now() };
    const history = [...(c.stageHistory || [{ stage: c.stage || "Radar", at: c.addedAt || Date.now() }]), entry];
    return { ...c, stage, stageHistory: history };
  }));
  const removeCard  = (id) => setCards(prev => prev.filter(c => c.id !== id));

  const buildPendingCard = (pa) => ({
    id: generateId(), stage: "Radar", addedAt: Date.now(),
    stageHistory: [{ stage: "Radar", at: Date.now() }],
    title: pa.title, company: pa.company, jd: pa.jdText,
    fitScore: pa.fitScore || null, fitReason: pa.fitReason || "",
  });
  const addPendingToCards = (prev, newCard) => {
    const exists = prev.find(c => c.title === newCard.title && c.company === newCard.company);
    return exists ? prev : [newCard, ...prev];
  };

  const handleAnalyzeFromSearch = (jdText, title, company, fitScore, fitReason) => {
    setPendingAnalysis({ jdText, title, company, fitScore, fitReason });
    setActiveScreen("analyze");
  };

  // Resolve open card — fallback to pending ref while setCards async settles
  const openCard = cards.find(c => c.id === openCardId) ||
    (_pendingCard.current?.id === openCardId ? _pendingCard.current : null);
  if (openCard && _pendingCard.current?.id === openCard.id) _pendingCard.current = null;

  // Auth loading spinner
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", gap: "12px" }}>
          <Spinner size={20} /> Loading…
        </div>
      </div>
    );
  }

  if (!user) return <LoginGate />;

  // Onboarding — first-time users with no resume
  const handleOnboardingComplete = (finalProfile, extractedStories) => {
    setProfile(finalProfile);
    if (extractedStories?.length > 0) setStories(prev => [...prev, ...extractedStories]);
  };
  if (loaded && !profile.resumeUploaded && !profile.resumeVariants?.length) {
    return <OnboardingFlow user={user} profile={profile} onComplete={handleOnboardingComplete} />;
  }

  // Role workspace overlay — full-screen, bypasses main layout
  if (openCardId && openCard) {
    const initialTab = _pendingTab.current || "Overview";
    _pendingTab.current = null;
    return (
      <RoleWorkspace
        card={openCard}
        profile={profile}
        stories={stories}
        corrections={corrections}
        initialTab={initialTab}
        onUpdateCard={updateCard}
        onUpdateCorrections={setCorrections}
        onClose={() => setOpenCardId(null)}
        onRemove={() => { removeCard(openCard.id); setOpenCardId(null); }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e8e4f8", display: "flex", flexDirection: "column", paddingBottom: isMobile ? "60px" : 0 }}>

      {/* Header */}
      <div style={{ background: "#131528", borderBottom: "1px solid #2e3050", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontSize: "18px", fontWeight: "800", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-0.5px" }}>NarrativeOS</span>
          <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>Your story. Your signal.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {sessionCost > 0 && <span style={{ fontSize: "11px", color: "#4a4868" }}>~${sessionCost.toFixed(4)}</span>}
          {apiLocked && <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#fbbf24" }}><Spinner size={10} />Running…</div>}
          {!isMobile && (
            <div style={{ display: "flex", gap: "4px" }}>
              {[["board","Board"],["search","Search"],["analyze","Analyze JD"],["stories","Stories"],["profile","Profile"]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveScreen(id)}
                  style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px", background: activeScreen === id ? "rgba(79,110,247,0.15)" : "transparent", color: activeScreen === id ? "#8aacff" : "#6860a0", borderColor: activeScreen === id ? "#4f6ef7" : "transparent" }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {user.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid #3a3d5c", cursor: "pointer" }} onClick={() => setActiveScreen("profile")} />
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {!loaded ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", gap: "10px" }}>
            <Spinner />Loading your workspace…
          </div>
        ) : (
          <>
            {activeScreen === "board" && (
              <Board
                cards={cards}
                onOpenCard={setOpenCardId}
                onStageChange={updateStage}
                onAddCard={addCard}
                onOpenSearch={() => setActiveScreen("search")}
                onRemoveCard={removeCard}
              />
            )}

            {activeScreen === "search" && (
              <div style={{ padding: "24px", maxWidth: "860px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <button onClick={() => setActiveScreen("board")} style={{ background: "none", border: "none", color: "#6860a0", cursor: "pointer", fontSize: "18px" }}>←</button>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Job Search</div>
                </div>
                <JobSearchTab
                  profile={profile}
                  onAnalyzeJD={handleAnalyzeFromSearch}
                  savedJobs={searchJobs}       onSaveJobs={setSearchJobs}
                  savedQueries={searchQueries} onSaveQueries={setSearchQueries}
                />
              </div>
            )}

            {activeScreen === "analyze" && (
              <div style={{ padding: "24px", maxWidth: "860px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <button onClick={() => setActiveScreen("search")} style={{ background: "none", border: "none", color: "#6860a0", cursor: "pointer", fontSize: "18px" }}>←</button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      {pendingAnalysis?.title || "Analyze JD"}
                    </div>
                    {pendingAnalysis?.company && (
                      <div style={{ fontSize: "13px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{pendingAnalysis.company}</div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (!pendingAnalysis) return;
                      const newCard = buildPendingCard(pendingAnalysis);
                      setCards(prev => [newCard, ...prev]);
                      _pendingCard.current = newCard;
                      setOpenCardId(newCard.id);
                      setActiveScreen("board");
                    }}
                    style={{ ...S.btn, fontSize: "12px", padding: "7px 16px" }}>
                    ＋ Add to Tracker
                  </button>
                </div>
                <AnalyzeTab
                  jd={pendingAnalysis?.jdText || ""}
                  setJd={(jd) => setPendingAnalysis(p => ({ ...(p || {}), jdText: jd }))}
                  stories={stories} profile={profile}
                  corrections={corrections} onSaveCorrections={setCorrections}
                  onAddToTracker={() => {
                    if (!pendingAnalysis) return;
                    const newCard = buildPendingCard(pendingAnalysis);
                    setCards(prev => addPendingToCards(prev, newCard));
                    _pendingCard.current = newCard;
                    setOpenCardId(newCard.id);
                    setActiveScreen("board");
                  }}
                  onBuildResume={() => {
                    if (!pendingAnalysis) return;
                    const newCard = buildPendingCard(pendingAnalysis);
                    setCards(prev => addPendingToCards(prev, newCard));
                    _pendingCard.current = newCard;
                    _pendingTab.current = "Resume";
                    setOpenCardId(newCard.id);
                    setActiveScreen("board");
                  }}
                  onResumeOnly={() => {
                    if (!pendingAnalysis) return;
                    const newCard = buildPendingCard(pendingAnalysis);
                    setCards(prev => addPendingToCards(prev, newCard));
                    _pendingCard.current = newCard;
                    _pendingTab.current = "Resume";
                    setOpenCardId(newCard.id);
                    setActiveScreen("board");
                  }}
                  onNewJD={() => { setPendingAnalysis(null); setActiveScreen("search"); }}
                />
              </div>
            )}

            {activeScreen === "stories" && (
              <div style={{ padding: "24px", maxWidth: "860px" }}>
                <MyStoriesTab profile={profile} stories={stories} setStories={setStories} />
              </div>
            )}

            {activeScreen === "profile" && (
              <ProfileTab
                profile={profile} onUpdateProfile={setProfile}
                saveJD={saveJD} setSaveJD={setSaveJD}
                corrections={corrections} onUpdateCorrections={setCorrections}
                user={user} logout={logout}
                stories={stories}
              />
            )}
          </>
        )}
      </div>

      {isMobile && <BottomNav active={activeScreen} onSelect={setActiveScreen} />}
    </div>
  );
}
