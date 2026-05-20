// Maps between Supabase DB rows and client-side canvas types.
// Client types (CanvasNode, Edge) remain the source of truth.

import type {
  CanvasNode,
  ImageNode,
  AnnotationNode,
  LinkNode,
  Edge,
} from "@/lib/canvas-types";

// ---------------------------------------------------------------------------
// DB row types (what Supabase returns)
// ---------------------------------------------------------------------------

export type DbCanvasNode = {
  id: string;
  canvas_id: string;
  node_type: "image" | "annotation" | "link";
  canvas_x: number;
  canvas_y: number;
  sort_order: number;
  created_at: string;
  src: string | null;
  alt: string | null;
  canvas_w: number | null;
  canvas_h: number | null;
  body: string | null;
  annotation: string;
  url: string | null;
  link_name: string | null;
  preview_title: string | null;
  preview_description: string | null;
  preview_og_image: string | null;
  preview_site_name: string | null;
  fetch_error: boolean;
};

export type DbCanvasEdge = {
  id: string;
  canvas_id: string;
  from_id: string;
  to_id: string;
};

export type DbProfile = {
  id: string;
  display_name: string;
  role: string;
  slug: string;
  avatar_url: string | null;
  external_links: { label: string; url: string }[];
  reflection_mode: boolean;
  theme: string;
  created_at: string;
  updated_at: string;
};

export type DbCanvas = {
  id: string;
  owner_id: string;
  title: string;
  visibility: "private" | "public";
  cover_image_url: string | null;
  last_view: "canvas" | "grid";
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// DB row -> Client type
// ---------------------------------------------------------------------------

export function dbNodeToClient(row: DbCanvasNode): CanvasNode {
  const createdAt = new Date(row.created_at).getTime();

  switch (row.node_type) {
    case "image":
      return {
        id: row.id,
        type: "image",
        src: row.src ?? "",
        alt: row.alt ?? "",
        canvasX: row.canvas_x,
        canvasY: row.canvas_y,
        canvasW: row.canvas_w ?? 400,
        canvasH: row.canvas_h ?? 300,
        annotation: row.annotation,
        createdAt,
      } satisfies ImageNode;

    case "annotation":
      return {
        id: row.id,
        type: "annotation",
        body: row.body ?? "",
        canvasX: row.canvas_x,
        canvasY: row.canvas_y,
        createdAt,
      } satisfies AnnotationNode;

    case "link":
      return {
        id: row.id,
        type: "link",
        url: row.url ?? "",
        name: row.link_name ?? undefined,
        canvasX: row.canvas_x,
        canvasY: row.canvas_y,
        canvasW: row.canvas_w ?? 300,
        annotation: row.annotation,
        preview:
          row.preview_title !== null
            ? {
                url: row.url ?? "",
                title: row.preview_title ?? "",
                description: row.preview_description ?? "",
                ogImage: row.preview_og_image ?? "",
                siteName: row.preview_site_name ?? "",
              }
            : null,
        loading: false,
        fetchError: row.fetch_error,
        createdAt,
      } satisfies LinkNode;
  }
}

export function dbEdgeToClient(row: DbCanvasEdge): Edge {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
  };
}

// ---------------------------------------------------------------------------
// Client type -> DB row (for upsert)
// ---------------------------------------------------------------------------

export function clientNodeToDb(
  node: CanvasNode,
  canvasId: string,
  sortOrder: number
): Omit<DbCanvasNode, "created_at"> & { created_at: string } {
  const base = {
    id: node.id,
    canvas_id: canvasId,
    node_type: node.type,
    canvas_x: node.canvasX,
    canvas_y: node.canvasY,
    sort_order: sortOrder,
    created_at: new Date(node.createdAt).toISOString(),
    src: null as string | null,
    alt: null as string | null,
    canvas_w: null as number | null,
    canvas_h: null as number | null,
    body: null as string | null,
    annotation: "",
    url: null as string | null,
    link_name: null as string | null,
    preview_title: null as string | null,
    preview_description: null as string | null,
    preview_og_image: null as string | null,
    preview_site_name: null as string | null,
    fetch_error: false,
  };

  switch (node.type) {
    case "image":
      return {
        ...base,
        src: node.src,
        alt: node.alt,
        canvas_w: node.canvasW,
        canvas_h: node.canvasH,
        annotation: node.annotation,
      };

    case "annotation":
      return {
        ...base,
        body: node.body,
      };

    case "link":
      return {
        ...base,
        url: node.url,
        link_name: node.name ?? null,
        canvas_w: node.canvasW,
        annotation: node.annotation,
        preview_title: node.preview?.title ?? null,
        preview_description: node.preview?.description ?? null,
        preview_og_image: node.preview?.ogImage ?? null,
        preview_site_name: node.preview?.siteName ?? null,
        fetch_error: node.fetchError,
      };
  }
}

export function clientEdgeToDb(
  edge: Edge,
  canvasId: string
): DbCanvasEdge {
  return {
    id: edge.id,
    canvas_id: canvasId,
    from_id: edge.fromId,
    to_id: edge.toId,
  };
}
