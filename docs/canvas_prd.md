# Canvas

### A Reflection Layer for Cosmos

**Author:** Poro
**Status:** Pitch draft, v1
**Audience:** Cosmos product and founding team

---

## TL;DR

Cosmos is the best place on the internet to collect things you love. But taste isn't built by collecting, it's built by reflecting. **Canvas** is a new view mode on Cosmos clusters that turns them from grids into spatial, connected, annotated maps of your taste. Users paste, arrange, connect, and, critically, write about why things resonate. It's Obsidian's graph for designers, layered on top of Cosmos's existing save-and-curate flow.

Same data, new lens. Same users, deeper loop.

---

## The Problem

Designers using Cosmos, Are.na, Pinterest, and Milanote collect constantly but rarely articulate why. The grid format rewards volume and optimizes for scanning, but it flattens every relationship between items into a single signal: "they live in the same cluster."

Two consequences:

1. **Taste stays tacit.** Designers absorb patterns without being able to name them, which makes those patterns harder to apply deliberately in their work.
2. **Collections become graveyards.** Items get saved, not revisited, because no surface in the product rewards returning to them.

A small group of thoughtful designers already works around this by pasting references into a Figma file and writing annotations next to them. It's an ugly, manual practice that lives outside the tools where references are actually collected. **Canvas brings that practice inside Cosmos.**

---

## The Opportunity for Cosmos

Cosmos already owns the collection moment. Adding Canvas gives Cosmos ownership of the **reflection loop**, which no competitor has credibly claimed:

- **Pinterest** optimizes for discovery, not depth.
- **Are.na** has connections as a hidden primitive but no reflection surface.
- **Milanote** and **FigJam** have canvases but no curation engine underneath.
- **MyMind** uses AI for organization but has no social or spatial layer.

Canvas deepens engagement per cluster, increases return visits (users come back to write, not just save), and sets up a defensible AI story for v2: the annotations users write become the training signal for a personalized taste model that no scraped content can replicate.

---

## Hero User

The thoughtful designer who already keeps reference files, writes notes in the margins of their Figma, and treats taste as something to be cultivated rather than hoarded. This is Cosmos's existing power user. The pitch is not "attract new users" but "give your most engaged users a reason to go deeper, and build the data moat while you do it."

---

## Product Vision

Canvas is a new view mode on any existing Cosmos cluster. You toggle between **Grid** (today) and **Canvas** (new). The underlying data is the same set of elements.

In Canvas mode:

- Elements become nodes on an infinite, pan-and-zoomable surface.
- Users can paste directly onto the canvas: links, images, plain text.
- Nodes can be connected with lines, Obsidian-style, to show relationships.
- Every node can carry an annotation answering "why does this resonate?"
- Clicking a node opens an expanded overlay with the media, annotation, and connected nodes.
- Canvases can be shared read-only via a public link.

---

## MVP Scope

### In scope

**View modes**
- Tab component at the top of every cluster toggles between **Grid** and **Canvas**.
- Grid view: masonry layout, 4 columns, existing Cosmos behavior.
- Canvas view: infinite pan-and-zoomable surface.
- Both views are backed by the same underlying set of elements.
- Light and dark mode toggle applies across both views.
- Node cap of 30 per canvas (protective for MVP perf and scope).
- Canvas cap of 2 per user (MVP only; lifted as we validate retention and storage economics).

**Paste and content types**
- Paste via Cmd+V anywhere on the canvas.
- Supported: web links (with Open Graph preview), images (uploaded to CDN), plain text.
- Link previews show title, hero image, and source. Never a raw URL.
- Document links (Figma, Google Docs, Notion) fall back to title plus favicon.

**Nodes and interactions**
- Manual node placement, drag to move.
- Hover state surfaces node controls: edit, annotate, connect, delete.
- Click to open expanded overlay.
- Expanded overlay shows: full media, annotation (editable in place), and clickable thumbnails of connected nodes. Clicking a thumbnail flies the canvas to that node.
- Click outside the overlay to close.

**Connections**
- Manual connections only. User drags from a node's edge handle to another node.
- Connections are unlabeled lines, Obsidian-style.
- Connections persist and render in both directions.

**Reflection Mode**
- On by default, toggleable in settings.
- When on: every new paste prompts the user with "Why does this resonate?" before the node is finalized. Skippable with one keystroke.
- When off: annotations are always optional; a small "Add note" affordance appears on hover.

**Sharing and privacy**
- Every canvas has a public/private toggle, private by default.
- Private canvases are visible only to the owner.
- Public canvases generate a shareable read-only URL.
- Public view supports pan, zoom, and expanded node overlay. No editing.
- Access is link-only for MVP. Name-based discovery (e.g. searching "Pournami Pottekat" surfaces her public canvases) is roadmapped.

**Search**
- Global search bar surfaces across all of a user's canvases.
- Keyword search on node titles and annotations in MVP.
- Semantic search ("find the things that feel soft") is roadmapped.

**Auth**
- Google OAuth and email sign-in.

**Are.na import**
- OAuth with Are.na, user selects a channel, blocks are imported as nodes on a new canvas.
- Initial layout is a loose grid; user rearranges.

### Out of scope (deferred)

- Auto-clustering and auto-layout (visual or semantic).
- Natural-language cluster queries ("group by yellow", "cluster by mood").
- Labeled connections (relationship types).
- Embeds on third-party sites.
- Video upload (embeds from YouTube/Vimeo via link preview are OK).
- Real-time multi-user collaboration.
- Content moderation tooling.
- Onboarding flow beyond a single empty-state prompt.
- Node caps above 30.

