"use client";

import { useState } from "react";
import type { LinkPreviewData } from "@/lib/canvas-types";
export type { LinkPreviewData } from "@/lib/canvas-types";

type LinkPreviewCardProps = {
  data: LinkPreviewData | null; // null while loading
  fetchError?: boolean;
  width?: number | string;
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
}: LinkPreviewCardProps) {
  const [imgError, setImgError] = useState(false);

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
            height: 140,
            background: "var(--surface-raised)",
            animation: "shimmer 1.6s ease-in-out infinite",
          }}
        />
        <div style={{ padding: "12px 16px" }}>
          <Bone w={64} h={8} mb={10} />
          <Bone w="80%" h={12} mb={6} />
          <Bone w="60%" h={10} />
        </div>
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
      {showImage && (
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
      )}

      {/* Text content */}
      <div className="tc-link-preview__text" style={{ padding: "12px 16px" }}>
        {/* Site name */}
        <p
          className="tc-link-preview__site-name"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-xs)",
            color: "var(--accent-default)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wide)",
            marginBottom: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.siteName}
        </p>

        {/* Title */}
        {data.title && (
          <p
            className="tc-link-preview__title"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-base)",
              fontWeight: 500,
              color: "var(--text-primary)",
              lineHeight: "var(--line-height-tight)",
              marginBottom: data.description ? 6 : 0,
              // Clamp to 2 lines
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.title}
          </p>
        )}

        {/* Description */}
        {data.description && (
          <p
            className="tc-link-preview__description"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-secondary)",
              lineHeight: "var(--line-height-normal)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.description}
          </p>
        )}
      </div>
    </div>
  );
}
