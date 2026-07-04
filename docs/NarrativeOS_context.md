# NarrativeOS — Session Context for Handoff

## What This Is
NarrativeOS is a personal job search and career management React app built by Scott Henderson (senior transformation executive, Bellingham WA). Single-user, mobile-first. Built on Vite/React, deployed on Netlify, auth via Netlify Identity (email + Google). Monolithic single-file architecture by design — previous split attempts failed.

---

## Current Version: v25
File: `src/App.jsx` (NarrativeOS_v25.jsx)
Repo: https://github.com/Spr0/NarrativeOS

---

## Tech Stack
- **Frontend:** React (Vite), single monolithic JSX file
- **Auth:** Netlify Identity (email + Google OAuth, both in active use)
- **API:** Anthropic claude-haiku-4-5-20251001 via Netlify Function proxy (`netlify/functions/claude.js`)
- **Persistence:** localStorage (Supabase migration is next — v26)
- **Deployment:** Netlify
- **Storage keys:** `nos_profile`, `nos_cards`, `nos_stories`

---

## Architecture Decisions Made
- All Anthropic API calls go through `/.netlify/functions/claude.js` (server-side key, never in browser)
- `getAuthToken()` is async, uses `user.jwt(true)` for refresh
- `ANTHROPIC_API_KEY` (no VITE_ prefix) = server-side key in Netlify env
- `VITE_ANTHROPIC_API_KEY` = still present, used only to check if coaching nudge should fire (to be removed in v26)
- Supabase publishable key (`sb_publishable_...`) stored as `SUPABASE_ANON_KEY` in Netlify env
- `SUPABASE_URL` stored in Netlify env
- Schema written and ready (`schema.sql`) but NOT yet run in Supabase — waiting for v26

---

## Netlify Env Vars (confirmed set)
- `ANTHROPIC_API_KEY` — server-side Anthropic key
- `VITE_ANTHROPIC_API_KEY` — client-side (temporary, remove in v26)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — publishable key
- `APIFY_TOKEN`
- `OPENAI_API_KEY`
- `VITE_APIFY_TOKEN`
- `VITE_GOOGLE_CLIENT_ID`

---

## Nav Structure (Hamburger/Drawer)
- Dashboard (landing)
- Tracker (formerly Board/Kanban)
- Fit Check
- Stories
- Interview Prep (routes to Tracker to pick a card)
- Profile

---

## Data Shapes

### profile (nos_profile)
```js
{
  name, displayName, email, phone,
  address: "Bellingham, WA",
  linkedin, website, title, background,
  resumeText, resumeUploaded: false,
  profileTier: "senior", // student | midlevel | senior | executive
  resumeVariants: [], // [{id, name, text, createdAt}]
  activeResumeId: null,
  verifiedSkills: [], // [{skill, context, sources:[cardId], count, firstSeenAt}]
}
```

### card (nos_cards array item)
```js
{
  id, company, title,
  stage: "Considering", // Considering|Applied|Screening|Hiring Manager|Panel|Exec|Rejected
  jd, jdUrl, tags: [], notes,
  resumeText, resumeType, coverLetterText,
  corrections: [], // [{gapTitle, explanation, verifiedAt}]
  createdAt,
}
```

### story (nos_stories array item)
```js
{
  id, title, company, role,
  competencies: [],
  hook, situation, task, action, result,
  tags: [], starred: false
}
```

---

## Supabase Schema (written, not yet run)
Tables: `profiles`, `resumes`, `cards`, `stories`, `prep_sessions`, `search_history`
RLS approach: Option B (service role key in Netlify Function, user scoping at query level via `context.clientContext.user.sub`)
Reason: Netlify Identity JWT secret not easily accessible from UI to paste into Supabase JWT settings.
Schema file: `schema.sql` (delivered, sitting ready)

---

## Key Features

### Dashboard
- Greeting + date
- AI coaching nudge (NarrativeOS-oriented, not generic job advice)
- Amber alert strip when no resume on file (collapses once uploaded)
- Pipeline widget (counts by stage, clicks through to Tracker)
- Stats row: Applied, Active, Stories
- 3 Quick actions: Fit Check, Stories, Profile
- Active resume strip

### Tracker
- Kanban board with pipeline stats strip pinned at top
- Cards open RoleWorkspace (full-screen overlay)
- Export CSV

### RoleWorkspace (card detail)
Tabs: Resume | Cover Letter | Interview Prep | Research
- Resume: Chronological/Hybrid/Functional, Hankel framework, DOCX + PDF download
- Cover Letter: high commitment signal, DOCX + PDF
- Interview Prep: generates "Brief" (formerly cockpit) — crib notes for live calls
  - Gap Correction panel appears below Brief after generation
  - Corrections persist to card.corrections AND profile.verifiedSkills
