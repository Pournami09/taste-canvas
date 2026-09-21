# Phase 8 Plan: Browser Extension (Quick Add)

**Companion to:** canvas_prd.md, canvas_requirements.md (FR-16, UI-17)
**Audience:** Claude (build agent), Poro (designer/PM)
**Status:** plan, pre-build. No extension code written yet.

---

## How to use this document

> This is a planning document, not an implementation. It defines the architecture, the integration points against the existing repo, the hard technical decisions, and the open questions for Poro to confirm before any Phase 8 code is written. The same working rules apply as the rest of the project: tokens before components, no hardcoded design values, both themes, keyboard support, and no em dashes anywhere. Treat the FR-16 and UI-17 IDs in canvas_requirements.md as the checklist; this doc is the "why" and "how" behind them.

Build order inside Phase 8 follows the project rule: backend prerequisites first (so the data layer can accept an external append safely), then the bearer-auth API, then the extension surfaces, last the hover detection and polish.

---

## Goal

Let a user save media from anywhere on the web into a chosen Taste Canvas board without leaving the page they are on. Two entry points:

1. A floating quick-add button that appears on hover over an eligible image, GIF, video, or tweet, tuned for high-value sites first (X/Twitter, Instagram, Pinterest, Are.na) with a generic image fallback elsewhere.
2. A right-click "Save to Taste Canvas" context-menu item available on any page, image, link, or text selection.

After a save, the user gets on-page feedback ("Saved to {board name}") without navigating to the canvas. A toolbar popup lets the user pick which of their boards new saves land on.

The product's reflection layer stays in the web app. The extension is a capture tool, not an editor. Annotation ("why does this resonate?") still happens on the canvas.

---

## What already exists in the repo (the foundation this builds on)

The repo is past Phase 5. The extension does not need new storage or auth primitives; it needs a safe way to reach them from outside the app.

- **Auth:** Supabase, cookie-based sessions via `lib/supabase/*` and `middleware.ts` (`updateSession`). Cookies are scoped to the app origin.
- **Data model** (`supabase/migrations/001_schema.sql`): `profiles`, `canvases` (max 2 per user, enforced by trigger), `canvas_nodes` (max 30 per canvas, enforced by trigger; types `image | annotation | link`), `canvas_edges`. RLS restricts writes to the owner.
- **Node shape** (`lib/canvas-types.ts`): `ImageNode` (src is an R2 key, signed on read), `AnnotationNode` (body text), `LinkNode` (url plus OG preview fields).
- **Image storage** (`app/api/upload/route.ts`, `lib/upload.ts`, `lib/r2.ts`): authenticated client requests a presigned R2 PUT URL, uploads directly, stores the object key. 10 MB cap, image MIME allowlist.
- **Link preview** (`app/api/link-preview/route.ts`): server-side OG fetch, used by the in-app paste handler.
- **Paste-to-node pipeline** (`app/canvas/CanvasClient.tsx`): the in-page `paste` handler classifies clipboard content into image / direct-image-URL / link / text and creates the right node, then `resolveCollisions` places it. This is the logic the extension's server endpoint mirrors, but it lives client-side and cannot be reused as-is from outside the page.
- **Persistence** (`lib/hooks/use-auto-save.ts`): see the conflict section below. This is the single biggest thing to change.

---

## The hard problem: full-replace auto-save is hostile to an external append

`use-auto-save.ts` persists with a **full-replace** strategy: on a 1.5s debounce it deletes every node and edge for the canvas, then re-inserts the entire in-memory array. That is safe at 30 nodes when the canvas tab is the only writer. It is unsafe the moment a second writer (the extension) inserts a node:

- The open tab's in-memory state does not know about the extension's new node.
- The next auto-save (triggered by any edit in the tab) deletes all nodes, including the extension's insert, and re-inserts only what the tab knew about. The extension's node is silently lost.
- Even with no edits, the new node never appears in the open tab until a manual reload.

This is a correctness problem, not a cosmetic one, so it is a prerequisite, not a nice-to-have.

### Recommended fix: granular mutations plus realtime merge

1. **Move auto-save off full-replace to per-node mutations.** Track adds, updates, and deletes by node id and persist only the diff (upsert changed/new nodes, delete removed ids). This makes an external additive insert survive the next save, because the tab no longer nukes rows it did not author. This is a focused refactor of `use-auto-save.ts` plus the mutation call sites; the client `CanvasNode`/`Edge` types stay the source of truth.
2. **Subscribe the open canvas to Supabase Realtime** on `canvas_nodes` filtered by `canvas_id`. When the extension inserts a node, the open tab receives the row and merges it into state (running `resolveCollisions` so it does not land on top of an existing node). Result: the user sees the saved item appear live if the canvas is open.

If we want a smaller first step, the minimum safe version is just item 1 (granular mutations); realtime can follow. We should not ship the extension on top of the current full-replace save under any circumstances.

---

## Extension architecture (Manifest V3)

Four parts, isolated by Chrome's extension model.

