# Canvas — Requirements & Design System Spec

**Companion to:** canvas_prd.md
**Audience:** Claude (build agent), Poro (designer/PM)
**Status:** v1, pre-build

---

## How to use this document

> **Instruction to Claude:** Treat every item in the Functional Requirements (FR) and UI Requirements (UI) sections as a **checklist**. Before implementing any screen or interaction, locate its FR and UI IDs and confirm every requirement is met. After implementing, walk the relevant IDs and self-verify. Do not introduce features or components not listed here without flagging them as scope additions. If a requirement is ambiguous, stop and ask before guessing.
>
> **Build order:** Always build in this order: (1) tokens, (2) primitive components, (3) the `/design-system` route to verify, (4) feature components composed from primitives, (5) pages composed from feature components, (6) integration. Do not skip ahead.
>
> **Token discipline:** Never hardcode a color, spacing, radius, font size, or motion value in a component. If a value isn't in the token set, add it to the token layer first, then use it. This applies in dark mode too.
>
> **Cross-check:** Every component must work in both light and dark mode, support keyboard navigation, and have a defined empty/loading/error state where applicable.

---

## Part 1 — Functional Requirements

### FR-1: Authentication & Profile

- **FR-1.1** Sign up and sign in via Google OAuth.
- **FR-1.2** Sign up and sign in via email + magic link (no password).
- **FR-1.3** Each user has a profile with: display name, role/title (single-line, e.g. "designer"), URL slug (auto-generated from name, editable), avatar (auto-generated initials in MVP, image upload v2), and an optional set of external profile links.
- **FR-1.4** URL slug is globally unique, lowercase, kebab-case (e.g. `pournami-pottekat`).
- **FR-1.5** External profile links: user can add up to 5 named external links (e.g. X, LinkedIn, Are.na, personal site, Substack). Each is a `{label, url}` pair. Labels are uppercased in display.
- **FR-1.6** Sign-out clears session and returns to landing.

### FR-2: Canvas as an Entity

- **FR-2.1** A user can create a new canvas. Default title: "Untitled."
- **FR-2.2** A canvas has: title (editable inline), owner, created-at, updated-at, visibility (private | public), node array, edge array.
- **FR-2.3** A canvas has a cover image, auto-selected from the first image node, replaceable later.
- **FR-2.4** A canvas can be deleted by its owner with a confirmation dialog.
- **FR-2.5** A user can have up to **2 canvases** in MVP. The "New canvas" action is disabled when the user is at cap, with a message explaining the limit.
- **FR-2.6** A user can list and switch between their canvases via the AppMenu (UI-16).
- **FR-2.7** Canvas hard cap: 30 nodes per canvas. When the cap is reached, paste is blocked with a clear message.

### FR-3: View Toggle (Grid ↔ Canvas)

- **FR-3.1** Every canvas page exposes a tab toggle: **Grid** | **Canvas**.
- **FR-3.2** Toggle persists per canvas (last-used view restored on revisit).
- **FR-3.3** Both views render the same node set.
- **FR-3.4** **Grid view:** masonry layout, 4 columns desktop, responsive collapse to 2 / 1 columns at narrower widths.
- **FR-3.5** **Canvas view:** infinite pan-and-zoom surface.
- **FR-3.6** Connections (edges) only render in Canvas view. Annotations render in both.

### FR-4: Pasting & Content Types

- **FR-4.1** Cmd+V (Ctrl+V on Windows) anywhere on the canvas creates a new node at cursor position (Canvas) or end of grid (Grid).
- **FR-4.2** Drag-drop image files from the filesystem also creates an image node.
- **FR-4.3** Supported content types in MVP:
  - Web links (any URL with Open Graph metadata)
  - Images (PNG, JPG, WebP, GIF)
  - Plain text
- **FR-4.4** Link previews must show: title, hero image (if present), source domain, favicon. Never raw URL.
- **FR-4.5** Document links (Figma, Google Docs, Notion) without OG fall back to: title (from `<title>`), favicon, source domain.
- **FR-4.6** Image upload max size: 10 MB. Error state if exceeded.
- **FR-4.7** Failed link preview: node still created, marked with a "couldn't load preview" state, retains the URL as fallback.
- **FR-4.8** Duplicate paste detection: if the exact same URL is already on the canvas, scroll/pan to it instead of creating a duplicate; toast: "Already on canvas."

### FR-5: Reflection Mode

- **FR-5.1** Reflection Mode is **on by default** for new users.
- **FR-5.2** Toggle in Settings turns it on/off globally (per user, not per canvas).
- **FR-5.3** When **on**: every paste action opens a reflection prompt: "Why does this resonate?" The node is created but visually pending until the prompt is answered or skipped.
- **FR-5.4** Skip is one keystroke (Esc) or one click ("Skip"). Skipping creates the node without an annotation.
- **FR-5.5** When **off**: pastes create nodes immediately. Annotations remain accessible via hover affordance.
- **FR-5.6** Annotations are always editable later regardless of mode.
- **FR-5.7** Annotation max length: 500 characters in MVP.

### FR-6: Nodes & Interactions

- **FR-6.1** Click a node → opens expanded overlay (FR-7).
- **FR-6.2** Hover a node → reveals: edit, annotate, connect handle, delete.
- **FR-6.3** Drag a node → repositions (Canvas view only).
- **FR-6.4** Multi-select via Shift+click or lasso (drag on empty canvas).
- **FR-6.5** Multi-select supports: bulk delete, bulk move.
- **FR-6.6** Delete a node → soft-confirm via toast with undo (5s window).
- **FR-6.7** Cmd+Z undoes the last action (paste, delete, move, connect, disconnect, annotate). Cmd+Shift+Z redoes.
- **FR-6.8** Undo/redo history persists for the current session, cleared on canvas exit.

