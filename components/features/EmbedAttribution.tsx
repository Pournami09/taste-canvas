"use client";

type EmbedAttributionProps = {
  displayName: string;
  avatarUrl?: string | null;
};

export function EmbedAttribution({ displayName, avatarUrl }: EmbedAttributionProps) {
  const nameParts = displayName.split(" ").filter(Boolean);
  const firstName = nameParts[0] ?? "Unknown";
  const initials = nameParts
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
        boxShadow: "none",
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
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--font-size-xs)",
          color: "var(--embed-attribution-fg)",
          whiteSpace: "nowrap",
        }}
      >
        {firstName}&apos;s Taste Canvas
      </span>
    </div>
  );
}