### 1. manifest.json
- `manifest_version: 3`.
- `permissions`: `contextMenus`, `storage`, `activeTab`, `scripting`.
- `host_permissions`: the Taste Canvas production origin (for API calls) and `<all_urls>` (content script needs to run on any site for hover and right-click). Broad, and justified: the product is "save from anywhere." Called out in the store listing.
- `action`: default popup (`popup.html`), opens below the toolbar icon by default.
- `background.service_worker: background.js`.
- `content_scripts`: `content.js` plus an isolated stylesheet, matched on `<all_urls>`, injected at `document_idle`.
- `externally_connectable` (optional, for the connect handshake): the app origin, so the web app can message the extension.

### 2. Background service worker (background.js)
The coordinator. Responsibilities:
- Register context-menu items on install (images, links, selection, page).
- Handle context-menu clicks: resolve the active target board from `chrome.storage`, call the save API, push feedback back to the originating tab and flash the toolbar badge.
- Hold the session (see auth) and refresh it.
- Relay messages between content script and popup.

### 3. Content script (content.js, isolated world, Shadow DOM UI)
Runs on every page but does nothing passive. Responsibilities:
- Detect eligible media on hover and position a floating quick-add button over it.
- On quick-add click, capture the media reference (image URL, tweet URL, video poster plus source URL) and send it to the background worker.
- Render the on-page "Saved to {board}" toast and error toasts.
- All injected UI lives inside a Shadow DOM root with a high z-index so it cannot be styled or broken by the host page, and cannot leak styles into it.

### 4. Popup (popup.html, popup.js)
Opens below the toolbar icon. Responsibilities:
- Show connection state (signed in / connect).
- List the user's boards (up to 2) with live node counts, for example "Untitled 12/30".
- Let the user choose the active target board; persist to `chrome.storage.sync`.
- Empty / loading / error states to match FR-15 parity.
- Link to open the web app.

---

## Auth model

The web app uses Supabase cookie sessions. The naive approach (have the service worker fetch the app API with `credentials: include`) is unreliable: Supabase auth cookies default to `SameSite=Lax`, so they are not sent on cross-site subrequests from a `chrome-extension://` origin. Relaxing them to `SameSite=None` to make this work weakens the web app's CSRF posture. Not recommended.

### Recommended: connect handshake plus bearer token

1. The popup shows "Connect to Taste Canvas." Clicking it opens a new `/extension/connect` route in the web app (authenticated by the existing cookie session, so the user logs in normally if needed).
2. That page, being signed in, hands the extension the Supabase session (access token plus refresh token) via `chrome.runtime.sendMessage` (using `externally_connectable`) or `postMessage` picked up by a content script on that origin.
3. The extension stores the session in `chrome.storage.local`, and the background worker keeps it fresh using the refresh token (bundle `@supabase/supabase-js` in the extension, or a thin refresh call).
4. Every API call from the extension sends `Authorization: Bearer <access_token>`. The new API routes validate it server-side with `supabase.auth.getUser(token)`.

This keeps the web app's cookie security intact, gives the extension a clean credential it owns, and reuses Supabase's own token lifecycle. The cost is the one-time connect step and token-refresh handling.

---

## API layer (new, bearer-authenticated)

A small `/api/extension/*` group on the web app, so cap enforcement, ownership checks, image upload, and link-preview fetching all stay server-side. The extension stays thin. All routes validate the bearer token and return CORS headers locked to the extension id (`Access-Control-Allow-Origin: chrome-extension://<id>`).

- **GET `/api/extension/canvases`** returns the user's boards for the popup picker: `[{ id, title, nodeCount, cap: 30 }]`.
- **POST `/api/extension/nodes`** the workhorse. Body: `{ canvasId, type: "image" | "link" | "text", imageUrl?, url?, text?, sourceUrl, alt? }`. Server does, in order:
  1. Validate bearer token, resolve user.
  2. Confirm the user owns `canvasId` (RLS plus an explicit check).
  3. Check the 30-node cap; if full, return a typed "cap reached" error.
  4. For `image`: server-side fetch the remote image, validate MIME and size against the existing allowlist and 10 MB cap, upload to R2 (reuse `lib/r2.ts`), store the key. For `link` (including tweets and video source pages): insert a link node and run the existing OG fetch (reuse `app/api/link-preview` logic). For `text`: create an annotation node.
  5. Compute a non-colliding position (a server-side port of the next-free-slot logic, or a simple stacked offset; the open tab will re-resolve on realtime merge anyway).
  6. Additive insert (depends on the granular-mutation refactor being in place).
  7. Return `{ ok: true, canvasTitle, nodeId }` so the extension can show "Saved to {canvasTitle}".
- **Connect handshake** route(s) under `/extension/connect` (page) plus whatever token-exchange endpoint the handshake needs.

Note: server-side fetching a remote image introduces an SSRF surface. Restrict to http/https, block private and link-local address ranges, cap redirects and response size, and enforce the MIME allowlist before the R2 put.

