// NarrativeOS v23 — API Proxy + Avatar + Resume Alert + Coaching Fix
// Key changes from v21:
//   - Dashboard replaces Board as landing view
//   - Hamburger/drawer nav replaces bottom nav
//   - Board renamed to Tracker
//   - Pipeline stats widget on dashboard (clickable → Tracker)
//   - AI coaching nudge on dashboard
//   - Quick actions panel with warnings for neglected areas
//   - Interview Prep added as top-level nav destination (routes to card)
//   - JobSearchTab state internalized (no longer passed as props)

import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONSTANTS & CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const COMPETENCIES = [
  "Transformation","Financial Impact","Leadership","Technical",
  "Agile/Delivery","Governance","Vendor Management","Strategy","Stakeholder",
];

const STAGES = ["Considering","Applied","Screening","Hiring Manager","Panel","Exec","Rejected"];

const STAGE_COLORS = {
  Considering:    { bg: "rgba(99,140,255,0.12)",  border: "#4f6ef7", text: "#8aacff" },
  Applied:        { bg: "rgba(251,191,36,0.10)",  border: "#d97706", text: "#fbbf24" },
  Screening:      { bg: "rgba(168,85,247,0.10)",  border: "#9333ea", text: "#c084fc" },
  "Hiring Manager":{ bg: "rgba(34,197,94,0.10)", border: "#16a34a", text: "#4ade80" },
  Panel:          { bg: "rgba(20,184,166,0.10)",  border: "#0d9488", text: "#2dd4bf" },
  Exec:           { bg: "rgba(251,146,60,0.10)",  border: "#ea580c", text: "#fb923c" },
  Rejected:       { bg: "rgba(100,116,139,0.10)", border: "#475569", text: "#94a3b8" },
};

const RESUME_TYPES = [
  { id: "chronological", label: "Chronological", desc: "Reverse-chron with Hankel upgrades. Best for roles matching your exact path." },
  { id: "hybrid",        label: "Hybrid",        desc: "Potential-first bullets anchored by proof. Best for stretch roles." },
  { id: "functional",    label: "Functional",    desc: "Competency-grouped. Best for pivots or when recency hurts." },
];

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
    student:   { voice: "Use encouraging, coaching tone. Avoid jargon.", scope: "Focus on internships, academic projects, transferable skills, and early-career potential.", expectations: "Do not expect P&L ownership, large team leadership, or deep domain expertise.", questions: "Interview questions should focus on behavioral basics, learning mindset, and role-specific skills." },
    midlevel:  { voice: "Professional, direct tone. Assume familiarity with core business concepts.", scope: "Focus on individual contribution, team collaboration, and early leadership.", expectations: "Expect 3-8 years of experience. Some management experience may be present but not required.", questions: "Interview questions should probe execution quality, stakeholder navigation, and growth into leadership." },
    senior:    { voice: "Peer-level, direct tone. Skip basics. Lead with impact and strategic framing.", scope: "Focus on program/portfolio ownership, cross-functional influence, and measurable outcomes.", expectations: "Expect 8-15 years. Director or senior manager scope. P&L exposure likely but may not be full ownership.", questions: "Interview questions should probe leadership under ambiguity, organizational influence, and business outcomes." },
    executive: { voice: "Boardroom-level, concise, commercially framed. No hand-holding.", scope: "Focus on P&L ownership, organizational transformation, C-suite and board relationships, and enterprise outcomes.", expectations: "Expect VP+ scope. Full P&L, revenue accountability, and multi-year transformation programs are baseline.", questions: "Interview questions should probe strategic vision, enterprise risk, talent philosophy, and financial stewardship." },
  };
  return map[tier] || map.senior;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANKEL FRAMEWORK
// ─────────────────────────────────────────────────────────────────────────────

const _HANKEL_BANNED = `BANNED outdated phrases — never use:
"team player," "results-oriented," "seasoned professional," "go-getter," "synergy,"
"thrives in fast-paced environments," "works well under pressure," "strategic thinker" (vague),
"multi-tasker," "dynamic leader," "bottom-line focus," "excellent communication skills,"
"hard worker," "self-starter," "people person," "proven track record," "detail-oriented"`;

const _HANKEL_UPGRADE = `FADING terms — upgrade these:
"change management" → "transformation leadership" or "change agility"
"stakeholder communication" → "cross-functional fluency"
"process development" → pair with automation/efficiency language
"cross-functional collaboration" → add specifics (team count, outcome)
"project management" → tie to methodology (SAFe, Kanban, Agile) or scope`;

const _HANKEL_TRENDING = `TRENDING transferable skills — use naturally:
Team Alignment, Market Adaptability, Cross-Functional Fluency, Change Agility,
Outcomes-Based Reporting, Data Storytelling, AI-Augmented Workflows, Operational Resilience,
Continuous Delivery Mindset, Internal Enablement Tools, Data-Driven Decision Support`;

const _HANKEL_AGREE = `AGREEABLENESS signals — ATS linguistic scoring rewards these:
Include stakeholder/team counts ("partnered with 40+ stakeholders," "aligned 15 contributors"),
morale/trust outcomes ("strengthening team trust," "reducing internal friction"),
cooperation language ("collaborated with," "built alignment across"),
alignment phrases ("focused on shared goals," "helps teams stay aligned").

COOPERATIVE KPI format (highest ATS scoring):
"[Potential phrase] + [cooperative context with count] + [quantified result] + [agreeableness signal]"`;

const _HANKEL_VOCAB = `PROOF vocabulary: "Expertise in," "A background in," "A strong history of," "Demonstrated success in," "Recognized strength in," "Deep knowledge of"
POTENTIAL vocabulary: "Positioned to," "Poised to," "Prepared to," "Ready to," "Equipped to," "Building momentum as"`;

const _HANKEL_HYBRID_BULLETS = `HYBRID BULLET ARCHITECTURE — Potential + Results (Hankel "Esp. Do This"):
Structure: [Potential phrase], [cooperative context], as demonstrated by [specific proof], [agreeableness signal].

Examples calibrated to this candidate:
- "Positioned to lead complex portfolio governance at expanded scale, having partnered with 75+ initiative owners to rationalize a $40M+ program while building alignment across finance, technology, and operations."
- "Poised to drive enterprise-wide AI adoption, drawing on governance framework development that reduced unsanctioned tool usage while strengthening cross-functional trust in technology decisions."
- "Prepared to own P&L accountability at increased scope, as demonstrated by delivering $28M annualized EBITDA improvement while improving stakeholder engagement across 15 initiatives."
- "Ready to lead services commercialization, building on a strong history of productizing internal capability that generated $2M+ in revenue while enabling team growth across two business units."

65% potential-first. 35% proof-anchored. EVERY bullet has at least one quantified result.
Do NOT lead bullets with pure performance metrics ("Drove 30% revenue increase").`;

const _PAGE_RULES = `PAGE LIMIT — DENSE 2 PAGES:
- Bullet distribution (total 20-22 bullets): Cypress Creek (VP): 6-7 | EDF (Sr Dir): 5-6 | Percipio (Sr Mgr): 3-4 | Nike (Dir): 2-3 | Intel (Sr PM): 2
- Roles before Intel Corporation (Apr 2013) EXCLUDED entirely.
- Certifications: single compact line with pipe separators.
- Every bullet must be substantive. No filler.`;

const _PROJECTS = `PROJECTS SECTION — after PROFESSIONAL EXPERIENCE, before EDUCATION:
SELECTED PROJECTS
- HendersonSolution.com — Executive advisory platform; AI-assisted positioning and portfolio storytelling for senior transformation leaders
- CareerForge — AI-powered job search platform (React/Netlify); multi-profile support, STAR story library, ATS optimization, and DOCX resume generation
- ClauseLens — AI contract analysis tool; clause-level risk identification and redlining with safety and compliance guardrails`;

const _BASE_FMT = `FORMAT: No commentary, no markdown, no asterisks. Name ALL CAPS first line. Contact line second with | separators. Section headers ALL CAPS no punctuation. Job entries: Title | Company | Years. Bullets start with dash (-). Do not invent facts.`;

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
Score HIGH when candidate has required certifications, domain experience, hands-on tool experience, or scope match.
Score LOW when candidate is missing explicitly required certifications, industry experience, or technical platform hands-on.
The "reason" field must be specific — name the actual requirement gap or match.
Return ONLY a JSON array: [{"index":0,"score":8,"reason":"specific one sentence"},...]
Score all ${jobCount} jobs. No preamble.`,

  jdAnalyzer: (profile, stories, corrections) => {
    const tc = tierContext(profile);
    const correctionText = Object.keys(corrections).length > 0
      ? `\n\nUSER CORRECTIONS — treat as verified facts, do NOT re-flag:\n${Object.entries(corrections).map(([k, v]) => `- "${k}": ${v}`).join("\n")}`
      : "";
    const resumeText = (profile.resumeText || "").slice(0, 1200);
    const hasStories = stories && stories.length > 0;
    const profileContext = hasStories ? `RESUME BASELINE:\n${resumeText}` : `RESUME (no stories yet — evaluate from resume only):\n${resumeText}`;
    return `You are a senior career strategist evaluating fit for ${profile.name || "this candidate"}.

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.scope}
${tc.expectations}

${profileContext}${correctionText}

EVALUATION PHILOSOPHY:
Assess the whole person — career arc, demonstrated impact, and transferable experience.
A 10/10 is reserved for near-perfect alignment. A 9/10 means exceptional fit with only minor gaps.
Only flag gaps explicitly required in the JD and clearly absent from the candidate's background.
CRITICAL: Before flagging any gap, check the resume above. Only flag genuine verified gaps.

Return ONLY a valid JSON object — no markdown, no backticks:
{
  "score": <1-10>,
  "company": "<company name from JD>",
  "role": "<job title from JD>",
  "rationale": "<one energizing sentence leading with the candidate's strongest angle>",
  "keyRequirements": ["<req>","<req>","<req>","<req>","<req>"],
  "strongestAngles": [{"angle":"<angle>","why":"<1 sentence why this matters for THIS role>"}],
  "topStories": [{"story":"<story title or resume achievement>","useFor":"<interview question type>"}],
  "gaps": [{"title":"<gap>","assessment":"<honest 1-sentence>","framing":"<how to address it confidently>"}],
  "keywords": ["<kw>"]
}`;
  },

  resumeStrategy: (profile, resumeType = "chronological") => {
    const tc = tierContext(profile);
    const profileContext = [
      profile.title && `Title: ${profile.title}`,
      profile.background && `Background: ${profile.background}`,
      profile.resumeText && `Resume (first 800 chars): ${profile.resumeText.slice(0, 800)}`,
    ].filter(Boolean).join("\n");

    const typeGuidance = resumeType === "hybrid"
      ? `RESUME TYPE: HYBRID (Potential-Forward Hankel)
Strategy bullets should recommend POTENTIAL-FIRST language anchored with proof.
bulletEdits should transform purely transactional bullets into potential+proof format.
summaryRewrite should be forward-looking — what the candidate is positioned to do.`
      : resumeType === "functional"
      ? `RESUME TYPE: FUNCTIONAL (Competency-Grouped)
Strategy should recommend grouping bullets by competency.
bulletEdits should reframe bullets as demonstrated capabilities, referencing companies inline.
summaryRewrite should focus on competency areas and executive scope.`
      : `RESUME TYPE: CHRONOLOGICAL (Upgraded with Hankel)
Strategy should upgrade language per Hankel framework while preserving chronological structure.
bulletEdits should add agreeableness signals, upgrade fading vocabulary, and add potential bridges.`;

    return `You are a senior executive resume strategist for ${profile.name || "this candidate"}.
${profileContext}

CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.scope}
${tc.expectations}
${tc.voice}

${typeGuidance}

SCOPE: Analyze only roles from Intel Corporation (Apr 2013) forward. Roles prior to Intel are excluded.

HANKEL LANGUAGE FRAMEWORK — apply to all bullet edits:
${_HANKEL_BANNED}
${_HANKEL_UPGRADE}
${_HANKEL_TRENDING}
${_HANKEL_AGREE}
${_HANKEL_VOCAB}

Analyze the resume against the job description and return ONLY a valid JSON object — no markdown, no backticks:
{
  "summaryRewrite": "<complete 3-sentence summary rewritten for this role — forward-looking, calibrated to candidate level>",
  "bulletEdits": [
    {"original": "<exact bullet from resume>", "revised": "<stronger version using Hankel framework>", "reason": "<one sentence why>"}
  ],
  "bulletsToPromote": ["<bullet text to move higher>"],
  "keywordsToAdd": ["<keyword or phrase missing from resume but in JD>"],
  "toDeEmphasize": ["<experience or section to minimize for this application>"]
}
Return only the JSON. bulletEdits should include the 4-5 highest-impact changes only.`;
  },

  resumeRender: (resumeType = "chronological") => {
    if (resumeType === "hybrid") {
      return `You are an expert resume writer producing a HYBRID executive resume using the Hankel potential-forward framework.
Apply ALL approved edits from the strategy. Produce clean resume text only.

${_BASE_FMT}

HYBRID FORMAT:
1. Name (ALL CAPS) + Contact line
2. EXECUTIVE PROFILE section — a functional descriptor header (e.g. "Enterprise Transformation & Portfolio Leadership — VP/SVP Level") followed by 3-4 forward-looking sentences on what the candidate is positioned to do. NOT a career history recap.
3. PROFESSIONAL EXPERIENCE — reverse chronological, context sentence per role
4. ${_PROJECTS}
5. EDUCATION + CERTIFICATIONS (single compact line with pipes)

${_HANKEL_BANNED}
${_HANKEL_UPGRADE}
${_HANKEL_TRENDING}
${_HANKEL_AGREE}
${_HANKEL_HYBRID_BULLETS}

${_PAGE_RULES}`;
    }

    if (resumeType === "functional") {
      return `You are an expert resume writer producing a FUNCTIONAL executive resume.
Apply ALL approved edits from the strategy. Produce clean resume text only.

${_BASE_FMT}

FUNCTIONAL FORMAT:
1. Name (ALL CAPS) + Contact line
2. EXECUTIVE SUMMARY — 3 forward-looking sentences on scope and what the candidate is positioned to do
3. AREAS OF EXPERTISE — 4-5 competency-grouped sections:
   Headers: ENTERPRISE TRANSFORMATION | FINANCIAL STEWARDSHIP | PORTFOLIO GOVERNANCE | TECHNOLOGY & AI STRATEGY | STAKEHOLDER & COMMERCIAL LEADERSHIP
   - 3-4 bullets per section referencing companies inline ("at Cypress Creek Renewables," "during the EDF transformation program")
   - 60% potential-first, 40% proof-anchored bullets
4. PROFESSIONAL EXPERIENCE — brief list only: Title | Company | Dates (one line, NO bullets)
5. ${_PROJECTS}
6. EDUCATION + CERTIFICATIONS

${_HANKEL_BANNED}
${_HANKEL_UPGRADE}
${_HANKEL_TRENDING}
${_HANKEL_AGREE}
${_HANKEL_VOCAB}`;
    }

    return `You are an expert resume writer producing a CHRONOLOGICAL resume with Hankel language upgrades.
Apply ALL approved edits from the strategy. Produce clean resume text only.

${_BASE_FMT}

CHRONOLOGICAL FORMAT:
- Reverse chronological order, full date ranges per role
- Context sentence per role: one line on what the company/BU did and its scale
- 60% PROOF-ANCHORED bullets, 40% POTENTIAL-BRIDGE bullets
- Potential bridges: "[Achievement], positioning the organization to [future outcome]"
- Mix agreeableness signals WITH hard metrics in the same bullet

${_HANKEL_BANNED}
${_HANKEL_UPGRADE}
${_HANKEL_TRENDING}
${_HANKEL_AGREE}
${_HANKEL_VOCAB}

${_PAGE_RULES}