### FR-7: Expanded Node Overlay (Hero Interaction)

- **FR-7.1** Clicking a node opens a centered overlay with a soft scrim over the canvas.
- **FR-7.2** Overlay contains, in order:
  - Full media (image at native size up to viewport bounds, or rendered link preview card, or text)
  - Annotation field (editable in place, autosaves on blur)
  - Connected nodes strip: horizontally scrollable thumbnails of every connected node, each clickable
- **FR-7.3** Clicking a connected-node thumbnail closes the current overlay and opens that node's overlay (with a brief fly-to motion in Canvas view).
- **FR-7.4** Click outside the overlay → closes it.
- **FR-7.5** Esc → closes it.
- **FR-7.6** Overlay supports keyboard navigation: Tab through interactive elements, Enter to activate.
- **FR-7.7** External link nodes have an "Open original" button in the overlay.

### FR-8: Connections (Edges)

- **FR-8.1** Connections are manual only in MVP.
- **FR-8.2** Drag from a node's edge handle to another node creates a connection.
- **FR-8.3** Connections are unlabeled lines.
- **FR-8.4** Connections render only in Canvas view. Endpoint dots persist on connected nodes in both Canvas and Grid view as a subtle "this is connected" signal.
- **FR-8.5** **Line rendering behavior** (Canvas only): connection lines are hidden by default. They render on hover or click of either endpoint node, the line itself, or any node selected via Shift+click or lasso. Endpoint dots remain visible regardless.
- **FR-8.6** Hovering a rendered connection reveals a delete affordance at its midpoint.
- **FR-8.7** Self-connections are not allowed.
- **FR-8.8** Duplicate connections (same A→B) are not allowed; second attempt is no-op.

### FR-9: Search

- **FR-9.1** A global search bar searches across the user's canvases.
- **FR-9.2** Search matches: node titles, annotations, canvas titles.
- **FR-9.3** Results grouped by canvas, with snippets showing matched text.
- **FR-9.4** Click a result → opens that canvas, focuses (and in Canvas view, flies to) the matching node.
- **FR-9.5** Empty-state: "No matches in your canvases."
- **FR-9.6** Semantic search is **out of scope for MVP** (see Roadmap in PRD).

### FR-10: Sharing & Privacy

- **FR-10.1** Each canvas has a privacy toggle: **Private** (default) | **Public**.
- **FR-10.2** Public canvases generate a stable URL: `app.tld/{slug}/{canvas-id}` or similar.
- **FR-10.3** Public view is read-only: pan, zoom, click-to-expand. No edit affordances. No paste. No connect.
- **FR-10.4** Public view shows attribution: "By [name]" with avatar, top-left or top-right.
- **FR-10.5** Public view shows a small Cosmos Canvas badge for attribution back to the product.
- **FR-10.6** Toggling a public canvas to private → existing public URL returns a "This canvas is private" page (not 404).
- **FR-10.7** OG tags for public canvas URLs: title = canvas title, image = canvas cover, description = "A taste canvas by [name]."

### FR-11: Are.na Import

- **FR-11.1** From the New Canvas flow, user can choose "Import from Are.na."
- **FR-11.2** OAuth flow against Are.na's v3 API.
- **FR-11.3** User selects one of their channels.
- **FR-11.4** Up to 30 most recent blocks are imported as nodes (cap matches FR-2.6).
- **FR-11.5** Initial layout: loose grid in Canvas view; standard masonry in Grid view.
- **FR-11.6** Block annotations from Are.na (descriptions/titles) are mapped to node annotations.
- **FR-11.7** Failed block fetches are skipped silently with a count toast: "5 blocks couldn't be imported."

### FR-12: Settings

- **FR-12.1** Settings page accessible from user menu.
- **FR-12.2** Sections: Profile (name, slug), Appearance (theme: light | dark | system), Reflection Mode (on | off), Account (sign out, delete account).

### FR-13: Theming

- **FR-13.1** Three theme states: light, dark, system (follows OS).
- **FR-13.2** Theme persists per user.
- **FR-13.3** Switching is instant (no flash, no reload).
- **FR-13.4** Both themes meet WCAG AA contrast for body text and interactive elements.

### FR-14: Keyboard Shortcuts

- **FR-14.1** Required shortcuts in MVP:
  - **Cmd/Ctrl + V** — paste
  - **Cmd/Ctrl + Z** — undo
  - **Cmd/Ctrl + Shift + Z** — redo
  - **Cmd/Ctrl + K** — open command palette / search
  - **Esc** — close overlay, deselect, dismiss prompt
  - **Delete / Backspace** — delete selected node(s) or connection
  - **Space + drag** — pan canvas
  - **Cmd/Ctrl + scroll** — zoom canvas
  - **Cmd/Ctrl + 0** — fit canvas to view
  - **Cmd/Ctrl + 1** — zoom to 100%
  - **Shift + click** — multi-select
  - **Tab / Shift+Tab** — focus traversal in overlays
- **FR-14.2** A `?` keystroke opens a shortcut cheat sheet modal.

### FR-15: States (Empty, Loading, Error)