---

## Key Flows

### 1. Paste a link

1. User copies a URL and pastes onto the canvas.
2. A node appears at cursor position with a loading state.
3. Backend fetches Open Graph metadata; node populates with title, hero image, and source.
4. If Reflection Mode is on, a prompt opens: "Why does this resonate?" Skippable.

### 2. Connect two nodes

1. User hovers a node; a connection handle appears on the edge.
2. User drags from the handle to a target node.
3. A line is drawn and persists.

### 3. Expand a node (hero interaction for the demo)

1. User clicks a node.
2. Node enlarges into an overlay covering most of the canvas.
3. Overlay shows full media, the annotation (editable in place), and a horizontal strip of connected-node thumbnails.
4. Clicking a thumbnail flies the canvas to that node and opens its overlay.
5. Clicking outside the overlay closes it and returns to the previous canvas state.

This is the "taste dossier" moment. Any element on your canvas is one click away from its full context, its reflection, and its neighbors in your thinking.

### 4. Share

1. User clicks Share; a public URL is generated.
2. Opening the URL renders the canvas in view-only mode.

### 5. Import from Are.na

1. User clicks "Import from Are.na."
2. OAuth with Are.na.
3. User selects a channel.
4. Blocks are fetched and laid out on a new canvas.

---

## Technical Approach

- **Frontend:** React, component-based architecture.
- **Canvas library:** react-flow is the leaner, better-fit choice for node-and-edge graphs at this scale. tldraw is a viable alternative if richer freeform editing matters later.
- **Design-to-code:** Figma MCP for component handoff.
- **Theming:** CSS variables driving light/dark tokens, toggleable at the app level.
- **Link previews:** server-side Open Graph fetcher with title-scrape fallback.
- **Image storage:** S3 or equivalent CDN.
- **Auth:** Clerk or Supabase Auth (Google and email supported natively).
- **Public share route:** same read API as authenticated view, rendered in read-only mode based on route.
- **Are.na integration:** OAuth + v3 REST API (channels endpoint + blocks endpoint, paginated).

---

## Success Metrics

- **Activation:** percentage of new users who paste at least one item **and** write at least one annotation in the first session.
- **Reflection depth:** average number of annotations per canvas.
- **Return rate:** percentage of canvases revisited within 7 days of creation.
- **Share rate:** percentage of canvases with a public link generated.
- **Canvas adoption within Cosmos:** percentage of existing clusters that get toggled to Canvas view at least once.

---

## Risks

1. **Is reflection a behavior people want, or one they say they want?** The Reflection Mode default is the biggest bet in this doc. Needs to be validated with a small cohort before over-investing in the prompting UX.
2. **Canvas performance at the node ceiling.** 30 is protective but image rendering at zoom still needs engineering attention.
3. **Link preview reliability.** Open Graph tags are inconsistent across sites. Graceful fallbacks matter more than they sound.
4. **Grid vs Canvas coherence.** The two views must feel like two lenses on the same object, not two competing features. Requires careful cross-view state (selection, filters) handling.
5. **Positioning against Are.na.** Are.na's community loves the "connections" primitive. Canvas must feel additive, not derivative. The reflection layer is the honest differentiator.

---

## Roadmap

### v2 (next quarter after MVP)

- **Auto-clustering** by visual and semantic similarity. Flower images drift toward flower images; interface screenshots cluster with interface screenshots.
- **Natural-language cluster queries**: "cluster by yellow", "group by mood", "show me everything that feels soft." This is the headline AI moment.
- **Labeled connections**: inspires, contrasts with, builds on, same feeling. Unlocks taste-graph queries.
- **Embeds** on third-party sites. Writers embed research canvases in Substacks, designers embed mood boards in case studies. Live, not snapshot.
- **Semantic search** across annotations and nodes. Query by feeling or concept, not just keyword.
- **Name-based discovery**. Searching a user's name surfaces their public canvases, building a light social layer on top of reflection.

### v3

- **AI taste summaries** generated from a user's annotations across all their canvases. "Here is what your canvases say about your sensibility." Shareable as a profile artifact.
- **Team canvases** with multi-user real-time editing.
- **Canvas-to-moodboard export** to Figma, PDF, or shareable grid image.

---

## Open Questions

1. **Naming.** Shipping as "Canvas" inside Cosmos for now. Worth a naming pass before launch if Cosmos wants a sharper label.
2. **Canvas-Grid cross-view consistency.** If a user selects or rearranges nodes in Canvas, does Grid reflect any of that state? Recommend: ordering in Canvas has no effect on Grid in MVP; they share content, not layout.
3. **Annotation persistence across views.** Annotations written in Canvas should be visible in Grid too (on hover or expansion). Needs a Grid-side design pass.
4. **Public canvas attribution.** Public view should show the owner's name and a subtle Cosmos Canvas badge. Exact treatment is a design call.
5. **Reflection Mode validation.** On-by-default in this draft. Will be validated with real users via the MVP itself.

### Resolved

- **Pricing.** Free for all Cosmos users in MVP.
- **View toggle.** Tab component between Grid (masonry, 4 columns) and Canvas.
- **Search.** Keyword search on titles and annotations in MVP. Semantic search in v2.
- **Privacy and discovery.** Public/private toggle per canvas, private by default. Link-only access in MVP. Name-based discovery in v2.
