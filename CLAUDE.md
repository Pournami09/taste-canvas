# Taste Canvas

Taste Canvas is a personal Next.js 15 + TypeScript project for building a spatial, connected, annotated map of taste. It turns collections of saved references from flat grids into infinite canvas surfaces for reflection. The reflection layer (annotations answering "why does this resonate?") is the differentiator. Same references, new lens.

This file is the binding context for every Claude Code session on this repo. Read it end to end before writing code.

## Source of truth

Two spec docs live in `docs/`. Treat them as binding.

- `docs/canvas_prd.md` — product story, MVP scope, key flows, risks, roadmap.
- `docs/canvas_requirements.md` — Functional Requirements (FR-N), UI Requirements (UI-N), and Design System Spec (DS-N). The "How to use this document" preamble is binding. Treat every FR/UI/DS ID as a checklist item.

If a spec is ambiguous, stop and ask before guessing. Do not introduce features or components not listed in the spec.

## Working rules

These override defaults. Do not violate them.

1. Read `docs/canvas_requirements.md` end to end before writing any code in a fresh session.
2. Treat every FR/UI/DS ID as a checklist. Locate IDs before implementing, self-verify after.
3. Build in this strict order: tokens, then primitive components, then `/design-system` route to verify, then feature components, then pages, then integration. Do not skip ahead.
4. Token discipline: never hardcode a color, spacing, radius, font size, or motion value in a component. If a value is not in the token set, add it to the token layer first, then use it.
5. Every component must work in both light and dark mode, support keyboard navigation, and have empty/loading/error states where applicable.
6. Match the visual direction: Linear precision plus warm, organic accents. Snappy and precise motion, never bouncy.
7. Do not use em dashes in any code, comments, copy strings, content files, or commit messages. Use periods, semicolons, parentheses, or a colon instead.
8. Dark mode is the design source of truth (Figma frames are dark mode). Light mode tokens are populated; design pass deferred to a later phase.

## Stack

- Framework: Next.js 15 (App Router) + TypeScript. Reason: public canvas URLs need OG tags and SSR for share previews.
- Hosting: Vercel (Phase 6+). Local dev only in Phase 1.
- Package manager: pnpm.
- Styling: Tailwind v4. CSS variables drive all tokens (DS-1). Tailwind utilities pull from those CSS variables. No hardcoded values anywhere.
- UI primitives: shadcn/ui (Radix underneath) for Dialog, Dropdown, Tooltip, Toast (Sonner), Tabs, Switch, Avatar accessibility plumbing. Hand-build the rest (Button, IconButton, Input, Badge, Skeleton, Spinner, Kbd) so we are not stripping shadcn defaults we do not want.
- Canvas library: react-flow (Phase 3 only).
- Fonts: Geist Sans and Geist Mono via the `geist` npm package (`import { GeistSans, GeistMono } from 'geist/font'`).
- Icons: `lucide-react`.

## Phased build

- Phase 1 (current): foundation. Tokens, primitives, `/design-system` route, AnnotationCard, HoverToolbar.
- Phase 2: layout shell (ProfileBlock, ViewTogglePill, AppMenu) plus canvas/grid page routes.
- Phase 3: react-flow integration, Node component variants, paste handling, link preview backend.
- Phase 4: connections, endpoint dots, hover toolbar wired to nodes, expanded overlay, reflection prompt.
- Phase 5: auth, database, image storage.
- Phase 6: sharing (public read-only routes plus OG tags), Are.na import.
- Phase 7: search, settings, polish, accessibility audit.

Stay strictly in phase scope. Phase 1 explicitly excludes auth, DB, image upload, link previews, react-flow, paste handling, sharing, Are.na import, search, settings page.

## Token system architecture

Three layers, strictly enforced. See DS-1 in `docs/canvas_requirements.md` for the full inventory.

- Layer 1 (primitive): raw values. Color scales (gray, warm, orange, red, green), spacing scale, radius, type, shadow, motion. Lives in `styles/tokens/primitives.css`. Also includes alpha aliases like `--alpha-white-06: rgba(255,255,255,0.06)` for the glass variant.
- Layer 2 (semantic): theme-aware mappings under `[data-theme="light"]` and `[data-theme="dark"]` on `<html>`. Lives in `styles/tokens/semantic.css`. Examples: `surface.background`, `surface.raised`, `surface.raised.glass`, `text.primary`, `accent.default`.
- Layer 3 (component): per-component bindings reading only from semantic, never from primitive. Lives in `styles/tokens/components.css`. Examples: `--annotation-card-bg`, `--button-primary-bg`.

