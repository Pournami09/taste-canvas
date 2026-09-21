"use client";

import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// TagChip
// ---------------------------------------------------------------------------

type TagChipProps = {
  label: string;
  active?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
};

export function TagChip({ label, active = false, onRemove, onClick }: TagChipProps) {
  const isInteractive = !!onClick;

  return (
    <span
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
      className="tc-tag-chip"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: onRemove ? "2px 4px 2px 8px" : "2px 8px",
        borderRadius: "var(--radius-full)",
        background: active ? "var(--tag-chip-bg-active)" : "var(--tag-chip-bg)",
        border: `1px solid ${active ? "var(--tag-chip-border-active)" : "var(--tag-chip-border)"}`,
        color: active ? "var(--tag-chip-fg-active)" : "var(--tag-chip-fg)",
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        letterSpacing: "var(--letter-spacing-wide)",
        cursor: isInteractive ? "pointer" : "default",
        whiteSpace: "nowrap",
        userSelect: "none",
        transition:
          "background var(--motion-duration-small) var(--motion-easing-out), border-color var(--motion-duration-small) var(--motion-easing-out), color var(--motion-duration-small) var(--motion-easing-out)",
        flexShrink: 0,
      }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove tag ${label}`}
          style={{
            width: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            padding: 0,
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TagFilterBar
// ---------------------------------------------------------------------------

type TagFilterBarProps = {
  allTags: string[];
  activeTags: Set<string>;
  onToggleTag: (tag: string) => void;
  onClearAll: () => void;
};

export function TagFilterBar({
  allTags,
  activeTags,
  onToggleTag,
  onClearAll,
}: TagFilterBarProps) {
  if (allTags.length === 0) return null;

  return (
    <div
      className="tc-tag-filter-bar"
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        maxWidth: "calc(100vw - 240px)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "var(--tag-filter-bar-bg)",
        border: "1px solid var(--tag-filter-bar-border)",
        borderRadius: "var(--radius-full)",
        padding: "6px 10px",
        boxShadow: "var(--shadow-sm)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--text-tertiary)",
          letterSpacing: "var(--letter-spacing-wider)",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Filter
      </span>

      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {allTags.map((tag) => (
          <TagChip
            key={tag}
            label={tag}
            active={activeTags.has(tag)}
            onClick={() => onToggleTag(tag)}
          />
        ))}
      </div>

      {activeTags.size > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          style={{
            marginLeft: 2,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
            letterSpacing: "var(--letter-spacing-wide)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            padding: "0 4px",
            flexShrink: 0,
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
