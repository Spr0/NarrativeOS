# NarrativeOS — Resume Kit Improvements
## Implementation Spec for Claude Code

---

## Project Context

**NarrativeOS** is a React/Vite job search application hosted on Netlify, using:
- Netlify Identity for OAuth/auth
- `localStorage` for all persistent state
- Anthropic API via a Netlify Function (`/netlify/functions/claude.js` or similar)
- Existing scoring engine with FACT LOCK hallucination guards and a `prepContext` positioning field

This spec adds 5 improvements derived from analyzing the `claude-resume-kit` architecture. They are ordered by implementation priority. **Do not refactor existing code unless a change requires it.** Prefer whole-file replacements over patch scripts.

---

## Change 1: Role-Type Bundles

### What & Why
The scoring engine currently infers positioning from the JD alone. Role-type bundles provide a pre-defined positioning strategy per target role archetype — the JD confirms which bundle to use, but the bundle drives what leads.

### Data Structure
Add a `ROLE_BUNDLES` constant (can live in `src/data/roleBundles.js` or inline in the scoring utility):

```js
export const ROLE_BUNDLES = {
  "transformation": {
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
  "technology_leadership": {
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
  "portfolio_pmo": {
    label: "Director — Portfolio / PMO",
    positioningStrategy: "Lead with the scale of portfolio managed and the rationalization/prioritization method. Emphasize governance, Cost of Delay thinking, and measurable throughput improvements.",
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
```

### Scoring Engine Integration
When generating a resume or cover letter, detect the best-fit bundle from the JD before building the prompt:

```js
function detectBundle(jdText) {
  const jd = jdText.toLowerCase();
  if (/transformation|change management|organizational/.test(jd)) return "transformation";
  if (/chief technology|vp.{0,10}technology|cto|technology leadership/.test(jd)) return "technology_leadership";
  if (/portfolio|pmo|program management office|governance/.test(jd)) return "portfolio_pmo";
  return "transformation"; // default fallback
}
```

Inject the matched bundle into the system prompt:

```
ROLE BUNDLE: ${bundle.label}
POSITIONING STRATEGY: ${bundle.positioningStrategy}
SUMMARY GUIDE: ${bundle.summaryGuide}
ACHIEVEMENT PRIORITY ORDER:
${bundle.achievementPriority.map((a, i) => `${i + 1}. ${a}`).join('\n')}
LEAD SKILLS: ${bundle.leadSkills.join(', ')}
ANTI-PATTERNS TO AVOID: ${bundle.antiPatterns.join('; ')}
```

Store the detected bundle name in the application's localStorage record (e.g., `detectedBundle: "transformation"`).

---

## Change 2: AI Fingerprint Check

### What & Why
A post-generation scan that flags output likely to read as AI-written. Surfaces as a warning in the UI, not a blocking error.

### Implementation
Add a `fingerprintCheck(text)` utility function:

```js
export function fingerprintCheck(text) {
  const warnings = [];

  const bannedWords = [
    "utilize", "leverage", "spearhead", "spearheaded",
    "dynamic", "robust", "innovative", "synergy", "synergize",
    "impactful", "results-driven", "proven track record",
    "passionate about", "detail-oriented", "thought leader",
    "game-changer", "move the needle", "best-in-class",
    "holistic", "cutting-edge", "best practices"
  ];

  bannedWords.forEach(word => {
    if (text.toLowerCase().includes(word)) {
      warnings.push(`Banned word: "${word}"`);
    }
  });

  // Structural tells
  const bullets = text.split('\n').filter(l => l.trim().startsWith('•') || l.trim().startsWith('-'));
  const verbStarts = bullets.map(b => b.trim().replace(/^[•\-]\s*/, '').split(' ')[0].toLowerCase());
  const verbCounts = verbStarts.reduce((acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }), {});
  Object.entries(verbCounts).forEach(([verb, count]) => {
    if (count >= 3) warnings.push(`Repetitive verb: "${verb}" used ${count} times`);
  });

  // Passive voice tells
  if (/\bwas responsible for\b/i.test(text)) warnings.push('Weak phrasing: "was responsible for"');
  if (/\bhelped to\b/i.test(text)) warnings.push('Weak phrasing: "helped to"');
  if (/\bassisted (in|with)\b/i.test(text)) warnings.push('Weak phrasing: "assisted in/with"');

  return {
    passed: warnings.length === 0,
    warningCount: warnings.length,
    warnings
  };
}
```

### UI Integration
After generation, run the check and display a collapsible warning panel if `warningCount > 0`:

```jsx
{fingerprintResult.warningCount > 0 && (
  <div className="fingerprint-warning">
    <span>⚠ {fingerprintResult.warningCount} AI fingerprint warning(s)</span>
    <ul>{fingerprintResult.warnings.map(w => <li key={w}>{w}</li>)}</ul>
  </div>
)}
```

Add `fingerprintScore` (0–100, where 100 = clean) as a dimension in the existing scoring display.

---

## Change 3: Multi-Perspective Critique Mode

### What & Why
A critique pass that runs in a **fresh API call** — no generation context — so it reads the output without bias from how it was produced. Returns a structured score across 5 reader personas.

### Trigger
Add a "Critique" button that appears after a resume is generated. It makes a second, separate Netlify Function call.

### Netlify Function Addition
Create `netlify/functions/critique.js` (or add a `mode: "critique"` branch to the existing function):

```js
const CRITIQUE_SYSTEM_PROMPT = `You are an independent resume reviewer. You have not seen how this resume was generated.
Evaluate the resume against the job description from five perspectives. Return ONLY valid JSON.

