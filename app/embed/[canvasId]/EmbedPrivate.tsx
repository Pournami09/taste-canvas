export function EmbedPrivate() {
  return (
    <div
      className="tc-embed-error"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: "var(--surface-background)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--font-size-lg)",
          color: "var(--text-tertiary)",
          fontWeight: 400,
        }}
      >
        This canvas is private
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-size-xs)",
          color: "var(--text-tertiary)",
          opacity: 0.6,
          letterSpacing: "var(--letter-spacing-wide)",
        }}
      >
        Taste Canvas
      </p>
    </div>
  );
}
