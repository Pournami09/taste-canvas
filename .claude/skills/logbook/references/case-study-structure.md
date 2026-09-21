# Case Study Seed Structure

This is the structure to use when generating `CASE_STUDY_SEED.md`. It is not a polished portfolio piece — it's dense raw material the builder can pull from when writing any format: portfolio write-up, slide deck, LinkedIn series, job application story.

Write in first person, past tense. Be specific and honest. Avoid generic designer-speak ("I worked closely with stakeholders to..."). If there were no stakeholders, say so.

---

## CASE_STUDY_SEED.md structure

```markdown
# [PROJECT NAME] — Build Case Study Seed
Generated: [date]
Decisions logged: [N]
Span: [first entry date] → [last entry date]

---

## The one-liner
<!-- The project in a single sentence. Concrete. Specific. -->

---

## Context
<!-- What was the situation before this project started? 
     What problem existed? What was missing or broken?
     Who was it for? What constraints existed from day one? -->

---

## Why me, building this, now
<!-- Why did this project exist? What motivated it?
     What were you trying to prove, learn, or ship?
     This is the hook — the reason it's worth reading about. -->

---

## The arc (chronological)
<!-- A timeline of the key decisions, pulled from the log.
     Not every decision — the 4-6 that actually shaped the thing.
     For each: what the moment was, what the real choice was, what you chose and why. -->

### [Decision title] — #NNN, [date]
[2-3 sentences: the situation, the fork, the call, the reason]

### [Decision title] — #NNN, [date]
...

---

## The hardest call
<!-- Pull the single decision that had the most uncertainty or trade-off.
     Write it in full: what was at stake, what you gave up, whether it paid off. -->

---

## What I tried that didn't work
<!-- Rejected directions from the log. Honest account of what failed or got cut.
     This is the part most portfolios skip — it's also the most credible part. -->

---

## What shipped
<!-- The concrete output. Features, screens, interactions, components — whatever shipped.
     Link to live product, repo, or prototype if it exists. -->

---

## What I'd do differently
<!-- Pulled from the "how it felt" and uncertainty notes in the log.
     Honest reflection — not false humility, not defensiveness. -->

---

## The thing I got better at
<!-- What skill, judgment, or pattern did this project sharpen?
     Specific. Not "I got better at design" — what specifically? -->

---

## Raw quotes from the log
<!-- 3-5 direct quotes from the decision files that capture real thinking.
     These are great for portfolio writing — they show process, not just output. -->

> "[quote from a decision file's 'how it felt' or 'why I decided' section]"
> — Entry #NNN, [date]

---

## Suggested case study angles
<!-- 2-3 framings this log could support, depending on what the builder wants to emphasize.
     e.g., "1. The interaction design angle — lead with the nav decision..."
           "2. The solo builder angle — lead with the constraint story..."
           "3. The domain learning angle — lead with what you didn't know going in..." -->
```

---

## Writing guidance for Claude when generating this

- Pull quotes directly from decision files — do not paraphrase the user's own words
- The "arc" section should only include decisions that had a real fork (not obvious choices or implementation details)
- Flag any gaps in the log — if there's a major-looking gap in the timeline, note it so the user knows what's missing
- Don't editorialize on whether decisions were good or bad — surface the user's own stated confidence levels
- If a milestone was logged as "shipped" but no outcome was recorded, note that the outcome section is blank and prompt the user to fill it in
- The "suggested case study angles" should be genuinely different framings, not variations of the same narrative
