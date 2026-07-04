# NarrativeOS — Project Instructions for Claude Code

## What This App Is
NarrativeOS is a React/Vite job search application Scott built and uses personally. It tailors resumes and cover letters to specific job descriptions using the Anthropic API.

**Stack:**
- React + Vite (frontend)
- Netlify (hosting + serverless functions)
- Netlify Identity (OAuth/auth)
- `localStorage` for all persistent state
- Anthropic API via Netlify Function

**Repo:** github.com/Spr0/NarrativeOS

---

## Developer Preferences — Read First

- **Whole-file replacements over patch scripts.** When modifying an existing file, rewrite the full file. Do not use partial patches or multi-step str_replace sequences on large files.
- **Never rename or restructure localStorage keys.** Append new fields to existing record shapes only — do not break existing records.
- **Read the full existing file before modifying it.** Especially for the main Netlify Function — understand what's there before touching it.
- **Never hardcode model names.** All Netlify Functions must read the model from `process.env.ANTHROPIC_MODEL`. When building the request body always use: `model: process.env.ANTHROPIC_MODEL`. Do not supply a fallback default — if the env var is missing, let it fail loudly so it's caught in config, not silently in production.
- **No em dashes** in any generated text output or UI copy.
- Contact header always uses: `Bellingham, WA`

---

## Active Development: 5 Improvements

These are in priority order. Complete them sequentially — each depends on the previous.

---

### 1. Claim Level on Story Objects (do first)

Add a `claimLevel` field to each STAR story in localStorage. This is referenced by all subsequent changes.

**Valid values:** `"owned"` | `"co-led"` | `"supported"` | `"contributed"`

**Default for existing stories:** `"owned"` — Scott's six core proof points are all direct ownership.

**Story shape addition:**
```js
{
  id: "cd3-portfolio",
  title: "CD3 Portfolio Rationalization",
  claimLevel: "owned",   // new field
  // ... all existing fields unchanged
}
```

**UI:** Add a `claimLevel` dropdown to the story editor component. Options: Owned / Co-Led / Supported / Contributed.

**Inject into scoring prompt** as a verb discipline table:
```
VERB DISCIPLINE — enforce strictly, no exceptions:

| Claim Level | Allowed Lead Verbs                          | Never Use                        |
|-------------|---------------------------------------------|----------------------------------|
| owned       | Led, Drove, Owned, Delivered, Architected   | Contributed to, Assisted, Helped |
| co-led      | Co-led, Partnered, Collaborated             | Led, Owned, Drove solo           |
| supported   | Supported, Contributed, Assisted            | Led, Owned, Drove                |
| contributed | Contributed, Participated                   | Led, Owned, Drove, Co-led        |

STORY CLAIM LEVELS:
${stories.map(s => `- ${s.title}: ${s.claimLevel}`).join('\n')}
```

---

### 2. Role-Type Bundles

Add a `src/data/roleBundles.js` file and integrate bundle detection into the scoring engine prompt.

**File: `src/data/roleBundles.js`**
```js
export const ROLE_BUNDLES = {
  transformation: {
    label: "Director/VP — Transformation & Change",
    positioningStrategy: "Lead with portfolio rationalization scale and measurable EBITDA/cost outcomes. Frame technology as an enabler of business transformation, not an end in itself.",
    summaryGuide: "Open with scope (number of initiatives, dollar value, org size). Follow with the transformation method. Close with the outcome metric.",
    achievementPriority: [
      "CD3 portfolio rationalization — $28M EBITDA, 73→15 initiatives",
      "ERP replacement — $6.8M, 18 months, 40% financial close reduction",
      "AI contract automation — $2M annualized EBITDA",
      "Digital Catalog — $13M spend mapped, reduced to $11M",
      "RPA strategy — $4.8M SG&A reduction"
    ],
    leadSkills: ["Portfolio Management", "P&L Ownership", "Agile Transformation", "Stakeholder Influence"],
    clKeywords: ["transformation", "portfolio", "EBITDA", "rationalization", "cost reduction"],
    antiPatterns: ["avoid leading with tools/tech stack", "don't open with team size alone"]
  },
  technology_leadership: {
    label: "VP/Director — Technology Leadership",
    positioningStrategy: "Lead with P&L ownership and full-stack technology accountability. Emphasize build/buy/partner decisions and enterprise architecture outcomes.",
    summaryGuide: "Open with P&L scope and org size. Follow with the technology transformation angle. Close with a business outcome.",
    achievementPriority: [
      "ERP replacement — $6.8M, Snowflake/Tableau/Sigma, 40% financial close reduction",
      "Digital Catalog — $13M software spend rationalized",
      "CD3 portfolio rationalization — $28M EBITDA",
      "AI contract automation — $2M annualized EBITDA",
      "RPA strategy — $4.8M SG&A reduction"
    ],
    leadSkills: ["P&L Ownership", "Enterprise Architecture", "Cloud/Data Platforms", "Vendor Management"],
    clKeywords: ["technology strategy", "digital transformation", "architecture", "platform", "data"],
    antiPatterns: ["avoid framing as pure PM role", "don't omit P&L ownership"]
  },
  portfolio_pmo: {
    label: "Director — Portfolio / PMO",
    positioningStrategy: "Lead with portfolio scale and the rationalization/prioritization method. Emphasize governance, Cost of Delay thinking, and measurable throughput improvements.",
    summaryGuide: "Open with portfolio scale (# initiatives, $ value). Follow with the governance/prioritization method. Close with delivery outcome or EBITDA impact.",
    achievementPriority: [
      "CD3 portfolio rationalization — 73→15 initiatives, $28M EBITDA",
      "ERP replacement — on-time, on-budget delivery",
      "Stakeholder influence — converted resistant VP",
      "Digital Catalog — portfolio visibility from scratch",
      "AI contract automation — initiative delivery, $2M outcome"
    ],
    leadSkills: ["Portfolio Governance", "Cost of Delay / CD3", "Agile at Scale", "Executive Reporting"],
    clKeywords: ["portfolio", "governance", "prioritization", "PMO", "delivery"],
    antiPatterns: ["don't lead with tech stack", "avoid underselling P&L experience"]
  }
};

export function detectBundle(jdText) {
  const jd = jdText.toLowerCase();
  if (/transformation|change management|organizational/.test(jd)) return "transformation";
  if (/chief technology|vp.{0,10}technology|cto|technology leadership/.test(jd)) return "technology_leadership";
  if (/portfolio|pmo|program management office|governance/.test(jd)) return "portfolio_pmo";
  return "transformation"; // default
}

export function buildBundlePromptBlock(bundle) {
  return `
