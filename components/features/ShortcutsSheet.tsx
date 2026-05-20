"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type ShortcutsSheetProps = {
  onClose: () => void;
};

const SHORTCUTS: Array<{ keys: string[]; description: string; section?: string }> = [
  { section: "Canvas", keys: ["Cmd", "V"], description: "Paste (link, image, or text)" },
  { keys: ["Cmd", "Z"], description: "Undo" },
  { keys: ["Cmd", "Shift", "Z"], description: "Redo" },
  { keys: ["Cmd", "K"], description: "Search nodes" },
  { keys: ["Cmd", "0"], description: "Fit canvas to view" },
  { keys: ["Cmd", "1"], description: "Zoom to 100%" },
  { section: "Nodes", keys: ["Click"], description: "Open node detail" },
  { keys: ["Shift", "Click"], description: "Add to selection" },
  { keys: ["Delete", "/", "Backspace"], description: "Delete selected node(s)" },
  { keys: ["Esc"], description: "Close overlay, deselect, cancel" },
  { section: "Navigation", keys: ["Scroll"], description: "Pan canvas" },
  { keys: ["Cmd", "Scroll"], description: "Zoom in/out" },
  { keys: ["Drag"], description: "Pan canvas (on background)" },
  { keys: ["Double-drag"], description: "Lasso / multi-select" },
  { section: "Other", keys: ["?"], description: "Show this shortcut sheet" },
];

function KbdKey({ label }: { label: string }) {
  return (
    <span
      className="tc-shortcuts-sheet__kbd"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 24,
        height: 20,
        padding: "0 6px",
        borderRadius: "var(--radius-xs)",
        background: "var(--surface-subtle)",
        border: "1px solid var(--border-default)",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        color: "var(--text-secondary)",
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}

export function ShortcutsSheet({ onClose }: ShortcutsSheetProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?") { e.preventDefault(); onClose(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="tc-shortcuts-sheet"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        className="tc-shortcuts-sheet__scrim"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--surface-overlay)",
          animation: "fadeIn var(--motion-duration-small) var(--motion-easing-out) both",
        }}
      />

      {/* Sheet */}
      <div
        className="tc-shortcuts-sheet__container"
        style={{
          position: "relative",
          width: "min(90vw, 480px)",
          maxHeight: "80vh",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "overlayIn 140ms ease-out both",
        }}
      >
        {/* Header */}
        <div
          className="tc-shortcuts-sheet__header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <p
            className="tc-shortcuts-sheet__title"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-md)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Keyboard Shortcuts
          </p>
          <button
            className="tc-shortcuts-sheet__close"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--surface-subtle)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* List */}
        <div className="tc-shortcuts-sheet__list" style={{ overflowY: "auto", padding: "8px 0" }}>
          {SHORTCUTS.map((s, i) => (
            <div key={i}>
              {s.section && (
                <p
                  className="tc-shortcuts-sheet__section"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                    padding: i === 0 ? "12px 24px 6px" : "20px 24px 6px",
                  }}
                >
                  {s.section}
                </p>
              )}
              <div
                className="tc-shortcuts-sheet__row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 24px",
                }}
              >
                <p
                  className="tc-shortcuts-sheet__description"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {s.description}
                </p>
                <div className="tc-shortcuts-sheet__keys" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {s.keys.map((k, ki) => (
                    <span key={ki} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {ki > 0 && k !== "/" && (
                        <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>+</span>
                      )}
                      {ki > 0 && k === "/" && (
                        <span style={{ color: "var(--text-tertiary)", fontSize: 11, margin: "0 2px" }}>/</span>
                      )}
                      {k !== "/" && <KbdKey label={k} />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
