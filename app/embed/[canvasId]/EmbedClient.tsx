"use client";

import { useEffect } from "react";
import { ReadOnlyCanvasView } from "@/components/features/ReadOnlyCanvasView";
import { EmbedAttribution } from "@/components/features/EmbedAttribution";
import { usePublicSignedUrls } from "@/lib/hooks/use-public-signed-urls";
import type { CanvasNode, Edge } from "@/lib/canvas-types";

type EmbedClientProps = {
  canvasId: string;
  nodes: CanvasNode[];
  edges: Edge[];
  ownerName: string;
  ownerAvatarUrl: string | null;
  initialSignedUrls: Record<string, string>;
  theme: "light" | "dark";
};

export function EmbedClient({
  canvasId,
  nodes,
  edges,
  ownerName,
  ownerAvatarUrl,
  initialSignedUrls,
  theme,
}: EmbedClientProps) {
  // Force the embed theme (overrides localStorage/system preference)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const { resolveUrl } = usePublicSignedUrls(canvasId, nodes, initialSignedUrls);

  return (
    <div className="tc-embed" style={{ position: "fixed", inset: 0 }}>
      <ReadOnlyCanvasView
        nodes={nodes}
        edges={edges}
        resolveUrl={resolveUrl}
      />

      <EmbedAttribution
        displayName={ownerName}
        avatarUrl={ownerAvatarUrl}
      />
    </div>
  );
}
