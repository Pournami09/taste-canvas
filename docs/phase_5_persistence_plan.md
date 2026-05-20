# Phase 5 Persistence Plan: Supabase

**Companion to:** canvas_prd.md, canvas_requirements.md
**Status:** Plan, pre-build. No code lands until Phases 2 through 4 are complete.
**Author:** Claude (build agent), pending Poro review.

---

## How to use this document

Treat this as the binding spec for Phase 5, the same way `canvas_requirements.md` is binding for Phases 1 through 4. When Phase 5 starts, every section below becomes a checklist. Before changing the schema or auth flow, update this doc first.

This is the spec, not the code. Nothing in this doc gets installed, migrated, or scaffolded today. Phase 1 is the foundation; Phases 2 through 4 build the canvas surface, nodes, annotations, and connections. Persisting empty state is not useful, so persistence waits.

---

## Goal

Make every profile, canvas, node, annotation, and connection survive a page reload, a session, and a different device. Supabase is the chosen backend, providing managed Postgres, GoTrue auth, and object storage in one project.

---

## Stack

- **Supabase managed project**: Postgres 15+, GoTrue auth, Storage. Two projects: `taste-canvas-dev` and `taste-canvas-prod`.
- **Client libraries**: `@supabase/supabase-js` plus `@supabase/ssr` (the App Router cookie-aware client). Do not use the deprecated `auth-helpers-nextjs`.
- **Local dev**: Supabase CLI (`pnpm dlx supabase`) runs Postgres, Auth, and Storage locally via Docker. Migrations live in `supabase/migrations/`.
- **Type generation**: `pnpm dlx supabase gen types typescript --local > lib/supabase/types.ts`. Regenerate after every migration; commit the result.

PRD line confirms Supabase as the auth choice (over Clerk). Both required providers (Google OAuth, email magic link) are native in Supabase.

---

## Data model

One Postgres schema, all under `public`. RLS on every table, default deny.

### Tables

```
profiles
  id              uuid PK references auth.users on delete cascade
  display_name    text not null                  -- FR-1.3
  role_title      text                           -- FR-1.3
  slug            text unique not null           -- FR-1.4, kebab-case
  reflection_mode boolean not null default true  -- FR-5.1, FR-5.2
  theme           text not null default 'system' -- FR-13.1, FR-13.2
  created_at      timestamptz default now()
  updated_at      timestamptz default now()

profile_links                                    -- FR-1.5, up to 5
  id          uuid PK
  profile_id  uuid FK profiles on delete cascade
  label       text not null
  url         text not null
  position    smallint not null
  unique (profile_id, position)

canvases
  id            uuid PK
  owner_id      uuid FK profiles on delete cascade
  title         text not null default 'Untitled' -- FR-2.1
  visibility    text not null default 'private'  -- FR-10.1, check in ('private','public')
  cover_node_id uuid                             -- FR-2.3, FK nodes, nullable
  last_view     text default 'canvas'            -- FR-3.2, check in ('canvas','grid')
  created_at    timestamptz default now()
  updated_at    timestamptz default now()

nodes                                            -- unified for image, link, text, annotation
  id              uuid PK
  canvas_id       uuid FK canvases on delete cascade
  kind            text not null check (kind in ('image','link','text','annotation'))
  x               double precision not null default 0
  y               double precision not null default 0
  width           double precision
  height          double precision
  z_index         integer not null default 0

  -- image kind
  image_url       text
  image_alt       text

  -- link kind
  link_url            text
  link_title          text
  link_description    text
  link_hero_url       text
  link_favicon_url    text
  link_source_domain  text

  -- text kind or annotation kind
  body            text

  -- attached annotation on image, link, or text kinds (FR-7.2 inline annotation field)
  annotation_body text

  created_at      timestamptz default now()
  updated_at      timestamptz default now()

connections
  id              uuid PK
  canvas_id       uuid FK canvases on delete cascade
  source_node_id  uuid FK nodes on delete cascade
  target_node_id  uuid FK nodes on delete cascade
  created_at      timestamptz default now()
  check (source_node_id <> target_node_id)       -- FR-8.7

  -- FR-8.8 dedupe regardless of direction
  unique index on (canvas_id, least(source_node_id, target_node_id), greatest(source_node_id, target_node_id))
```

### Why annotations live in the `nodes` table

The spec has two manifestations of annotation:

1. **Standalone annotation node** (UI-4.4, UI-12). The annotation card is a first-class node placed on the canvas alongside images. In Figma it has its own endpoint dot, so it participates in connections like any other node.
2. **Attached annotation** (UI-4.5 indicator dot, FR-7.2 inline editable field). A text field belonging to an image, link, or text node, surfaced in the expanded overlay.

Unifying under one `nodes` table with a `kind` discriminator gives us:

