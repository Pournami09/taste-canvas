import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getR2Client, getR2BucketName } from "@/lib/r2";
import { dbNodeToClient, dbEdgeToClient } from "@/lib/canvas-db";
import { isR2Key } from "@/lib/r2-utils";
import type { DbProfile, DbCanvas, DbCanvasNode, DbCanvasEdge } from "@/lib/canvas-db";
import { EmbedClient } from "./EmbedClient";
import { EmbedNotFound } from "./EmbedNotFound";
import { EmbedPrivate } from "./EmbedPrivate";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ canvasId: string }>;
}) {
  const { canvasId } = await params;
  const supabase = await createClient();

  // 1. Load canvas (RLS allows anon read on public canvases)
  const { data: canvas } = await supabase
    .from("canvases")
    .select("*")
    .eq("id", canvasId)
    .single<DbCanvas>();

  if (!canvas) {
    return <EmbedNotFound />;
  }

  if (canvas.visibility !== "public") {
    return <EmbedPrivate />;
  }

  // 2. Load owner profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", canvas.owner_id)
    .single<Pick<DbProfile, "display_name" | "avatar_url">>();

  const ownerName = profile?.display_name ?? "Unknown";
  const ownerAvatarUrl = profile?.avatar_url ?? null;

  // 3. Load nodes and edges
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

  // 4. Pre-sign R2 image keys
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
    <EmbedClient
      canvasId={canvas.id}
      nodes={nodes}
      edges={edges}
      ownerName={ownerName}
      ownerAvatarUrl={ownerAvatarUrl}
      initialSignedUrls={initialSignedUrls}
    />
  );
}
