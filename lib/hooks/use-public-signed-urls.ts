"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isR2Key } from "@/lib/r2-utils";
import type { CanvasNode } from "@/lib/canvas-types";

type UrlMap = Record<string, string>;

const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes

async function fetchPublicSignedUrls(keys: string[], canvasId: string): Promise<UrlMap> {
  if (keys.length === 0) return {};
  const res = await fetch("/api/sign-urls/public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys, canvasId }),
  });
  if (!res.ok) return {};
  const { urls } = await res.json();
  return urls;
}

export function usePublicSignedUrls(
  canvasId: string,
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

  useEffect(() => {
    const keys = getImageKeys(nodes);
    const keysStr = keys.sort().join(",");

    if (keysStr === lastKeysRef.current) return;
    lastKeysRef.current = keysStr;

    if (keys.length === 0) return;

    const missing = keys.filter((k) => !urlMap[k]);
    if (missing.length === 0) return;

    fetchPublicSignedUrls(missing, canvasId).then((urls) => {
      setUrlMap((prev) => ({ ...prev, ...urls }));
    });
  }, [nodes, getImageKeys, urlMap, canvasId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const keys = getImageKeys(nodes);
      if (keys.length > 0) {
        fetchPublicSignedUrls(keys, canvasId).then((urls) => {
          setUrlMap((prev) => ({ ...prev, ...urls }));
        });
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [nodes, getImageKeys, canvasId]);

  const resolveUrl = useCallback(
    (src: string): string => {
      if (!isR2Key(src)) return src;
      return urlMap[src] ?? "";
    },
    [urlMap]
  );

  return { resolveUrl };
}