- **FR-15.1** First-run empty canvas: centered prompt, "Paste anything to begin (Cmd+V)."
- **FR-15.2** Empty My Canvases: prompt to create first canvas.
- **FR-15.3** Empty search results: "No matches in your canvases."
- **FR-15.4** Link preview loading: skeleton card with shimmer.
- **FR-15.5** Image upload progress: ring indicator on the placeholder node.
- **FR-15.6** Are.na import progress: linear bar with block count.
- **FR-15.7** Network error: toast with retry action.
- **FR-15.8** Canvas-at-cap: paste is blocked, message: "30-node limit reached. Remove a node or start a new canvas."
- **FR-15.9** Public-canvas-not-found: clean error page, link back to the user's profile.

---

## Part 2 — UI Requirements

### UI-1: Layout & Navigation

The product is **canvas-first**. There is no top bar or persistent sidebar. The full viewport is the work surface; UI controls dock to the bottom.

- **UI-1.1** Bottom-left: **Profile block** (always visible).
  - Line 1: display name, sans-serif, ~22px, semibold, primary text color.
  - Line 2: role/title, sans-serif, ~16px, regular, tertiary text color.
  - Line 3 (optional): row of external profile chips (e.g. `X(TWITTER)`, `LINKEDIN`, `ARE.NA`), monospace caps, ~11px, in dark rounded chips with subtle border.
  - Profile block is non-interactive in the canvas owner's own view (it's identity, not navigation). Each chip is clickable and opens the corresponding URL in a new tab.
- **UI-1.2** Bottom-center: **View toggle pill**.
  - Single pill containing two segments: `CANVAS` (with cursor icon) and `GRID` (with grid icon).
  - Active segment has a slightly lighter surface fill; inactive is transparent.
  - Monospace caps label, ~12px, with letter-spacing.
  - Pill background: `surface.raised`, with subtle border. Floating, with shadow-md.
- **UI-1.3** Bottom-right: reserved for **canvas-level actions** (share, more menu). Not in this frame yet.
- **UI-1.4** **Top-right: AppMenu** (UI-16). Floating avatar/menu button that opens a panel containing: current canvas title (editable), canvas list with "New canvas," search, share, settings, sign out. This is the single navigation surface for the product.
- **UI-1.5** Empty state imagery is restrained, geometric, on-brand. No illustrations of people or stock graphics.

### UI-2: Canvas View

- **UI-2.1** Background: `surface.background` (very dark in dark mode), with subtle dot grid pattern. Dots are `border.subtle`, ~1.5px diameter, ~24px spacing. Grid scales with zoom.
- **UI-2.2** Pan cursor: grab/grabbing.
- **UI-2.3** Zoom range: 25% to 200%.
- **UI-2.4** Mini-map: bottom-right corner of canvas viewport, toggleable, shows node positions. Defaults to off.
- **UI-2.5** **Connection visualization** (3-layer hierarchy):
  - **Background dot grid**: subtle gray dots, ~1.5px diameter, ~24px spacing, `border.subtle` color at ~40% opacity. This is canvas texture, not connection state.
  - **Connection endpoint dots**: small filled circles in `accent.default` (warm orange), ~6px diameter, anchored to the connection's endpoints on each connected node's bounding edge. **Always visible.** Signals "this node has a connection," without forcing the line into the visual.
  - **Connection line**: 1.5px stroke in `accent.default`, slightly curved (not orthogonal). **Renders only on hover or click** of either endpoint node, the line itself, or any selected node. Includes a small delete affordance at the line midpoint when hovered.
  - When no node is hovered or selected, only the orange endpoint dots are visible. This keeps the canvas quiet and lets the user reveal the relational layer on demand.
- **UI-2.6** Selected node: 1.5px focus ring in `accent.default`, ~6px outside the node's edge.
- **UI-2.7** Multi-select lasso: 1px dashed `accent.default`, 8% accent fill.
- **UI-2.8** Nodes are placed at user-defined positions, drag to move, no snap-to-grid in MVP.

### UI-3: Grid View

- **UI-3.1** Masonry layout, **3 fixed-width columns at ≥1024px**, 2 columns at ≥640px, 1 column below.
- **UI-3.2** Column gutter: ~24px (token: `space.6`). Row gutter: ~24px.
- **UI-3.3** Each grid item displays at the natural aspect ratio of its content. Items are not cropped.
- **UI-3.4** Each grid item shows: media or annotation card. A small annotation indicator (8px dot in accent color) appears on a corner if a non-annotation node has an annotation attached; hover reveals snippet.
- **UI-3.5** Click a grid item → opens the same expanded overlay used in Canvas view.
- **UI-3.6** Grid order: chronological by paste time, newest first. (Spatial layout from Canvas view does not affect Grid order in MVP.)
- **UI-3.7** **Connection endpoint dots in Grid view**: nodes that participate in a connection display a small endpoint dot at a corner. In Grid view, these dots default to `border.strong` (dark grey) and shift to `accent.default` (orange) on hover of the item. This is gentler than Canvas view (where dots are always orange), since Grid hides the relational structure and shouldn't shout. Connection lines themselves never render in Grid view.

### UI-4: Node Component (Canvas)