- Connections FK uniformly to `nodes.id`. Polymorphic FKs in Postgres have no native FK constraint enforcement; unifying avoids the whole class of bug.
- The runtime shape on the canvas (react-flow nodes with positions) matches the DB shape one-to-one.
- A single set of RLS policies covers all kinds.

Tradeoff: per-kind columns are nullable, validated by `kind` rather than by NOT NULL. Acceptable for MVP. If kinds diverge significantly in v2 (richer media, embeds), revisit by extracting per-kind detail tables.

---

## Constraints enforced in the database, not the app

Hard caps and invariants live in Postgres so a client bug cannot bypass them.

- **2 canvases per user** (FR-2.5): trigger on `canvases` insert counts owner's canvases, raises if at cap. App layer catches and surfaces FR-2.5 message.
- **30 nodes per canvas** (FR-2.7): trigger on `nodes` insert counts canvas's nodes, raises if at cap. App layer catches and surfaces FR-15.8 message.
- **Annotation length** (FR-5.7): `check (length(annotation_body) <= 500 and length(body) <= 500)`.
- **No self-connection** (FR-8.7): `check (source_node_id <> target_node_id)`.
- **No duplicate connection** (FR-8.8): the normalized unique index above.
- **Cover image stays consistent** (FR-2.3): `cover_node_id` enforced by trigger to point at a node whose `canvas_id` matches and whose `kind = 'image'`.

---

## RLS policies

RLS on every table, default deny.

- **profiles**: `select` open (public canvases need attribution per UI-9.2). `insert` and `update` only when `id = auth.uid()`.
- **profile_links**: select where the parent profile is readable (always); write only when the parent profile is the caller.
- **canvases**: `select` if `owner_id = auth.uid()` OR `visibility = 'public'`. `insert`, `update`, `delete` only if `owner_id = auth.uid()`.
- **nodes** and **connections**: inherit from `canvases` via subquery. Read if the parent canvas is owned by the caller OR public. Write only if the parent canvas is owned.

### Private flip handling (FR-10.6)

When a canvas flips public to private, the existing public URL must return a "This canvas is private" page, not a 404. RLS alone returns zero rows for both cases, which the app cannot distinguish.

Fix: a `security definer` Postgres function `lookup_canvas_for_public(id uuid)` that returns one of three states (`found`, `private`, `not_found`). The public route calls only this function for visibility checks; never queries `canvases` directly as anon.

---

## Auth

- **Providers**: Google OAuth (FR-1.1) and email magic link (FR-1.2). Configured in the Supabase dashboard. No password flow.
- **Session**: cookie-based via `@supabase/ssr`. A Next.js middleware at `middleware.ts` refreshes the session on every request before it hits a route handler or server component.
- **Profile auto-creation**: trigger `on auth.users insert` calls a function that inserts a matching `profiles` row. `display_name` is derived from OAuth provider metadata or the email local-part. `slug` is auto-generated from `display_name` (kebab-case), with a random 4-char suffix on collision. User can edit the slug later (FR-1.4); editing prompts on collision per the Resolved question on slug collisions.
- **Sign-out** (FR-1.6): `supabase.auth.signOut()` then redirect to landing, session cookie cleared.

---

## Storage

One bucket: `canvas-assets`. Private.

- **Path convention**: `{user_id}/{canvas_id}/{node_id}.{ext}`. Owner-prefixed paths make RLS straightforward and let us cascade-delete by prefix when a canvas or user is removed.
- **Upload (FR-4.6)**: client-side via `supabase.storage.from('canvas-assets').upload(...)`. Pre-upload check rejects files over 10 MB with the FR-15 error toast.
- **Display URLs**:
  - Owner viewing own canvas: signed URLs with a 1-hour TTL, regenerated on canvas load.
  - Public canvas viewers: signed URLs with a longer TTL (24 hours), issued by a server route that first calls `lookup_canvas_for_public` to confirm the canvas is still public. Cache aggressively at the edge.
- **Bucket RLS**: mirror the `nodes` policy; permit reads when the `{user_id}` path prefix matches `auth.uid()`, or when the canvas in the path is public.
- **No image transforms in MVP**: store as uploaded. Add thumbnails in v2 only if grid view performance demands it.

---

## lib/ structure (built in Phase 5, not before)

```
lib/
  supabase/
    client.ts        // createBrowserClient
    server.ts        // createServerClient (RSC + server actions)
    middleware.ts    // session refresh
    types.ts         // generated; do not edit by hand
  db/
    profiles.ts      // getProfile, updateProfile, listProfileLinks, upsertProfileLink, ...
    canvases.ts      // listMyCanvases, createCanvas, renameCanvas, setVisibility, deleteCanvas
    nodes.ts         // createNode (per kind), moveNode, updateNode, deleteNode
    annotations.ts   // setAttachedAnnotation, clearAttachedAnnotation
    connections.ts   // createConnection, deleteConnection, listConnections
    storage.ts       // uploadImage, getSignedUrl, deleteImage
```

