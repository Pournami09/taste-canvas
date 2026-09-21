"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TagChip } from "./TagFilterBar";

// ---------------------------------------------------------------------------
// TagInput
// ---------------------------------------------------------------------------

type TagInputProps = {
  tags: string[];
  allCanvasTags: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
};

export function TagInput({ tags, allCanvasTags, onChange, readOnly = false }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = allCanvasTags.filter(
    (t) =>
      !tags.includes(t) &&
      (inputValue.trim() === "" || t.toLowerCase().includes(inputValue.toLowerCase().trim()))
  );

  function normalizeTag(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, " ");
  }

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag || tags.includes(tag)) {
      setInputValue("");
      setShowDropdown(false);
      setActiveSuggestionIdx(-1);
      return;
    }
    onChange([...tags, tag]);
    setInputValue("");
    setShowDropdown(false);
    setActiveSuggestionIdx(-1);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  const updateDropdownPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 600,
    });
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (activeSuggestionIdx >= 0 && suggestions[activeSuggestionIdx]) {
          addTag(suggestions[activeSuggestionIdx]);
        } else if (inputValue.trim()) {
          addTag(inputValue);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!showDropdown && suggestions.length > 0) {
          updateDropdownPosition();
          setShowDropdown(true);
        }
        setActiveSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIdx((i) => Math.max(i - 1, -1));
        return;
      }

      if (e.key === "Escape") {
        setShowDropdown(false);
        setActiveSuggestionIdx(-1);
        setInputValue("");
        return;
      }

      if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
        return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputValue, activeSuggestionIdx, suggestions, tags, showDropdown]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    setActiveSuggestionIdx(-1);
    if (val.trim()) {
      updateDropdownPosition();
      setShowDropdown(true);
    } else {
      // Show all unused tags when input is empty and focused
      if (suggestions.length > 0) {
        updateDropdownPosition();
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setActiveSuggestionIdx(-1);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (readOnly) {
    if (tags.length === 0) return null;
    return (
      <div
        className="tc-tag-input tc-tag-input--readonly"
        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
      >
        {tags.map((tag) => (
          <TagChip key={tag} label={tag} />
        ))}
      </div>
    );
  }

  return (
    <div className="tc-tag-input" style={{ position: "relative" }} ref={containerRef}>
      <div
        className="tc-tag-input__field"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          minHeight: 36,
          padding: "4px 8px",
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          borderRadius: "var(--radius-sm)",
          cursor: "text",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <TagChip
            key={tag}
            label={tag}
            onRemove={() => removeTag(tag)}
          />
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            if (allCanvasTags.filter((t) => !tags.includes(t)).length > 0) {
              updateDropdownPosition();
              setShowDropdown(true);
            }
          }}
          placeholder={tags.length === 0 ? "Add tags..." : ""}
          style={{
            flex: 1,
            minWidth: 80,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-primary)",
            padding: 0,
          }}
        />
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          className="tc-tag-input__dropdown"
          style={{
            ...dropdownStyle,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)",
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {suggestions.map((tag, i) => (
            <button
              key={tag}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                addTag(tag);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "7px 10px",
                textAlign: "left",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                color: i === activeSuggestionIdx ? "var(--text-primary)" : "var(--text-secondary)",
                background:
                  i === activeSuggestionIdx ? "var(--surface-subtle)" : "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