- **UI-4.1** **Image node:** image rendered at natural aspect, max-width ~480px in Canvas view, max-width = column width in Grid view. Border radius `radius.md` (~10px). No visible border in default state. Slight elevation (shadow-sm) on hover.
- **UI-4.2** **Link node (card):** hero image (top, full-bleed within card), title (1-2 lines, sans-serif, primary text), source domain + favicon (bottom, tertiary text). Card uses `surface.raised`, border `border.subtle`, radius `radius.md`. Default width 320px.
- **UI-4.3** **Text node:** `surface.raised` background, sans-serif body, primary text color, padded (~20px), radius `radius.md`. Default width 320px. Max 12 lines visible (truncated with ellipsis). Click to expand.
- **UI-4.4** **Annotation node** (first-class type, see UI-12). Cards labeled "WHAT MAKES THIS GREAT?" with body text below.
- **UI-4.5** Annotation indicator on non-annotation nodes: 8px filled dot in `accent.default`, top-right corner of the node, present when an annotation is attached.
- **UI-4.6** **Hover toolbar** (UI-13): appears on node hover, with two layouts (vertical-right in Canvas, horizontal-below in Grid).
- **UI-4.7** Selected node: 1.5px focus ring in `accent.default`, ~6px offset.

### UI-5: Expanded Overlay

- **UI-5.1** Backdrop: 60% opacity scrim using semantic surface-overlay token.
- **UI-5.2** Overlay container: max 80vw × 80vh, centered, soft shadow, rounded corners (radius-lg).
- **UI-5.3** Sections (top to bottom): media (60% of vertical space), annotation (editable text area), connected-nodes strip (horizontal scroll, ~80px tall).
- **UI-5.4** Open animation: scale from 0.92 to 1.0 + opacity 0 to 1, duration ~180ms, easing ease-out-cubic.
- **UI-5.5** Close animation: reverse, duration ~140ms.
- **UI-5.6** Connected-node thumbnail: 64×64, rounded corners, hover scale to 1.05.

### UI-6: Reflection Prompt

- **UI-6.1** Inline modal centered on viewport, not full-screen.
- **UI-6.2** Heading: "Why does this resonate?"
- **UI-6.3** Subtext: small, "Take 10 seconds. You can always skip."
- **UI-6.4** Text area: ~3 rows, character counter at 500.
- **UI-6.5** Actions: primary "Save" (Cmd+Enter), secondary "Skip" (Esc).
- **UI-6.6** Auto-focuses the text area on open.

### UI-7: Settings Page

- **UI-7.1** Two-pane layout: nav on left, content on right.
- **UI-7.2** Each setting is a row with label + control + helper text underneath.
- **UI-7.3** Reflection Mode is the most prominent setting in Appearance/Behavior.

### UI-8: Search

- **UI-8.1** Cmd+K opens a centered command-palette-style search.
- **UI-8.2** Top input, autofocused. Below: grouped results.
- **UI-8.3** Up/Down arrows navigate, Enter opens.
- **UI-8.4** Result row: small thumbnail + title + matched-text snippet + canvas name.

### UI-9: Public Canvas View

- **UI-9.1** Identical Canvas/Grid rendering minus all edit affordances.
- **UI-9.2** Top bar shows: "[Canvas Title] by [Name]" + Cosmos Canvas badge.
- **UI-9.3** No sidebar.
- **UI-9.4** Footer: small "Made with Cosmos Canvas" CTA link.

### UI-10: Motion

- **UI-10.1** Personality: snappy and precise (Linear-flavored). No bouncy springs.
- **UI-10.2** Standard durations: micro 80ms, small 140ms, medium 200ms, large 320ms.
- **UI-10.3** Easing: ease-out-cubic for entrances, ease-in-cubic for exits, ease-in-out-cubic for movement.
- **UI-10.4** Respect `prefers-reduced-motion`: disable scale/translate, keep opacity transitions only.

### UI-11: Accessibility

- **UI-11.1** All interactive elements keyboard-reachable.
- **UI-11.2** Focus rings visible on all focusable elements.
- **UI-11.3** Modal/overlay focus traps; Esc always closes.
- **UI-11.4** All icons paired with text labels or aria-labels.
- **UI-11.5** Connection lines have aria-describedby for screen readers in connected-nodes strip.
- **UI-11.6** Color is never the sole signal (icons + text accompany).

### UI-12: Annotation Card (first-class component)

The annotation card is the visual signature of the product. Spec carefully.

- **UI-12.1** Structure (top to bottom):
  - **Label**: `WHAT MAKES THIS GREAT?` in monospace caps, ~11px, `text.tertiary`, letter-spacing ~0.08em. Fixed string in MVP; configurable in v2.
  - **Body**: sans-serif, ~16px, `text.secondary` (slightly muted to keep label-body hierarchy), regular weight, line-height 1.5.
- **UI-12.2** Container:
  - Background: `surface.raised`.
  - Border: 1px `border.subtle` in default state.
  - Radius: `radius.lg` (~14px).
  - Padding: 24px.
  - Default width: 380px (Canvas view).
- **UI-12.3** States:
  - Default: 1px `border.subtle`.
  - Editing: 1px `accent.default` (warm orange) border, replaces the default border. Triggered by clicking the card; persists while the body is being edited; reverts to default on save (Cmd+Enter) or cancel (Esc). There is no separate "selected but not editing" state, click-to-select and click-to-edit are the same action.
  - Hover: shows hover toolbar (UI-13).
- **UI-12.4** Edit affordance: clicking the card opens the body in inline edit mode. The label stays as a label. Cmd+Enter saves; Esc cancels.
- **UI-12.5** In Grid view, annotation cards render as items in the masonry, full column width, same internal structure.

### UI-13: Hover Toolbar (Node and Annotation)

Two layout variants depending on view.