${_PROJECTS}`;
  },

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

HIGH COMMITMENT SIGNAL — CRITICAL:
This letter must communicate that this specific role, at this specific company, is the destination — not a stepping stone.
Signal genuine, researched alignment — not generic enthusiasm.
One line should clearly say (without cliché): this is exactly the kind of problem I have spent years preparing to own.
Make the alignment specific and earned — reference something particular about THIS company's stage, challenge, or mandate.
Avoid vague flattery ("I've long admired your company"). Earned specificity wins.

AGREEABLENESS LANGUAGE:
- Emphasize collaborative impact alongside individual achievement
- Include partnership language: "working alongside," "in service of the team's goals," "building alignment with"
- One sentence should reference team or stakeholder outcomes, not just personal metrics
- Avoid purely competitive framing ("I single-handedly," "I outperformed")

CRITICAL FORMATTING:
- Do NOT include contact information, addresses, phone numbers, or email addresses
- Do NOT include a name line, letterhead, or salutation
- Do NOT include a closing signature block — the template adds this
- Output ONLY the body paragraphs, nothing else
- No placeholders like [Phone] or [Email]`;
  },

  interviewPrep: (profile, stories, round) => {
    const tc = tierContext(profile);
    const storyCtx = stories.length > 0
      ? stories.map(s => `"${s.title}": ${s.hook || s.result}`).join("\n")
      : "No stories added — draw from resume context.";
    const profileCtx = [
      profile.name  && `Name: ${profile.name}`,
      profile.title && `Title: ${profile.title}`,
      profile.background && `Background: ${profile.background}`,
      profile.resumeText && `Resume (partial): ${profile.resumeText.slice(0, 600)}`,
    ].filter(Boolean).join("\n");

    return `You are a senior interview coach. Produce a cockpit-style prep sheet for a ${round} interview.
${profileCtx}
CANDIDATE LEVEL: ${profile.profileTier || "senior"}
${tc.voice}
Story bank (proof+potential hooks): ${storyCtx}

CRITICAL: Return ONLY a valid JSON object. No preamble. No markdown fences. No commentary.

{
  "header": {
    "name": "${profile.name || "Candidate"}",
    "company": "[company from JD]",
    "role": "[role title from JD]",
    "round": "${round}",
    "logistics": "[comp range if stated | reporting line | location/hybrid — pipe separated, omit unknowns]"
  },
  "coreStory": [
    "[career throughline in 4-6 words]",
    "[Most recent company]: [key proof point with number]",
    "[Prior company]: [key proof point with number]",
    "[What I do]: [3 phrases separated by | characters]"
  ],
  "fitAtGlance": {
    "strengths": ["[specific match referencing company or project and metric]", "[...]", "[...]", "[...]"],
    "gaps": ["[honest gap with a framing hint appended after a dash]"]
  },
  "objection": {
    "concern": "[Most likely objection — phrased as what the interviewer is REALLY asking in caps]",
    "doNotSay": ["[phrase to avoid]", "[phrase to avoid]"],
    "sayThis": "[One or two scripted sentences. Calm. Decided. Not defensive. Not hedging.]"
  },
  "competencyGrid": [
    { "label": "[JD SKILL CLUSTER 1 IN ALL CAPS]", "bullets": ["[candidate proof point]", "[candidate proof point]", "[candidate proof point]"] },
    { "label": "[JD SKILL CLUSTER 2 IN ALL CAPS]", "bullets": ["[candidate proof point]", "[candidate proof point]", "[candidate proof point]"] },
    { "label": "[JD SKILL CLUSTER 3 IN ALL CAPS]", "bullets": ["[candidate proof point]", "[candidate proof point]", "[candidate proof point]"] }
  ],
  "openerLeft": {
    "tellMeAboutYourself": "[3-4 keyword anchors — no full sentences]",
    "whyCompany": "[2-3 specific phrases about THIS role — not generic]",
    "partnershipAngle": "[2-3 phrases on how they add value to this hiring manager]"
  },
  "openerRight": {
    "governancePhilosophy": "[Lead phrase + 2 supporting phrases]",
    "keyExperience": "[Single most relevant proof point with metric]",
    "frameYourSearch": "[1-2 phrases — deliberate, not reactive framing]"
  },
  "domainGap": {
    "label": "[DOMAIN GAP — name the specific domain]",
    "bullets": ["[how to acknowledge directly]", "[how to map to known pattern from their background]", "[bridge phrase — domain changes, operating model does not]"]
  },
  "watchThese": [
    "[specific behavior to avoid — start with Do not]",
    "[specific behavior to avoid]",
    "[specific behavior to avoid]",
    "[mindset reminder — last item, no Do not prefix]"
  ],
  "thirtysixtynety": {
    "thirty": ["Listen & Map", "[specific action 1]", "[specific action 2]"],
    "sixty": ["Structure & Align", "[specific action 1]", "[specific action 2]"],
    "ninety": ["Execute & Measure", "[specific action 1]", "[specific action 2]"]
  },
  "questions": [
    "[Most diagnostic question — flag it as ask first]",
    "[Question about hiring manager style or priorities]",
    "[Question about PMO/team maturity]",
    "[Question about success metrics]",
    "[Question about biggest current challenge]"
  ],
  "closeStrong": [
    "[Question that confirms alignment with hiring manager]",
    "[Question about next step and timeline]",
    "[Reinforcing statement that lands the candidate frame — not a question]"
  ],
  "positioningFrame": [
    "Not [wrong label] — [correct frame]",
    "Not [wrong label] — [correct frame]",
    "Not [wrong label] — [correct frame]"
  ],
  "reminder": "[One sentence. The mindset to hold. Usually starts: You are evaluating them too.]"
}

RULES:
- competencyGrid columns are the JD top three skill clusters — not generic categories
- All proof points reference candidate companies or metrics — no placeholders
- Phrases only — no full sentences except objection.sayThis, watchThese last item, reminder
- No em dashes anywhere — use pipe or hyphen
- questions[0] is the one to ask first
- Return ONLY the JSON object, nothing else`;
  },

  storyExtract: (profile) =>
    `You are an expert career coach helping ${profile.name || "this candidate"} build a STAR story library.

Analyze the resume and extract 4-6 significant achievements that would make strong interview stories.

Return ONLY a valid JSON array. Critical rules:
- Straight double quotes only (no curly quotes)
- No em dashes (use hyphen)
- No unescaped apostrophes
- All string values on a single line
- No trailing commas

[{
  "title": "Brief title leading with the outcome or metric",
  "company": "company name",
  "role": "job title at that company",
  "competencies": ["one or two from: Transformation, Financial Impact, Leadership, Technical, Agile/Delivery, Governance, Vendor Management, Strategy, Stakeholder"],
  "hook": "One powerful sentence using proof+potential bridge. Format: [Achieved X], which positions me to [future capability]. Executive voice, no em dashes.",
  "situation": "2-3 sentences describing the context and problem.",
  "task": "1-2 sentences describing what you were responsible for.",
  "action": "2-3 sentences describing what you specifically did.",
  "result": "1-2 sentences with quantified outcomes where possible.",
  "tags": ["keyword1", "keyword2", "keyword3"],
  "starred": false
}]

Return ONLY the JSON array, nothing else.`,

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
  "hook": "Proof+potential bridge: [Achieved X], which positions me to [future capability]. Executive voice.",
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

HOOK GUIDANCE — when building the hook sentence, guide toward PROOF + POTENTIAL BRIDGE:
Format: "[Achieved X result], which now positions me to [what this experience enables going forward]."
Example: "Surfaced $13M in SaaS rationalization across a 75-initiative portfolio, which positions me to own enterprise-scale vendor governance with direct P&L accountability."
This format works for both the 30-second phone screen opener and resume bullets.

When asking each section, briefly remind the user what interviewers are listening for. Keep it natural.
If the user gives a vague answer, ask for a specific number, timeline, or concrete example.

Current story being built:
${JSON.stringify(story, null, 2)}

Rules:
- Ask ONE focused question at a time
- Be warm, conversational, and encouraging
- When all four STAR fields are reasonably complete, respond with ONLY a JSON object:
{"complete": true, "situation": "...", "task": "...", "action": "...", "result": "...", "hook": "[Achievement], which positions me to [future capability]."}
- Otherwise respond with just your coaching + question as plain text — no JSON`,

  storyMatch: (stories) => {
    const storyList = stories.map((s, i) =>
      `${i}: "${s.title}" [${s.competencies?.join(", ") || ""}] — ${s.result || s.hook || ""}`
    ).join("\n");
    return `You are matching interview stories to a job description.
Stories available:
${storyList}
Return ONLY a JSON array of the 3 most relevant stories — ordered by relevance:
[{"index": <number>, "useFor": "<specific interview question type>", "why": "<one sentence on why this story fits this role>"}]
No preamble. Only the JSON array.`;
  },

  followUp: (profile, card, type) => {
    const tc = tierContext(profile);
    const typeInstructions = {
      "thank-you": `Write a post-interview thank you email. Send within 24 hours. Reference one specific topic discussed. Reaffirm genuine interest and one key proof point. 3 short paragraphs maximum, warm but professional close.`,
      "recruiter-follow-up": `Write a recruiter follow-up email. Polite, brief, not desperate. Reference the specific role and when applied. Express continued strong interest. Ask for a clear next step. 2 paragraphs maximum.`,
      "check-in": `Write a check-in email for a role gone quiet after an interview. Professional, not needy. Acknowledge their timeline. Restate interest and one differentiating value point. 2 tight paragraphs.`,
      "offer-response": `Write an email responding to a job offer. Acknowledge and express genuine enthusiasm. If accepting: confirm start date. If negotiating: professional framing around one ask only. Warm, decisive, forward-looking tone.`,
    };
    return `You are writing a professional email for ${profile.name || "this candidate"}.
${tc.voice}
Role: ${card.title || "this position"} at ${card.company || "this company"}
Stage: ${card.stage || "unknown"}
${typeInstructions[type] || typeInstructions["thank-you"]}
RULES: Subject line on first line prefixed "Subject: ". Blank line. Email body. No placeholders. No closing signature block.`;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GLOBAL STATE
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

// ─── Ephemeral Fit Check session ────────────────────────────────────────────
const _emptySession = { jd: "", jdUrl: "", company: "", role: "", resumeText: "", resumeType: "", coverLetterText: "", prepText: "" };
let _fitSession = { ..._emptySession };
const _fitListeners = new Set();
function getFitSession() { return _fitSession; }
function setFitSession(updates) {
  _fitSession = { ..._fitSession, ...updates };
  _fitListeners.forEach(cb => cb({ ..._fitSession }));
}
function wipeFitSession() { _fitSession = { ..._emptySession }; _fitListeners.forEach(cb => cb({ ..._fitSession })); }
function useFitSession() {
  const [s, setS] = useState({ ..._fitSession });
  useEffect(() => { _fitListeners.add(setS); return () => _fitListeners.delete(setS); }, []);
  return s;
}

function detectUrl(text) {
  const m = text.match(/https?:\/\/[^\s"'<>)]+/);
  return m ? m[0] : "";
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

const PRE_INTEL_COMPANIES = ["proudcloud", "bookmans", "bookman's"];

function stripPreIntelRoles(text) {
  if (!text) return text;
  const lines = text.split("\n");
  const result = [];
  let skipping = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i];
    const lower = t.toLowerCase();
    const isRoleHeader = t.includes("|") && !t.includes("@") && t.split("|").length >= 2 && t.split("|").length <= 4;
    if (isRoleHeader) {
      const isExcluded = PRE_INTEL_COMPANIES.some(c => lower.includes(c));
      skipping = isExcluded;
      if (!skipping) result.push(t);
      continue;
    }
    const isSectionHeader = t === t.toUpperCase() && t.trim().length > 2 && t.trim().length < 40 && !t.includes("|") && !t.includes("@");
    if (isSectionHeader) skipping = false;
    if (!skipping) result.push(t);
  }
  return result.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. API
// ─────────────────────────────────────────────────────────────────────────────

// API key is now server-side only (netlify/functions/claude.js)
// VITE_ANTHROPIC_API_KEY kept temporarily for CoachingNudge availability check only
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const APIFY_TOKEN       = import.meta.env.VITE_APIFY_TOKEN || "";
const PROXY_URL         = "/.netlify/functions/claude";

async function getAuthToken() {
  const user = window.netlifyIdentity?.currentUser();
  if (!user) return "";
  try {
    // jwt() returns a fresh token, refreshing if needed
    return await user.jwt(true);
  } catch {
    return user?.token?.access_token || "";
  }
}

async function callClaude(system, user, maxTokens = 2000) {
  setApiLock(true);
  try {
    const token = await getAuthToken();
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ mode: "standard", system, userMessage: user, maxTokens }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `API ${res.status}`);
    const text = data.content?.find(b => b.type === "text")?.text || "";
    trackCost((system + user).length, text.length);
    return text;
  } finally { setApiLock(false); }
}

async function callClaudeSearch(company, query) {
  setApiLock(true);
  try {
    const token = await getAuthToken();
    const system = `You are a research analyst preparing a pre-interview briefing about ${company}.
Summarize findings in 3-5 factual sentences with specific numbers, names, and dates.
After your summary, list 1-3 source URLs as: "Sources: url1, url2"
Scope is limited to public information about the company.`;
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ mode: "search", system, userMessage: query, maxTokens: 1500 }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `API ${res.status}`);
    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    trackCost(query.length, (text || "").length);
    return text || "No information found.";
  } finally { setApiLock(false); }
}

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

function clearDriveToken(userKey) {
  if (userKey) localStorage.removeItem(`${userKey}:google_token:drive`);
  localStorage.removeItem("cf:google_token:drive");
}

async function getOrCreateDriveFolder(token) {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (searchRes.status === 401 || searchRes.status === 400) throw new Error("OAUTH_EXPIRED");
  const searchData = await searchRes.json();
  if (searchData.error) throw new Error("OAUTH_EXPIRED");
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
  const data = await res.json();
  if (res.status === 401 || res.status === 400 || data.error) throw new Error("OAUTH_EXPIRED");
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DOCX / PDF / XLSX GENERATION
// ─────────────────────────────────────────────────────────────────────────────

async function exportTrackerXlsx(cards) {
  const rows = cards
    .filter(c => c.stage !== "Considering")
    .sort((a, b) => (a.company || "").localeCompare(b.company || ""));
  const header = ["Company","Title","Stage","Link","Date Added","Resume Type","Resume Generated","Cover Letter Generated"];
  const data = rows.map(c => [
    c.company || "",
    c.title || "",
    c.stage || "",
    c.jdUrl || "",
    c.createdAt || "",
    c.resumeType || "",
    c.resumeText ? "Yes" : "No",
    c.coverLetterText ? "Yes" : "No",
  ]);
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [header, ...data].map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `NarrativeOS_Tracker_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

let _docxLib = null;
async function getDocxLib() {
  if (!_docxLib) _docxLib = await import("https://esm.sh/docx@8.5.0");
  return _docxLib;
}

let _mammoth = null;
async function getMammoth() {
  if (!_mammoth) _mammoth = await import("https://esm.sh/mammoth@1.8.0");
  return _mammoth;
}

let _jspdf = null;
async function getJsPDF() {
  if (!_jspdf) {
    const mod = await import("https://esm.sh/jspdf@2.5.1");
    _jspdf = mod.jsPDF || mod.default?.jsPDF || mod.default;
  }
  return _jspdf;
}

async function extractDocxText(arrayBuffer) {
  const mammoth = await getMammoth();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

async function buildPdfBlob(text) {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ unit: "pt", format: "letter" });
  const margin = 60;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const lines = doc.splitTextToSize(text, maxW);
  let y = margin;
  const lineH = 14;
  const pageH = doc.internal.pageSize.getHeight();
  lines.forEach(line => {
    if (y + lineH > pageH - margin) { doc.addPage(); y = margin; }
    doc.text(line, margin, y);
    y += lineH;
  });
  return doc.output("blob");
}