Every `db/` function is a thin typed wrapper around supabase-js. No business logic at this layer. Form-level validation belongs in Zod schemas; structural invariants belong in Postgres.

---

## Mutation pattern

App Router server actions for every mutation. Reasons:

- Cookie-based auth flows server-side cleanly via the SSR client.
- One round trip from form to DB; no extra API route boilerplate.
- Type-safe end to end via generated DB types.

Client state holds the in-memory canvas for snappy UX. Recommendation: zustand store keyed by canvas id, with optimistic updates on paste, move, annotate, connect; rollback on action error. Supabase is the source of truth; the store is a cache.

### Undo and redo (FR-6.7, FR-6.8)

Pure client-side, session-scoped. Stack holds inverse operations; each undo calls the matching server action. Cleared on canvas exit per FR-6.8.

---

## Local dev workflow

1. `pnpm dlx supabase init` (once): creates the `supabase/` directory.
2. `pnpm dlx supabase start`: spins up local Postgres, Auth, Storage via Docker. Outputs anon key, service role key, URL.
3. Copy keys into `.env.local` (gitignored):
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # server only, never exposed to client
   ```
4. Write the initial migration in `supabase/migrations/0001_initial_schema.sql`. Apply with `pnpm dlx supabase migration up`.
5. Regenerate types: `pnpm dlx supabase gen types typescript --local > lib/supabase/types.ts`.
6. Optional seed data in `supabase/seed.sql` for design-system route testing.

Production deploys reuse the same migration files against the hosted `taste-canvas-prod` project. Migrations are append-only; never edit a shipped migration.

---

## Sequencing within Phase 5

Top to bottom. Each step is verifiable before the next.

1. Install `@supabase/supabase-js` and `@supabase/ssr`. Scaffold `lib/supabase/` clients plus `middleware.ts`. Confirm session refresh works on a trivial protected page.
2. Write `0001_initial_schema.sql`: all tables, all RLS policies, all triggers, all constraints. Apply locally.
3. Wire Google OAuth and email magic link sign-in pages. Confirm a new user lands with a `profiles` row, a sane slug, and `reflection_mode = true`.
4. Build the slug-collision edit UX per the Resolved question.
5. Build `lib/db/canvases.ts` plus the My Canvases UI (FR-2.5, FR-2.6). Verify the 2-canvas cap triggers a clean message.
6. Build `lib/db/nodes.ts`; wire into the Phase 3 paste handler. Verify the 30-node cap.
7. Build `lib/db/annotations.ts`; wire into the Phase 4 reflection prompt and the inline annotation field in the expanded overlay.
8. Build `lib/db/connections.ts`; wire into the Phase 4 drag-to-connect interaction.
9. Build `lib/db/storage.ts`; wire into the image paste path.
10. End-to-end verification: open canvas, paste image, annotate, connect, reload, see everything intact. Sign out, sign in as a second user, confirm RLS denies access.

---

## What this plan does not cover

Out of Phase 5, picked up later.

- Public read-only routes and OG tag generation: Phase 6 (FR-10.3, FR-10.7, UI-9). Schema already supports it; the route work is separate.
- Are.na OAuth and import flow: Phase 6 (FR-11).
- Realtime subscriptions for multi-device sync: deferred. MVP can refetch on canvas mount.
- Image transforms or thumbnails: v2 if grid view performance demands it.
- Search backed by Postgres FTS or pgvector (FR-9): Phase 7 polish.
- AI taste summaries on annotations: v3 per PRD roadmap.

---

## Decisions for Poro to confirm before Phase 5 starts

1. **Annotation storage shape**: unified `nodes` table with `kind = 'annotation'` plus an `annotation_body` column for attached annotations (recommended). Alternative is a separate `annotations` table.
2. **Public asset serving**: server-issued signed URLs with TTL governed by canvas visibility (recommended). Alternative is a second public bucket with copy-on-publish.
3. **Client state store**: introduce zustand for in-memory canvas state (recommended). Alternative is plain React state plus server actions.
4. **Realtime in MVP**: defer (recommended). Alternative is light realtime on the active canvas for single-user multi-device sync.
5. **Profile auto-creation**: DB trigger on `auth.users` insert (recommended). Alternative is first-login bootstrap in app code.
6. **Single-table nodes vs per-kind tables**: single table (recommended). Revisit if v2 kinds diverge significantly.

---

## Open question carried forward from canvas_requirements.md

Section 6.6 of `canvas_requirements.md` flags an open question: should connection endpoint dots appear in Grid view at all? Current spec keeps them as a subtle relational signal. Schema supports either answer; the rendering decision is a Phase 4 concern, not a Phase 5 one.