- **UI-13.1** Toolbar contains: **Edit** (pencil icon) and **Open link** (chain icon) as circular icon buttons. Each button: 32px diameter, `surface.raised` background, `border.subtle` border, `text.secondary` icon at ~16px.
- **UI-13.2** **Canvas view variant**: vertical stack, anchored to the right outer edge of the node, ~12px gap from node, ~8px between buttons.
- **UI-13.3** **Grid view variant**: horizontal pair, anchored ~12px below the bottom-left of the item, ~8px between buttons.
- **UI-13.4** Toolbar appears on hover/focus of the node, persists while hovering the toolbar itself, dismisses on mouse leave with a 100ms delay.
- **UI-13.5** Buttons are keyboard-focusable when the parent node is focused (Tab moves into toolbar).
- **UI-13.6** Hover state on each button: background lifts to `surface.subtle`, icon color to `text.primary`.

### UI-14: View Toggle Pill (bottom-center)

- **UI-14.1** Single pill component, two segments: `CANVAS` and `GRID`.
- **UI-14.2** Each segment: cursor-or-grid icon (16px) + monospace caps label (~12px, letter-spacing 0.08em), padded ~12px vertical, ~20px horizontal.
- **UI-14.3** Pill container: `surface.raised`, 1px `border.subtle`, radius `radius.full`, shadow-md.
- **UI-14.4** Active segment: `surface.subtle` background fill within the pill, `text.primary` color. Inactive: transparent fill, `text.secondary` color.
- **UI-14.5** Position: fixed, bottom-center of viewport, ~40px from bottom edge.
- **UI-14.6** Click switches view with a 140ms cross-fade.
- **UI-14.7** Keyboard: Tab focuses the pill, ←/→ switches segments.

### UI-15: Profile Block (bottom-left)

- **UI-15.1** Always visible, fixed to the bottom-left, ~40px from bottom and left edges.
- **UI-15.2** Layout (top to bottom):
  - Display name: sans-serif, ~22px, semibold, `text.primary`.
  - Role/title: sans-serif, ~16px, regular, `text.tertiary`. Single line.
  - External profile chips: row of monospace caps chips, ~8px gap.
- **UI-15.3** Chip styling:
  - Background: `surface.raised`.
  - Border: 1px `border.subtle`.
  - Radius: `radius.sm`.
  - Padding: 4px 10px.
  - Text: monospace caps, ~11px, `text.secondary`.
  - Hover: border becomes `border.default`, text becomes `text.primary`.
  - Click: opens external URL in new tab.
- **UI-15.4** On a public canvas viewed by someone else, the profile block reads as attribution. On the owner's own canvas, it reads as identity. Visual treatment is identical.

### UI-16: AppMenu (top-right)

The single navigation surface. Replaces the top bar and sidebar from typical web apps.

- **UI-16.1** Trigger: circular avatar button, 36px diameter, fixed top-right ~24px from top and right edges.
  - Default: user's avatar (initials in `surface.raised`, primary text).
  - Hover: subtle ring in `border.default`.
  - On panel open: ring switches to `accent.default`.
- **UI-16.2** Panel: opens downward from the avatar, ~320px wide, `surface.raised` background, 1px `border.subtle`, radius `radius.lg`, shadow-lg.
- **UI-16.3** Panel sections (top to bottom):
  - **Current canvas**: editable title input (inline, primary text, sans-serif, ~16px). Renaming saves on blur or Enter.
  - **Canvas list**: scrollable list of the user's canvases (max 2 in MVP, see FR-2.5). Each row: small thumbnail (32×32), title, last-modified. Active canvas marked with a `accent.default` indicator dot. Click a row to switch.
  - **New canvas** button: primary button, full width of section. Disabled with a tooltip when the user is at the 2-canvas cap. Also offers "Import from Are.na" as a secondary action (also disabled at cap).
  - **Share**: opens the share dialog for the current canvas (private/public toggle, copy-link).
  - **Search**: opens the Cmd+K palette.
  - **Settings**: opens the settings page.
  - **Sign out**: destructive style.
- **UI-16.4** Open animation: scale 0.96 → 1.0 + opacity 0 → 1, duration 140ms, ease-out-cubic. Origin top-right (anchors to the avatar).
- **UI-16.5** Close: click outside, Esc, or click the avatar again.
- **UI-16.6** Keyboard: Tab traverses sections, Up/Down within canvas list, Enter to activate.
- **UI-16.7** When viewing a public canvas (not the owner), the AppMenu is replaced by a smaller "Made with Cosmos Canvas" link or a "Sign in" affordance. Owner-only items are hidden.

---

## Part 3 — Design System Spec

### DS-1: Token Architecture

Three layers, strictly enforced.

