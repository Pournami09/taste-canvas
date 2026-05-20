"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import type { CanvasNode } from "@/lib/canvas-types";

type SearchResult = {
  node: CanvasNode;
  matchedField: string;
  snippet: string;
};

function getNodeTitle(node: CanvasNode): string {
  if (node.type === "image") return node.alt || "Image";
  if (node.type === "link") return node.name ?? node.preview?.title ?? node.url;
  return node.body.slice(0, 60) || "Note";
}

function getNodeSnippet(node: CanvasNode, query: string): { field: string; snippet: string } {
  const q = query.toLowerCase();

  if (node.type === "image") {
    if (node.alt.toLowerCase().includes(q)) {
      return { field: "name", snippet: node.alt };
    }
    if (node.annotation.toLowerCase().includes(q)) {
      const idx = node.annotation.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 30);
      return { field: "reflection", snippet: (start > 0 ? "..." : "") + node.annotation.slice(start, idx + 60) };
    }
  }

  if (node.type === "link") {
    const title = node.name ?? node.preview?.title ?? "";
    if (title.toLowerCase().includes(q)) {
      return { field: "title", snippet: title };
    }
    if (node.annotation.toLowerCase().includes(q)) {
      const idx = node.annotation.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 30);
      return { field: "reflection", snippet: (start > 0 ? "..." : "") + node.annotation.slice(start, idx + 60) };
    }
    if (node.url.toLowerCase().includes(q)) {
      return { field: "url", snippet: node.url };
    }
  }

  if (node.type === "annotation") {
    if (node.body.toLowerCase().includes(q)) {
      const idx = node.body.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 30);
      return { field: "note", snippet: (start > 0 ? "..." : "") + node.body.slice(start, idx + 60) };
    }
  }

  return { field: "", snippet: "" };
}

function nodeMatches(node: CanvasNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.type === "image") {
    return node.alt.toLowerCase().includes(q) || node.annotation.toLowerCase().includes(q);
  }
  if (node.type === "link") {
    const title = node.name ?? node.preview?.title ?? "";
    return (
      title.toLowerCase().includes(q) ||
      node.annotation.toLowerCase().includes(q) ||
      node.url.toLowerCase().includes(q)
    );
  }
  if (node.type === "annotation") {
    return node.body.toLowerCase().includes(q);
  }
  return false;
}

type SearchPaletteProps = {
  nodes: CanvasNode[];
  resolveUrl: (src: string) => string;
  onClose: () => void;
  onJump: (nodeId: string) => void;
};

export function SearchPalette({ nodes, resolveUrl, onClose, onJump }: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results: SearchResult[] = query.trim()
    ? nodes
        .filter((n) => nodeMatches(n, query.trim()))
        .map((n) => {
          const { field, snippet } = getNodeSnippet(n, query.trim());
          return { node: n, matchedField: field, snippet };
        })
        .slice(0, 12)
    : [];

  // Reset active index when results change
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && results[activeIdx]) {
        e.preventDefault();
        onJump(results[activeIdx].node.id);
        onClose();
        return;
      }
    },
    [results, activeIdx, onClose, onJump]
  );

  // Scroll active item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <div
      className="tc-search-palette"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "18vh",
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="tc-search-palette__scrim"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--surface-overlay)",
          animation: "fadeIn var(--motion-duration-small) var(--motion-easing-out) both",
        }}
      />

      {/* Palette container */}
      <div
        className="tc-search-palette__container"
        style={{
          position: "relative",
          width: "min(90vw, 560px)",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          animation: "overlayIn 140ms ease-out both",
        }}
      >
        {/* Input row */}
        <div
          className="tc-search-palette__input-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            borderBottom: query.trim() && results.length > 0 ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <Search size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <input
            className="tc-search-palette__input"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-md)",
              color: "var(--text-primary)",
            }}
          />
          {query && (
            <button
              className="tc-search-palette__clear"
              onClick={() => setQuery("")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="tc-search-palette__results" ref={listRef} style={{ maxHeight: 360, overflowY: "auto" }}>
            {results.length === 0 ? (
              <div
                className="tc-search-palette__empty"
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-tertiary)",
                }}
              >
                No matches in your canvas.
              </div>
            ) : (
              results.map((r, i) => (
                <button
                  className="tc-search-palette__result"
                  key={r.node.id}
                  data-idx={i}
                  onClick={() => { onJump(r.node.id); onClose(); }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    width: "100%",
                    padding: "10px 16px",
                    background: i === activeIdx ? "var(--surface-subtle)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="tc-search-palette__thumb"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--surface-subtle)",
                      overflow: "hidden",
                      flexShrink: 0,
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {r.node.type === "image" && (
                      <img src={resolveUrl(r.node.src)} alt={r.node.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                    {r.node.type === "link" && r.node.preview?.ogImage && (
                      <img src={r.node.preview.ogImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>

                  {/* Text */}
                  <div className="tc-search-palette__result-text" style={{ flex: 1, minWidth: 0 }}>
                    <p
                      className="tc-search-palette__result-title"
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: 2,
                      }}
                    >
                      {getNodeTitle(r.node)}
                    </p>
                    {r.snippet && (
                      <p
                        className="tc-search-palette__result-snippet"
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "var(--font-size-xs)",
                          color: "var(--text-tertiary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.matchedField && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "10px",
                              color: "var(--accent-default)",
                              textTransform: "uppercase",
                              marginRight: 6,
                            }}
                          >
                            {r.matchedField}
                          </span>
                        )}
                        {r.snippet}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Empty / hint state */}
        {!query.trim() && (
          <div
            className="tc-search-palette__hint"
            style={{
              padding: "20px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              textAlign: "center",
              letterSpacing: "var(--letter-spacing-wide)",
            }}
          >
            Search nodes, annotations, and links
          </div>
        )}
      </div>
    </div>
  );
}
