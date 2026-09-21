/**
 * Parse a Twitter/X post URL and extract the tweet ID.
 * Returns the tweet ID string or null if the URL is not a tweet.
 */
export function parseTweetId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (host !== "twitter.com" && host !== "x.com" && host !== "mobile.twitter.com") {
      return null;
    }
    // Pattern: /:handle/status/:id
    const match = u.pathname.match(/^\/[^/]+\/status\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