**Layer 1 — Primitive (raw values, no semantics)**
- `color.gray.50` … `color.gray.950` (cool, slightly desaturated neutrals)
- `color.warm.50` … `color.warm.950` (warm beige/cream family for light-mode surfaces)
- `color.orange.50` … `color.orange.950` (Cosmos-inspired warm accent; primary brand color)
- `color.red.50` … `color.red.950` (destructive)
- `color.green.50` … `color.green.950` (success)
- `space.0` … `space.32` (4px scale: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- `radius.none, sm, md, lg, xl, full` (sm: 6px, md: 10px, lg: 14px, xl: 20px)
- `font.sans, font.mono` (sans = Geist Sans, mono = Geist Mono, via the `geist` npm package)
- `fontSize.xs (11), sm (12), base (14), md (16), lg (18), xl (22), 2xl (28), 3xl (36)`
- `fontWeight.regular (400), medium (500), semibold (600)`
- `lineHeight.tight (1.2), normal (1.5), relaxed (1.7)`
- `letterSpacing.tight, normal, wide (0.04em), wider (0.08em)`
- `shadow.xs, sm, md, lg, xl`
- `motion.duration.micro (80ms) / small (140ms) / medium (200ms) / large (320ms)`
- `motion.easing.in / out / inout` (cubic)

**Layer 2 — Semantic (meaning, theme-aware)**
Light and dark each map differently to primitives.

- `surface.background` — main canvas / page background
- `surface.subtle` — sidebars, secondary panels
- `surface.raised` — cards, nodes
- `surface.overlay` — modal scrims
- `border.subtle` — hairline dividers
- `border.default` — card borders
- `border.strong` — emphasized borders
- `border.focus` — focus ring
- `text.primary` — body
- `text.secondary` — supporting
- `text.tertiary` — captions, metadata
- `text.inverse` — on accent surfaces
- `accent.default` — primary actions, selection
- `accent.hover`, `accent.active`
- `destructive.default`, `destructive.hover`
- `success.default`
- `warning.default`

**Layer 3 — Component (per-component bindings)**
Each component pulls from semantic only, never from primitive.

- `button.primary.bg = accent.default`
- `button.primary.bg.hover = accent.hover`
- `button.primary.fg = text.inverse`
- `node.bg = surface.raised`
- `node.border = border.default`
- `node.border.selected = border.focus`
- `connection.stroke = border.strong`
- `connection.stroke.hover = accent.default`
- `overlay.scrim = surface.overlay`
- `tab.active.bg = surface.raised`
- `tab.active.fg = text.primary`
- `tab.inactive.fg = text.secondary`
- ...and so on for every component in DS-3

### DS-2: Dark Mode Mapping (anchored in Figma designs)

Dark mode is the design source of truth (the Figma frames are dark mode). Light mode is a deliberate semantic remap, not an inversion.

Approximate hex values, to be tuned during implementation against the Figma:

| Semantic | Light | Dark |
|---|---|---|
| `surface.background` | `warm.50` (#FAF7F2) | `gray.950` (#0E0E10) |
| `surface.subtle` | `warm.100` (#F2EEE7) | `gray.900` (#161618) |
| `surface.raised` | `white` | `gray.850` (#1C1C1F) |
| `surface.overlay` | `gray.950` @ 60% | `gray.950` @ 70% |
| `border.subtle` | `warm.200` (#E6E0D6) | `gray.800` (#262629) |
| `border.default` | `warm.300` (#D6CEBE) | `gray.750` (#34343A) |
| `border.strong` | `gray.400` | `gray.600` (#4A4A52) |
| `border.focus` | `orange.500` | `orange.400` |
| `text.primary` | `gray.950` | `gray.50` (#F2F2F2) |
| `text.secondary` | `gray.700` | `gray.300` (#C4C4C8) |
| `text.tertiary` | `gray.500` | `gray.500` (#7A7A82) |
| `text.inverse` | `white` | `gray.950` |
| `accent.default` | `orange.600` | `orange.500` (~#F47D3A based on the design) |
| `accent.hover` | `orange.700` | `orange.400` |
| `accent.subtle` | `orange.50` | `orange.950` @ 40% |
| `destructive.default` | `red.600` | `red.500` |
| `dot-grid.color` | `warm.200` | `gray.800` |

Notes:
- The annotation card "selected" border, the connection-point dots, and the focus ring all draw from `accent.default`. The orange is the product's emotional center, not just a hover color.
- The dot-grid pattern uses `dot-grid.color` at low opacity (~40%) so it reads as texture, not foreground.

### DS-3: Component Inventory

**Primitives (build first, expose in /design-system)**
- Button (primary, secondary, ghost, destructive; sm, md, lg)
- IconButton
- Input (text, textarea)
- Tab (tab group + tab item)
- Toggle / Switch
- Tooltip
- Toast
- Dialog / Modal
- Dropdown Menu
- Avatar
- Badge
- Skeleton
- Spinner
- Kbd (keyboard key indicator)

**Feature components (composed from primitives)**
- ProfileBlock (bottom-left identity, UI-15)
- ViewTogglePill (bottom-center pill, UI-14)
- Node (variants: link, image, text)
- AnnotationCard (UI-12) — first-class component, the visual signature
- HoverToolbar (UI-13) — vertical-right and horizontal-below variants
- ConnectionLine (with endpoint dots)
- ConnectionPointDot (UI-2.5)
- ExpandedOverlay
- ReflectionPrompt
- LinkPreviewCard
- GridItem (wraps Node for masonry)
- SearchPalette
- CanvasMiniMap
- ZoomControls
- ShortcutsCheatSheet
- EmptyState
- AppMenu (top-right navigation surface, UI-16)

### DS-4: /design-system Route

- **DS-4.1** Available at `/design-system`, accessible only in dev (or behind a flag).
- **DS-4.2** Navigation: left sidebar listing all primitives + feature components.
- **DS-4.3** Each component page shows:
  - Name + one-sentence description
  - All variants rendered live
  - Theme toggle (light/dark) at the top of the page
  - Token references used by the component
  - Code snippet (collapsible)
  - Accessibility notes
- **DS-4.4** Tokens page: a dedicated page showing all primitive, semantic, and component tokens with their resolved values in the current theme.

### DS-5: Implementation Notes

- **DS-5.1** CSS variables for all semantic tokens, scoped under `[data-theme="light"]` and `[data-theme="dark"]` on the document root.
- **DS-5.2** Theme switch is a single attribute change, no class swap on every component.
- **DS-5.3** Use Radix Primitives (or shadcn) for Dialog, Dropdown, Tooltip, Toast, Tabs accessibility plumbing.
- **DS-5.4** Canvas surface: `react-flow` for nodes/edges/pan/zoom. Customize node and edge components to match the design system.
- **DS-5.5** Storybook is **not** used in MVP. The in-app `/design-system` route is the source of truth.

---

## Part 4 — Build Checklist (Claude-facing)

> Walk this checklist top to bottom. Do not skip ahead. Mark each item complete only when it works in both themes, with keyboard navigation, and matches the relevant FR/UI IDs.

**Foundation**
- [ ] Set up token architecture (DS-1): primitive, semantic, component layers as CSS variables.
- [ ] Implement light/dark theme switcher with `prefers-color-scheme` fallback (FR-13, DS-2).
- [ ] Stand up `/design-system` route with tokens page (DS-4).

**Primitives**
- [ ] Build each component in DS-3 primitives list, render in `/design-system`.

**Auth & Profile**
- [ ] Google OAuth + email magic link (FR-1).
- [ ] Profile model with slug generator (FR-1.3, FR-1.4).
- [ ] Settings page (FR-12, UI-7).

**Canvas Entity**
- [ ] Canvas CRUD, title editing, cover auto-pick (FR-2).
- [ ] My Canvases view (FR-2.5).

**View Toggle**
- [ ] Tab toggle between Grid and Canvas (FR-3, UI-1.1).
- [ ] View persistence per canvas (FR-3.2).

**Pasting & Nodes**
- [ ] Paste handler for links, images, text (FR-4).
- [ ] Open Graph fetcher with fallbacks (FR-4.4, FR-4.5, FR-4.7).
- [ ] Image upload with size cap (FR-4.6).
- [ ] Node component variants (UI-4).
- [ ] Hover toolbar (UI-4.6).
- [ ] Node-cap enforcement (FR-2.6, FR-15.8).

**Reflection Mode**
- [ ] Reflection prompt UI (UI-6).
- [ ] On/off toggle in settings (FR-5.2).
- [ ] Skip behavior (FR-5.4).

**Canvas Interactions**
- [ ] Pan, zoom, mini-map (UI-2).
- [ ] Drag-to-move, multi-select, lasso (FR-6.3, FR-6.4, FR-6.5).
- [ ] Connections: create, hover-delete, no-self, no-dupe (FR-8).
- [ ] Undo/redo stack (FR-6.7).
- [ ] All shortcuts (FR-14).
- [ ] Shortcuts cheat sheet (`?`) (FR-14.2).

**Expanded Overlay**
- [ ] Overlay layout: media + annotation + connected-nodes strip (FR-7.2, UI-5).
- [ ] Fly-to-connected-node (FR-7.3, UI-5).
- [ ] Outside-click + Esc close (FR-7.4, FR-7.5).

**Grid View**
- [ ] Masonry, 4-col responsive (UI-3).
- [ ] Annotation indicator on grid items (UI-3.3).

**Search**
- [ ] Cmd+K command palette (UI-8).
- [ ] Title + annotation match (FR-9.2).
- [ ] Result jump-to (FR-9.4).

**Sharing**
- [ ] Public/private toggle (FR-10.1).
- [ ] Public canvas read-only route (FR-10.3, UI-9).
- [ ] OG tag generation (FR-10.7).
- [ ] Private-flip page handling (FR-10.6).

**Are.na Import**
- [ ] OAuth + channel picker (FR-11.1, FR-11.2, FR-11.3).
- [ ] Block fetch + node mapping (FR-11.4, FR-11.6).
- [ ] Progress UI (FR-15.6).

**Polish**
- [ ] Every empty/loading/error state from FR-15.
- [ ] Motion compliance with UI-10.
- [ ] Accessibility audit against UI-11.
- [ ] Both themes, both views, full keyboard pass.

---

## Part 5 — Canvas View Design Spec

**Source:** Figma node `4992-982` in Portfolio-Website file. Design analyzed from PNG export. Pixel values approximate; refine against Figma during implementation.

### 5.1 Frame & Background

- Viewport: full window, no chrome.
- Background: `surface.background` in dark mode, ~`#0E0E10`.
- Dot grid overlay: dots at ~`gray.800` color, ~1.5px diameter, ~24px spacing, ~40% opacity. Scales with zoom.

### 5.2 Layout Anchors

- **Bottom-left** (~40px from bottom and left): Profile block (UI-15).
- **Bottom-center** (~40px from bottom): View toggle pill (UI-14).
- **Bottom-right** (~40px from bottom and right): reserved for canvas-level actions (share, etc.). Not in this frame.
- **Top-right**: reserved for AppMenu / canvas switcher (UI-1.4). Not in this frame.

### 5.3 Nodes (as observed in design)

**Image nodes**
- Rendered at natural aspect, varying widths (~280px to ~600px).
- Border radius: `radius.md` (~10px).
- No visible default border.
- No visible default shadow. Slight hover elevation.

**Annotation cards** (UI-12)
- Width: ~380px.
- Internal padding: ~24px.
- Background: `surface.raised`.
- Default border: 1px `border.subtle`.
- **Selected/focused state**: 1px `accent.default` border (warm orange), as shown on the second annotation in the frame.
- Label: monospace caps `WHAT MAKES THIS GREAT?`, ~11px, `text.tertiary`, letter-spacing ~0.08em.
- Body: sans-serif, ~16px, `text.secondary`, line-height 1.5.
- Spacing label-to-body: ~16px gap.

### 5.4 Hover Toolbar (visible on the David statue node)

- Two circular buttons, vertically stacked, anchored ~12px right of the node's right edge.
- Each button: 32px diameter, `surface.raised`, 1px `border.subtle`, icon ~16px in `text.secondary`.
- Top: pencil/edit. Bottom: chain/link.
- Gap between buttons: ~8px.
- Toolbar is vertically centered on the node's height.

### 5.5 Connection Visualization (resolved)

- **Background dot grid** (visible across the frame): subtle gray dots at ~1.5px diameter, ~24px spacing. This is canvas texture and is unrelated to connections.
- **Endpoint dots** (visible at top of painting, right of David, right of second annotation card): filled circles in `accent.default` (~6px), anchored to the bounding edge of each connected node. Always visible. Signals "this node has a connection."
- **Connection lines**: not drawn in the static frame because no node is hovered or selected. Behavior in the live product: lines render in `accent.default` (1.5px, gently curved) only when the user hovers or clicks a connected node, or selects connected nodes. This keeps the canvas quiet by default and lets relationships surface on demand.

### 5.6 View Toggle Pill (visible bottom-center)

- Pill container: ~210px wide, ~44px tall, radius `radius.full`, `surface.raised`, 1px `border.subtle`, soft shadow.
- Two segments split evenly.
- Active segment (`CANVAS` in this frame): subtly lighter fill, cursor icon (16px) + label.
- Inactive segment (`GRID`): transparent fill, grid icon (16px) + label.
- Label: monospace caps, ~12px, letter-spacing ~0.08em.
- Padding: ~12px vertical, ~20px horizontal per segment.

### 5.7 Profile Block (visible bottom-left)

- Display name: "Pournami Pottekat", sans-serif, ~22px, semibold, `text.primary`.
- Role: "designer", sans-serif, ~16px, regular, `text.tertiary`. ~6px below name.
- Chips row: 8px gap below role.
- Each chip: monospace caps text (`X(TWITTER)`, `LINKEDIN`, `ARE.NA`), ~11px, padding 4px 10px, `surface.raised`, 1px `border.subtle`, radius `radius.sm`, `text.secondary`.

---

## Part 6 — Grid View Design Spec

**Source:** Figma node `5245-3988` in Portfolio-Website file. Same design language as Canvas view.

### 6.1 Frame & Background

- Same dark background and dot-grid as Canvas view.

### 6.2 Layout Anchors

- Same bottom-left (Profile) and bottom-center (View toggle, with `GRID` segment now active) as Canvas view.

### 6.3 Grid Layout

- **3 fixed-width columns** at desktop. Approximate widths: ~330px each at the captured viewport, with ~24px gutters horizontally and vertically.
- Masonry packing: items flow into the column with the shortest current height.
- Items maintain natural aspect ratio.
- Side margins on the page: ~340px left/right at this viewport (so the grid is centered with significant negative space). For implementation, treat as a max-width container ~1080px centered.

### 6.4 Items

- Image items: same `radius.md`, no border, natural aspect.
- Annotation cards: same as Canvas view, but rendered at full column width (~330px). Internal structure unchanged.
- Items can mix freely; in the design, two annotation cards sit alongside images in the same masonry.

### 6.5 Hover Toolbar (visible on the second annotation in the design)

- Two circular buttons, **horizontally arranged**, anchored ~12px below the bottom-left of the item.
- Same 32px diameter, same icon set as Canvas view.
- Gap between buttons: ~8px.

### 6.6 Connection Indicators in Grid

- Connection-point dots also appear in Grid view (visible on the two annotation cards in the design), suggesting connection state is preserved across views.
- Lines themselves are not relevant in Grid view (no spatial layout).
- Dots in Grid view should be interpreted as: "this item participates in a connection, click into Canvas view to see relations."
- **Open question:** confirm whether dots should appear in Grid view at all, or only in Canvas. Current spec keeps them as a subtle signal of relational items.

---

## Open Questions

These are remaining questions to resolve. The big architectural and visual ones are now locked.

1. **Light mode design pass.** The Figma frames are dark mode only. Light mode is specified in tokens (DS-2) but needs a design pass before launch.

### Resolved

- **Pricing.** Free for all Cosmos users in MVP.
- **View toggle.** Bottom-center pill, Canvas | Grid (matches design).
- **Search.** Keyword search on titles and annotations in MVP. Semantic search in v2.
- **Privacy and discovery.** Public/private toggle per canvas, private by default. Link-only access in MVP. Name-based discovery in v2.
- **Reflection Mode default.** On, validated post-launch.
- **Grid columns.** 3 columns (revised from 4 to match Figma).
- **Accent color.** Warm orange (revised from blue to match Figma's Cosmos warmth).
- **App-level navigation surface.** Top-right AppMenu (UI-16) handles canvas switching, title editing, share, settings. No top bar, no sidebar.
- **Connection rendering (Canvas).** Endpoint dots always visible in `accent.default`. Lines render only on hover/click of either endpoint node or the line itself.
- **Connection endpoint dots (Grid).** `border.strong` (dark grey) by default, shift to `accent.default` (orange) on item hover.
- **Slug collisions.** Prompt the user to choose a different slug.
- **Canvas count.** 2 canvases per user in MVP. Caps a user's footprint until we validate retention and storage economics.
- **Profile block.** Same component, same visual treatment in owner view and public view. Reads as identity to the owner, attribution to a viewer; no visual differentiation.
- **Annotation card states.** Single active state with one border treatment. Default → click → editing (orange border) → save/cancel → default. No separate "selected but not editing" state.