- Research: company overview, leadership, financials, transformation, news, culture

### Fit Check (AnalyzeTab)
- Paste JD → AI scores fit 1-10
- Gap correction panel
- Track + Build Resume, Track Only, Interview Prep, Cover Letter actions
- Verified skills from profile auto-applied (shown as ✓ Verified, not flagged)

### Stories
- Manual add
- Extract from resume (AI)
- STAR format with proof+potential hook
- Edit/delete

### Profile
- Career tier selector
- Contact fields
- Resume upload: .docx (mammoth.js), .txt, .md, .pdf
- Resume variants manager
- Resume text editable

---

## Verified Skills Layer
- Gap corrections write to `card.corrections` AND merge into `profile.verifiedSkills`
- `verifiedSkillsContext()` helper builds prompt injection string
- Resume builder, Brief generation, Fit Check all consume verified skills
- Coaching nudge surfaces skills with count >= 2 that may be missing from resume
- Skills with verified corrections are pre-answered in Brief competency grid

---

## AI Prompts System
All prompts in `PROMPTS` object:
- `jdAnalyzer` — fit scoring, includes verifiedSkills
- `resumeStrategy` — Hankel framework strategy, includes verifiedSkills
- `resumeRender` — final resume text (chronological/hybrid/functional)
- `coverLetter` — high commitment signal
- `interviewPrep` — Brief JSON output, pre-corrects verified gaps
- `storyExtract` — STAR stories from resume
- `storyInterview` — guided story building
- `followUp` — email templates
- `contactExtract` — parse contact info from resume

---

## Hankel Framework (baked into all resume prompts)
- Banned phrases list
- Fading terms to upgrade
- Trending transferable skills
- Agreeableness signals for ATS
- Proof + Potential vocabulary
- Hybrid bullet architecture
- Pre-Intel roles excluded (Proudcloud, Bookmans)

---

## Known Issues / Notes
- `VITE_ANTHROPIC_API_KEY` to be removed in v26 once Supabase migration removes last direct client reference
- `build.command` in netlify.toml: `npm run build`
- Functions directory: `netlify/functions`
- Publish dir: `dist`

---

## Build Queue (v26 and beyond)

### v26 — Supabase data migration
- Replace all localStorage reads/writes with Supabase via Netlify Function
- Add Supabase client to `claude.js` using service role key
- User scoping via `context.clientContext.user.sub`
- Migrate existing localStorage data on first load
- Remove `VITE_ANTHROPIC_API_KEY`
- Need: `SUPABASE_SERVICE_KEY` added to Netlify env vars

### Queued features (post-v26)
- Profile hub with sub-pages (Bio/Titles, Skills, Stories, Resumes)
- Archive system — cards and resumes, bidirectional with prompt on restore
- Outcome tracking on cards (close application flow: offer/rejected/ghosted/withdrew)
- Interview debrief field per stage (what landed, what surprised)
- Stage transition summary — Brief carries forward prior stage notes
- Conversational interview prep refinement (back-and-forth after structured start)
- HERO story conversion (one-click with guiding questions)
- JD fetch from URL (LinkedIn, Greenhouse, Lever)
- Search history persistence (Supabase search_history table ready)
- Pattern recognition → coaching + resume suggestions
- Resume version history (sent resumes labeled by job, archived not deleted)
- PWA/offline capability
- Notification/reminder layer for stale cards
- Multi-resume targeting logic (which variant fits this role)
- Profile versioning / changelog per field
- Permanently delete from archive

---

## Scott's Background (for AI context in prompts)
- Senior transformation executive, VP/Sr. Director level
- EDF Renewables (Sr. Director) — $28M annualized EBITDA improvement
- Cypress Creek Renewables (VP) — $2M annualized EBITDA from AI contract automation, 27% reduction in compliance fines
- Nike, Intel earlier career (agile coaching roots)
- Target roles: executive transformation, AI enablement, VP/SVP level
- Profile tier: executive/senior
- Location: Bellingham, WA (always in resume header)
- Key proof points: $28M EBITDA, $2M AI automation, 27% compliance reduction

---

## Coding Conventions
- No em dashes anywhere in generated content (use hyphen or pipe)
- No "genuinely", "honestly", "straightforward" in responses
- Peer-level, direct tone
- Always deliver complete replacement files (no surgical patches preferred)
- Parse-check every file before delivery using @babel/parser with jsx plugin
- Python for multi-step file patches (str_replace unreliable with template literals)
