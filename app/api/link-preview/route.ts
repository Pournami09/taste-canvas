import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a <meta> tag's content by attribute name + value. */
function getMeta(html: string, attr: string, value: string): string {
  // Handle both attribute orders: attr first, then content; or content first.
  const re1 = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["']`,
    "i"
  );
  return html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? "";
}

/** Decode common HTML entities. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

/** Resolve a potentially relative URL against a base. */
function resolveUrl(maybeRelative: string, base: string): string {
  if (!maybeRelative) return "";
  if (maybeRelative.startsWith("http")) return maybeRelative;
  try {
    return new URL(maybeRelative, base).href;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") ?? "";

  let targetUrl: URL;
  try {
    targetUrl = new URL(raw);
    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      throw new Error("protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl.href, {
      headers: {
        // A realistic User-Agent improves og:image availability on many sites.
        "User-Agent":
          "Mozilla/5.0 (compatible; TasteCanvas/1.0; +https://taste-canvas.vercel.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    const contentType = res.headers.get("content-type") ?? "";

    // Direct image URL: return it as the og:image itself.
    if (contentType.startsWith("image/")) {
      return NextResponse.json({
        url: targetUrl.href,
        title: targetUrl.hostname,
        description: "",
        ogImage: targetUrl.href,
        siteName: targetUrl.hostname,
      });
    }

    if (!contentType.includes("html")) {
      return NextResponse.json({
        url: targetUrl.href,
        title: targetUrl.hostname,
        description: "",
        ogImage: "",
        siteName: targetUrl.hostname,
      });
    }

    // Read only the first 100 KB — og tags are always in <head>.
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder().decode(buffer.slice(0, 100_000));

    const title =
      getMeta(html, "property", "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
      targetUrl.hostname;

    const description =
      getMeta(html, "property", "og:description") ||
      getMeta(html, "name", "description") ||
      "";

    const ogImageRaw = getMeta(html, "property", "og:image");
    const ogImage = resolveUrl(ogImageRaw, targetUrl.href);

    const siteName =
      getMeta(html, "property", "og:site_name") || targetUrl.hostname;

    return NextResponse.json({
      url: targetUrl.href,
      title: decodeEntities(title),
      description: decodeEntities(description),
      ogImage,
      siteName: decodeEntities(siteName),
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
