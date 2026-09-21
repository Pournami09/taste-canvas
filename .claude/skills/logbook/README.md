# logbook

a Claude Code skill for designers and design-first builders who move fast and forget why they made every decision.

---

you know the feeling. you ship something, it's good, you're proud of it. two months later someone asks you to walk them through your process. or you're writing a portfolio case study. or you're in an interview.

and you blank.

not because the thinking wasn't there. it was. you just didn't write it down because you were in it — choosing between two layouts, cutting scope, figuring out why one interaction felt wrong. the rationale lived in your head for about four hours and then evaporated.

logbook fixes that. it sits inside your Claude Code session and captures your decisions as you make them. when you're ready to write the case study, the interview answer, the portfolio write-up — it's already there.

---

## what it captures

every time you log something, it records:

- what you decided or shipped
- what problem you were actually solving
- what alternatives you considered (even the ones you only half-thought through)
- why you went the direction you did — including the constraints that shaped it
- how it felt, including uncertainty and doubt

the uncertainty part matters. a logbook with "I'm not sure this was the right call but we were two days from launch" is more useful than a sanitized version where everything looks intentional.

---

## how it works

you don't fill in forms or run commands. you just talk while you build.

```
"just shipped the empty state"
"log this — I went with a table instead of cards, data density mattered more here"
"tried a map view first but dropped it, too heavy for v1"
"not sure about this navigation structure but moving on"
```

logbook picks those up, asks one follow-up if something's missing, and writes a structured entry to your project. at the end of a sprint, a project, or whenever you need it — you ask for the export and get a case study seed doc ready to shape into whatever format you need.

---

## install

requires [Claude Code CLI](https://claude.ai/code). if you don't have it:

```bash
npm install -g @anthropic/claude-code
```

then install logbook globally so it's available in every project you work on:

```bash
npx skills add yourname/logbook --skill logbook --agent claude-code
```

then add the always-on instructions to your project's `CLAUDE.md`:

```bash
# if you don't have a CLAUDE.md yet
cp ~/.claude/skills/logbook/LOGBOOK_CLAUDE.md ./CLAUDE.md

# if you already have a CLAUDE.md
cat ~/.claude/skills/logbook/LOGBOOK_CLAUDE.md >> ./CLAUDE.md
```

that's the file that makes logbook always-on. without it, you'd have to manually trigger logging every time. with it, Claude watches passively and surfaces a prompt when something worth capturing happens.

**important:** do not replace an existing `CLAUDE.md` — always append to it.

---

## starting a new project

open Claude Code in your project folder and say:

```
"starting a new project. set up my logbook."
```

it'll ask you two things — project name and a one-liner on what you're building and who it's for. answer those and you're set. takes about 30 seconds.

---

## logging as you build

you don't have to do anything. logbook watches passively the entire session.

when it detects a moment worth capturing — a decision, a shipped thing, a rejected direction, a moment of doubt — it surfaces a single quiet prompt:

> "that navigation call sounds worth logging — want me to capture it?"

say yes and it logs it. say no and it drops it. it never asks twice about the same thing.

you can also trigger it manually anytime:

```
"just shipped X"
"log this decision"
"I chose X over Y because..."
"tried X, didn't work because..."
"not sure this was the right call"
```

Claude will confirm before writing anything. if it needs more context it asks one question, not five.

---

## getting the case study seed

whenever you want it — end of a sprint, after shipping, before writing a case study:

```
"export my logbook"
```

you get a `CASE_STUDY_SEED.md` with the full arc: the problem, the key decisions, what you tried that didn't work, what shipped, and 2-3 suggested angles for writing it up. it's not polished writing. it's dense raw material you can actually use.

---

## what gets created in your project

```
your-project/
├── CLAUDE.md                        ← logbook instructions appended here
└── docs/
    └── logbook/
        ├── PROJECT.md               ← project context, created at init
        ├── LOGBOOK.md               ← master log, updated each session
        ├── CASE_STUDY_SEED.md       ← generated on export
        └── decisions/
            ├── 001-dropped-sidebar.md
            ├── 002-chose-table-over-cards.md
            └── ...
```

plain markdown. lives in your repo. version-controlled alongside your code. no accounts, no external services, no subscriptions.

---

## built for

- designers building with AI tools who ship faster than they can document
- solo founders doing their own product and design work
- design engineers who want a record of why the thing is built the way it is
- anyone who has ever stared at a blank case study doc thinking "I know I made good decisions, I just can't remember any of them"

---

## a note on what this isn't

logbook doesn't capture every code change or design tweak. it's not a git log. it captures the moments that shaped the thing — the real forks, the constraint-driven calls, the things you tried and killed. if you find yourself saying "why did I do it this way" six months from now, logbook is why you'll have an answer.

---

built by [Pournami Pottekat](https://www.pournami.work/) · made for the Claude Code ecosystem · [twitter/x](https://x.com/Poro090)
