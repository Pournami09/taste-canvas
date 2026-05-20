-- Taste Canvas: Phase 5 schema
-- Run this in the Supabase SQL Editor.

-- =========================================================================
-- 1. profiles
-- =========================================================================

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null default '',
  role          text not null default '',
  slug          text unique not null,
  avatar_url    text,
  external_links jsonb not null default '[]'::jsonb,
  reflection_mode boolean not null default true,
  theme         text not null default 'dark',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone can read profiles (needed for public canvas attribution)
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- =========================================================================
-- 2. Auto-create profile trigger
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  raw_name   text;
  base_slug  text;
  final_slug text;
  counter    int := 0;
begin
  -- Derive a name from metadata or email
  raw_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );

  -- Convert to kebab-case slug
  base_slug := lower(regexp_replace(trim(raw_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'user';
  end if;

  -- Ensure uniqueness
  final_slug := base_slug;
  loop
    exit when not exists (select 1 from public.profiles where slug = final_slug);
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  end loop;

  insert into public.profiles (id, display_name, slug, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    final_slug,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 3. canvases (max 2 per user enforced by trigger)
-- =========================================================================

create table public.canvases (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  title           text not null default 'Untitled',
  visibility      text not null default 'private' check (visibility in ('private', 'public')),
  cover_image_url text,
  last_view       text not null default 'canvas' check (last_view in ('canvas', 'grid')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.canvases enable row level security;

-- Owner has full access
create policy "Owners can do everything with their canvases"
  on public.canvases for all
  using (auth.uid() = owner_id);

-- Public canvases are readable by anyone
create policy "Public canvases are readable"
  on public.canvases for select
  using (visibility = 'public');

-- Enforce max 2 canvases per user
create or replace function public.enforce_canvas_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.canvases where owner_id = new.owner_id) >= 2 then
    raise exception 'Canvas limit reached. Maximum 2 canvases per user.';
  end if;
  return new;
end;
$$;

create trigger check_canvas_limit
  before insert on public.canvases
  for each row execute procedure public.enforce_canvas_limit();

-- =========================================================================
-- 4. canvas_nodes (polymorphic, max 30 per canvas)
-- =========================================================================

create table public.canvas_nodes (
  id          uuid primary key default gen_random_uuid(),
  canvas_id   uuid not null references public.canvases(id) on delete cascade,
  node_type   text not null check (node_type in ('image', 'annotation', 'link')),

  -- Shared spatial fields
  canvas_x    double precision not null default 0,
  canvas_y    double precision not null default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  -- Image fields (nullable for non-image types)
  src         text,
  alt         text,
  canvas_w    double precision,
  canvas_h    double precision,

  -- Annotation field
  body        text,

  -- Shared annotation field (for image and link nodes)
  annotation  text not null default '',

  -- Link fields
  url              text,
  link_name        text,
  preview_title    text,
  preview_description text,
  preview_og_image text,
  preview_site_name text,
  fetch_error      boolean not null default false
);

alter table public.canvas_nodes enable row level security;

-- Owner access via canvas ownership
create policy "Node owners have full access"
  on public.canvas_nodes for all
  using (
    exists (
      select 1 from public.canvases
      where canvases.id = canvas_nodes.canvas_id
        and canvases.owner_id = auth.uid()
    )
  );

-- Public canvas nodes are readable
create policy "Public canvas nodes are readable"
  on public.canvas_nodes for select
  using (
    exists (
      select 1 from public.canvases
      where canvases.id = canvas_nodes.canvas_id
        and canvases.visibility = 'public'
    )
  );

-- Enforce max 30 nodes per canvas
create or replace function public.enforce_node_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.canvas_nodes where canvas_id = new.canvas_id) >= 30 then
    raise exception 'Node limit reached. Maximum 30 nodes per canvas.';
  end if;
  return new;
end;
$$;

create trigger check_node_limit
  before insert on public.canvas_nodes
  for each row execute procedure public.enforce_node_limit();

-- =========================================================================
-- 5. canvas_edges
-- =========================================================================

create table public.canvas_edges (
  id        uuid primary key default gen_random_uuid(),
  canvas_id uuid not null references public.canvases(id) on delete cascade,
  from_id   uuid not null references public.canvas_nodes(id) on delete cascade,
  to_id     uuid not null references public.canvas_nodes(id) on delete cascade,

  -- Prevent duplicate edges (A->B same as B->A)
  constraint unique_edge unique (canvas_id, from_id, to_id),
  -- Prevent self-connections
  constraint no_self_edge check (from_id <> to_id)
);

-- Unique undirected edge constraint
create unique index unique_undirected_edge
  on public.canvas_edges (canvas_id, least(from_id, to_id), greatest(from_id, to_id));

alter table public.canvas_edges enable row level security;

-- Owner access via canvas ownership
create policy "Edge owners have full access"
  on public.canvas_edges for all
  using (
    exists (
      select 1 from public.canvases
      where canvases.id = canvas_edges.canvas_id
        and canvases.owner_id = auth.uid()
    )
  );

-- Public canvas edges are readable
create policy "Public canvas edges are readable"
  on public.canvas_edges for select
  using (
    exists (
      select 1 from public.canvases
      where canvases.id = canvas_edges.canvas_id
        and canvases.visibility = 'public'
    )
  );

-- =========================================================================
-- 6. updated_at triggers
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger canvases_updated_at
  before update on public.canvases
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- 7. Seed function: populates a user's first canvas with sample data
-- =========================================================================

create or replace function public.seed_first_canvas(user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  canvas_uuid uuid;
begin
  insert into public.canvases (owner_id, title)
  values (user_id, 'Untitled')
  returning id into canvas_uuid;

  -- Sample image nodes
  insert into public.canvas_nodes (id, canvas_id, node_type, canvas_x, canvas_y, canvas_w, canvas_h, src, alt, annotation, sort_order) values
    (gen_random_uuid(), canvas_uuid, 'image', 38, 36, 525, 350, 'https://picsum.photos/seed/tc-gallery/600/400', 'Gallery', 'The restraint in the negative space is doing all the work. When you remove decoration, what is left has to earn its place. That tension between what is shown and what is withheld creates the resonance.', 0),
    (gen_random_uuid(), canvas_uuid, 'image', 296, 520, 217, 169, 'https://picsum.photos/seed/tc-product/300/240', 'Still life', 'Something about the color palette here feels genuinely warm. Not warm as in temperature: warm as in proximity to something alive.', 1),
    (gen_random_uuid(), canvas_uuid, 'image', 700, 460, 217, 169, 'https://picsum.photos/seed/tc-form/300/240', 'Form study', '', 2),
    (gen_random_uuid(), canvas_uuid, 'image', 620, 80, 380, 290, 'https://picsum.photos/seed/tc-arch/500/380', 'Architecture', 'The way structure becomes ornament here. Every load-bearing element is also the decoration. Nothing is added for its own sake.', 3),
    (gen_random_uuid(), canvas_uuid, 'image', 100, 460, 300, 225, 'https://picsum.photos/seed/tc-light/400/300', 'Natural light', 'This quality of diffused light feels like late afternoon in October. The shadows are not hard. Everything is present but not insistent.', 4);

  return canvas_uuid;
end;
$$;
