"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";
import { HoverToolbar } from "./HoverToolbar";

type AnnotationCardProps = {
  initialBody?: string;
  readOnly?: boolean;
  onSave?: (body: string) => void;
  className?: string;
};

const LABEL = "WHAT MAKES THIS GREAT?";

export function AnnotationCard({
  initialBody = "",
  readOnly = false,
  onSave,
  className,
}: AnnotationCardProps) {
  const [body, setBody] = useState(initialBody);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }

  function save() {
    setEditing(false);
    onSave?.(body);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      setBody(initialBody);
      setEditing(false);
    }
  }

  return (
    <div
      className={cn("relative group", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover toolbar: vertical-right, 12px from node edge */}
      {hovered && !editing && (
        <div
          className="absolute top-1/2 -translate-y-1/2 z-10"
          style={{ left: "calc(100% + 12px)" }}
        >
          <HoverToolbar variant="vertical-right" onEdit={startEditing} />
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
        }}
        className={cn(
          "transition-colors",
          !readOnly && !editing && "hover:border-border-subtle",
          !readOnly && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        )}
      >
        {/* Label */}
        <p
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
