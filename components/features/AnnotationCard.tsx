"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";
import { HoverToolbar } from "./HoverToolbar";

type AnnotationCardProps = {
  initialBody?: string;
  readOnly?: boolean;
  onSave?: (body: string) => void;
  cardStyle?: React.CSSProperties;
  className?: string;
  /** Suppress the hover toolbar (used when the toolbar lives on the parent node). */
  hideToolbar?: boolean;
  /** Called whenever the editing state changes. */
  onEditingChange?: (editing: boolean) => void;
};

const LABEL = "WHAT MAKES THIS GREAT?";

export function AnnotationCard({
  initialBody = "",
  readOnly = false,
  onSave,
  cardStyle,
  className,
  hideToolbar = false,
  onEditingChange,
}: AnnotationCardProps) {
  const [body, setBody] = useState(initialBody);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal state when the parent switches to a different node
  useEffect(() => {
    if (!editing) {
      setBody(initialBody);
    }
  }, [initialBody, editing]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  function startEditing() {
    if (readOnly) return;
    setEditing(true);
    onEditingChange?.(true);
  }

  function save() {
    setEditing(false);
    onSave?.(body);
    onEditingChange?.(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      setBody(initialBody);
      setEditing(false);
      onEditingChange?.(false);
    }
  }

  return (
    <div
      className={cn("tc-annotation-card relative group", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover toolbar: vertical-right, 12px from node edge */}
      {!hideToolbar && hovered && !editing && (
        <div
          className="tc-annotation-card__toolbar absolute top-1/2 -translate-y-1/2 z-10"
          style={{ left: "calc(100% + 12px)" }}
        >
          <HoverToolbar variant="vertical-right" />
        </div>
      )}

      <div
        onClick={startEditing}
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        onKeyDown={(e) => {
          if (!readOnly && (e.key === "Enter" || e.key === " ")) startEditing();
        }}
        style={{
          width: "289px",
          padding: "16px",
          borderRadius: "5px",
          background: "var(--annotation-card-bg)",
          border: `1px solid ${editing ? "var(--annotation-card-border-editing)" : "transparent"}`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          cursor: readOnly ? "default" : editing ? "text" : "pointer",
          ...cardStyle,
        }}
        className={cn(
          "tc-annotation-card__frame transition-colors",
          !readOnly && !editing && "hover:border-border-subtle",
          !readOnly && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        )}
      >
        {/* Label */}
        <p
          className="tc-annotation-card__label"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-xs)",
            letterSpacing: "var(--letter-spacing-wider)",
            color: "var(--annotation-card-label-color)",
            marginBottom: "12px",
            textTransform: "uppercase",
          }}
        >
          {LABEL}
        </p>

        {/* Body */}
        {editing ? (
          <textarea
            className="tc-annotation-card__textarea"
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={save}
            maxLength={500}
            rows={4}
            placeholder="Why does this resonate?"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-md)",
              lineHeight: "var(--line-height-normal)",
              color: "var(--annotation-card-body-color)",
            }}
          />
        ) : (
          <p
            className="tc-annotation-card__body"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-md)",
              lineHeight: "var(--line-height-normal)",
              color: "var(--annotation-card-body-color)",
              minHeight: "24px",
            }}
          >
            {body || (
              <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                Click to add a reflection...
              </span>
            )}
          </p>
        )}

        {editing && (
          <p
            className="tc-annotation-card__hint"
            style={{
              marginTop: "8px",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Cmd+Enter to save, Esc to cancel
          </p>
        )}
      </div>
    </div>
  );
}