Tailwind v4 theme reads CSS variables directly so utility classes resolve through the token system and theme-swap automatically.

A grep for hex values outside `styles/tokens/primitives.css` should return zero matches. That grep is part of Phase 1 Definition of Done.

### Surface model: hybrid solid plus glass variant

This is a deliberate decision based on reconciling DS-2 against the Figma frames (Canvas node `4992:982`, Grid node `5245:3988` in Portfolio-Website).

The Figma uses translucent alpha-on-white surfaces (`rgba(255,255,255,0.06)`) for several components, suggesting a glass design language. Decision: keep solid semantic surfaces as the default for the system, and add a single `surface.raised.glass` variant used only by the AnnotationCard.

- AnnotationCard: uses `surface.raised.glass` (translucent, `rgba(255,255,255,0.06)` in dark, `rgba(0,0,0,0.04)` in light).
- HoverToolbar buttons: use solid `surface.raised` (Figma shows these as glass; we are deviating intentionally to keep glass scoped to a single component).
- ProfileBlock chips: use solid `surface.raised` (same deviation, same reason).
- ViewTogglePill, dropdown menus, dialogs, all other surfaces: use solid `surface.raised`.

Implication: AnnotationCard will be the only component whose background visibly picks up the canvas underneath. That is intentional, the card is the visual signature of the product.

### Reconciled values vs DS-2 spec (smaller deltas, all baked in)

