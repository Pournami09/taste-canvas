"use client";

import type { LinkPreviewData } from "@/lib/canvas-types";
import { useState, useRef, useCallback } from "react";
import { Pause, Play } from "lucide-react";

type TweetPreviewCardProps = {
  data: LinkPreviewData;
  width?: number | string;
};

/** Check if a URL points to a video file. */
function isVideoUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /\.(mp4|webm|mov)$/.test(path) || url.includes("/vid/");
  } catch {
    return false;
  }
}

/**
 * Extract the author handle from a Twitter/X URL.
 */
function extractHandle(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/([^/]+)\/status\//);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function TweetPreviewCard({ data, width = 300 }: TweetPreviewCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handle = extractHandle(data.url);

  const hasMedia = data.ogImage && !imgError;
  const isVideo = hasMedia ? isVideoUrl(data.ogImage) : false;

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPaused(false);
    } else {
      vid.pause();
      setIsPaused(true);
    }
  }, []);

  return (
    <div
      className="tc-tweet-preview"
      style={{
        width,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--annotation-card-bg)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Media */}
      {hasMedia && (
        <div style={{ position: "relative", width: "100%" }}>
          {isVideo ? (
            <>
              <video
                ref={videoRef}
                src={data.ogImage}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setImgError(true)}
                style={{
                  width: "100%",
                  height: 200,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {/* Play/Pause button */}
              <button
                onClick={togglePlay}
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-full)",
                  background: "rgba(0, 0, 0, 0.6)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  backdropFilter: "blur(4px)",
                }}
                aria-label={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? <Play size={14} fill="#fff" /> : <Pause size={14} fill="#fff" />}
              </button>
            </>
          ) : (
            <img
              src={data.ogImage}
              alt=""
              onError={() => setImgError(true)}
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                display: "block",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      )}

      {/* Minimal attribution bar */}
      <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
        <svg
          viewBox="0 0 24 24"
          width={12}
          height={12}
          style={{ flexShrink: 0, fill: "var(--text-tertiary)" }}
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        {handle && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            @{handle}
          </span>
        )}
      </div>
    </div>
  );
}
