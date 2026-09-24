"use client";

import { useEffect, useRef } from "react";
import { X, ExternalLink, Trash2 } from "lucide-react";
import { AnnotationCard } from "./AnnotationCard";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { TagInput } from "./TagInput";
import type { CanvasNode, ImageNode, LinkNode, Edge } from "@/lib/canvas-types";
import { parseTweetId } from "@/lib/twitter";

type ExpandedOverlayProps = {
  node: CanvasNode;
  allNodes: CanvasNode[];
  edges: Edge[];
  resolveUrl: (src: string) => string;
  onClose: () => void;
  onAnnotationSave: (nodeId: string, body: string) => void;
  onNavigate: (nodeId: string) => void;
  onTagsSave: (nodeId: string, tags: string[]) => void;
  onDelete?: (nodeId: string) => void;
  allCanvasTags: string[];
  readOnly?: boolean;
};

function ConnectedNodeThumb({
  node,
  resolveUrl,
  onClick,
}: {
  node: CanvasNode;
  resolveUrl: (src: string) => string;
  onClick: () => void;
}) {
  const thumbStyle: React.CSSProperties = {
    width: 64,
    height: 64,
    borderRadius: "var(--radius-sm)",
    objectFit: "cover",
    display: "block",
    flexShrink: 0,
  };

  return (
    <button
      className="tc-expanded-overlay__connection-thumb"
      onClick={onClick}
      title={
        node.type === "image"
          ? node.alt
          : node.type === "link"
          ? (node.preview?.title ?? node.url)
          : node.type === "annotation"
          ? node.body.slice(0, 40)
          : "Video"
      }
      style={{
        width: 64,
        height: 64,
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-subtle)",
        border: "1px solid var(--border-subtle)",
        cursor: "pointer",
        overflow: "hidden",
        flexShrink: 0,
        padding: 0,
        display: "block",
        transition: "transform var(--motion-duration-small) var(--motion-easing-out), border-color var(--motion-duration-small) var(--motion-easing-out)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
      }}
    >
      {node.type === "image" ? (
        <img src={resolveUrl(node.src)} alt={node.alt} style={thumbStyle} />
      ) : node.type === "link" && node.preview?.ogImage ? (
        <img src={node.preview.ogImage} alt={node.preview.title} style={thumbStyle} />
      ) : node.type === "link" ? (
        <div
          className="tc-expanded-overlay__thumb-link-fallback"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              textAlign: "center",
              wordBreak: "break-all",
            }}
          >
            {node.preview?.siteName ?? new URL(node.url).hostname}
          </p>
        </div>
      ) : (
        <div
          className="tc-expanded-overlay__thumb-annotation-fallback"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-secondary)",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {node.type === "annotation" ? node.body : ""}
          </p>
        </div>
      )}
    </button>
  );
}

