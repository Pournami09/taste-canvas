"use client";

type EmbedAttributionProps = {
  displayName: string;
  avatarUrl?: string | null;
};

export function EmbedAttribution({ displayName, avatarUrl }: EmbedAttributionProps) {
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "U";

  return (
    <div
      className="tc-embed-attribution"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px 8px 8px",
        background: "var(--embed-attribution-bg)",
        border: "1px solid var(--embed-attribution-border)",
        borderRadius: "var(--radius-full)",
        boxShadow: "var(--shadow-md)",
        pointerEvents: "auto",
      }}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          className="tc-embed-attribution__avatar"
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--embed-attribution-avatar-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--embed-attribution-avatar-fg)",
          }}
        >
          {initials}
        </div>
      )}

      {/* Text */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-xs)",
            color: "var(--embed-attribution-fg)",
            whiteSpace: "nowrap",
          }}
        >
          By {displayName}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--embed-attribution-fg-muted)",
            letterSpacing: "var(--letter-spacing-wide)",
            whiteSpace: "nowrap",
          }}
        >
          Taste Canvas
        </span>
      </div>
    </div>
  );
}
