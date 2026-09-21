---
name: logbook
version: 1.0.0
description: >
  Logs design and build decisions as a solo builder works — capturing what shipped, what was rejected, and why. Trigger when the user mentions a decision, milestone, shipped feature, rejected direction, or says "log this", "export my logbook", or "generate my case study". Also active passively via LOGBOOK_CLAUDE.md throughout the session.
---

# Logbook Skill

This skill helps solo builders document their design and build decisions in real time — as milestones happen, as directions get chosen or rejected, as features ship. The output is a structured log that can later be exported as a case study seed doc: something you can hand to yourself six months from now and immediately understand the full arc of the project.

---

## What this skill does

It maintains two things:

1. **A decision log** — individual markdown files for each logged moment (decision, milestone, or shipped thing), stored in `docs/logbook/decisions/`
2. **A master logbook** — a single aggregated document at `docs/logbook/LOGBOOK.md` that pulls everything together chronologically

On demand (or at end of session), it also generates:

3. **A case study seed** — a restructured export at `docs/logbook/CASE_STUDY_SEED.md` that reframes the log into the arc of a design case study: problem → process → decisions → outcome → reflection

---

## When to log

Log a decision or milestone when:
- The user ships or finishes a feature, screen, component, or version
- The user chooses between two real alternatives (layout A vs B, this library vs that one, this interaction vs the simpler version)
- The user explains *why* they went a direction — that reasoning is gold for later
- The user mentions something they tried and rejected
- The user says "I'm not sure this was the right call" — log the uncertainty too
- A constraint (time, tech, scope) forced a decision that would otherwise have gone differently
- The user reflects on something mid-session ("I realized the real problem was...")

Don't log every small code choice. Log the moments that shaped the thing.

---

## Initialization (first use only)

Before logging anything, check if `docs/logbook/` exists. If it doesn't, run initialization.

### Step 0: Detect whether this is a new or mid-project install

First, ask one question:

> "Is this a new project or are you adding logbook to something you've already been building?"

**If new project → run new project flow.**
**If mid-project → run mid-project flow.**

---

### New project flow

1. Ask: "What's the project called, and in one sentence — what are you building and who's it for?"
2. Ask: "Is there anything you always want me to capture when logging a decision? (e.g., time pressure, tools used, which AI helped)"
3. Confirm before creating files, then create the directory structure and seed `PROJECT.md` and `LOGBOOK.md`

Seed `LOGBOOK.md` with:

```markdown
# Logbook — [PROJECT NAME]
Started: YYYY-MM-DD

---

| # | Date | Title | Summary |
|---|------|-------|---------|

---
*No entries yet. Start building — decisions will appear here as you log them.*
```

---

### Mid-project flow

The builder has history that logbook doesn't know about. Collect enough context to make future entries and the eventual case study seed meaningful.

Ask questions one at a time — never as a list. There are two tiers:

**Required — always ask these, no skipping:**
1. "What's the project called, and what are you building and who's it for?"
2. "How far in are you — early stages, mid-build, or close to shipping?"

**Optional — ask these after the required ones, but make clear they can skip:**
3. "What are the 2-3 biggest decisions you've made so far? Skip this if you'd rather just start logging from here."
4. "Anything you tried and dropped that's worth remembering? Or skip."
5. "Any constraints that shaped the project — time, tech, scope? Or skip."

Once the required questions are answered, logbook starts its normal passive capture immediately — no further setup needed. If they skipped questions 3, 4, or 5, note in `PROJECT.md` that pre-logbook history was not captured and move on. Do not circle back to skipped questions.

After collecting answers, do two things before creating any files:

**A. Backfill a context block in `PROJECT.md`**
Write a `## Before logbook` section that summarises what you learned from their answers — the project status, key decisions already made, dropped directions, and constraints. This is not a decision log entry. It's context that future entries and the case study seed will draw from.

**B. Offer to log backdated entries**
Say:

> "I can log those past decisions as backdated entries so your logbook has a complete picture — or we can start fresh from today. Which do you prefer?"

If they want backdated entries: write one decision file per major decision they mentioned, using the date they estimate it happened (or today's date with a note that it's backdated). Add a `[backdated]` tag to each entry in `LOGBOOK.md` so it's clear these were captured retrospectively, not in real time.

If they want to start fresh: skip backdated entries, note in `PROJECT.md` that logbook was installed mid-project, and begin logging from this session forward.

Seed `LOGBOOK.md` with:

```markdown
# Logbook — [PROJECT NAME]
Started: YYYY-MM-DD (logbook installed mid-project)

---

| # | Date | Title | Summary |
|---|------|-------|---------|

---
*Logbook installed mid-project. Context captured in PROJECT.md → Before logbook section.*
```

---

### Directory structure to create (both flows)

```
docs/
└── logbook/
    ├── PROJECT.md          ← project context, seeded at init
    ├── LOGBOOK.md          ← master log, seeded at init, updated each time
    ├── CASE_STUDY_SEED.md  ← generated on export request, not created at init
    └── decisions/
        └── 001-[slug].md   ← individual decision files, created as entries are logged
```