async function buildResumeDocxBlob(finalResumeText, company, profile) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await getDocxLib();
  const children = [];
  const lines = stripPreIntelRoles(finalResumeText).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) { children.push(new Paragraph({ text: "", spacing: { after: 40 } })); continue; }
    if (i === 0 || children.length === 0) {
      children.push(new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 28, color: "1a1a4a", font: "Calibri" })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }));
    } else if (t.includes("|") && t.includes("@") && children.length <= 2) {
      children.push(new Paragraph({ children: [new TextRun({ text: t, size: 18, color: "444444", font: "Calibri" })], alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
    } else if (t === t.toUpperCase() && t.length > 2 && t.length < 40 && !t.includes("|") && !t.includes("@") && !t.includes("—")) {
      children.push(new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, color: "1a1a4a", font: "Calibri" })], spacing: { before: 180, after: 60 } }));
    } else if (t.includes("|") && !t.includes("@") && t.split("|").length >= 2 && t.split("|").length <= 4) {
      const parts = t.split("|").map(p => p.trim());
      children.push(new Paragraph({ children: [new TextRun({ text: parts[0], bold: true, size: 19, color: "111111", font: "Calibri" }), new TextRun({ text: "  |  ", size: 19, color: "888888", font: "Calibri" }), new TextRun({ text: parts.slice(1).join("  |  "), size: 19, color: "444444", font: "Calibri" })], spacing: { before: 140, after: 40 } }));
    } else if (t.startsWith("-") || t.startsWith("•")) {
      children.push(new Paragraph({ children: [new TextRun({ text: t.replace(/^[-•]\s*/, ""), size: 19, color: "111111", font: "Calibri" })], bullet: { level: 0 }, spacing: { after: 40 } }));
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: t, size: 19, color: "111111", font: "Calibri" })], spacing: { after: 60 } }));
    }
  }
  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 504, bottom: 504, left: 720, right: 720 } } }, children }],
    styles: { default: { document: { run: { font: "Calibri", size: 19 } } } },
  });
  return await Packer.toBlob(doc);
}

async function buildCoverLetterDocxBlob(letterText, company, role, profile) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await getDocxLib();
  const contactLine = `${profile.address}  |  ${profile.phone}  |  ${profile.email}  |  ${profile.website}`;
  const cleanLines = letterText.split("\n").filter(l => {
    const t = l.trim();
    if (!t) return true;
    if (t.match(/^\[.*\]$/) || t === profile.email || t === profile.phone) return false;
    if (t.toLowerCase().includes(profile.name?.toLowerCase()) && t.length < 30) return false;
    return true;
  });
  const children = [
    new Paragraph({ children: [new TextRun({ text: (profile.name || "").toUpperCase(), bold: true, size: 30, color: "1a1a4a", font: "Calibri" })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: contactLine, size: 18, color: "555555", font: "Calibri" })], spacing: { after: 80 } }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "2F2B8F" } }, spacing: { after: 320 } }),
    new Paragraph({ children: [new TextRun({ text: getToday(), size: 20, color: "555555", font: "Calibri" })], spacing: { after: 320 } }),
  ];
  if (company) children.push(new Paragraph({ children: [new TextRun({ text: company, size: 20, bold: true, font: "Calibri" })], spacing: { after: 40 } }));
  if (role) children.push(new Paragraph({ children: [new TextRun({ text: role, size: 20, color: "444444", font: "Calibri" })], spacing: { after: 320 } }));
  let bodyStarted = false;
  for (const line of cleanLines.join("\n").split("\n")) {
    const t = line.trim();
    if (!t && !bodyStarted) continue;
    bodyStarted = true;
    if (!t) { children.push(new Paragraph({ text: "", spacing: { after: 140 } })); continue; }
    children.push(new Paragraph({ children: [new TextRun({ text: t, size: 22, color: "111111", font: "Calibri" })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED }));
  }
  children.push(new Paragraph({ text: "", spacing: { after: 160 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: profile.name || "", size: 22, bold: true, font: "Calibri" })], spacing: { after: 40 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: profile.phone || "", size: 20, color: "555555", font: "Calibri" })], spacing: { after: 40 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: profile.email || "", size: 20, color: "555555", font: "Calibri" })], spacing: { after: 40 } }));
  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } }, children }],
    styles: { default: { document: { run: { font: "Calibri" } } } },
  });
  return await Packer.toBlob(doc);
}

async function buildFinalResumeText(baseResume, strategy, jd, resumeType = "chronological") {
  return callClaude(
    PROMPTS.resumeRender(resumeType),
    `Base Resume:\n${stripPreIntelRoles(baseResume)}\n\nApproved Strategy:\n${JSON.stringify(strategy, null, 2)}\n\nJob Description:\n${jd}`,
    2700
  );
}

async function buildPrepCockpitDocx(prepData, profile) {
  const lib = await getDocxLib();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } = lib;

  const BORDER    = { style: "single", size: 4, color: "CCCCCC" };
  const ALL_B     = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  const CELL_PAD  = { top: 80, bottom: 80, left: 100, right: 100 };

  function hdr(text, color = "1A237E") {
    return new Paragraph({
      children: [new TextRun({ text: text.toUpperCase(), size: 17, bold: true, color, font: "Calibri" })],
      spacing: { before: 60, after: 50 },
    });
  }
  function txt(text, size = 17, color = "222222", bold = false) {
    return new Paragraph({
      children: [new TextRun({ text, size, bold, color, font: "Calibri" })],
      spacing: { after: 40 },
    });
  }
  function blt(text, color = "333333") {
    return new Paragraph({
      children: [new TextRun({ text, size: 16, color, font: "Calibri" })],
      bullet: { level: 0 },
      spacing: { after: 36 },
    });
  }
  function gap() { return new Paragraph({ text: "", spacing: { after: 40 } }); }

  function mkCell(children, span, fill) {
    const shading = fill ? { type: "clear", color: "auto", fill } : undefined;
    return new TableCell({
      children,
      columnSpan: span,
      width: { size: 1500 * span, type: WidthType.DXA },
      borders: ALL_B,
      margins: CELL_PAD,
      ...(shading ? { shading } : {}),
    });
  }

  function mkRow(...cells) { return new TableRow({ children: cells }); }

  const d    = prepData;
  const name = d.header?.name || profile.name || "";
  const co   = d.header?.company || "";
  const role = d.header?.role || "";

  const rows = [];

  rows.push(mkRow(mkCell([
    new Paragraph({ children: [new TextRun({ text: [name, co, role, d.header?.round || ""].filter(Boolean).join("   \u00b7   "), size: 20, bold: true, color: "FFFFFF", font: "Calibri" })], spacing: { after: 20 } }),
    new Paragraph({ children: [new TextRun({ text: d.header?.logistics || "", size: 16, color: "DDDDFF", font: "Calibri" })], spacing: { after: 0 } }),
  ], 6, "1A237E")));

  const strengths = (d.fitAtGlance?.strengths || []).map(s => blt("\u2705  " + s, "1B5E20"));
  const gaps      = (d.fitAtGlance?.gaps || []).map(g => blt("\u26a0\ufe0f  " + g, "7B3F00"));
  rows.push(mkRow(
    mkCell([hdr("CORE STORY"), ...(d.coreStory || []).map(s => txt(s))], 3),
    mkCell([hdr("FIT AT A GLANCE"), ...strengths, ...gaps], 3),
  ));

  if (d.objection?.concern) {
    rows.push(mkRow(
      mkCell([
        hdr(d.objection.concern, "8B0000"),
        txt("Answer like someone who has already decided — not debating, not enduring.", 15, "666666"),
        ...(d.objection.doNotSay || []).map(s => blt("\u274c  " + s, "8B0000")),
      ], 3),
      mkCell([
        hdr("SAY THIS", "1A5276"),
        txt(d.objection.sayThis || "", 17, "111111"),
      ], 3),
    ));
  }

  const grid = d.competencyGrid || [];
  if (grid.length > 0) {
    rows.push(mkRow(...grid.slice(0, 3).map(col =>
      mkCell([hdr(col.label || ""), ...(col.bullets || []).map(b => blt(b))], 2)
    )));
  }

  const ol = d.openerLeft || {};
  const or_ = d.openerRight || {};
  rows.push(mkRow(
    mkCell([
      hdr("TELL ME ABOUT YOURSELF"), txt(ol.tellMeAboutYourself || ""),
      hdr("WHY " + (co || "THIS COMPANY").toUpperCase()), txt(ol.whyCompany || ""),
      hdr("PARTNERSHIP ANGLE"), txt(ol.partnershipAngle || ""),
    ], 3),
    mkCell([
      hdr("GOVERNANCE PHILOSOPHY"), txt(or_.governancePhilosophy || ""),
      hdr("KEY EXPERIENCE"), txt(or_.keyExperience || ""),
      hdr("YOUR SEARCH"), txt(or_.frameYourSearch || ""),
    ], 3),
  ));

  rows.push(mkRow(mkCell([
    new Paragraph({ children: [new TextRun({ text: "PAGE 2   \u00b7   " + name + "   \u00b7   " + co.toUpperCase() + " SCREEN", size: 18, bold: true, color: "FFFFFF", font: "Calibri" })], spacing: { after: 0 } }),
  ], 6, "1A237E")));

  const ttt = d.thirtysixtynety || {};
  rows.push(mkRow(
    mkCell([
      hdr(d.domainGap?.label || "DOMAIN GAP"),
      ...(d.domainGap?.bullets || []).map(b => blt(b)),
      gap(),
      hdr("WATCH THESE"),
      ...(d.watchThese || []).map(w => blt((w.toLowerCase().startsWith("do not") ? "\u274c  " : "") + w, "8B0000")),
    ], 3),
    mkCell([
      hdr("30 / 60 / 90"),
      hdr("30 \u2014 " + (ttt.thirty?.[0] || "Listen & Map"), "1A5276"),
      ...(ttt.thirty?.slice(1) || []).map(b => blt(b)),
      hdr("60 \u2014 " + (ttt.sixty?.[0] || "Structure & Align"), "1A5276"),
      ...(ttt.sixty?.slice(1) || []).map(b => blt(b)),
      hdr("90 \u2014 " + (ttt.ninety?.[0] || "Execute & Measure"), "1A5276"),
      ...(ttt.ninety?.slice(1) || []).map(b => blt(b)),
    ], 3),
  ));

  rows.push(mkRow(
    mkCell([hdr("TOP QUESTIONS TO ASK"), ...(d.questions || []).map(q => blt(q))], 2),
    mkCell([hdr("CLOSE STRONG"), ...(d.closeStrong || []).map(c => blt(c))], 2),
    mkCell([
      hdr("POSITIONING \u2014 HOLD THIS FRAME"),
      ...(d.positioningFrame || []).map(p => blt(p)),
      gap(),
      hdr("THE REMINDER"),
      txt(d.reminder || "", 17, "111111", true),
    ], 2),
  ));

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 360, bottom: 360, left: 360, right: 360 } } },
      children: [new Table({ width: { size: 9000, type: WidthType.DXA }, rows })],
    }],
  });
  return await Packer.toBlob(doc);
}

async function buildPrepDocxBlob(prepText, company, role, profile) {
  if (typeof prepText === "object" && prepText !== null) {
    return buildPrepCockpitDocx(prepText, profile);
  }
  const { Document, Packer, Paragraph, TextRun } = await getDocxLib();
  const children = [
    new Paragraph({ children: [new TextRun({ text: `${role || "Role"}  \u00b7  ${company || "Company"}`, size: 24, bold: true, color: "1A237E", font: "Calibri" })], spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: `${profile.name || ""}  \u00b7  Prepared ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" })}`, size: 18, color: "888888", font: "Calibri" })], spacing: { after: 240 } }),
    ...prepText.split("\n").map(line => {
      const t = line.trim();
      if (!t) return new Paragraph({ text: "", spacing: { after: 60 } });
      if (/^[A-Z][A-Z\s\/&:]{4,}$/.test(t)) return new Paragraph({ children: [new TextRun({ text: t, size: 20, bold: true, color: "1A237E", font: "Calibri" })], spacing: { before: 160, after: 60 } });
      if (/^[-\u2022]\s/.test(t)) return new Paragraph({ children: [new TextRun({ text: t.slice(2), size: 18, font: "Calibri" })], bullet: { level: 0 }, spacing: { after: 40 } });
      return new Paragraph({ children: [new TextRun({ text: t, size: 18, font: "Calibri", color: "333333" })], spacing: { after: 60 } });
    }),
  ];
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }] });
  return await Packer.toBlob(doc);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  input: { width: "100%", background: "#1e2240", border: "1px solid #3a3d5c", borderRadius: "6px", padding: "10px 14px", fontSize: "14px", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e8e4f8", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" },
  textarea: { width: "100%", background: "#1e2240", border: "1px solid #3a3d5c", borderRadius: "6px", padding: "12px 14px", fontSize: "14px", fontFamily: "Georgia, serif", color: "#e8e4f8", outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: "1.6" },
  btn: { background: "#4f6ef7", color: "#ffffff", border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "14px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer", transition: "opacity 0.15s" },
  btnGhost: { background: "transparent", color: "#8880b8", border: "1px solid #3a3d5c", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer" },
  section: { background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px", padding: "20px 24px" },
  label: { display: "block", fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#4f6ef7", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", marginBottom: "10px" },
  resultBox: { fontSize: "14px", color: "#c8c4e8", fontFamily: "Georgia, serif", lineHeight: "1.8", whiteSpace: "pre-wrap", maxHeight: "480px", overflowY: "auto", padding: "16px", background: "#1a1c2e", borderRadius: "6px", border: "1px solid #2e3050" },
  btnSmall: { background: "#4f6ef7", color: "#fff", border: "none", borderRadius: "5px", padding: "4px 10px", fontSize: "11px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600, cursor: "pointer" },
  tab: { padding: "16px 20px" },
};

const _spinStyle = document.createElement("style");
_spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(_spinStyle);

// ─────────────────────────────────────────────────────────────────────────────
// 8. UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="#4f6ef7" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      style={{ ...S.btnGhost, fontSize: "12px", padding: "5px 12px" }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function Tag({ label, color = "#3a3d5c", textColor = "#8880a0" }) {
  return <span style={{ background: color, color: textColor, borderRadius: "3px", padding: "2px 8px", fontSize: "11px", fontFamily: "'DM Sans', system-ui, sans-serif", whiteSpace: "nowrap" }}>{label}</span>;
}

function CompBadge({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ background: active ? "rgba(99,140,255,0.18)" : "rgba(255,255,255,0.03)", color: active ? "#8aacff" : "#5a5870", border: `1px solid ${active ? "#4a6abf" : "#3a3d5c"}`, borderRadius: "4px", padding: "5px 12px", fontSize: "12px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer" }}>{label}</button>
  );
}