PERSONAS:
1. ATS_BOT: Does it pass keyword matching for this JD? (score 0-20)
2. RECRUITER_10S: First 10-second scan — does the summary and first bullet earn a longer read? (score 0-20)
3. HR_SCREEN_30S: 30-second read — is the level/scope clear? Does it fit the role band? (score 0-20)
4. HIRING_MANAGER: Full read — are the outcomes credible and specific? Are there red flags? (score 0-20)
5. TECHNICAL_REVIEWER: Are the tools, methods, and scale claims internally consistent? (score 0-20)

Return this JSON structure exactly:
{
  "totalScore": <sum of all scores>,
  "personas": {
    "ATS_BOT": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "RECRUITER_10S": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "HR_SCREEN_30S": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "HIRING_MANAGER": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" },
    "TECHNICAL_REVIEWER": { "score": <0-20>, "notes": "<2-3 sentences>", "topGap": "<single biggest gap>" }
  },
  "topFixes": ["<fix 1, highest impact>", "<fix 2>", "<fix 3>"],
  "interviewLikelihood": "<Low / Medium / High> — <one sentence rationale>"
}`;

exports.handler = async (event) => {
  const { resumeText, jdText } = JSON.parse(event.body);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      system: CRITIQUE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `JOB DESCRIPTION:\n${jdText}\n\n---\n\nRESUME:\n${resumeText}`
        }
      ]
    })
  });

  const data = await response.json();
  const raw = data.content[0].text;

  try {
    const parsed = JSON.parse(raw);
    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to parse critique", raw }) };
  }
};
```

### UI
Display critique results as a score card below the resume, collapsed by default. Each persona shows its score (out of 20), notes, and top gap.

---

## Change 4: Claim Level / Verb Discipline

### What & Why
Extends the existing FACT LOCK system with structured per-achievement claim levels that enforce verb discipline in prompts.

### Data Structure
Add a `claimLevel` field to each STAR story in localStorage:

```js
// Claim levels: "owned" | "co-led" | "supported" | "contributed"
// Example story object addition:
{
  id: "cd3-portfolio",
  title: "CD3 Portfolio Rationalization",
  claimLevel: "owned",   // <-- new field
  // ... existing fields
}
```

### Verb Discipline Table
Inject into the system prompt based on each story's claim level:

```
VERB DISCIPLINE — enforce strictly, no exceptions:

| Claim Level | Allowed Lead Verbs                        | Never Use                        |
|-------------|-------------------------------------------|----------------------------------|
| owned       | Led, Drove, Owned, Delivered, Architected | Contributed to, Assisted, Helped |
| co-led      | Co-led, Partnered, Collaborated           | Led, Owned, Drove solo           |
| supported   | Supported, Contributed, Assisted          | Led, Owned, Drove                |
| contributed | Contributed, Participated                 | Led, Owned, Drove, Co-led        |

Current story claim levels:
${stories.map(s => `- ${s.title}: ${s.claimLevel}`).join('\n')}
```

### UI
Add a `claimLevel` dropdown to the story editor (Owned / Co-Led / Supported / Contributed). Default to `"owned"` for existing stories since Scott's proof points are all direct ownership.

---

## Change 5: Decision Log per Application

### What & Why
A structured audit trail for each application record in localStorage. Makes scoring bugs traceable and gives Scott visibility into why certain stories were ranked/excluded.

### Data Structure
Add a `decisionLog` array to each application record:

```js
{
  companyName: "G-P",
  // ... existing fields ...
  decisionLog: [
    {
      timestamp: "2026-04-23T10:15:00Z",
      event: "bundle_detected",
      value: "transformation",
      detail: "JD matched 'transformation' pattern (keyword: 'organizational change')"
    },
    {
      timestamp: "2026-04-23T10:15:01Z",
      event: "stories_ranked",
      value: ["cd3-portfolio", "erp-replacement", "ai-automation"],
      detail: "Top 3 stories selected by bundle achievement priority"
    },
    {
      timestamp: "2026-04-23T10:15:30Z",
      event: "generation_complete",
      value: { tokenCount: 1240, model: "claude-opus-4-5" },
      detail: null
    },
    {
      timestamp: "2026-04-23T10:16:10Z",
      event: "fingerprint_check",
      value: { warningCount: 1, warnings: ["Banned word: \"leverage\""] },
      detail: null
    }
  ]
}
```

### Logging Helper
```js
export function logDecision(applicationId, event, value, detail = null) {
  const apps = JSON.parse(localStorage.getItem('narrativeos_applications') || '[]');
  const app = apps.find(a => a.id === applicationId);
  if (!app) return;

  if (!app.decisionLog) app.decisionLog = [];
  app.decisionLog.push({
    timestamp: new Date().toISOString(),
    event,
    value,
    detail
  });

  localStorage.setItem('narrativeos_applications', JSON.stringify(apps));
}
```

### UI
Add a collapsible "Decision Log" section to each application detail view. Display as a timeline — event type as label, detail as secondary text. No editing required; log is append-only.

---

## Implementation Order

1. **Change 4** (Claim Level) — touches the story data model; do this first so other changes can reference `claimLevel`
2. **Change 1** (Role Bundles) — update scoring prompt injection; depends on story data being stable
3. **Change 2** (Fingerprint Check) — pure utility function, add to scoring display
4. **Change 5** (Decision Log) — add logging calls after bundle detection, generation, and fingerprint check
5. **Change 3** (Critique Mode) — new Netlify Function + UI component; build last once generation pipeline is solid

---

## Notes for Claude Code

- Prefer **whole-file replacements** over patch scripts
- Do not rename existing localStorage keys — append new fields only to avoid breaking existing records
- The Anthropic API key is already in Netlify environment as `ANTHROPIC_API_KEY`
- All new UI components should match existing component style/class conventions in the project
- If a change touches the main scoring Netlify Function, read the full existing function first before modifying
