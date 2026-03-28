# NarrativeOS — AI Job Search Intelligence

> *Built for a senior transformation leader. Useful for anyone serious about their search.*

NarrativeOS is a multi-tool AI career platform built with React and the Anthropic Claude API. It combines a persistent STAR story library with four AI-powered job search tools — all driven by a single job description input.

---

## Live App

🔗 **[aicareerforge.netlify.app](https://careerforge.netlify.app)**

---

## What It Does

**Story Library**
A persistent STAR story library — your proven career moments, tagged by competency, searchable, starred for quick access. Survives across sessions via key-value storage. Add, edit, and organize your interview stories in one place.

**JD Analyzer**
Paste a job description and get: a fit score with rationale, the 5 key requirements the role actually needs, your top 3 most relevant proof points for that specific role, which stories to lead with and for which question type, honest gap analysis with suggested framing, and keywords to embed in your materials.

**Resume Tailoring**
JD in → specific, actionable resume edits out. Rewrites your summary for the role, identifies which bullets to strengthen (with revised text), surfaces keywords missing from your resume, and flags what to de-emphasize.

**Cover Letter**
JD + company + role + optional context → complete, ready-to-send cover letter. Tuned to avoid generic AI tone — direct, proof-point-led, executive voice.

**Interview Prep**
Select the interview round (screening through final), paste a JD → 8 likely questions with coaching notes tied to your specific stories, 3 tricky questions with honest framings, and 4 sharp questions to ask the interviewer.

---

## Architecture

```
Persistent Storage (key-value)
  └── STAR story library per user profile
  └── Shared JD state across tabs

Shared JD Input
  └── Paste once → available on all tool tabs

AI Tools (Claude API — claude-haiku)
  ├── JD Analyzer     → fit score, story match, gap analysis
  ├── Resume Tailor   → specific edits against resume baseline
  ├── Cover Letter    → complete draft in user's voice
  └── Interview Prep  → questions + coaching notes per round

Multi-user Architecture (in progress)
  └── Profile-keyed storage — Scott / Joshua / Aaron
```

**Key design decisions:**
- JD is shared state across all tabs — paste once, use everywhere
- Each tool has a distinct system prompt tuned to the user's background and proof points
- Story library feeds directly into JD Analyzer and Interview Prep — AI knows your stories
- Storage keyed by user profile for future multi-user expansion

---

## Build Log

| Version | What changed |
|---------|-------------|
| v1 | STAR story library — persistent storage, competency tags, search, star/filter |
| v2 | Layer 2 AI tools — JD Analyzer, Resume Tailoring, Cover Letter, Interview Prep · shared JD state persisted across tabs |
| v3 (planned) | Company Research Agent — multi-step agentic workflow · multi-user profiles (Joshua, Aaron) |

---

## Setup

```bash
git clone https://github.com/Spr0/NarrativeOS.git
cd NarrativeOS
npm install
cp .env.example .env.local
# Add your Anthropic API key to .env.local
npm run dev
```

For Netlify deployment, set `VITE_ANTHROPIC_API_KEY` as an environment variable in site settings.

---

## Why I Built This

I'm a senior transformation leader in an active job search. Every tool I evaluated was either too generic, too expensive, or didn't know my actual stories and proof points.

CareerForge is designed around a simple insight: **the job description is the common input for every search activity** — resume tailoring, cover letter, interview prep, story selection. Making the JD the shared thread across all tools eliminates redundant work and keeps outputs consistent.

It's also a deliberate exercise in building AI-native tools — understanding prompt engineering, agentic patterns, and API integration firsthand, not just conceptually.

---

## Stack

- **React** (via Vite)
- **Anthropic Claude API** — `claude-haiku-4-5` for all AI tools
- **Persistent key-value storage** — story library and JD state survive across sessions
- No backend — client-side only

---

## About

Built by **Scott Henderson** — enterprise transformation leader, VP Technology, renewable energy.

🌐 [hendersonsolution.com](https://hendersonsolution.com) · 📬 scott@hendersonsolution.com · [GitHub](https://github.com/Spr0)