function generateId() { return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function StagePill({ stage, onClick, small }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS.Radar;
  return (
    <button onClick={onClick} style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: "12px", padding: small ? "2px 8px" : "4px 12px", fontSize: small ? "11px" : "12px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: onClick ? "pointer" : "default" }}>
      {stage}
    </button>
  );
}

function SaveToDriveBtn({ blob, filename, onSaved, disabled, userEmail }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);
  const [expired, setExpired] = useState(false);

  const handle = async () => {
    setSaving(true); setErr(null); setExpired(false);
    try {
      const token = getDriveToken(userEmail);
      if (!token) { setErr("Connect Google Drive in Profile first"); setSaving(false); return; }
      const result = await saveToDrive(blob, filename, token);
      if (result.webViewLink) { setSaved(true); onSaved?.(result); }
      else setErr("Upload failed");
    } catch (e) {
      if (e.message === "OAUTH_EXPIRED") {
        clearDriveToken(userEmail);
        setExpired(true);
      } else { setErr(e.message); }
    }
    finally { setSaving(false); }
  };

  if (saved) return <span style={{ fontSize: "12px", color: "#4ade80", fontFamily: "'DM Sans', system-ui, sans-serif" }}>✓ Saved to Drive</span>;
  if (expired) return (
    <div style={{ fontSize: "11px", color: "#c9a84c", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "6px", padding: "6px 10px" }}>
      Drive token expired — reconnect in Profile, then retry.
    </div>
  );
  return (
    <div>
      <button onClick={handle} disabled={disabled || saving} style={{ ...S.btnGhost, fontSize: "12px", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px", opacity: disabled || saving ? 0.5 : 1 }}>
        {saving ? <><Spinner size={12} />Saving…</> : "📁 Save to Drive"}
      </button>
      {err && <div style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>{err}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. AUTH
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
    ni.on("init", onInit); ni.on("login", onLogin); ni.on("logout", onLogout);
    if (ni.currentUser) { setUser(ni.currentUser()); setAuthLoading(false); }
    const timeout = setTimeout(() => setAuthLoading(false), 4000);
    return () => { ni.off("init", onInit); ni.off("login", onLogin); ni.off("logout", onLogout); clearTimeout(timeout); };
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
          <div style={{ fontSize: "14px", color: "#c8c4e8", fontFamily: "'DM Sans', system-ui, sans-serif", fontStyle: "italic" }}>Your story. Your signal.</div>
        </div>
        <div style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "16px", padding: "40px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#e8e4f8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "8px" }}>Sign in to continue</div>
          <div style={{ fontSize: "14px", color: "#6860a0", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.6", marginBottom: "32px" }}>Your profile, stories, and applications are private to your account.</div>
          <button onClick={() => window.netlifyIdentity?.open("login")} style={{ width: "100%", background: "#ffffff", color: "#1a1a2e", border: "none", borderRadius: "8px", padding: "13px 20px", fontSize: "15px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "12px" }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>
          <button onClick={() => window.netlifyIdentity?.open("login")} style={{ width: "100%", background: "transparent", color: "#a8a0c8", border: "1px solid #2e3050", borderRadius: "8px", padding: "13px 20px", fontSize: "15px", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            ✉ Continue with email
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. JD ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisModal({ score, rationale, gaps, onTrackBuildResume, onInterviewPrep, onCoverLetter, onTrackOnly, onCorrect, onNewJD, onDismiss }) {
  const verdict =
    score >= 8 ? { label: "Excellent Match 🎯", color: "#4ade80", rec: "Strong alignment. Your background fits the core mandate." } :
    score >= 6 ? { label: "Strong Contender ✅", color: "#fbbf24", rec: "Solid fit with room to sharpen your materials." } :
    score >= 4 ? { label: "Possible Fit 🤔",    color: "#fb923c", rec: "Transferable strengths. Review gaps before applying." } :
                 { label: "Tough Road Ahead 💪", color: "#f87171", rec: "Significant gaps. Correct any AI errors below." };
  return (
    <div onClick={onDismiss} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#181a2e", border: "1px solid rgba(100,100,200,0.25)", borderRadius: "14px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", padding: "32px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)", position: "relative" }}>
        <button onClick={onDismiss} style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", color: "#a0a0c0", fontSize: "15px" }}>✕</button>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "76px", fontWeight: 800, lineHeight: 1, color: verdict.color, letterSpacing: "-2px" }}>{score}<span style={{ fontSize: "28px", color: "#6060a0", fontWeight: 400 }}>/10</span></div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: verdict.color, marginTop: "8px" }}>{verdict.label}</div>
          <div style={{ fontSize: "13px", color: "#9890b8", marginTop: "6px", fontStyle: "italic" }}>{rationale}</div>
          <div style={{ fontSize: "13px", color: "#c8c4e8", marginTop: "8px", lineHeight: 1.6 }}>{verdict.rec}</div>
        </div>
        {gaps.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#8880b8", fontWeight: 600, marginBottom: "10px" }}>Gaps to Review ({gaps.length})</div>
            {gaps.map((gap, i) => (
              <div key={i} style={{ background: "#1e2035", border: "1px solid #2e3050", borderRadius: "7px", padding: "10px 14px", marginBottom: "7px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8e4f8", marginBottom: "3px" }}>{gap.title}</div>
                <div style={{ fontSize: "12px", color: "#9890b8", lineHeight: 1.55 }}>{gap.assessment}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={onTrackBuildResume} style={{ background: "#4f6ef7", color: "#fff", border: "none", borderRadius: "8px", padding: "14px 18px", fontSize: "14px", fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Track + Build Resume</span><span style={{ fontSize: "12px", opacity: 0.75 }}>Saves to card →</span>
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onInterviewPrep} style={{ flex: 1, background: "rgba(168,85,247,0.12)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "8px", padding: "11px 14px", fontSize: "13px", cursor: "pointer" }}>Interview Prep</button>
            <button onClick={onCoverLetter}   style={{ flex: 1, background: "rgba(20,184,166,0.10)", color: "#2dd4bf", border: "1px solid rgba(20,184,166,0.3)", borderRadius: "8px", padding: "11px 14px", fontSize: "13px", cursor: "pointer" }}>Cover Letter</button>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onTrackOnly}  style={{ flex: 1, background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", cursor: "pointer" }}>Track Only</button>
            <button onClick={onCorrect}    style={{ flex: 1, background: "rgba(74,222,128,0.06)", color: "#6ab8a8", border: "1px solid rgba(74,222,128,0.2)",  borderRadius: "8px", padding: "10px 14px", fontSize: "12px", cursor: "pointer" }}>Correct a Gap</button>
            <button onClick={onNewJD}      style={{ flex: 1, background: "transparent",            color: "#6a6880", border: "1px solid #2a2840",                borderRadius: "8px", padding: "10px 14px", fontSize: "12px", cursor: "pointer" }}>New JD</button>
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
      <div style={{ fontSize: "12px", color: "#8880b8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "16px" }}>Flag any gap the AI got wrong and explain why.</div>
      {local.map((gap, i) => (
        <div key={i} style={{ border: `1px solid ${gap.flagged ? "rgba(201,168,76,0.4)" : "#2e3050"}`, borderRadius: "6px", padding: "14px 16px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <button onClick={() => toggle(i)} style={{ background: gap.flagged ? "#c9a84c" : "transparent", border: `1px solid ${gap.flagged ? "#c9a84c" : "#6860a0"}`, borderRadius: "3px", width: "18px", height: "18px", cursor: "pointer", flexShrink: 0, marginTop: "2px", fontSize: "11px", color: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center" }}>{gap.flagged ? "✓" : ""}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#c0b0d8", fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: "3px" }}>{gap.title}</div>
              <div style={{ fontSize: "12px", color: "#4a4060", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: "1.5" }}>{gap.assessment}</div>
              {gap.flagged && (
                <div style={{ marginTop: "10px" }}>
                  <textarea value={gap.userCorrection} onChange={e => update(i, e.target.value)} placeholder="Explain why this is not actually a gap…" rows={3} style={{ ...S.textarea, border: "1px solid #c9a84c" }} />
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

function AnalyzeTab({ stories, corrections, onSaveCorrections, onTrackBuildResume, onTrackOnly, onNewJD, profile, onAddToTracker, onGoToInterviewPrep, onGoToCoverLetter }) {
  const session = useFitSession();
  const jd = session.jd;

  const [parsedScore, setParsedScore]         = useState(null);
  const [parsedRationale, setParsedRationale] = useState("");
  const [parsedGaps, setParsedGaps]           = useState([]);
  const [fullResult, setFullResult]           = useState("");
  const [loading, setLoading]                 = useState(false);
  const [reScoring, setReScoring]             = useState(false);
  const [error, setError]                     = useState(null);
  const [showModal, setShowModal]             = useState(false);
  const [showCorrections, setShowCorrections] = useState(false);
  const [showFull, setShowFull]               = useState(false);
  const apiLocked = useApiLock();

  function handleJdChange(val) {
    if (val !== jd) {
      wipeFitSession();
      setParsedScore(null); setParsedRationale(""); setParsedGaps([]); setFullResult(""); setShowModal(false); setShowFull(false);
    }
    const url = detectUrl(val);
    setFitSession({ jd: val, jdUrl: url });
  }

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
    const storyList = stories.length > 0 ? stories.map((s, i) => `${i + 1}. "${s.title}" — ${s.competencies?.join(", ")} | Result: ${s.result}`).join("\n") : "";
    const userCtx = stories.length > 0 ? `INTERVIEW STORIES:\n${storyList}\n\n` : "";
    const text = await callClaude(PROMPTS.jdAnalyzer(profile, stories, activeCorrections), `${userCtx}Job Description:\n${jd}`, 3000);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Could not parse analysis response");
    const p = JSON.parse(m[0]);
    setParsedScore(p.score); setParsedRationale(p.rationale); setParsedGaps(p.gaps || []);
    setFitSession({ company: p.company || "", role: p.role || "" });
    setFullResult(formatFull(p));
    return p;
  };

  const run = async () => {
    setLoading(true); setError(null); setShowFull(false); setShowModal(false);
    try { await runWithCorrections(corrections); setShowModal(true); }
    catch (e) { setError(`Analysis failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const handleSaveCorrections = async (nc) => {
    const merged = { ...corrections, ...nc };
    onSaveCorrections(merged); setShowCorrections(false); setReScoring(true);
    try { await runWithCorrections(merged); setShowModal(true); }
    catch (e) { setError(`Re-scoring failed: ${e.message}`); }
    finally { setReScoring(false); }
  };

  return (
    <div style={S.tab}>
      {showModal && (
        <AnalysisModal
          score={parsedScore} rationale={parsedRationale} gaps={parsedGaps}
          onTrackBuildResume={() => { setShowModal(false); setShowFull(true); onTrackBuildResume(session); }}
          onInterviewPrep={() => { setShowModal(false); onGoToInterviewPrep(); }}
          onCoverLetter={() => { setShowModal(false); onGoToCoverLetter(); }}
          onTrackOnly={() => { setShowModal(false); onTrackOnly(session); }}
          onCorrect={() => { setShowModal(false); setShowCorrections(true); }}
          onNewJD={() => { setShowModal(false); wipeFitSession(); setParsedScore(null); }}
          onDismiss={() => setShowModal(false)}
        />
      )}

      {!showModal && parsedScore !== null && !showCorrections && (
        <div onClick={() => setShowModal(true)} style={{ background: parsedScore >= 8 ? "rgba(74,222,128,0.08)" : parsedScore >= 6 ? "rgba(251,191,36,0.08)" : "rgba(248,113,113,0.08)", border: "1px solid rgba(100,100,200,0.2)", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px", fontWeight: 800, color: parsedScore >= 8 ? "#4ade80" : parsedScore >= 6 ? "#fbbf24" : "#f87171" }}>{parsedScore}/10</span>
            <span style={{ fontSize: "13px", color: "#c8c4e8" }}>{parsedRationale}</span>
          </div>
          <span style={{ fontSize: "11px", color: "#6a6880" }}>View →</span>
        </div>
      )}

      {reScoring && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#181a2e", borderRadius: "10px", padding: "32px 40px", textAlign: "center" }}>
            <Spinner size={24} /><div style={{ fontSize: "15px", fontWeight: 600, color: "#e8e4f8", marginTop: "12px" }}>Re-scoring…</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label style={S.label}>Job Description</label>
          {session.jdUrl && <a href={session.jdUrl} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#c9a84c", textDecoration: "none" }}>🔗 View Post ↗</a>}
        </div>
        <textarea value={jd} onChange={e => handleJdChange(e.target.value)} rows={8} placeholder="Paste the full job description here…" style={S.textarea} />
      </div>

      {Object.keys(corrections).length > 0 && (
        <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "4px", padding: "10px 14px", marginBottom: "12px", fontSize: "12px", color: "#8a7040", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✓ {Object.keys(corrections).length} gap correction{Object.keys(corrections).length > 1 ? "s" : ""} active</span>
          <button onClick={() => setShowCorrections(true)} style={{ background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: "12px" }}>View / edit</button>
        </div>
      )}

      <button onClick={run} disabled={!jd.trim() || loading || reScoring || apiLocked}
        style={{ ...S.btn, opacity: !jd.trim() || loading || reScoring || apiLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", width: "100%" }}>
        {loading ? <><Spinner /> Analyzing…</> : "Run Fit Check"}
      </button>

      {error && <div style={{ color: "#c06060", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
      {showCorrections && parsedGaps.length > 0 && <GapCorrectionPanel gaps={parsedGaps} corrections={corrections} onSave={handleSaveCorrections} onDone={() => setShowCorrections(false)} />}
      {showFull && fullResult && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ ...S.label, margin: 0 }}>Full Analysis</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={fullResult} />
              {parsedGaps.length > 0 && <button onClick={() => setShowCorrections(!showCorrections)} style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px", color: "#c9a84c" }}>Correct gaps</button>}
            </div>
          </div>
          <div style={S.resultBox}>{fullResult}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOARD / TRACKER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function RoleCard({ card, onClick }) {
  const sc = STAGE_COLORS[card.stage] || STAGE_COLORS.Considering;
  return (
    <div onClick={() => onClick(card)} style={{ background: "rgba(20,20,35,0.7)", border: `1px solid ${sc.border}`, borderRadius: "8px", padding: "14px 16px", marginBottom: "10px", cursor: "pointer", transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <div style={{ fontWeight: 600, fontSize: "14px", color: "#e8e6f0", lineHeight: 1.3, flex: 1, paddingRight: "8px" }}>{card.company || "New Role"}</div>
        <StagePill stage={card.stage} small />
      </div>
      <div style={{ fontSize: "12px", color: "#8a85a0", marginBottom: "8px" }}>{card.title || "Title TBD"}</div>
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        {card.jdUrl && <a href={card.jdUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: "10px", color: "#c9a84c", textDecoration: "none" }}>🔗 Post</a>}
        {card.resumeText && <span style={{ fontSize: "10px", color: "#4ade80", background: "rgba(74,222,128,0.08)", borderRadius: "3px", padding: "1px 5px" }}>Resume ✓</span>}
        {card.coverLetterText && <span style={{ fontSize: "10px", color: "#2dd4bf", background: "rgba(20,184,166,0.08)", borderRadius: "3px", padding: "1px 5px" }}>Cover ✓</span>}
      </div>
    </div>
  );
}

function PipelineStatsStrip({ cards: cardsProp }) {
  const cards = Array.isArray(cardsProp) ? cardsProp : [];
  const stageCount = STAGES.reduce((acc, s) => { acc[s] = cards.filter(c => c.stage === s).length; return acc; }, {});
  return (
    <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "14px" }}>
      {STAGES.map(stage => {
        const count = stageCount[stage] || 0;
        const sc = STAGE_COLORS[stage];
        return (
          <div key={stage} style={{ flexShrink: 0, textAlign: "center", minWidth: "58px", background: count > 0 ? sc.bg : "rgba(255,255,255,0.02)", border: `1px solid ${count > 0 ? sc.border : "#1a1830"}`, borderRadius: "6px", padding: "7px 6px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: count > 0 ? sc.text : "#2a2840", lineHeight: 1 }}>{count}</div>
            <div style={{ fontSize: "8px", color: count > 0 ? sc.text : "#2a2840", marginTop: "4px", letterSpacing: "0.03em", lineHeight: 1.2 }}>{stage}</div>
          </div>
        );
      })}
    </div>
  );
}

function Board({ cards: cardsProp, onCardClick, onAddCard, onExport }) {
  const cards = Array.isArray(cardsProp) ? cardsProp : [];
  const grouped = STAGES.reduce((acc, s) => { acc[s] = cards.filter(c => c.stage === s); return acc; }, {});
  const hasCards = cards.length > 0;
  return (
    <div>
      <PipelineStatsStrip cards={cards} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", color: "#3a3860" }}>{cards.length} role{cards.length !== 1 ? "s" : ""} tracked</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {hasCards && <button onClick={onExport} style={{ ...S.btnGhost, fontSize: "11px", padding: "5px 12px" }}>⬇ Export CSV</button>}
          <button onClick={onAddCard} style={{ ...S.btn, fontSize: "12px", padding: "6px 14px" }}>+ Add Role</button>
        </div>
      </div>
      {!hasCards && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#3a3860" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⬡</div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#4a4880", marginBottom: "8px" }}>No roles tracked yet</div>
          <div style={{ fontSize: "13px", marginBottom: "20px" }}>Paste a JD in Fit Check to analyze a role, or add one manually.</div>
          <button onClick={onAddCard} style={S.btn}>+ Add Role</button>
        </div>
      )}
      {hasCards && (
        <div style={{ overflowX: "auto", paddingBottom: "16px" }}>
          <div style={{ display: "flex", gap: "12px", minWidth: `${STAGES.length * 190}px` }}>
            {STAGES.map(stage => {
              const sc = STAGE_COLORS[stage];
              return (
                <div key={stage} style={{ flex: "0 0 180px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: sc.text, letterSpacing: "0.08em", textTransform: "uppercase" }}>{stage}</span>
                    <span style={{ fontSize: "10px", color: "#4a4860", background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "1px 6px" }}>{grouped[stage].length}</span>
                  </div>
                  {grouped[stage].map(card => <RoleCard key={card.id} card={card} onClick={onCardClick} />)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB SEARCH TAB
// ─────────────────────────────────────────────────────────────────────────────

async function scoreJobsAgainstProfile(jobs, profile) {
  if (!jobs.length || !profile.resumeText) return jobs.map(j => ({ ...j, fitScore: null }));
  const resumeSnip = getActiveResume(profile).slice(0, 800);
  const list = jobs.map((j, i) => `${i}. ${j.title} at ${j.company}: ${(j.snippet || "").slice(0, 150)}`).join("\n");
  const sys = `You score job fit for a senior transformation executive. Resume snippet: ${resumeSnip}`;
  const user = `Score each job 0-100 for fit. Return JSON array of numbers only, same order.\n${list}`;
  try {
    const raw = await callClaude(sys, user, 300);
    const scores = JSON.parse(raw.match(/\[.*\]/s)?.[0] || "[]");
    return jobs.map((j, i) => ({ ...j, fitScore: scores[i] ?? null }));
  } catch { return jobs.map(j => ({ ...j, fitScore: null })); }
}

function JobResultCard({ job, onAnalyze, onAddToTracker }) {
  const score = job.fitScore;
  const scoreColor = score >= 75 ? "#4ade80" : score >= 50 ? "#fbbf24" : score !== null ? "#f87171" : "#4a4860";
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState("");

  async function handleAnalyze() {
    setFetching(true); setFetchErr("");
    let fullJd = job.snippet || "";
    if (job.url) {
      try {
        const fetched = await callClaudeSearch(
          job.company,
          `Retrieve the full job description text from this URL: ${job.url}\nReturn only the raw job description text, no commentary.`
        );
        if (fetched && fetched.length > fullJd.length) fullJd = fetched;
      } catch { }
    }
    if (!fullJd) {
      setFetchErr("Couldn't fetch full JD — paste it manually in Fit Check.");
      setFetching(false); return;
    }
    setFetching(false);
    onAnalyze({ ...job, fullJd });
  }

  return (
    <div style={{ background: "rgba(20,20,35,0.7)", border: "1px solid #2a2840", borderRadius: "8px", padding: "14px 16px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "#e8e6f0" }}>{job.title}</div>
          <div style={{ fontSize: "12px", color: "#8a85a0", marginTop: "2px" }}>{job.company}{job.location ? ` · ${job.location}` : ""}</div>
        </div>
        {score !== null && (
          <div style={{ fontSize: "12px", fontWeight: 700, color: scoreColor, background: `${scoreColor}18`, border: `1px solid ${scoreColor}40`, borderRadius: "6px", padding: "3px 8px", flexShrink: 0 }}>{score}%</div>
        )}
      </div>
      {job.snippet && <div style={{ fontSize: "12px", color: "#6a6880", marginBottom: "8px", lineHeight: 1.5 }}>{job.snippet.slice(0, 180)}…</div>}
      {fetchErr && <div style={{ fontSize: "11px", color: "#c9a84c", marginBottom: "8px" }}>{fetchErr}</div>}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleAnalyze} disabled={fetching} style={{ ...S.btnSmall, opacity: fetching ? 0.6 : 1, display: "flex", gap: "4px", alignItems: "center" }}>
          {fetching ? <><Spinner size={11} /> Fetching JD…</> : "Analyze Fit"}
        </button>
        <button onClick={() => onAddToTracker(job)} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>+ Tracker</button>
        {job.url && <a href={job.url} target="_blank" rel="noreferrer" style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px", textDecoration: "none" }}>View ↗</a>}
      </div>
    </div>
  );
}

// State internalized — no longer passed as props
function JobSearchTab({ profile, onAnalyzeJob, onAddToTracker }) {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [scored, setScored] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (!query.trim()) return;
    setLoading(true); setError(""); setJobs([]); setScored(false);
    try {
      const results = await callClaudeSearch(`${query} ${location}`, `Find 8 real job postings for: ${query} in ${location}. Return JSON array with fields: title, company, location, snippet, url.`);
      let parsed = [];
      try { parsed = JSON.parse(results.match(/\[.*\]/s)?.[0] || "[]"); } catch {}
      const withScores = await scoreJobsAgainstProfile(parsed, profile);
      setJobs(withScores); setScored(true);
    } catch (e) { setError("Search failed. Check API key or try again."); }
    setLoading(false);
  }

  return (
    <div style={S.tab}>
      <div style={S.label}>Job Search</div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="Role title or keywords…" style={{ ...S.input, flex: 2, minWidth: "160px" }} />
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" style={{ ...S.input, flex: 1, minWidth: "100px" }} />
        <button onClick={search} disabled={loading || !query.trim()} style={{ ...S.btn, opacity: loading || !query.trim() ? 0.5 : 1 }}>
          {loading ? <><Spinner /> Searching…</> : "Search"}
        </button>
      </div>
      {error && <div style={{ color: "#c06060", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
      {jobs.length > 0 && (
        <>
          <div style={{ fontSize: "12px", color: "#4a4860", marginBottom: "12px" }}>{jobs.length} results{scored && profile.resumeText ? " · scored against your profile" : ""}</div>
          {jobs.map((job, i) => <JobResultCard key={i} job={job} onAnalyze={onAnalyzeJob} onAddToTracker={onAddToTracker} />)}
        </>
      )}
      {!loading && jobs.length === 0 && !error && (
        <div style={{ textAlign: "center", color: "#3a3860", fontSize: "13px", paddingTop: "40px" }}>Search for roles above to see AI-scored results.</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUME TAB
// ─────────────────────────────────────────────────────────────────────────────

function ResumeTab({ profile, card, jd, onSaveToCard }) {
  const [resumeType, setResumeType] = useState(card?.resumeType || "chronological");
  const [strategy, setStrategy] = useState("");
  const [finalResume, setFinalResume] = useState(card?.resumeText || "");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [blob, setBlob] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);

  const baseResume = getActiveResume(profile);
  const company = card?.company || "";
  const role = card?.title || "";
  const driveToken = getDriveToken(profile.email);

  async function run() {
    if (!baseResume) { setError("Upload a resume in Profile first."); return; }
    setLoading(true); setError(""); setStrategy(""); setFinalResume(""); setBlob(null); setPdfBlob(null); setFeedback("");
    try {
      setPhase("Building strategy…");
      const strat = await callClaude(PROMPTS.resumeStrategy(profile, resumeType), `JD:\n${jd || "(none)"}\n\nBase resume:\n${baseResume}`, 1200);
      setStrategy(strat);
      setPhase("Rendering resume…");
      const final = await buildFinalResumeText(baseResume, strat, jd, resumeType);
      setFinalResume(final);
      if (onSaveToCard) onSaveToCard(final, resumeType);
      setPhase("Building DOCX…");
      const b = await buildResumeDocxBlob(final, company, profile);
      setBlob(b);
      const pb = await buildPdfBlob(final);
      setPdfBlob(pb);
    } catch (e) { setError(String(e)); }
    setLoading(false); setPhase("");
  }

  async function refine() {
    if (!feedback.trim() || !finalResume) return;
    setRefining(true);
    try {
      const refined = await callClaude(
        `You are refining a resume. Apply the user's feedback precisely. Maintain all formatting rules, Hankel language, and ${resumeType} structure. Return only the revised resume text.`,
        `CURRENT RESUME:\n${finalResume}\n\nFEEDBACK TO APPLY:\n${feedback}`,
        2000
      );
      setFinalResume(refined);
      if (onSaveToCard) onSaveToCard(refined, resumeType);
      setFeedback("");
      const b = await buildResumeDocxBlob(refined, company, profile);
      setBlob(b);
      const pb = await buildPdfBlob(refined);
      setPdfBlob(pb);
    } catch (e) { setError(String(e)); }
    setRefining(false);
  }

  return (
    <div style={S.tab}>
      <div style={S.label}>Resume Format</div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {RESUME_TYPES.map(rt => (
          <button key={rt.id} onClick={() => setResumeType(rt.id)} style={{
            padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid",
            borderColor: resumeType === rt.id ? "#c9a84c" : "#2a2840",
            background: resumeType === rt.id ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
            color: resumeType === rt.id ? "#c9a84c" : "#6a6880",
          }}>
            {rt.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: "12px", color: "#6a6880", marginBottom: "20px", lineHeight: 1.5, padding: "10px 14px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "6px" }}>
        {RESUME_TYPES.find(r => r.id === resumeType)?.desc}
      </div>
      {company && <div style={{ fontSize: "12px", color: "#4a4860", marginBottom: "12px" }}>Target: <span style={{ color: "#8a85a0" }}>{role} @ {company}</span></div>}
      <button onClick={run} disabled={loading || !baseResume} style={{ ...S.btn, marginBottom: "20px", opacity: loading || !baseResume ? 0.5 : 1, display: "flex", alignItems: "center", gap: "8px" }}>
        {loading ? <><Spinner /> {phase}</> : `Build ${RESUME_TYPES.find(r => r.id === resumeType)?.label} Resume`}
      </button>
      {error && <div style={{ color: "#c06060", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
      {strategy && (
        <div style={{ ...S.section, marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={S.label}>Strategy</div>
            <CopyBtn text={strategy} />
          </div>
          <div style={{ ...S.resultBox, maxHeight: "200px", overflowY: "auto" }}>{strategy}</div>
        </div>
      )}
      {finalResume && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={S.label}>Final Resume</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <CopyBtn text={finalResume} />
              {blob && <SaveToDriveBtn blob={blob} filename={`Resume_${company || "Draft"}_${resumeType}.docx`} onSaved={() => setSaved(true)} disabled={!driveToken} />}
              {blob && (
                <button onClick={() => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = `Resume_${company || "Draft"}_${resumeType}.docx`; a.click(); }} style={S.btnGhost}>↓ DOCX</button>
              )}
              {pdfBlob && (
                <button onClick={() => { const u = URL.createObjectURL(pdfBlob); const a = document.createElement("a"); a.href = u; a.download = `Resume_${company || "Draft"}_${resumeType}.pdf`; a.click(); }} style={S.btnGhost}>↓ PDF</button>
              )}
            </div>
          </div>
          <div style={S.resultBox}>{finalResume}</div>
          {saved && <div style={{ fontSize: "11px", color: "#4ade80", marginTop: "8px" }}>✓ Saved to Google Drive</div>}
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #2a2840" }}>
            <div style={{ fontSize: "10px", color: "#4a4860", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Refine</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={feedback} onChange={e => setFeedback(e.target.value)} onKeyDown={e => e.key === "Enter" && refine()} placeholder="e.g. Make the opener more direct, add the $28M EBITDA number…" style={{ ...S.input, flex: 1, fontSize: "12px" }} />
              <button onClick={refine} disabled={refining || !feedback.trim()} style={{ ...S.btn, fontSize: "12px", padding: "8px 14px", opacity: refining || !feedback.trim() ? 0.5 : 1 }}>
                {refining ? <Spinner size={12} /> : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER LETTER TAB
// ─────────────────────────────────────────────────────────────────────────────

function CoverLetterTab({ profile, card, jd, onSaveToCard }) {
  const [letter, setLetter] = useState(card?.coverLetterText || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blob, setBlob] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [addedToCard, setAddedToCard] = useState(!!card?.coverLetterText);
  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);
  const driveToken = getDriveToken(profile.email);
  const company = card?.company || "";
  const role = card?.title || "";

  async function run() {
    const base = getActiveResume(profile);
    if (!base) { setError("Upload a resume in Profile first."); return; }
    setLoading(true); setError(""); setLetter(""); setBlob(null); setPdfBlob(null); setFeedback(""); setAddedToCard(false);
    try {
      const result = await callClaude(
        PROMPTS.coverLetter(profile, company, role, jd || ""),
        `Base resume:\n${base}\n\nJD:\n${jd || "(none)"}`,
        1000
      );
      setLetter(result);
      const b = await buildCoverLetterDocxBlob(result, company, role, profile);
      setBlob(b);
      const pb = await buildPdfBlob(result);
      setPdfBlob(pb);
    } catch (e) { setError(String(e)); }
    setLoading(false);
  }

  async function refine() {
    if (!feedback.trim() || !letter) return;
    setRefining(true);
    try {
      const refined = await callClaude(
        "You are refining a cover letter. Apply the user feedback precisely. Maintain high commitment signal, Hankel agreeableness language, and earned specificity. Return only the revised body paragraphs — no letterhead, no signature.",
        `CURRENT LETTER:\n${letter}\n\nFEEDBACK:\n${feedback}`,
        800
      );
      setLetter(refined);
      setFeedback("");
      if (addedToCard && onSaveToCard) onSaveToCard(refined);
      const b = await buildCoverLetterDocxBlob(refined, company, role, profile);
      setBlob(b);
      const pb = await buildPdfBlob(refined);
      setPdfBlob(pb);
    } catch (e) { setError(String(e)); }
    setRefining(false);
  }

  function addToCard() {
    if (onSaveToCard && letter) { onSaveToCard(letter); setAddedToCard(true); }
  }

  return (
    <div style={S.tab}>
      <div style={S.label}>Cover Letter</div>
      {company && <div style={{ fontSize: "12px", color: "#4a4860", marginBottom: "10px" }}>Target: <span style={{ color: "#8a85a0" }}>{role} @ {company}</span></div>}
      <div style={{ fontSize: "12px", color: "#6a6880", marginBottom: "14px", lineHeight: 1.5 }}>
        High commitment signal — frames this role as the destination, not a stepping stone.
      </div>
      <button onClick={run} disabled={loading} style={{ ...S.btn, marginBottom: "16px", opacity: loading ? 0.5 : 1, display: "flex", gap: "8px", alignItems: "center" }}>
        {loading ? <><Spinner /> Writing…</> : letter ? "Regenerate" : "Generate Cover Letter"}
      </button>
      {error && <div style={{ color: "#c06060", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
      {letter && (
        <div style={S.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
            <div style={S.label}>Output</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <CopyBtn text={letter} />
              {onSaveToCard && (
                <button onClick={addToCard} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px", color: addedToCard ? "#4ade80" : "#8880b8", borderColor: addedToCard ? "#4ade80" : undefined }}>
                  {addedToCard ? "✓ On Card" : "+ Add to Card"}
                </button>
              )}
              {blob && <SaveToDriveBtn blob={blob} filename={`CoverLetter_${company || "Draft"}.docx`} onSaved={() => {}} disabled={!driveToken} />}
              {blob && <button onClick={() => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = `CoverLetter_${company || "Draft"}.docx`; a.click(); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>↓ DOCX</button>}
              {pdfBlob && <button onClick={() => { const u = URL.createObjectURL(pdfBlob); const a = document.createElement("a"); a.href = u; a.download = `CoverLetter_${company || "Draft"}.pdf`; a.click(); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px" }}>↓ PDF</button>}
            </div>
          </div>
          <div style={S.resultBox}>{letter}</div>
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #2a2840" }}>
            <div style={{ fontSize: "10px", color: "#4a4860", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Refine</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={feedback} onChange={e => setFeedback(e.target.value)} onKeyDown={e => e.key === "Enter" && refine()} placeholder="e.g. Strengthen the second paragraph, reference their Series B…" style={{ ...S.input, flex: 1, fontSize: "12px" }} />
              <button onClick={refine} disabled={refining || !feedback.trim()} style={{ ...S.btn, fontSize: "12px", padding: "8px 14px", opacity: refining || !feedback.trim() ? 0.5 : 1 }}>
                {refining ? <Spinner size={12} /> : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERVIEW PREP TAB
// ─────────────────────────────────────────────────────────────────────────────

function CockpitView({ data }) {
  if (!data) return null;
  const d = data;
  const co = d.header?.company || "";

  function Section({ title, color = "#c9a84c", children }) {
    return (
      <div style={{ marginBottom: "4px" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "5px", paddingBottom: "3px", borderBottom: `1px solid ${color}30` }}>{title}</div>
        {children}
      </div>
    );
  }
  function Phrase({ text, color = "#c8c4e8" }) {
    return <div style={{ fontSize: "12px", color, lineHeight: 1.5, marginBottom: "3px" }}>{text}</div>;
  }
  function Bullet({ text, color = "#a0a0c0" }) {
    return <div style={{ fontSize: "11px", color, lineHeight: 1.5, marginBottom: "2px", paddingLeft: "10px" }}>{text}</div>;
  }
  function Cell({ children, style = {} }) {
    return (
      <div style={{ background: "rgba(20,20,38,0.8)", border: "1px solid #2a2850", borderRadius: "6px", padding: "12px 14px", ...style }}>
        {children}
      </div>
    );
  }
  function grid2(left, right) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
        {left}{right}
      </div>
    );
  }
  function grid3(a, b, c) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
        {a}{b}{c}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: "#1a237e", borderRadius: "6px", padding: "10px 14px", marginBottom: "8px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
          {[d.header?.name, co, d.header?.role, d.header?.round].filter(Boolean).join("  ·  ")}
        </div>
        {d.header?.logistics && <div style={{ fontSize: "11px", color: "#c5cae9", marginTop: "3px" }}>{d.header.logistics}</div>}
      </div>
      {grid2(
        <Cell>
          <Section title="Core Story">
            {(d.coreStory || []).map((s, i) => <Phrase key={i} text={s} color={i === 0 ? "#e8e6f0" : "#a0a0c0"} />)}
          </Section>
        </Cell>,
        <Cell>
          <Section title="Fit at a Glance">
            {(d.fitAtGlance?.strengths || []).map((s, i) => <Bullet key={i} text={"✅  " + s} color="#4ade80" />)}
            {(d.fitAtGlance?.gaps || []).map((g, i) => <Bullet key={i} text={"⚠️  " + g} color="#fbbf24" />)}
          </Section>
        </Cell>
      )}
      {d.objection?.concern && grid2(
        <Cell>
          <Section title={d.objection.concern} color="#f87171">
            <Phrase text="Answer like someone who has already decided — not debating." color="#888" />
            {(d.objection.doNotSay || []).map((s, i) => <Bullet key={i} text={"❌  " + s} color="#f87171" />)}
          </Section>
        </Cell>,
        <Cell>
          <Section title="Say This" color="#60a5fa">
            <Phrase text={d.objection.sayThis || ""} color="#e8e6f0" />
          </Section>
        </Cell>
      )}
      {(d.competencyGrid || []).length > 0 && grid3(
        ...(d.competencyGrid || []).slice(0, 3).map((col, i) => (
          <Cell key={i}>
            <Section title={col.label || ""} color="#c084fc">
              {(col.bullets || []).map((b, j) => <Bullet key={j} text={b} />)}
            </Section>
          </Cell>
        ))
      )}
      {grid2(
        <Cell>
          <Section title="Tell Me About Yourself"><Phrase text={d.openerLeft?.tellMeAboutYourself || ""} /></Section>
          <Section title={"Why " + (co || "This Company")}><Phrase text={d.openerLeft?.whyCompany || ""} /></Section>
          <Section title="Partnership Angle"><Phrase text={d.openerLeft?.partnershipAngle || ""} /></Section>
        </Cell>,
        <Cell>
          <Section title="Governance Philosophy"><Phrase text={d.openerRight?.governancePhilosophy || ""} /></Section>
          <Section title="Key Experience"><Phrase text={d.openerRight?.keyExperience || ""} /></Section>
          <Section title="Your Search"><Phrase text={d.openerRight?.frameYourSearch || ""} /></Section>
        </Cell>
      )}
      <div style={{ background: "#1a237e", borderRadius: "4px", padding: "6px 14px", marginBottom: "8px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#c5cae9", letterSpacing: "0.1em" }}>
          PAGE 2  ·  {(d.header?.name || "").toUpperCase()}  ·  {co.toUpperCase()} SCREEN
        </span>
      </div>
      {grid2(
        <Cell>
          <Section title={d.domainGap?.label || "Domain Gap"} color="#fb923c">
            {(d.domainGap?.bullets || []).map((b, i) => <Bullet key={i} text={b} color="#fb923c" />)}
          </Section>
          <div style={{ marginTop: "8px" }}>
            <Section title="Watch These" color="#f87171">
              {(d.watchThese || []).map((w, i) => <Bullet key={i} text={(w.toLowerCase().startsWith("do not") ? "❌  " : "") + w} color="#f87171" />)}
            </Section>
          </div>
        </Cell>,
        <Cell>
          <Section title="30 / 60 / 90" color="#4ade80">
            {d.thirtysixtynety?.thirty && <>
              <Phrase text={"30 — " + (d.thirtysixtynety.thirty[0] || "")} color="#4ade80" />
              {(d.thirtysixtynety.thirty.slice(1) || []).map((b, i) => <Bullet key={i} text={b} />)}
            </>}
            {d.thirtysixtynety?.sixty && <>
              <Phrase text={"60 — " + (d.thirtysixtynety.sixty[0] || "")} color="#34d399" />
              {(d.thirtysixtynety.sixty.slice(1) || []).map((b, i) => <Bullet key={i} text={b} />)}
            </>}
            {d.thirtysixtynety?.ninety && <>
              <Phrase text={"90 — " + (d.thirtysixtynety.ninety[0] || "")} color="#2dd4bf" />
              {(d.thirtysixtynety.ninety.slice(1) || []).map((b, i) => <Bullet key={i} text={b} />)}
            </>}
          </Section>
        </Cell>
      )}
      {grid3(
        <Cell>
          <Section title="Top Questions to Ask" color="#60a5fa">
            {(d.questions || []).map((q, i) => <Bullet key={i} text={q} color="#93c5fd" />)}
          </Section>
        </Cell>,
        <Cell>
          <Section title="Close Strong" color="#4ade80">
            {(d.closeStrong || []).map((c, i) => <Bullet key={i} text={c} color="#86efac" />)}
          </Section>
        </Cell>,
        <Cell>
          <Section title="Positioning — Hold This Frame" color="#c084fc">
            {(d.positioningFrame || []).map((p, i) => <Bullet key={i} text={p} color="#d8b4fe" />)}
          </Section>
          <div style={{ marginTop: "8px", padding: "8px 10px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "4px" }}>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#c9a84c", letterSpacing: "0.1em", marginBottom: "4px" }}>THE REMINDER</div>
            <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 600, lineHeight: 1.5 }}>{d.reminder || ""}</div>
          </div>
        </Cell>
      )}
    </div>
  );
}

function InterviewPrepTab({ profile, card, jd, stories }) {
  const [prepData, setPrepData] = useState(null);
  const [rawText, setRawText]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [depth, setDepth]       = useState("recruiter");
  const [blob, setBlob]         = useState(null);
  const [pdfBlob, setPdfBlob]   = useState(null);
  const driveToken = getDriveToken(profile.email);

  const company = card?.company || "";
  const role    = card?.title   || "";

  function prepToText(d) {
    if (!d) return "";
    const lines = [];
    lines.push([d.header?.name, d.header?.company, d.header?.role, d.header?.round].filter(Boolean).join("  |  "));
    if (d.header?.logistics) lines.push(d.header.logistics);
    lines.push("\nCORE STORY");
    (d.coreStory || []).forEach(s => lines.push("  " + s));
    lines.push("\nFIT AT A GLANCE");
    (d.fitAtGlance?.strengths || []).forEach(s => lines.push("  ✅  " + s));
    (d.fitAtGlance?.gaps || []).forEach(g => lines.push("  ⚠️  " + g));
    if (d.objection?.concern) {
      lines.push("\n" + d.objection.concern);
      (d.objection.doNotSay || []).forEach(s => lines.push("  ❌  " + s));
      lines.push("  SAY: " + (d.objection.sayThis || ""));
    }
    lines.push("\nCOMPETENCY GRID");
    (d.competencyGrid || []).forEach(col => { lines.push("  " + col.label); (col.bullets || []).forEach(b => lines.push("    - " + b)); });
    lines.push("\nTELL ME ABOUT YOURSELF: " + (d.openerLeft?.tellMeAboutYourself || ""));
    lines.push("WHY " + (d.header?.company || "COMPANY") + ": " + (d.openerLeft?.whyCompany || ""));
    lines.push("\nGOVERNANCE PHILOSOPHY: " + (d.openerRight?.governancePhilosophy || ""));
    lines.push("KEY EXPERIENCE: " + (d.openerRight?.keyExperience || ""));
    lines.push("YOUR SEARCH: " + (d.openerRight?.frameYourSearch || ""));
    lines.push("\n--- PAGE 2 ---");
    lines.push("\n" + (d.domainGap?.label || "DOMAIN GAP"));
    (d.domainGap?.bullets || []).forEach(b => lines.push("  - " + b));
    lines.push("\nWATCH THESE");
    (d.watchThese || []).forEach(w => lines.push("  ❌  " + w));
    lines.push("\n30 / 60 / 90");
    const ttt = d.thirtysixtynety || {};
    ["thirty", "sixty", "ninety"].forEach(k => (ttt[k] || []).forEach((b, i) => lines.push("  " + (i === 0 ? (k === "thirty" ? "30" : k === "sixty" ? "60" : "90") + " — " : "    ") + b)));
    lines.push("\nTOP QUESTIONS TO ASK");
    (d.questions || []).forEach(q => lines.push("  - " + q));
    lines.push("\nCLOSE STRONG");
    (d.closeStrong || []).forEach(c => lines.push("  - " + c));
    lines.push("\nPOSITIONING — HOLD THIS FRAME");
    (d.positioningFrame || []).forEach(p => lines.push("  - " + p));
    lines.push("\nTHE REMINDER\n" + (d.reminder || ""));
    return lines.join("\n");
  }

  async function run() {
    const base = getActiveResume(profile);
    if (!base && !jd) { setError("Add a resume or JD first."); return; }
    setLoading(true); setError(""); setPrepData(null); setRawText(""); setBlob(null); setPdfBlob(null);
    try {
      const raw = await callClaude(
        PROMPTS.interviewPrep(profile, stories, depth),
        `Company: ${company}\nRole: ${role}\nJD:\n${jd || "(none)"}\nResume:\n${(base || "").slice(0, 1400)}`,
        2400
      );
      const cleaned = raw.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Response was not valid JSON. Try again.");
      const parsed = JSON.parse(jsonMatch[0]);
      setPrepData(parsed);
      const txt = prepToText(parsed);
      setRawText(txt);
      const db = await buildPrepCockpitDocx(parsed, profile);
      setBlob(db);
      const pb = await buildPdfBlob(txt);
      setPdfBlob(pb);
    } catch (e) { setError(String(e)); }
    setLoading(false);
  }

  const depthLabels = { recruiter: "Recruiter Screen", behavioral: "Behavioral", technical: "Technical/Deep", executive: "Executive" };
  const filename = `PrepDoc_${company || "Draft"}_${depthLabels[depth] || depth}`;

  return (
    <div style={S.tab}>
      <div style={S.label}>Interview Prep</div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {Object.entries(depthLabels).map(([v, l]) => (
          <button key={v} onClick={() => setDepth(v)} style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", border: "1px solid", fontWeight: depth === v ? 700 : 400, borderColor: depth === v ? "#c9a84c" : "#2a2840", background: depth === v ? "rgba(201,168,76,0.1)" : "transparent", color: depth === v ? "#c9a84c" : "#6a6880" }}>{l}</button>
        ))}
      </div>
      {company && <div style={{ fontSize: "12px", color: "#4a4860", marginBottom: "14px" }}>Target: <span style={{ color: "#8a85a0" }}>{role} @ {company}</span></div>}
      <button onClick={run} disabled={loading} style={{ ...S.btn, marginBottom: "20px", opacity: loading ? 0.5 : 1, display: "flex", gap: "8px", alignItems: "center" }}>
        {loading ? <><Spinner /> Building cockpit…</> : `Generate ${depthLabels[depth]} Cockpit`}
      </button>
      {error && <div style={{ color: "#c06060", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
      {prepData && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", padding: "10px 14px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "#c9a84c", fontWeight: 600 }}>↓ Download for the call</span>
            {blob && <button onClick={() => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = `${filename}.docx`; a.click(); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 12px" }}>DOCX</button>}
            {pdfBlob && <button onClick={() => { const u = URL.createObjectURL(pdfBlob); const a = document.createElement("a"); a.href = u; a.download = `${filename}.pdf`; a.click(); }} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 12px" }}>PDF</button>}
            {blob && <SaveToDriveBtn blob={blob} filename={`${filename}.docx`} onSaved={() => {}} disabled={!driveToken} />}
            <div style={{ marginLeft: "auto" }}><CopyBtn text={rawText} /></div>
          </div>
          <CockpitView data={prepData} />
        </>
      )}
      {!prepData && !loading && (
        <div style={{ textAlign: "center", color: "#3a3860", fontSize: "13px", paddingTop: "30px" }}>
          Select your interview round above, then generate your cockpit.
          <div style={{ fontSize: "11px", color: "#2a2850", marginTop: "6px" }}>Structured for scanning during live calls. Downloads as a 2-page Word table.</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEARCH TAB
// ─────────────────────────────────────────────────────────────────────────────

function ResearchTab({ profile, card }) {
  const company = card?.company || "";
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState("");

  async function runStep(step) {
    if (!company) { setError("No company set on this role card."); return; }
    setLoading(p => ({ ...p, [step.key]: true })); setError("");
    try {
      const r = await callClaudeSearch(company, step.query(company));
      setResults(p => ({ ...p, [step.key]: r }));
    } catch (e) { setError(String(e)); }
    setLoading(p => ({ ...p, [step.key]: false }));
  }

  async function runAll() {
    for (const step of RESEARCH_STEPS) { await runStep(step); }
  }

  const allSteps = [...RESEARCH_STEPS, ...OPTIONAL_STEPS];

  return (
    <div style={S.tab}>
      <div style={S.label}>Company Research</div>
      {!company ? (
        <div style={{ color: "#4a4860", fontSize: "13px" }}>Set a company name on the role card first.</div>
      ) : (
        <>
          <div style={{ fontSize: "13px", color: "#8a85a0", marginBottom: "16px" }}>Researching: <strong style={{ color: "#c9a84c" }}>{company}</strong></div>
          <button onClick={runAll} disabled={Object.values(loading).some(Boolean)} style={{ ...S.btn, marginBottom: "20px", opacity: Object.values(loading).some(Boolean) ? 0.5 : 1 }}>
            Run All Core Research
          </button>
          {error && <div style={{ color: "#c06060", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
          {allSteps.map(step => (
            <div key={step.key} style={{ ...S.section, marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#8a85a0" }}>{step.label}</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {results[step.key] && <CopyBtn text={results[step.key]} />}
                  <button onClick={() => runStep(step)} disabled={loading[step.key]} style={{ ...S.btnGhost, fontSize: "11px", padding: "4px 10px", opacity: loading[step.key] ? 0.5 : 1 }}>
                    {loading[step.key] ? <Spinner size={12} /> : results[step.key] ? "Refresh" : "Run"}
                  </button>
                </div>
              </div>
              {results[step.key] && <div style={{ ...S.resultBox, fontSize: "12px" }}>{results[step.key]}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORIES
// ─────────────────────────────────────────────────────────────────────────────

function StoryCard({ story, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "rgba(20,20,35,0.7)", border: "1px solid #2a2840", borderRadius: "8px", padding: "14px 16px", marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
          <div style={{ fontWeight: 600, fontSize: "13px", color: "#e8e6f0", marginBottom: "4px" }}>{story.hook || "Untitled story"}</div>
          <div style={{ fontSize: "11px", color: "#4a4860" }}>{story.tags?.join(" · ")}</div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => onEdit(story)} style={{ ...S.btnGhost, fontSize: "11px", padding: "3px 8px" }}>Edit</button>
          <button onClick={() => onDelete(story.id)} style={{ ...S.btnGhost, fontSize: "11px", padding: "3px 8px", color: "#8a4040" }}>✕</button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #2a2840" }}>
          {story.situation && <div style={{ marginBottom: "8px" }}><span style={{ fontSize: "10px", color: "#4a4860", textTransform: "uppercase" }}>Situation</span><div style={{ fontSize: "12px", color: "#8a85a0", marginTop: "4px" }}>{story.situation}</div></div>}
          {story.task && <div style={{ marginBottom: "8px" }}><span style={{ fontSize: "10px", color: "#4a4860", textTransform: "uppercase" }}>Task</span><div style={{ fontSize: "12px", color: "#8a85a0", marginTop: "4px" }}>{story.task}</div></div>}
          {story.action && <div style={{ marginBottom: "8px" }}><span style={{ fontSize: "10px", color: "#4a4860", textTransform: "uppercase" }}>Action</span><div style={{ fontSize: "12px", color: "#8a85a0", marginTop: "4px" }}>{story.action}</div></div>}
          {story.result && <div><span style={{ fontSize: "10px", color: "#4a4860", textTransform: "uppercase" }}>Result</span><div style={{ fontSize: "12px", color: "#8a85a0", marginTop: "4px" }}>{story.result}</div></div>}
        </div>
      )}
    </div>
  );
}

function StoryEditor({ story, onSave, onCancel }) {
  const [form, setForm] = useState(story || { id: generateId(), hook: "", situation: "", task: "", action: "", result: "", tags: [] });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div style={{ ...S.section, padding: "16px" }}>
      <div style={{ ...S.label, marginBottom: "14px" }}>{story ? "Edit Story" : "New Story"}</div>
      {["hook", "situation", "task", "action", "result"].map(k => (
        <div key={k} style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: "#4a4860", textTransform: "uppercase", marginBottom: "4px" }}>{k === "hook" ? "Hook (proof+potential bridge)" : k}</div>
          <textarea value={form[k]} onChange={set(k)} rows={k === "hook" ? 2 : 3} style={{ ...S.input, width: "100%", resize: "vertical" }} placeholder={k === "hook" ? "[Achieved X], which positions me to [future capability]" : ""} />
        </div>
      ))}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => onSave(form)} style={S.btn}>Save</button>
        <button onClick={onCancel} style={S.btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

function MyStoriesTab({ profile, stories: storiesProp, setStories }) {
  const stories = Array.isArray(storiesProp) ? storiesProp : [];
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [extracting, setExtracting] = useState(false);

  function save(story) {
    setStories(prev => prev.find(s => s.id === story.id) ? prev.map(s => s.id === story.id ? story : s) : [...prev, story]);
    setEditing(null); setAdding(false);
  }
  function remove(id) { setStories(prev => prev.filter(s => s.id !== id)); }

  async function extract() {
    const base = getActiveResume(profile);
    if (!base) return;
    setExtracting(true);
    try {
      const raw = await callClaude(PROMPTS.storyExtract(profile), `Resume:\n${base}`, 2000);
      let parsed = [];
      try { parsed = JSON.parse(raw.match(/\[.*\]/s)?.[0] || "[]"); } catch {}
      const newStories = parsed.map(s => ({ ...s, id: s.id || generateId() }));
      setStories(prev => [...prev, ...newStories]);
    } catch {}
    setExtracting(false);
  }

  return (
    <div style={S.tab}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={S.label}>My Stories</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={extract} disabled={extracting} style={{ ...S.btnGhost, fontSize: "11px", opacity: extracting ? 0.5 : 1 }}>
            {extracting ? <><Spinner size={11} /> Extracting…</> : "Extract from Resume"}
          </button>
          <button onClick={() => setAdding(true)} style={{ ...S.btn, fontSize: "11px", padding: "5px 12px" }}>+ New</button>
        </div>
      </div>
      {adding && <StoryEditor onSave={save} onCancel={() => setAdding(false)} />}
      {editing && <StoryEditor story={editing} onSave={save} onCancel={() => setEditing(null)} />}
      {stories.length === 0 && !adding && (
        <div style={{ textAlign: "center", color: "#3a3860", fontSize: "13px", paddingTop: "30px" }}>No stories yet. Extract from your resume or add manually.</div>
      )}
      {stories.filter(s => s.id !== editing?.id).map(s => <StoryCard key={s.id} story={s} onEdit={setEditing} onDelete={remove} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE & ONBOARDING
// ─────────────────────────────────────────────────────────────────────────────

function ResumeVariantManager({ profile, setProfile }) {
  const [name, setName] = useState("");

  function addVariant() {
    if (!name.trim()) return;
    const v = { id: generateId(), name: name.trim(), text: profile.resumeText, createdAt: getToday() };
    setProfile(p => ({ ...p, resumeVariants: [...(p.resumeVariants || []), v], activeResumeId: v.id }));
    setName("");
  }
  function activate(id) { setProfile(p => ({ ...p, activeResumeId: id })); }
  function remove(id) {
    setProfile(p => ({ ...p, resumeVariants: p.resumeVariants.filter(v => v.id !== id), activeResumeId: p.activeResumeId === id ? null : p.activeResumeId }));
  }

  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ fontSize: "12px", color: "#6a6880", marginBottom: "10px" }}>Resume Variants</div>
      {(profile.resumeVariants || []).map(v => (
        <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(20,20,35,0.5)", border: `1px solid ${v.id === profile.activeResumeId ? "#c9a84c" : "#2a2840"}`, borderRadius: "6px", marginBottom: "6px" }}>
          <span style={{ fontSize: "12px", color: v.id === profile.activeResumeId ? "#c9a84c" : "#8a85a0" }}>{v.name}</span>
          <div style={{ display: "flex", gap: "6px" }}>
            {v.id !== profile.activeResumeId && <button onClick={() => activate(v.id)} style={{ ...S.btnGhost, fontSize: "10px", padding: "2px 8px" }}>Activate</button>}
            <button onClick={() => remove(v.id)} style={{ ...S.btnGhost, fontSize: "10px", padding: "2px 8px", color: "#8a4040" }}>✕</button>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Variant name (e.g. VP Tech)" style={{ ...S.input, flex: 1, fontSize: "12px" }} />
        <button onClick={addVariant} disabled={!name.trim()} style={{ ...S.btnGhost, fontSize: "11px", opacity: name.trim() ? 1 : 0.5 }}>Save Variant</button>
      </div>
    </div>
  );
}

function ProfileTab({ profile, setProfile }) {
  const [resumeText, setResumeText] = useState(profile.resumeText || "");
  const [extracting, setExtracting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith(".docx")) {
      try {
        const buf = await file.arrayBuffer();
        const text = await extractDocxText(buf);
        setResumeText(text);
      } catch (err) {
        console.error("DOCX parse error:", err);
      }
    } else {
      const reader = new FileReader();
      reader.onload = ev => setResumeText(ev.target.result);
      reader.readAsText(file);
    }
  }

  async function saveProfile() {
    setExtracting(true);
    let contact = {};
    if (resumeText && !profile.name) {
      try { contact = await extractContactFromResume(resumeText); } catch {}
    }
    const stripped = stripPreIntelRoles(resumeText);
    setProfile(p => ({ ...p, resumeText: stripped, resumeUploaded: true, ...contact }));
    setSaved(true);
    setExtracting(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields = [
    ["name", "Full Name"], ["email", "Email"], ["phone", "Phone"],
    ["address", "Location"], ["linkedin", "LinkedIn URL"], ["website", "Website"],
  ];

  return (
    <div style={S.tab}>
      <div style={S.label}>Profile</div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "12px", color: "#6a6880", marginBottom: "8px" }}>Career Tier</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[["student","Student"],["midlevel","Mid-Level"],["senior","Senior"],["executive","Executive"]].map(([v, l]) => (
            <button key={v} onClick={() => setProfile(p => ({ ...p, profileTier: v }))} style={{ padding: "5px 12px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", border: "1px solid", borderColor: profile.profileTier === v ? "#c9a84c" : "#2a2840", background: profile.profileTier === v ? "rgba(201,168,76,0.1)" : "transparent", color: profile.profileTier === v ? "#c9a84c" : "#6a6880" }}>{l}</button>
          ))}
        </div>
      </div>
      {fields.map(([k, l]) => (
        <div key={k} style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: "#4a4860", marginBottom: "4px" }}>{l}</div>
          <input value={profile[k] || ""} onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))} style={{ ...S.input, width: "100%" }} />
        </div>
      ))}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", color: "#4a4860", marginBottom: "4px" }}>Professional Summary (optional)</div>
        <textarea value={profile.background || ""} onChange={e => setProfile(p => ({ ...p, background: e.target.value }))} rows={4} style={{ ...S.input, width: "100%", resize: "vertical" }} placeholder="Additional context for AI (achievements, target roles, constraints)…" />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", color: "#4a4860", marginBottom: "8px" }}>Resume Text</div>
        <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={8} style={{ ...S.input, width: "100%", resize: "vertical", fontSize: "11px" }} placeholder="Paste resume text here, or upload a file below…" />
        <input type="file" accept=".txt,.md,.docx,.pdf" onChange={handleFile} style={{ marginTop: "8px", fontSize: "11px", color: "#6a6880" }} />
        <div style={{ fontSize: "10px", color: "#3a3860", marginTop: "4px" }}>Accepts .docx, .txt, .md, or .pdf. Pre-Intel roles (Proudcloud, Bookmans) are automatically stripped.</div>
      </div>
      <button onClick={saveProfile} disabled={extracting} style={{ ...S.btn, display: "flex", gap: "8px", alignItems: "center", opacity: extracting ? 0.5 : 1 }}>
        {extracting ? <><Spinner /> Extracting contact…</> : "Save Profile"}
      </button>
      {saved && <div style={{ fontSize: "11px", color: "#4ade80", marginTop: "8px" }}>✓ Profile saved</div>}
      <ResumeVariantManager profile={profile} setProfile={setProfile} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────

function WhatYouSent({ card, onClose }) {
  const [view, setView] = useState(card.resumeText ? "resume" : "cover");
  if (!card.resumeText && !card.coverLetterText) return null;
  return (
    <div style={{ background: "rgba(10,10,24,0.98)", borderBottom: "1px solid #1a1830", padding: "12px 20px", flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#c9a84c", letterSpacing: "0.1em", textTransform: "uppercase" }}>What You Sent</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a4860", fontSize: "12px", cursor: "pointer" }}>hide ↑</button>
      </div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        {card.resumeText && <button onClick={() => setView("resume")} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "4px", border: "1px solid", borderColor: view === "resume" ? "#4ade80" : "#2a2840", background: view === "resume" ? "rgba(74,222,128,0.1)" : "transparent", color: view === "resume" ? "#4ade80" : "#6a6880", cursor: "pointer" }}>Resume{card.resumeType ? ` (${card.resumeType})` : ""}</button>}
        {card.coverLetterText && <button onClick={() => setView("cover")} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "4px", border: "1px solid", borderColor: view === "cover" ? "#2dd4bf" : "#2a2840", background: view === "cover" ? "rgba(20,184,166,0.1)" : "transparent", color: view === "cover" ? "#2dd4bf" : "#6a6880", cursor: "pointer" }}>Cover Letter</button>}
        <CopyBtn text={view === "resume" ? card.resumeText : card.coverLetterText} />
      </div>
      <div style={{ fontSize: "11px", color: "#8a85a0", whiteSpace: "pre-wrap", maxHeight: "140px", overflowY: "auto", lineHeight: 1.6, background: "rgba(20,20,35,0.5)", borderRadius: "6px", padding: "10px 12px" }}>
        {view === "resume" ? card.resumeText : card.coverLetterText}
      </div>
    </div>
  );
}

function RoleWorkspace({ card, cards, setCards, profile, stories, onClose }) {
  const [activeTab, setActiveTab] = useState("resume");
  const [jd, setJd] = useState(card.jd || "");
  const [showSent, setShowSent] = useState(true);

  const liveCard = cards.find(c => c.id === card.id) || card;
  const hasSent = liveCard.resumeText || liveCard.coverLetterText;

  function updateCard(updates) {
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, ...updates } : c));
  }

  useEffect(() => {
    const url = detectUrl(jd);
    updateCard({ jd, ...(url ? { jdUrl: url } : {}) });
  }, [jd]);

  function onSaveResume(resumeText, resumeType) { updateCard({ resumeText, resumeType }); }
  function onSaveCoverLetter(coverLetterText) { updateCard({ coverLetterText }); }

  const TABS = [
    { id: "resume",   label: "Resume" },
    { id: "cover",    label: "Cover Letter" },
    { id: "prep",     label: "Interview Prep" },
    { id: "research", label: "Research" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,8,20,0.98)", zIndex: 200, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px 10px", borderBottom: "1px solid #1a1830", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <input value={liveCard.company || ""} onChange={e => updateCard({ company: e.target.value })} placeholder="Company" style={{ background: "transparent", border: "none", color: "#e8e6f0", fontSize: "15px", fontWeight: 700, outline: "none", minWidth: "80px", maxWidth: "160px" }} />
              <span style={{ color: "#3a3860" }}>·</span>
              <input value={liveCard.title || ""} onChange={e => updateCard({ title: e.target.value })} placeholder="Title" style={{ background: "transparent", border: "none", color: "#8a85a0", fontSize: "13px", outline: "none", minWidth: "80px", maxWidth: "200px" }} />
              {liveCard.jdUrl && <a href={liveCard.jdUrl} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#c9a84c", textDecoration: "none", flexShrink: 0 }}>🔗 Post ↗</a>}
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "8px", overflowX: "auto", paddingBottom: "2px" }}>
              {STAGES.map(s => (
                <button key={s} onClick={() => updateCard({ stage: s })} style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "10px", border: "1px solid", cursor: "pointer", flexShrink: 0, borderColor: liveCard.stage === s ? STAGE_COLORS[s].border : "#2a2840", background: liveCard.stage === s ? STAGE_COLORS[s].bg : "transparent", color: liveCard.stage === s ? STAGE_COLORS[s].text : "#3a3860" }}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginLeft: "12px" }}>
            {hasSent && <button onClick={() => setShowSent(v => !v)} style={{ fontSize: "10px", color: "#c9a84c", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "4px", padding: "3px 8px", cursor: "pointer" }}>What I Sent</button>}
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#6a6880", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>
      </div>
      {hasSent && showSent && <WhatYouSent card={liveCard} onClose={() => setShowSent(false)} />}
      <div style={{ padding: "8px 20px", borderBottom: "1px solid #1a1830", flexShrink: 0 }}>
        <textarea value={jd} onChange={e => setJd(e.target.value)} rows={2} placeholder="Paste job description here… (URL auto-detected)" style={{ ...S.input, width: "100%", fontSize: "11px", resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid #1a1830", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: "10px 4px", background: "none", border: "none", borderBottom: activeTab === t.id ? "2px solid #c9a84c" : "2px solid transparent", color: activeTab === t.id ? "#c9a84c" : "#4a4860", fontSize: "11px", cursor: "pointer", fontWeight: activeTab === t.id ? 700 : 400 }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "resume"   && <ResumeTab profile={profile} card={liveCard} jd={jd} onSaveToCard={onSaveResume} />}
        {activeTab === "cover"    && <CoverLetterTab profile={profile} card={liveCard} jd={jd} onSaveToCard={onSaveCoverLetter} />}
        {activeTab === "prep"     && <InterviewPrepTab profile={profile} card={liveCard} jd={jd} stories={stories} />}
        {activeTab === "research" && <ResearchTab profile={profile} card={liveCard} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAWER NAV
// ─────────────────────────────────────────────────────────────────────────────

function DrawerNav({ active, onChange, onClose, user }) {
  const items = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "tracker",   icon: "⬡", label: "Tracker" },
    { id: "search",    icon: "⌕", label: "Search" },
    { id: "analyze",   icon: "✦", label: "Fit Check" },
    { id: "stories",   icon: "◈", label: "Stories" },
    { id: "prep",      icon: "◎", label: "Interview Prep" },
    { id: "profile",   icon: "◉", label: "Profile" },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 150 }} />
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "260px", background: "#0c0e1e", borderRight: "1px solid #1a1830", zIndex: 151, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid #1a1830", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "0.06em", color: "#c9a84c" }}>NARRATIVE<span style={{ color: "#4a4860" }}>OS</span></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#4a4860", fontSize: "16px", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ flex: 1, paddingTop: "8px", overflowY: "auto" }}>
          {items.map(item => (
            <button key={item.id} onClick={() => { onChange(item.id); onClose(); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "14px", padding: "13px 20px",
              background: active === item.id ? "rgba(201,168,76,0.08)" : "none", border: "none",
              borderLeft: `3px solid ${active === item.id ? "#c9a84c" : "transparent"}`,
              color: active === item.id ? "#c9a84c" : "#6a6880",
              fontSize: "14px", fontFamily: "'DM Sans', system-ui, sans-serif", cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ fontSize: "16px", width: "22px", textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1a1830" }}>
          <div style={{ fontSize: "11px", color: "#3a3860", marginBottom: "6px" }}>{user?.email}</div>
          <button onClick={() => window.netlifyIdentity?.logout()} style={{ fontSize: "11px", color: "#4a4060", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Sign out</button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COACHING NUDGE
// ─────────────────────────────────────────────────────────────────────────────

function CoachingNudge({ cards: cardsProp, stories: storiesProp, profile }) {
  const cards = Array.isArray(cardsProp) ? cardsProp : [];
  const stories = Array.isArray(storiesProp) ? storiesProp : [];
  const [nudge, setNudge] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current || !ANTHROPIC_API_KEY) return;
    fetched.current = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const stageSummary = STAGES.map(s => `${s}: ${cards.filter(c => c.stage === s).length}`).join(", ");
        const ctx = `Active applications: ${cards.filter(c => c.stage !== "Rejected").length}. Stages: ${stageSummary}. Stories written: ${stories.length}. Resume uploaded: ${profile.resumeUploaded ? "yes" : "no"}. Profile complete: ${profile.name && profile.resumeText ? "yes" : "no"}.`;
        const raw = await callClaude(
          "You are a NarrativeOS guide. Based on the user's current app activity data, suggest ONE specific next action they should take inside NarrativeOS. Reference app features by name: Fit Check, Tracker, Stories, Profile, Search, Interview Prep. Focus on what is most useful right now. Never give generic job search advice — only NarrativeOS-specific guidance. 1-2 sentences maximum.",
          ctx, 120
        );
        setNudge(raw.trim());
      } catch { setNudge(null); }
      setLoading(false);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  if (!loading && !nudge) return null;
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "8px", padding: "12px 14px" }}>
      <span style={{ fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>💡</span>
      {loading
        ? <span style={{ fontSize: "12px", color: "#4a4060", fontStyle: "italic" }}>Reading your pipeline…</span>
        : <span style={{ fontSize: "12px", color: "#c9a84c", lineHeight: 1.6 }}>{nudge}</span>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab({ cards: cardsProp, stories: storiesProp, profile, onNavigate }) {
  const cards = Array.isArray(cardsProp) ? cardsProp : [];
  const stories = Array.isArray(storiesProp) ? storiesProp : [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile.displayName || profile.name?.split(" ")[0] || "";
  const stageCount = STAGES.reduce((acc, s) => { acc[s] = cards.filter(c => c.stage === s).length; return acc; }, {});
  const appliedCount = cards.filter(c => !["Considering","Rejected"].includes(c.stage)).length;
  const inProgressCount = cards.filter(c => ["Screening","Hiring Manager","Panel","Exec"].includes(c.stage)).length;
  const hasResume = !!profile.resumeUploaded || !!profile.resumeText;
  const activeVariant = profile.resumeVariants?.find(v => v.id === profile.activeResumeId);

  return (
    <div style={{ padding: "20px 16px 8px", maxWidth: "540px", margin: "0 auto" }}>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "20px", fontWeight: 700, color: "#e8e6f0", lineHeight: 1.2 }}>
          {greeting}{firstName ? `, ${firstName}` : ""}.
        </div>
        <div style={{ fontSize: "12px", color: "#3a3860", marginTop: "4px" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <CoachingNudge cards={cards} stories={stories} profile={profile} />
      </div>

      {/* Amber alert: no resume on file */}
      {!hasResume && (
        <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: "8px", padding: "12px 16px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#c9a84c" }}>No resume on file</div>
              <div style={{ fontSize: "11px", color: "#7a6030", marginTop: "2px" }}>Resume is required for Fit Check, interview prep, and story extraction.</div>
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onNavigate("profile"); }} style={{ background: "#c9a84c", color: "#0f1117", border: "none", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Upload
          </button>
        </div>
      )}

      {/* Pipeline widget */}
      <div onClick={() => onNavigate("tracker")}
        style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#4f6ef7", letterSpacing: "0.1em", textTransform: "uppercase" }}>Pipeline</span>
          <span style={{ fontSize: "10px", color: "#3a3860" }}>Open Tracker →</span>
        </div>
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
          {STAGES.map(stage => {
            const count = stageCount[stage] || 0;
            const sc = STAGE_COLORS[stage];
            return (
              <div key={stage} style={{ flexShrink: 0, textAlign: "center", minWidth: "52px", background: count > 0 ? sc.bg : "rgba(255,255,255,0.02)", border: `1px solid ${count > 0 ? sc.border : "#1a1830"}`, borderRadius: "6px", padding: "7px 6px" }}>
                <div style={{ fontSize: "17px", fontWeight: 700, color: count > 0 ? sc.text : "#2a2840", lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: "8px", color: count > 0 ? sc.text : "#2a2840", marginTop: "4px", letterSpacing: "0.03em", lineHeight: 1.2 }}>{stage}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        {[
          { label: "Applied",  value: appliedCount,    color: "#fbbf24" },
          { label: "Active",   value: inProgressCount, color: "#4ade80" },
          { label: "Stories",  value: stories.length,  color: "#c084fc" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "8px", padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: "9px", color: "#3a3860", marginTop: "5px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#4f6ef7", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>Quick Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { label: "Search for Roles",  sub: "Find and score opportunities",                                         nav: "search",  icon: "⌕", warn: false },
            { label: "Fit Check a JD",    sub: "Paste a JD and score your fit",                                        nav: "analyze", icon: "✦", warn: false },
            { label: "Add a Story",       sub: `${stories.length} stor${stories.length === 1 ? "y" : "ies"} in library`, nav: "stories", icon: "◈", warn: stories.length === 0 },
            { label: "Update Profile",    sub: hasResume ? "Resume on file" : "No resume yet — add one",               nav: "profile", icon: "◉", warn: !hasResume },
          ].map(a => (
            <button key={a.nav} onClick={() => onNavigate(a.nav)} style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "10px",
              background: a.warn ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${a.warn ? "rgba(201,168,76,0.18)" : "#222040"}`,
              borderRadius: "7px", cursor: "pointer", textAlign: "left", width: "100%",
            }}>
              <span style={{ fontSize: "15px", width: "20px", textAlign: "center", color: a.warn ? "#c9a84c" : "#4a4860" }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: a.warn ? "#c9a84c" : "#c0bce0" }}>{a.label}</div>
                <div style={{ fontSize: "10px", color: a.warn ? "#7a6030" : "#3a3860", marginTop: "2px" }}>{a.sub}</div>
              </div>
              <span style={{ fontSize: "11px", color: "#2a2840" }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active resume strip */}
      <div style={{ background: "#181a2e", border: "1px solid #2e3050", borderRadius: "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "9px", color: "#3a3860", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active Resume</div>
          <div style={{ fontSize: "12px", color: hasResume ? "#8a85a0" : "#4a4060", marginTop: "2px" }}>
            {hasResume ? (activeVariant?.name || "Base Resume") : "None uploaded"}
          </div>
        </div>
        <button onClick={() => onNavigate("profile")} style={{ ...S.btnGhost, fontSize: "10px", padding: "3px 10px" }}>Manage →</button>
      </div>
    </div>
  );
}

// Interview Prep standalone — routes to Tracker to pick a card
function InterviewPrepStandalone({ onNavigate }) {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "28px", marginBottom: "12px", color: "#3a3860" }}>◎</div>
      <div style={{ fontSize: "16px", fontWeight: 600, color: "#c8c4e8", marginBottom: "8px" }}>Interview Prep</div>
      <div style={{ fontSize: "13px", color: "#4a4860", lineHeight: 1.7, marginBottom: "24px" }}>
        Prep is launched from a specific role card.<br />Open a card in the Tracker to start your cockpit.
      </div>
      <button onClick={() => onNavigate("tracker")} style={S.btn}>Go to Tracker →</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function NarrativeOS() {
  const { user, loading: authLoading } = useNetlifyAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState(() => {
    try { const s = storageGet("nos_profile"); return s ? { ...DEFAULT_PROFILE, ...s } : DEFAULT_PROFILE; } catch { return DEFAULT_PROFILE; }
  });
  const [cards, setCards] = useState(() => {
    try { const v = storageGet("nos_cards"); return Array.isArray(v) ? v : []; } catch { return []; }
  });
  const [stories, setStories] = useState(() => {
    try { const v = storageGet("nos_stories"); return Array.isArray(v) ? v : []; } catch { return []; }
  });
  const [openCard, setOpenCard] = useState(null);
  const cost = useSessionCost();
  const apiLocked = useApiLock();

  useEffect(() => { storageSet("nos_profile", profile); }, [profile]);
  useEffect(() => { storageSet("nos_cards", cards); }, [cards]);
  useEffect(() => { storageSet("nos_stories", stories); }, [stories]);

  function makeCard(overrides = {}) {
    return { id: generateId(), company: "", title: "", stage: "Considering", jd: "", jdUrl: "", tags: [], notes: "", resumeText: "", coverLetterText: "", resumeType: "", createdAt: getToday(), ...overrides };
  }

  function addCard() {
    const c = makeCard();
    setCards(prev => [c, ...prev]);
    setOpenCard(c);
  }

  function handleTrackBuildResume(session) {
    const existing = cards.find(c => c.company === session.company && c.stage !== "Rejected");
    if (existing) {
      setOpenCard({ ...existing, stage: existing.stage === "Considering" ? "Applied" : existing.stage });
    } else {
      const c = makeCard({ company: session.company || "", title: session.role || "", stage: "Applied", jd: session.jd, jdUrl: session.jdUrl });
      setCards(prev => [c, ...prev]);
      setOpenCard(c);
    }
  }

  function handleTrackOnly(session) {
    const existing = cards.find(c => c.company === session.company && c.stage !== "Rejected");
    if (!existing) {
      const c = makeCard({ company: session.company || "", title: session.role || "", stage: "Applied", jd: session.jd, jdUrl: session.jdUrl });
      setCards(prev => [c, ...prev]);
    }
    setActiveTab("tracker");
  }

  function handleAddToTracker(job) {
    const exists = cards.find(c => c.company === job.company && c.title === job.title);
    if (!exists) {
      const c = makeCard({ company: job.company || "", title: job.title || "", stage: "Considering", notes: job.snippet || "", jdUrl: job.url || "" });
      setCards(prev => [c, ...prev]);
    }
    setActiveTab("tracker");
  }

  function handleGoToInterviewPrep() { setActiveTab("tracker"); }
  function handleGoToCoverLetter() { setActiveTab("tracker"); }

  if (authLoading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#080814", color: "#3a3860" }}><Spinner size={24} /></div>;
  if (!user) return <LoginGate />;

  return (
    <div style={{ background: "#080814", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e8e6f0" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 10px", borderBottom: "1px solid #1a1830", position: "sticky", top: 0, background: "rgba(8,8,20,0.95)", zIndex: 50, backdropFilter: "blur(8px)" }}>
        <button onClick={() => setDrawerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ display: "block", width: "18px", height: "2px", background: "#6a6880", borderRadius: "1px" }} />
          <span style={{ display: "block", width: "18px", height: "2px", background: "#6a6880", borderRadius: "1px" }} />
          <span style={{ display: "block", width: "13px", height: "2px", background: "#6a6880", borderRadius: "1px" }} />
        </button>
        <div style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "0.06em", color: "#c9a84c" }}>NARRATIVE<span style={{ color: "#4a4860" }}>OS</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {apiLocked && <span style={{ fontSize: "10px", color: "#c9a84c", background: "rgba(201,168,76,0.1)", padding: "2px 8px", borderRadius: "10px" }}>⏳</span>}
          {cost > 0 && <span style={{ fontSize: "10px", color: "#3a3860" }}>${cost.toFixed(4)}</span>}
          {user && (
            <div title={user.email} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#c9a84c", flexShrink: 0, cursor: "default", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {(user.email || "?")[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && <DrawerNav active={activeTab} onChange={setActiveTab} onClose={() => setDrawerOpen(false)} user={user} />}

      {/* Main content */}
      <div style={{ paddingBottom: "20px" }}>
        {activeTab === "dashboard" && (
          <DashboardTab cards={cards} stories={stories} profile={profile} onNavigate={setActiveTab} />
        )}
        {activeTab === "tracker" && (
          <div style={{ padding: "16px 16px 0" }}>
            <Board cards={cards} onCardClick={c => setOpenCard(c)} onAddCard={addCard} onExport={() => exportTrackerXlsx(cards)} />
          </div>
        )}
        {activeTab === "search" && (
          <JobSearchTab
            profile={profile}
            onAnalyzeJob={job => { setFitSession({ jd: job.snippet || "", jdUrl: job.url || "" }); setActiveTab("analyze"); }}
            onAddToTracker={handleAddToTracker}
          />
        )}
        {activeTab === "analyze" && (
          <AnalyzeTab
            stories={stories}
            corrections={{}}
            onSaveCorrections={() => {}}
            onTrackBuildResume={handleTrackBuildResume}
            onTrackOnly={handleTrackOnly}
            onNewJD={() => wipeFitSession()}
            profile={profile}
            onAddToTracker={handleAddToTracker}
            onGoToInterviewPrep={handleGoToInterviewPrep}
            onGoToCoverLetter={handleGoToCoverLetter}
          />
        )}
        {activeTab === "stories" && <MyStoriesTab profile={profile} stories={stories} setStories={setStories} />}
        {activeTab === "profile" && <ProfileTab profile={profile} setProfile={setProfile} />}
        {activeTab === "prep"    && <InterviewPrepStandalone onNavigate={setActiveTab} />}
      </div>

      {openCard && (
        <RoleWorkspace
          card={openCard}
          cards={cards}
          setCards={setCards}
          profile={profile}
          stories={stories}
          onClose={() => setOpenCard(null)}
        />
      )}
    </div>
  );
}
