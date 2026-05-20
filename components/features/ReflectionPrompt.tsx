"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type ReflectionPromptProps = {
  onSave: (body: string) => void;
  onSkip: () => void;
};

export function ReflectionPrompt({ onSave, onSkip }: ReflectionPromptProps) {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") { e.preventDefault(); onSkip(); }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(body); }
    },
    [body, onSave, onSkip]
  );

  return (
    <div
      className="tc-reflection-prompt"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 400,
        // No backdrop here: reflection prompt is a floating inline modal, not full-screen takeover.
        pointerEvents: "none",
      }}
    >
      <div
        className="tc-reflection-prompt__container"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: "var(--surface-raised)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          boxShadow: "var(--shadow-xl)",
          pointerEvents: "auto",
          animation: "overlayIn var(--motion-duration-small) var(--motion-easing-out) both",
        }}
      >
        {/* Heading */}
        <p
          className="tc-reflection-prompt__heading"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-xl)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Why does this resonate?
        </p>
        <p
          className="tc-reflection-prompt__subheading"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-tertiary)",
            marginBottom: 20,
          }}
        >
          Take 10 seconds. You can always skip.
        </p>

        {/* Textarea */}
        <textarea
          className="tc-reflection-prompt__textarea"
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          maxLength={500}
          rows={3}
          placeholder="What is it about this that speaks to you?"
          style={{
            width: "100%",
            background: "var(--surface-subtle)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            padding: "12px",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-md)",
            lineHeight: "var(--line-height-normal)",
            color: "var(--text-primary)",
            resize: "none",
            outline: "none",
            marginBottom: 8,
            display: "block",
          }}
        />

        {/* Counter + hint */}
        <div
          className="tc-reflection-prompt__meta"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <p
            className="tc-reflection-prompt__counter"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            {body.length} / 500
          </p>
          <p
            className="tc-reflection-prompt__hint"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            Cmd+Enter to save
          </p>
        </div>

        {/* Actions */}
        <div className="tc-reflection-prompt__actions" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            className="tc-reflection-prompt__skip"
            onClick={onSkip}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
              transition: "border-color var(--motion-duration-small) var(--motion-easing-out)",
            }}
          >
            Skip
          </button>
          <button
            className="tc-reflection-prompt__save"
            onClick={() => onSave(body)}
            style={{
              padding: "8px 20px",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-default)",
              border: "none",
              color: "var(--text-inverse)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