---

## Media detection (content script)

Right-click is the robust baseline and works everywhere via the native target type. The hover button is the tuned layer.

- **Images:** `<img>` and `<picture>`, choosing the best candidate from `srcset`. Generic fallback only above a size threshold so we do not decorate icons, avatars, and tracking pixels. CSS background images and `<canvas>` are out of scope for v1 hover (right-click "save page" still covers those pages).
- **GIFs:** real `.gif` images are handled as images. Many "GIFs" on X, Giphy, and Tenor are actually autoplaying `<video>` loops; treat those as the video case.
- **Videos:** v1 does not store video files (the 10 MB image-only R2 path). Instead capture the poster/thumbnail frame plus the source page URL and save a link node, so the canvas shows a preview card that opens the original. Flagged as a decision below.
- **Tweets:** detect the tweet article on x.com / twitter.com and save the tweet URL as a link node, so the existing OG pipeline renders a tweet card. We do not scrape tweet text or media. Robust and respects the source.

Quick-add button: an absolutely-positioned overlay inside the content script's Shadow DOM, shown on `mouseover` of an eligible element, hidden on `mouseout`, repositioned on scroll. Per-site selector packs for X, Instagram, Pinterest, and Are.na, plus the generic image fallback.

---

## Right-click context menu

Registered by the background worker via `chrome.contextMenus`:

- On an image: "Save image to Taste Canvas."
- On a link: "Save link to Taste Canvas."
- On a text selection: "Save selection to Taste Canvas" (becomes an annotation node).
- On the page (no specific target): "Save this page to Taste Canvas" (page URL becomes a link node).

Each save targets the active board chosen in the popup. The board name can be shown in the menu label, for example "Save image to Taste Canvas (Untitled)," so the destination is never a surprise.

---

## On-page feedback

After a successful save, the content script shows a transient toast in its Shadow DOM: "Saved to {board name}," with the Taste Canvas mark and an "Open" link to the board, auto-dismiss around 3 seconds. The toolbar badge also flashes a brief confirmation. Error toasts cover the real failure modes: board full (30/30, with a link to open and prune), not connected (with a "Connect" action), and image fetch or upload failed.

Visual language matches the product (dark-first, snappy not bouncy motion). Because an extension cannot read the app's CSS-variable token system at runtime, the extension ships a small static token snippet generated from the same primitive and semantic values. This is the one scoped, documented exception to "no hardcoded values": the values are copied from the token layer, not invented, and should be regenerated when the tokens change.

---

## Sequencing within Phase 8

1. **8.1 Backend prerequisite.** Refactor `use-auto-save.ts` from full-replace to granular per-node mutations. Add a Supabase Realtime subscription on the open canvas so external inserts merge live.
2. **8.2 API layer.** `/api/extension/canvases`, `/api/extension/nodes`, the connect handshake, bearer-token validation, CORS locked to the extension id, SSRF guards on image fetch.
3. **8.3 Extension scaffold.** manifest, background worker, popup with board picker and connect flow.
4. **8.4 Context-menu save** end to end (the most robust path; proves the pipeline before the fragile hover work).
5. **8.5 On-page feedback.** Success and error toasts, badge flash, token-synced styling.
6. **8.6 Hover quick-add button.** Generic image fallback first, then the X / Instagram / Pinterest / Are.na selector packs and the tweet, GIF, and video handling.
7. **8.7 Polish.** Popup keyboard navigation and accessibility, QA matrix across the key sites, store listing assets, privacy disclosure.

---

## Out of scope for v1 of the extension

- Saving raw video or audio files (we save thumbnail plus source link).
- Creating a new board from the extension (use the user's existing boards; respects the 2-canvas cap).
- Editing annotations or connections from the extension (reflection stays in the app).
- Bulk or multi-select capture.
- Firefox and Safari ports (Chrome MV3 first).
- Background scraping or any capture before the user explicitly clicks save.

---

## Decisions for Poro to confirm before 8.1 starts

1. **Auth.** Connect-handshake bearer token (recommended) versus cookie reuse (rejected here on the SameSite risk). Confirm the recommended path.
2. **Auto-save refactor.** Confirm we change `use-auto-save.ts` off full-replace as a prerequisite. The extension is unsafe without it.
3. **Video and GIF.** Save thumbnail plus source link (recommended) versus attempting file capture (heavy, hits the 10 MB image-only path).
4. **Tweets.** Save as a link node so the OG card renders (recommended) versus scraping text and media.
5. **Board targeting.** Single active board chosen in the popup (recommended) versus a per-save submenu picker in the context menu.
6. **New canvas from extension.** Recommend no for v1. Confirm.
7. **Production origin.** Need the deployed app origin for `host_permissions` and the CORS allowlist, and the extension id for the reverse direction.

---

## What this plan does not cover

- The store submission and review process, privacy policy copy, and listing assets (tracked in 8.7, detailed later).
- Non-Chromium browsers.
- Any change to the product's reflection model; the extension deliberately does not touch it.
