import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getR2Client, getR2BucketName } from "@/lib/r2";

const MAX_KEYS = 30;
const PUBLIC_TTL = 3600; // 1 hour

export async function POST(request: Request) {
  const body = await request.json();
  const { keys, canvasId } = body as { keys: string[]; canvasId: string };

  if (!canvasId || typeof canvasId !== "string") {
    return NextResponse.json({ error: "canvasId required" }, { status: 400 });
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: "keys array required" }, { status: 400 });
  }

  if (keys.length > MAX_KEYS) {
    return NextResponse.json({ error: "Too many keys" }, { status: 400 });
  }

  // Verify canvas is public (uses anon client; RLS allows read on public canvases)
  const supabase = await createClient();
  const { data: canvas } = await supabase
    .from("canvases")
    .select("id, visibility")
    .eq("id", canvasId)
    .single();

  if (!canvas) {
    return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
  }

  if (canvas.visibility !== "public") {
    return NextResponse.json({ error: "Canvas is private" }, { status: 403 });
  }

  // Verify keys belong to nodes on this canvas
  const { data: nodeRows } = await supabase
    .from("canvas_nodes")
    .select("src")
    .eq("canvas_id", canvasId)
    .in("src", keys);

  const validKeys = new Set((nodeRows ?? []).map((r: { src: string | null }) => r.src));
  const requestedKeys = keys.filter((k) => validKeys.has(k));

  if (requestedKeys.length === 0) {
    return NextResponse.json({ urls: {} });
  }

  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const entries = await Promise.all(
    requestedKeys.map(async (key) => {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const url = await getSignedUrl(s3, command, { expiresIn: PUBLIC_TTL });
      return [key, url] as [string, string];
    })
  );

  const urls: Record<string, string> = Object.fromEntries(entries);
  return NextResponse.json({ urls });
}
