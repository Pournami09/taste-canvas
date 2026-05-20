import { redirect } from "next/navigation";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getR2Client, getR2BucketName } from "@/lib/r2";
import { dbNodeToClient, dbEdgeToClient } from "@/lib/canvas-db";
import { isR2Key } from "@/lib/r2-utils";
import type { DbProfile, DbCanvas, DbCanvasNode, DbCanvasEdge } from "@/lib/canvas-db";
import { CanvasClient } from "./CanvasClient";

export default async function CanvasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const supabase = await createClient();

  // 1. Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 2. Load profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<DbProfile>();

  if (!profile) {
    redirect("/auth/login");
  }

  // 3. Load canvas list
  const { data: canvases } = await supabase
    .from("canvases")
    .select("id, title, visibility, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  let canvasList = (canvases ?? []) as { id: string; title: string; visibility: "private" | "public"; created_at: string }[];

  // 4. If user has no canvases, seed one
  if (canvasList.length === 0) {
    const { data: seedResult } = await supabase.rpc("seed_first_canvas", {
      user_id: user.id,
    });

    if (seedResult) {
      const { data: refreshed } = await supabase
        .from("canvases")
        .select("id, title, visibility, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });
      canvasList = (refreshed ?? []) as { id: string; title: string; visibility: "private" | "public"; created_at: string }[];
    }
  }

  // 5. Determine which canvas to load
  const params = await searchParams;
  const requestedId = params.id;
  let canvas: DbCanvas | null = null;

  if (requestedId) {
    const { data } = await supabase
      .from("canvases")
      .select("*")
      .eq("id", requestedId)
      .eq("owner_id", user.id)
      .single<DbCanvas>();
    canvas = data;
  }

  if (!canvas && canvasList.length > 0) {
    const { data } = await supabase
      .from("canvases")
      .select("*")
      .eq("id", canvasList[0].id)
      .single<DbCanvas>();
    canvas = data;
  }

  if (!canvas) {
    redirect("/auth/login");
  }

  // 6. Load nodes and edges
  const { data: dbNodes } = await supabase
    .from("canvas_nodes")
    .select("*")
    .eq("canvas_id", canvas.id)
    .order("sort_order", { ascending: true });

  const { data: dbEdges } = await supabase
    .from("canvas_edges")
    .select("*")
    .eq("canvas_id", canvas.id);

  const nodes = ((dbNodes ?? []) as DbCanvasNode[]).map(dbNodeToClient);
  const edges = ((dbEdges ?? []) as DbCanvasEdge[]).map(dbEdgeToClient);

  // Pre-sign R2 image keys for initial render (avoids blank-image flash)
  const imageKeys = nodes
    .filter((n): n is Extract<typeof n, { type: "image" }> => n.type === "image")
    .map((n) => n.src)
    .filter(isR2Key);

  let initialSignedUrls: Record<string, string> = {};
  if (imageKeys.length > 0) {
    const s3 = getR2Client();
    const bucket = getR2BucketName();
    const entries = await Promise.all(
      imageKeys.map(async (key) => {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return [key, url] as [string, string];
      })
    );
    initialSignedUrls = Object.fromEntries(entries);
  }

  return (
    <CanvasClient
      key={canvas.id}
      profile={profile}
      userEmail={user.email ?? ""}
      canvas={canvas}
      canvasList={canvasList.map((c) => ({ id: c.id, title: c.title, visibility: c.visibility }))}
      initialNodes={nodes}
      initialEdges={edges}
      initialSignedUrls={initialSignedUrls}
    />
  );
}