Where the Figma differs from DS-2, the Figma wins (per the spec's own "Pixel values approximate; refine against Figma during implementation" note). Adopted values:

- `surface.background` (dark): `#121212` (was `#0E0E10` in DS-2).
- `accent.default` (dark): `#ff8d46` (was `~#F47D3A` in DS-2). Warmer, brighter orange.
- AnnotationCard padding: 16px (was 24px in DS-2).
- AnnotationCard radius: 5px (was `radius.lg` 14px in DS-2). Maps to a new `radius.xs: 5px` primitive, since `radius.sm` is 6px.
- AnnotationCard width: 289px content (was 380px in DS-2).
- AnnotationCard default border: none (was 1px `border.subtle` in DS-2). Editing border remains 1px `accent.default`.
- HoverToolbar button diameter: 24px (was 32px in DS-2).
- ProfileBlock display name: Geist Medium 20px (was semibold 22px in DS-2).
- ProfileBlock chip radius: 5px (was `radius.sm` 6px). Use the new `radius.xs`.
- Dark-mode text colors: alpha-on-white (`rgba(255,255,255,0.9)` primary, `0.84` chip, `0.54` secondary, `0.52` tertiary) instead of solid grays. Functionally equivalent on solid backgrounds, faithful on translucent surfaces.

If you find a value in the spec that conflicts with the Figma, default to the Figma. If you find a value in neither, ask before introducing it.

## Phase 1 deliverables

Goal: lock in the foundation and prove the token system end to end via the design system route.

Definition of Done:

- `pnpm dev` boots with no console errors.
- `/design-system` route renders cleanly.
- Theme toggle flips light and dark instantly, no flash, no hardcoded colors anywhere.
- Tokens page displays the full three-layer architecture, resolved values update with the theme.
- All primitives in the list render correctly in both themes.
- `AnnotationCard` renders default + editing + hover (with HoverToolbar) states, dark mode matches Figma.
- Code is component-based, each component in its own file, clean named exports.

### Phase 1 task list

Walk top to bottom. Mark complete only when the task works in both themes with keyboard navigation.

1. Scaffold Next.js 15 + TypeScript + Tailwind v4 + pnpm. Install `geist`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`. Set up shadcn CLI; pull only Dialog, DropdownMenu, Tooltip, Sonner, Tabs, Switch, Avatar.
2. Build token system: primitive, semantic, component layers (three CSS files).
3. Implement theme switcher with no-flash inline script. Hand-rolled (~30 lines), no `next-themes` unless it earns its keep.
4. Build `/design-system` route shell + tokens page. Sidebar nav, theme toggle on every page, ComponentPreview wrapper, tokens table reading resolved values via `getComputedStyle`.
5. Primitives, in this order, each rendered in `/design-system` with all variants: Button → IconButton → Input → Tabs → Toggle → Tooltip → Toast → Dialog → DropdownMenu → Avatar → Badge → Skeleton → Spinner → Kbd.
6. HoverToolbar feature component: vertical-right and horizontal-below variants. 24px circular IconButtons (Edit pencil, Open-link chain). Solid `surface.raised`, no border. Render both variants in `/design-system/components/hover-toolbar`.
7. AnnotationCard feature component: default + editing + hover-with-toolbar. Glass surface (`surface.raised.glass`), 5px radius, 16px padding, 289px width, label/body typography per UI-12. Render in `/design-system/components/annotation-card`. Dark mode must match the Figma frame.
8. Verification pass: every DoD item.

### Suggested folder structure

```
app/
  layout.tsx                 # html lang, data-theme, geist font setup
  page.tsx                   # Phase 1: redirect or splash to /design-system
  design-system/
    layout.tsx               # sidebar nav + theme toggle
    page.tsx                 # landing
    tokens/page.tsx          # DS-4.4: full token table
    primitives/{button,icon-button,input,tabs,toggle,tooltip,toast,dialog,dropdown-menu,avatar,badge,skeleton,spinner,kbd}/page.tsx
    components/{hover-toolbar,annotation-card}/page.tsx
components/
  primitives/                # Button, IconButton, Input, Tabs, Toggle, Tooltip, Toast, Dialog, DropdownMenu, Avatar, Badge, Skeleton, Spinner, Kbd
  features/                  # HoverToolbar, AnnotationCard (Phase 1); more later
  design-system/             # DesignSystemSidebar, ThemeToggle, ComponentPreview, TokenTable
lib/
  theme.ts                   # theme provider + persistence + no-flash script
  cn.ts                      # tailwind class merge helper
  tokens.ts                  # typed catalog of token names for the tokens page
styles/
  tokens/
    primitives.css           # Layer 1: raw values
    semantic.css             # Layer 2: [data-theme="..."] mappings
    components.css           # Layer 3: per-component bindings
  globals.css                # imports the three token layers + Tailwind v4 directives
docs/
  canvas_prd.md              # binding spec
  canvas_requirements.md     # binding spec
```

## Figma reference

File: Portfolio-Website. Use the Figma MCP (configure in your Claude Code MCP setup) to read these frames directly when refining components.

- Canvas View frame: node `4992:982`. Shows the full canvas surface, profile block, view toggle pill, two annotation cards (one default, one editing/orange-bordered), David statue node with hover toolbar, four image nodes, three orange endpoint dots indicating connections.
- Grid View frame: node `5245:3988`. Shows the same design language in 3-column masonry. Two annotation cards rendered at full column width, mixed with image nodes.

The "Glass Effect" Figma variable indicates the glass treatment is intentional, not a one-off.

## Style rules

- No em dashes anywhere. Periods, parentheses, semicolons, or colons instead.
- Component files: one component per file, named exports, PascalCase filename matching the export.
- CSS variables: kebab-case (`--surface-background`, `--annotation-card-bg`).
- Token names in TS: dot-namespaced strings for the catalog (`surface.background`), but used as kebab-case CSS vars in actual styles.
- Comments: only when they add context the code does not. Do not narrate.
- Commit messages: imperative present tense, no em dashes.

## Things that are NOT in scope right now

Do not start any of these without an explicit phase change:

- Auth, sessions, user models.
- Database, persistence, image upload.
- Open Graph fetching, link previews.
- react-flow.
- Paste handling, drag and drop.
- Public sharing routes, OG tags.
- Are.na import.
- Search, command palette beyond a primitive shell.
- Settings page beyond a primitive shell.
- Production deployment.

## Conventions for working with me

- When I (Poro) ask for clarification before implementing, that is a feature, not a bug. Push back on ambiguity.
- When implementing, surface tradeoffs visually (rendered components in `/design-system`) rather than describing them in prose.
- Run a verification pass at the end of each phase. Not just "did it compile" but "does it match the Figma in dark mode and meet keyboard nav requirements."
- I will grep for hex values outside `styles/tokens/primitives.css` and treat any hit as a defect.
