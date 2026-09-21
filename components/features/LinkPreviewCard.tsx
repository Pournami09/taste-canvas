"use client";

import { useState } from "react";
import type { LinkPreviewData } from "@/lib/canvas-types";
export type { LinkPreviewData } from "@/lib/canvas-types";
import { parseTweetId } from "@/lib/twitter";
import { TweetPreviewCard } from "./TweetPreviewCard";

type LinkPreviewCardProps = {
  data: LinkPreviewData | null; // null while loading
  fetchError?: boolean;
  width?: number | string;
  /** Raw node URL; used to detect tweet links even before preview data arrives. */
  url?: string;
};

// Skeleton block used in the loading state.
function Bone({ w, h, mb = 0 }: { w: string | number; h: number; mb?: number }) {
  return (
    <div
      className="tc-link-preview__bone"
      style={{
        width: w,
        height: h,
        borderRadius: 4,
        background: "var(--surface-raised)",
        marginBottom: mb,
        animation: "shimmer 1.6s ease-in-out infinite",
      }}
    />
  );
}

export function LinkPreviewCard({
  data,
  fetchError = false,
  width = 300,
  url,
}: LinkPreviewCardProps) {
  const [imgError, setImgError] = useState(false);

  // Delegate to tweet card for Twitter/X URLs
  const resolvedUrl = data?.url ?? url;
  const isTweet = resolvedUrl ? parseTweetId(resolvedUrl) !== null : false;
  if (isTweet && data) {
    return <TweetPreviewCard data={data} width={width} />;
  }

  const cardStyle: React.CSSProperties = {
    width,
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    background: "var(--annotation-card-bg)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid var(--border-subtle)",
  };

  // --- Loading skeleton ---
  if (!data && !fetchError) {
    return (
      <div className="tc-link-preview tc-link-preview__skeleton" style={cardStyle}>
        <div
          style={{
            height: 160,
            background: "var(--surface-raised)",
            animation: "shimmer 1.6s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  // --- Error state ---
  if (fetchError || !data) {
    return (
      <div className="tc-link-preview tc-link-preview__error" style={cardStyle}>
        <div style={{ padding: "12px 16px" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wide)",
              marginBottom: 6,
            }}
          >
            Could not load preview
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data?.url ?? ""}
          </p>
        </div>
      </div>
    );
  }

  const showImage = data.ogImage && !imgError;

  return (
    <div className="tc-link-preview" style={cardStyle}>
      {/* OG image */}
      {showImage ? (
        <img
          className="tc-link-preview__image"
          src={data.ogImage}
          alt=""
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: 160,
            objectFit: "cover",
            display: "block",
            pointerEvents: "none",
          }}
        />
      ) : (
        /* No image: compact domain strip so the card has visual presence */
        <div
          className="tc-link-preview__domain-strip"
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--accent-default)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wide)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.siteName}
          </p>
        </div>
      )}
    </div>
  );
}