ROLE BUNDLE: ${bundle.label}
POSITIONING STRATEGY: ${bundle.positioningStrategy}
SUMMARY GUIDE: ${bundle.summaryGuide}
ACHIEVEMENT PRIORITY ORDER:
${bundle.achievementPriority.map((a, i) => `${i + 1}. ${a}`).join('\n')}
LEAD SKILLS: ${bundle.leadSkills.join(', ')}
ANTI-PATTERNS TO AVOID: ${bundle.antiPatterns.join('; ')}
`.trim();
}
```

**Scoring engine integration:**
1. Call `detectBundle(jdText)` before building the prompt
2. Look up the bundle in `ROLE_BUNDLES`
3. Call `buildBundlePromptBlock(bundle)` and inject the result into the system prompt, before the FACT LOCK block
4. Store the detected bundle key (`"transformation"`, etc.) in the application's localStorage record as `detectedBundle`

---

### 3. AI Fingerprint Check

Add `src/utils/fingerprintCheck.js` and integrate into the post-generation UI.

**File: `src/utils/fingerprintCheck.js`**
```js
const BANNED_WORDS = [
  "utilize", "leverage", "spearhead", "spearheaded",
  "dynamic", "robust", "innovative", "synergy", "synergize",
  "impactful", "results-driven", "proven track record",
  "passionate about", "detail-oriented", "thought leader",
  "game-changer", "move the needle", "best-in-class",
  "holistic", "cutting-edge", "best practices"
];

const WEAK_PHRASES = [
  { pattern: /\bwas responsible for\b/i, label: 'Weak phrasing: "was responsible for"' },
  { pattern: /\bhelped to\b/i, label: 'Weak phrasing: "helped to"' },
  { pattern: /\bassisted (in|with)\b/i, label: 'Weak phrasing: "assisted in/with"' },
];

export function fingerprintCheck(text) {
  const warnings = [];

  BANNED_WORDS.forEach(word => {
    if (text.toLowerCase().includes(word)) {
      warnings.push(`Banned word: "${word}"`);
    }
  });

  WEAK_PHRASES.forEach(({ pattern, label }) => {
    if (pattern.test(text)) warnings.push(label);
  });

  // Repetitive verb detection
  const bullets = text.split('\n').filter(l => /^[•\-]/.test(l.trim()));
  const verbs = bullets.map(b => b.trim().replace(/^[•\-]\s*/, '').split(' ')[0].toLowerCase());
  const verbCounts = verbs.reduce((acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }), {});
  Object.entries(verbCounts).forEach(([verb, count]) => {
    if (count >= 3) warnings.push(`Repetitive verb: "${verb}" used ${count} times`);
  });

  const score = Math.max(0, 100 - warnings.length * 10);

  return { passed: warnings.length === 0, score, warningCount: warnings.length, warnings };
}
```

**UI integration:**
- After generation completes, run `fingerprintCheck(generatedText)`
- If `warningCount > 0`, show a collapsible warning panel with the list
- Add `fingerprintScore` as a dimension in the existing score display (label: "AI Fingerprint", score out of 100)

