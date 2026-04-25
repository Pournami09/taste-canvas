# Taste Canvas

A spatial, connected, annotated map of taste. Pitched as a new "Canvas" view mode for taste curation tools like Cosmos and Are.na: same cluster data, new lens.

Designers paste references onto an infinite pan-and-zoomable surface, connect them, and answer "why does this resonate?" The reflection layer is the differentiator.

## Status

Pre-scaffold. The repo currently contains the binding specs (`docs/`) and project context (`CLAUDE.md`). Phase 1 (foundation: tokens, primitives, `/design-system` route, AnnotationCard, HoverToolbar) has not started.

To pick up where we left off, open this folder in Claude Code and the next agent session will read `CLAUDE.md` automatically. The first task is in `CLAUDE.md` under "Phase 1 task list".

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind v4 (CSS variable bridge)
- shadcn/ui (Radix) for Dialog, DropdownMenu, Tooltip, Sonner, Tabs, Switch, Avatar
- `geist` font package (Geist Sans, Geist Mono)
- `lucide-react` icons
- pnpm
- react-flow (Phase 3 only)
- Vercel (Phase 6+)

## Project structure (target)

```
app/                        # Next.js App Router routes
components/
  primitives/               # Button, Input, Tabs, etc.
  features/                 # AnnotationCard, HoverToolbar, etc.
  design-system/            # Sidebar, ThemeToggle, ComponentPreview, TokenTable
lib/                        # theme, cn, token catalog
styles/tokens/              # primitives.css, semantic.css, components.css
docs/                       # canvas_prd.md, canvas_requirements.md (binding)
CLAUDE.md                   # Project context for Claude Code
```

## Getting started (once scaffolded)

```
pnpm install
pnpm dev
```

Then open http://localhost:3000/design-system to verify the token system and primitives.

## Documentation

- `CLAUDE.md` — binding context, working rules, phased build plan, token decisions.
- `docs/canvas_prd.md` — product story, MVP scope, key flows.
- `docs/canvas_requirements.md` — FR / UI / DS spec; the source of truth for what to build.

## Working rules (summary)

The full list lives in `CLAUDE.md`. The non-negotiables:

- Build order: tokens, primitives, `/design-system`, features, pages, integration. No skipping ahead.
- Token discipline: no hardcoded colors, spacing, radii, font sizes, or motion values outside `styles/tokens/primitives.css`.
- Every component works in both themes, supports keyboard navigation, has empty/loading/error states.
