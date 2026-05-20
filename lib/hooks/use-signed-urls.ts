"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isR2Key } from "@/lib/r2-utils";
import type { CanvasNode } from "@/lib/canvas-types";

export { isR2Key } from "@/lib/r2-utils";

type UrlMap = Record<string, string>;

const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes (URLs expire at 60 min)

async function fetchSignedUrls(keys: string[]): Promise<UrlMap> {
  if (keys.length === 0) return {};
  const res = await fetch("/api/sign-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) {
    console.error("Failed to fetch signed URLs:", res.status);
    return {};
  }
  const { urls } = await res.json();
  return urls;
}

export function useSignedUrls(
  nodes: CanvasNode[],
  initialUrls?: UrlMap
) {
  const [urlMap, setUrlMap] = useState<UrlMap>(initialUrls ?? {});
  const lastKeysRef = useRef<string>("");

  const getImageKeys = useCallback((nodeList: CanvasNode[]): string[] => {
    return nodeList
      .filter((n): n is CanvasNode & { type: "image" } => n.type === "image")
      .map((n) => n.src)
      .filter(isR2Key);
  }, []);

  // Bulk resolve on mount and when the set of image keys changes
  useEffect(() => {
    const keys = getImageKeys(nodes);
    const keysStr = keys.sort().join(",");

    if (keysStr === lastKeysRef.current) return;
    lastKeysRef.current = keysStr;

    if (keys.length === 0) return;

    // Only fetch keys we do not already have
    const missing = keys.filter((k) => !urlMap[k]);
    if (missing.length === 0) return;

    fetchSignedUrls(missing).then((urls) => {
      setUrlMap((prev) => ({ ...prev, ...urls }));
    });
  }, [nodes, getImageKeys, urlMap]);

  // Periodic refresh to prevent expiry during long sessions
  useEffect(() => {
    const timer = setInterval(() => {
      const keys = getImageKeys(nodes);
      if (keys.length > 0) {
        fetchSignedUrls(keys).then((urls) => {
          setUrlMap((prev) => ({ ...prev, ...urls }));
        });
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [nodes, getImageKeys]);

  // Resolve a single key immediately (used after upload)
  const signKey = useCallback(async (key: string): Promise<string> => {
    const urls = await fetchSignedUrls([key]);
    const signedUrl = urls[key] ?? "";
    if (signedUrl) {
      setUrlMap((prev) => ({ ...prev, [key]: signedUrl }));
    }
    return signedUrl;
  }, []);

  // Look up a src value: R2 keys resolve to signed URLs, full URLs pass through
  const resolveUrl = useCallback(
    (src: string): string => {
      if (!isR2Key(src)) return src;
      return urlMap[src] ?? "";
    },
    [urlMap]
  );

  return { resolveUrl, signKey, urlMap };
}