---

### 4. Decision Log

Add a `decisionLog` array to each application record. Use the helper below to write log entries at key moments.

**Helper: `src/utils/decisionLog.js`**
```js
const STORAGE_KEY = 'narrativeos_applications'; // use whatever key the app already uses

export function logDecision(applicationId, event, value, detail = null) {
  const apps = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const app = apps.find(a => a.id === applicationId);
  if (!app) return;

  if (!app.decisionLog) app.decisionLog = [];
  app.decisionLog.push({
    timestamp: new Date().toISOString(),
    event,   // string: "bundle_detected" | "stories_ranked" | "generation_complete" | "fingerprint_check"
    value,   // any serializable value
    detail   // optional string
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}
```

**Log these events:**

| When | Event | Value |
|------|-------|-------|
| Bundle detected | `bundle_detected` | bundle key (e.g., `"transformation"`) |
| Stories ranked for prompt | `stories_ranked` | array of story IDs in order |
| Generation API call returns | `generation_complete` | `{ tokenCount, model }` |
| Fingerprint check runs | `fingerprint_check` | `{ warningCount, warnings }` |
| Critique runs | `critique_complete` | `{ totalScore, interviewLikelihood }` |

**UI:** Add a collapsible "Decision Log" section to the application detail view. Display as a simple timeline — timestamp + event label + detail. Read-only, no editing.

---

### 5. Critique Mode (Netlify Function)

Create a separate Netlify Function for critique. Do NOT add this to the existing generation function — keep contexts separate.

**File: `netlify/functions/critique.js`**

```js
const CRITIQUE_SYSTEM_PROMPT = `You are an independent resume reviewer with no knowledge of how this resume was generated.
Evaluate the resume against the job description from five reader perspectives.
Return ONLY valid JSON — no preamble, no markdown fences, no explanation.

JSON structure:
{
  "totalScore": <number 0-100>,
  "personas": {
    "ATS_BOT": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "RECRUITER_10S": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "HR_SCREEN_30S": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "HIRING_MANAGER": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "TECHNICAL_REVIEWER": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" }
  },
  "topFixes": ["<fix 1 — highest point impact>", "<fix 2>", "<fix 3>"],
  "interviewLikelihood": "<Low|Medium|High> — <one sentence rationale>"
}

PERSONAS:
- ATS_BOT: Keyword match against JD. Does structure allow parsing? (score 0-20)
- RECRUITER_10S: 10-second scan — does the summary and first bullet earn a longer read? (score 0-20)
- HR_SCREEN_30S: 30-second read — is level/scope clear? Does it fit the role band? (score 0-20)
- HIRING_MANAGER: Full read — are outcomes credible and specific? Any red flags? (score 0-20)
- TECHNICAL_REVIEWER: Are tools, methods, and scale claims internally consistent? (score 0-20)`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { resumeText, jdText } = JSON.parse(event.body);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: CRITIQUE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `JOB DESCRIPTION:\n${jdText}\n\n---\n\nRESUME:\n${resumeText}`
          }
        ]
      })
    });

    const data = await response.json();
    const raw = data.content[0].text;

    const parsed = JSON.parse(raw);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Critique failed', detail: err.message })
    };
  }
};
```

**UI:**
- Add a "Run Critique" button that appears after a resume is generated
- Button calls `/netlify/functions/critique` with `{ resumeText, jdText }`
- Display results as a score card: total score, persona breakdown (score + top gap), top 3 fixes, interview likelihood
- Collapsed by default; expandable per persona
- Log result with `logDecision(appId, 'critique_complete', { totalScore, interviewLikelihood })`

---

## Proof Point Reference (do not modify or fabricate)

| ID | Story | Claim Level | Key Metric |
|----|-------|-------------|------------|
| cd3 | CD3 Portfolio Rationalization — EDF | owned | $28M annualized EBITDA; 73→15 initiatives |
| erp | ERP Replacement — CCR | owned | $6.8M; 18 months; 40% financial close reduction |
| ai-contract | AI Contract Automation | owned | $2M annualized EBITDA |
| digital-catalog | Digital Catalog — CCR | owned | $13M mapped; reduced to $11M |
| rpa | RPA Strategy | owned | $4.8M SG&A reduction |
| stakeholder | Resistant VP Conversion | owned | converted strongest opponent into strongest advocate |

P&L framing: Scott owned **full P&L** at both CCR and EDF — budget ownership, revenue forecasting, margin management, board/C-suite financial reporting. Never reduce this to "delivery budget oversight."

---

## Output Rules

- Contact header: `Scott Henderson | Bellingham, WA`
- No em dashes anywhere in output
- Tone: direct, professionally warm, not effusive
- No first-person pronouns in resume bullets
- No filler qualifiers: "successfully," "effectively," "seamlessly"