export function ExpandedOverlay({
  node,
  allNodes,
  edges,
  resolveUrl,
  onClose,
  onAnnotationSave,
  onNavigate,
  onTagsSave,
  onDelete,
  allCanvasTags,
  readOnly = false,
}: ExpandedOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle Esc to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    }
    window.addEventListener("keydown", onKeyDown);
    containerRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Find connected nodes (nodes at the other end of edges involving this node)
  const connectedNodes = edges
    .filter((e) => e.fromId === node.id || e.toId === node.id)
    .map((e) => {
      const otherId = e.fromId === node.id ? e.toId : e.fromId;
      return allNodes.find((n) => n.id === otherId);
    })
    .filter((n): n is CanvasNode => n !== undefined);

  const annotation =
    node.type === "image" || node.type === "link" ? node.annotation : "";

  return (
    <div
      className="tc-expanded-overlay"
      style={{
        position: "fixed",
        top: 64,
        right: 16,
        bottom: 16,
        width: "min(380px, 85vw)",
        zIndex: 500,
        pointerEvents: "none",
      }}
    >
      {/* Floating side panel */}
      <div
        className="tc-expanded-overlay__container"
        ref={containerRef}
        tabIndex={-1}
        style={{
          pointerEvents: "auto",
          width: "100%",
          height: "100%",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slideInFromRight 180ms ease-out both",
          outline: "none",
        }}
      >
        {/* Header actions */}
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {onDelete && !readOnly && (
            <button
              className="tc-expanded-overlay__delete"
              onClick={() => onDelete(node.id)}
              aria-label="Delete node"
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
                transition: "color 120ms ease, border-color 120ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--state-error)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--state-error)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            className="tc-expanded-overlay__close"
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

        {/* Media area */}
        <div
          className="tc-expanded-overlay__media"
          style={{
            flexShrink: 0,
            maxHeight: "40%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-subtle)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          }}
        >
          {node.type === "image" ? (
            (() => {
              const normRot = (((node as ImageNode).canvasRotation % 360) + 360) % 360;
              return (
                <img
                  className="tc-expanded-overlay__media-image"
                  src={resolveUrl(node.src)}
                  alt={node.alt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transform: normRot !== 0 ? `rotate(${normRot}deg)` : undefined,
                    transformOrigin: "center",
                  }}
                />
              );
            })()
          ) : node.type === "link" ? (
            <div className="tc-expanded-overlay__media-link" style={{ width: "100%", padding: "20px" }}>
              <LinkPreviewCard data={node.preview} fetchError={node.fetchError} width="100%" url={node.url} />
              {/* Tweet text shown in expanded overlay */}
              {parseTweetId(node.url) && (node as LinkNode).preview?.description && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                    lineHeight: "var(--line-height-normal)",
                    marginTop: 12,
                  }}
                >
                  {(node as LinkNode).preview!.description}
                </p>
              )}
              <a
                className="tc-expanded-overlay__open-original"
                href={node.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--accent-default)",
                  textDecoration: "none",
                  letterSpacing: "var(--letter-spacing-wide)",
                }}
              >
                <ExternalLink size={11} />
                Open {(() => { try { return new URL((node as LinkNode).url).hostname.replace(/^www\./, ""); } catch { return (node as LinkNode).url; } })()}
              </a>
            </div>
          ) : (
            <div className="tc-expanded-overlay__media-annotation" style={{ padding: "24px 20px", width: "100%" }}>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-xs)",
                  letterSpacing: "var(--letter-spacing-wider)",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                What makes this great?
              </p>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--font-size-md)",
                  color: "var(--text-primary)",
                  lineHeight: "var(--line-height-normal)",
                }}
              >
                {(node.type === "annotation" ? node.body : "") || (
                  <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                    No text yet.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Annotation area (scrollable) */}
        {node.type !== "annotation" && (
          <div
            className="tc-expanded-overlay__annotation"
            style={{
              flex: "1 1 auto",
              overflowY: "auto",
              padding: "20px",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <AnnotationCard
              initialBody={annotation}
              readOnly={readOnly}
              onSave={(body) => onAnnotationSave(node.id, body)}
              cardStyle={{ width: "100%" }}
              hideToolbar
            />
          </div>
        )}

        {/* Tags section */}
        {(!readOnly || node.tags.length > 0) && (
          <div
            className="tc-expanded-overlay__tags"
            style={{
              borderTop: "1px solid var(--border-subtle)",
              padding: "14px 20px",
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                color: "var(--text-tertiary)",
                letterSpacing: "var(--letter-spacing-wide)",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Tags
            </p>
            <TagInput
              tags={node.tags}
              allCanvasTags={allCanvasTags}
              onChange={(tags) => onTagsSave(node.id, tags)}
              readOnly={readOnly}
            />
          </div>
        )}

        {/* Connected nodes strip */}
        {connectedNodes.length > 0 && (
          <div
            className="tc-expanded-overlay__connections-strip"
            style={{
              borderTop: "1px solid var(--border-subtle)",
              padding: "14px 20px",
              flexShrink: 0,
            }}
          >
            <p
              className="tc-expanded-overlay__connections-label"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                color: "var(--text-tertiary)",
                letterSpacing: "var(--letter-spacing-wide)",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Connected
            </p>
            <div
              className="tc-expanded-overlay__connections-list"
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 4,
              }}
              aria-label="Connected nodes"
            >
              {connectedNodes.map((cn) => (
                <ConnectedNodeThumb
                  key={cn.id}
                  node={cn}
                  resolveUrl={resolveUrl}
                  onClick={() => onNavigate(cn.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