Do not create `CASE_STUDY_SEED.md` at init — it is generated on demand only.

---

## Logging a decision or milestone

### Step 1: Extract the core of what happened

From what the user said, identify:
- **What shipped or was decided** — the concrete thing
- **The problem it was solving** — what prompted this decision
- **Alternatives considered** — what else was on the table (even loosely)
- **Why this direction** — the actual reason, including constraints
- **Outcome or feeling** — did it work? Does the user feel good about it? Any tension?

If any of these are unclear, ask one targeted question — not a list. Keep it conversational.

### Step 2: Assign a slug and number

Scan `docs/logbook/decisions/` for the highest existing number. Increment by 1. Create a slug from the decision title (lowercase, hyphens). Example: `007-dropped-sidebar-for-bottom-nav.md`

### Step 3: Write the decision file

Use the template at `templates/decision.md`. Fill every field. Leave nothing blank — if the user didn't mention an alternative, write "none explicitly considered" and note that the decision felt obvious or constrained.

### Step 4: Update LOGBOOK.md

Append a new entry to the master log. Format: date, number, title, one-sentence summary, and a link to the decision file.

### Step 5: Confirm what was written

After writing the files, show a one-line confirmation — not the full file content:

> "Logged #007 — Dropped sidebar for bottom nav. Want to add anything?"

Note: when logbook is triggered from LOGBOOK_CLAUDE.md (passive mode), the user already confirmed via the passive prompt. Do not ask again. Write the files, then confirm.

---

## Exporting the case study seed

When the user asks to export their process, generate a case study draft, or review what they have built so far — run this export.

First, check if `docs/logbook/CASE_STUDY_SEED.md` already exists. If it does, present three options before doing anything:

> "A case study seed already exists from [date of last export]. How do you want to handle it?
> 1. **Create new** — rename the existing one to `CASE_STUDY_SEED_v[N].md` and generate a fresh seed from the full log
> 2. **Update existing** — add new entries since the last export to the current seed, with a timestamped update block
> 3. **Cancel** — leave it as is"

Wait for their choice before writing anything.

**If they choose option 1 (create new):**
Scan `decisions/` for the existing version number. Rename `CASE_STUDY_SEED.md` to `CASE_STUDY_SEED_v[N].md` where N increments from any existing versions. Generate a full fresh seed from all decision files and write it as the new `CASE_STUDY_SEED.md`.

**If they choose option 2 (update existing):**
Read the existing `CASE_STUDY_SEED.md`. Identify which decision entries were logged after the seed's last generated/updated date. Append an update block at the bottom of the existing file in this format:

```markdown
---
<!-- Updated: [YYYY-MM-DD HH:MM] — [N] new decisions added since last export -->

## New since last export — [date range]

### [Decision title] — #NNN, [date]
[2-3 sentences: the situation, the fork, the call, the reason]
```

Do not regenerate or rewrite the sections above — only append. This preserves any edits the user made to the existing seed.

Read `PROJECT.md` and all files in `decisions/` chronologically. Then write `CASE_STUDY_SEED.md` using the structure in `references/case-study-structure.md`.

The case study seed is NOT a polished piece of writing. It is a structured prompt for the user's future self — dense with the real reasoning, ready to be shaped into whatever format they need (portfolio write-up, presentation, LinkedIn post series, etc.).

After writing it, tell the user which file it is, how many decisions it covers, the timespan, and the 1-2 strongest moments for a case study narrative.
---

## Reviewing the log mid-project

If the user asks "what have I logged so far" — read `LOGBOOK.md` and return the full entry list with numbers, dates, titles, and one-line summaries.

If the user asks about a specific past decision ("remind me why I did X", "what did I decide about Y") — read the relevant file from `decisions/` and return a structured response in this exact format:

> **#[NNN] — [Decision title]**
> **What you said:** "[exact prompt or statement the user gave that triggered this log]"
> **What I inferred:** [what Claude detected from that prompt — shipped moment, uncertainty, rejected direction, etc. — and why it was worth logging]
> **What was logged:** [2-3 sentences summarising the decision, rationale, and constraints from the file]
> **Changes made:** [the files that were written or updated as a result — e.g., `decisions/003-dropped-map-view.md`, `LOGBOOK.md` row #003]

This format ensures the user can always trace a log entry back to the exact moment it came from, understand what Claude read into it, and know exactly what was written to disk.

---

## Reference files

- `references/case-study-structure.md` — the structure to use when generating the case study seed export
- `templates/decision.md` — the template for individual decision files
- `templates/project.md` — the template for PROJECT.md at init

---

## Always-on behavior

The passive, always-on capture behavior is defined in `LOGBOOK_CLAUDE.md` — not in this file. SKILL.md handles the *how* of logging. LOGBOOK_CLAUDE.md handles the *when*, the tone, and the end-of-session sweep. Both files need to be present for logbook to work automatically.

The end-of-session sweep is triggered by LOGBOOK_CLAUDE.md detecting wrap-up phrases ("done for today", "wrapping up", etc.) — no external hook or additional configuration needed.
