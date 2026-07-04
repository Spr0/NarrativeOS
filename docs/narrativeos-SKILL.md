# NarrativeOS Resume Skill

## Trigger Conditions
Use this skill when Scott asks to:
- Tailor a resume or cover letter to a specific JD
- Score or critique a resume draft
- Generate STAR story bullets for a specific role
- Run a fingerprint/AI-detection check on resume text
- Prep for an interview (role positioning, story selection)
- Decide which proof points lead for a given application

Do NOT use for general career advice, coding questions, or NarrativeOS development work.

---

## Scott's Proof Point Library

Always draw from this verified set. Never fabricate or upgrade claims.

| ID | Story | Claim Level | Lead Metric |
|----|-------|-------------|-------------|
| cd3 | CD3 Portfolio Rationalization — EDF Renewables | owned | $28M annualized EBITDA; 73→15 initiatives |
| erp | ERP Replacement — CCR | owned | $6.8M budget; 18 months; 40% financial close reduction |
| ai-contract | AI Contract Automation | owned | $2M annualized EBITDA |
| digital-catalog | Digital Catalog — CCR | owned (self-initiated) | $13M spend mapped; reduced to $11M |
| rpa | RPA Strategy | owned | $4.8M SG&A reduction |
| stakeholder | Resistant VP Conversion | owned | converted model's strongest opponent into its strongest advocate |

**Claim Level Rules — enforce strictly:**

| Level | Allowed Lead Verbs | Never Use |
|-------|--------------------|-----------|
| owned | Led, Drove, Owned, Delivered, Architected | Contributed to, Assisted, Helped |
| co-led | Co-led, Partnered, Collaborated | Led, Owned, Drove (solo) |
| supported | Supported, Contributed, Assisted | Led, Owned, Drove |

All six stories above are `owned`. Never downgrade them. Never upgrade a story that isn't in this table.

---

## Role-Type Bundles

Match the JD to a bundle before generating anything. The bundle sets positioning strategy and achievement priority order.

### Bundle: Transformation
**Trigger keywords:** transformation, change management, organizational change, enterprise change  
**Positioning:** Lead with portfolio rationalization scale and measurable EBITDA/cost outcomes. Technology is an enabler of business transformation, not the lead.  
**Achievement order:** cd3 → erp → ai-contract → digital-catalog → rpa  
**Lead skills:** Portfolio Management, P&L Ownership, Agile Transformation, Stakeholder Influence  
**Summary pattern:** Scope (# initiatives, $ value) → Method (how transformation was driven) → Outcome (EBITDA/cost metric)

### Bundle: Technology Leadership
**Trigger keywords:** VP technology, CTO, technology strategy, digital transformation, technology leadership  
**Positioning:** Lead with P&L ownership and full-stack technology accountability. Emphasize build/buy/partner decisions and platform outcomes.  
**Achievement order:** erp → digital-catalog → cd3 → ai-contract → rpa  
**Lead skills:** P&L Ownership, Enterprise Architecture, Cloud/Data Platforms, Vendor Management  
**Summary pattern:** P&L scope + org size → Technology transformation angle → Business outcome

### Bundle: Portfolio / PMO
**Trigger keywords:** portfolio, PMO, program management office, governance, prioritization  
**Positioning:** Lead with portfolio scale and the rationalization/prioritization method. Emphasize governance, Cost of Delay, and measurable throughput.  
**Achievement order:** cd3 → erp (delivery) → stakeholder → digital-catalog → ai-contract  
**Lead skills:** Portfolio Governance, Cost of Delay / CD3, Agile at Scale, Executive Reporting  
**Summary pattern:** Portfolio scale (# initiatives, $ value) → Governance/prioritization method → Delivery outcome or EBITDA

**Default fallback:** If no bundle matches clearly, use Transformation.

---

## Position Theme Line

For each role in the resume, generate one JD-customized theme statement — a single sentence that reframes the job title in JD language. This goes under the job title, not in the summary.

Example for a Transformation role:
> *Led enterprise technology transformation and P&L management across 400+ utility-scale renewable projects.*

This is separate from the summary. It's position-level tailoring, not profile-level.

---

## Generation Protocol

### Step 1 — JD Analysis
Before writing anything:
- Identify the role archetype → select bundle
- Extract top 5 ATS keywords (exact phrases from JD)
- Identify employer type (PE-backed, public, nonprofit, etc.) — this affects tone
- Note any explicit red flags (e.g., JD asks for specific tools Scott doesn't have)

### Step 2 — Story Selection
Using the bundle's achievement priority order, select 3–4 stories that best match the JD. Document why each was selected or skipped.

### Step 3 — Position Theme Lines
Write one theme line per role before writing bullets.

### Step 4 — Bullet Generation
FACT LOCK constraints — apply to every bullet, no exceptions:
- Every metric must match the verified proof point library exactly
- No rounding up (e.g., $27M is not $28M)
- No omitting qualifiers (e.g., "annualized" must stay in EBITDA claims)
- No upgrading verbs beyond the claim level
- If a metric isn't in the library, don't invent one — describe the outcome qualitatively

Bullet structure: Strong verb + scope/method + quantified outcome (where available)

### Step 5 — Fingerprint Check
Before finalizing, scan output for:

**Banned words (flag and replace):**
utilize, leverage, spearhead(ed), dynamic, robust, innovative, synergy, impactful, results-driven, proven track record, passionate about, detail-oriented, thought leader, game-changer, move the needle, best-in-class, holistic, cutting-edge, best practices

**Structural tells (flag and fix):**
- Same action verb used 3+ times across bullets
- "Was responsible for" — replace with direct ownership verb
- "Helped to" / "assisted in" — check claim level and rewrite
- Three consecutive bullets with identical rhythm/length

---

## Critique Mode

When asked to critique a resume (use a fresh perspective — do not carry generation context):

Score across 5 reader personas (each out of 20, total out of 100):

1. **ATS Bot** — keyword match against JD
2. **Recruiter 10s** — does summary + first bullet earn a longer read?
3. **HR Screen 30s** — is level/scope clear? Does it fit the role band?
4. **Hiring Manager** — are outcomes credible and specific? Any red flags?
5. **Technical Reviewer** — are tools, methods, and scale claims internally consistent?

For each persona: score, 2–3 sentence notes, single biggest gap.

Close with: top 3 fixes ranked by point impact, and an interview likelihood assessment (Low / Medium / High + one-sentence rationale).

---

## Output Formatting

- Contact header: Scott Henderson | Bellingham, WA | [email] | [LinkedIn]
- P&L framing: always state full P&L ownership — budget ownership, revenue forecasting, margin management, financial reporting to board/C-suite. Never reduce to "delivery budget oversight."
- No em dashes in any output
- Tone: direct, professionally warm, not effusive
- Avoid: first-person pronouns in resume bullets; qualifiers like "successfully" or "effectively"

---

## Cover Letter Protocol

Use the selected bundle's CL keywords. Structure:
1. **Hook** — specific detail from JD or company that connects to Scott's work (not generic "I am excited to apply")
2. **Proof paragraph** — two proof points from the bundle's priority order, in narrative form
3. **Fit statement** — why this role/company specifically, not just the function
4. **Close** — direct, no filler

Length: 3 paragraphs, under 300 words.
