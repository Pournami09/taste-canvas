import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { getR2Client, getR2BucketName } from "@/lib/r2";

const MAX_KEYS = 30;
const OWNER_TTL = 3600; // 1 hour

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { keys } = body as { keys: string[] };

  if (!Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: "keys array required" }, { status: 400 });
  }

  if (keys.length > MAX_KEYS) {
    return NextResponse.json({ error: "Too many keys" }, { status: 400 });
  }

  const invalidKeys = keys.filter((k) => !k.startsWith(`${user.id}/`));
  if (invalidKeys.length > 0) {
    return NextResponse.json({ error: "Unauthorized keys" }, { status: 403 });
  }

  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const entries = await Promise.all(
    keys.map(async (key) => {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const url = await getSignedUrl(s3, command, { expiresIn: OWNER_TTL });
      return [key, url] as [string, string];
    })
  );

  const urls: Record<string, string> = Object.fromEntries(entries);
  return NextResponse.json({ urls });
}
