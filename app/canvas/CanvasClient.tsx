"use client";

import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, Plus, LayoutDashboard, Code, Keyboard } from "lucide-react";
import { toast, Toaster } from "sonner";
import { ViewTogglePill, type View } from "@/components/features/ViewTogglePill";
import { AnnotationCard } from "@/components/features/AnnotationCard";
import { HoverToolbar } from "@/components/features/HoverToolbar";
import { LinkPreviewCard } from "@/components/features/LinkPreviewCard";
import { ReflectionPrompt } from "@/components/features/ReflectionPrompt";
import { ExpandedOverlay } from "@/components/features/ExpandedOverlay";
import { AppMenuPanel } from "@/components/features/AppMenuPanel";
import { SearchPalette } from "@/components/features/SearchPalette";
import { ShortcutsSheet } from "@/components/features/ShortcutsSheet";
import { OnboardingSpotlight } from "@/components/features/OnboardingSpotlight";
import { BookmarkImportDialog } from "@/components/features/BookmarkImportDialog";
import { TagFilterBar, TagChip } from "@/components/features/TagFilterBar";
import { parseBookmarksHtml } from "@/lib/parse-bookmarks";
import type { BookmarkFolder, BookmarkItem } from "@/lib/parse-bookmarks";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { useSignedUrls } from "@/lib/hooks/use-signed-urls";
import { uploadImageToR2 } from "@/lib/upload";
import { createClient } from "@/lib/supabase/client";
import type { CanvasNode, ImageNode, AnnotationNode, LinkNode, VideoNode, Edge } from "@/lib/canvas-types";
import type { LinkPreviewData } from "@/components/features/LinkPreviewCard";
import type { DbProfile, DbCanvas } from "@/lib/canvas-db";
import { parseTweetId } from "@/lib/twitter";

// ---------------------------------------------------------------------------
// Props from server component
// ---------------------------------------------------------------------------

export type CanvasClientProps = {
  profile: DbProfile;
  userEmail: string;
  canvas: DbCanvas;
  canvasList: { id: string; title: string; visibility: "private" | "public" }[];
  initialNodes: CanvasNode[];
  initialEdges: Edge[];
  initialSignedUrls: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DRAG_THRESHOLD  = 4;
const MIN_SCALE       = 0.15;
const MAX_SCALE       = 4;
const MIN_NODE_W      = 80;
const LINK_CARD_W     = 300;
const DOUBLE_CLICK_MS = 350;
const FRAME_PADDING   = 10;
const NODE_CAP        = 150;

type Corner = "nw" | "ne" | "sw" | "se";

// ---------------------------------------------------------------------------
// CornerHandle
// ---------------------------------------------------------------------------

type CornerHandleProps = {
  corner: Corner;
  active: boolean;
  selected?: boolean;
  resizing?: boolean;
  scale?: number;
};

const CORNER_HANDLE_STYLE: Record<
  Corner,
  { top?: number; bottom?: number; left?: number; right?: number; cursor: string; radiusProp: string }
> = {
  nw: { top: 0,    left: 0,  cursor: "nw-resize", radiusProp: "borderTopLeftRadius" },
  ne: { top: 0,    right: 0, cursor: "ne-resize", radiusProp: "borderTopRightRadius" },
  sw: { bottom: 0, left: 0,  cursor: "sw-resize", radiusProp: "borderBottomLeftRadius" },
  se: { bottom: 0, right: 0, cursor: "se-resize", radiusProp: "borderBottomRightRadius" },
};

const CORNER_BORDERS: Record<Corner, [string, string]> = {
  nw: ["borderTop", "borderLeft"],
  ne: ["borderTop", "borderRight"],
  sw: ["borderBottom", "borderLeft"],
  se: ["borderBottom", "borderRight"],
};

function CornerHandle({ corner, active, selected = false, resizing = false, scale = 1 }: CornerHandleProps) {
  const visible  = active || resizing;
  const opacity  = resizing ? 1 : active ? 0.7 : 0;
  // Keep border visually 1px regardless of zoom level
  const strokeW  = 1 / scale;
  const color    = selected || resizing
    ? "var(--accent-default)"
    : `rgba(160, 160, 160, ${visible ? 0.7 : 0})`;
  const border   = `${strokeW}px solid ${color}`;
  const { radiusProp, cursor, ...pos } = CORNER_HANDLE_STYLE[corner];
  const [side1, side2] = CORNER_BORDERS[corner];

  return (
    <div
      className={`tc-corner-handle tc-corner-handle--${corner}`}
      data-resize-corner={corner}
      style={{
        position: "absolute",
        width: 16,
        height: 16,
        zIndex: 20,
        cursor,
        opacity,
        transition: "opacity 0.15s ease",
        pointerEvents: visible ? "auto" : "none",
        [side1]: border,
        [side2]: border,
        [radiusProp]: 16,
        ...pos,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// useHoverWithDelay
// ---------------------------------------------------------------------------

function useHoverWithDelay(delay = 200) {
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    timerRef.current = setTimeout(() => setHovered(false), delay);
  }, [delay]);

  useEffect(
    () => () => { if (timerRef.current) clearTimeout(timerRef.current); },
    []
  );

  return { hovered, onMouseEnter, onMouseLeave };
}


function distributeToColumns(nodes: CanvasNode[], colCount: number): CanvasNode[][] {
  const cols: CanvasNode[][] = Array.from({ length: colCount }, () => []);
  nodes.forEach((n, i) => cols[i % colCount].push(n));
  return cols;
}

// ---------------------------------------------------------------------------
// ImageNodeView
// ---------------------------------------------------------------------------

type ImageNodeViewProps = {
  node: ImageNode;
  isSelected: boolean;
  isConnecting: boolean;
  scale: number;
  resolveUrl: (src: string) => string;
  onAnnotationSave: (body: string) => void;
  onConnectStart: (e: React.PointerEvent) => void;
  onRotate: (deg: number) => void;
};

function ImageNodeView({ node, isSelected, isConnecting, scale, resolveUrl, onAnnotationSave, onConnectStart, onRotate }: ImageNodeViewProps) {
  const { hovered, onMouseEnter, onMouseLeave } = useHoverWithDelay(200);
  const [annotationEditing, setAnnotationEditing] = useState(false);
  const [liveRotation, setLiveRotation] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const rotateStartAngleRef = useRef<number | null>(null);
  const rotateStartRotationRef = useRef(0);

  const showOverlay = hovered || isSelected || annotationEditing;
  const active = hovered || isSelected;
  const imgH = node.canvasH > 0 ? node.canvasH : undefined;
  const displayRotation = liveRotation ?? node.canvasRotation;

  // Frame dimensions used for wrapper sizing and annotation placement.
  const frameW = node.canvasW + 2 * FRAME_PADDING;
  const frameH = (node.canvasH > 0 ? node.canvasH : node.canvasW * 0.75) + 2 * FRAME_PADDING;
  const normRot = ((displayRotation % 360) + 360) % 360;

  // Wrapper for 90/270 is (frameH x frameW). Annotation is always just right of it.
  const wrapperWidth = (normRot === 90 || normRot === 270) ? frameH : frameW;
  const annotLeft = wrapperWidth + 12;
  const annotTop  = 0;

  function onRotatePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = rootRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rotateStartAngleRef.current = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    rotateStartRotationRef.current = node.canvasRotation;
  }

  function onRotatePointerMove(e: React.PointerEvent) {
    if (rotateStartAngleRef.current === null) return;
    const rect = rootRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    setLiveRotation(rotateStartRotationRef.current + (angle - rotateStartAngleRef.current));
  }

  function onRotatePointerUp() {
    if (liveRotation === null) { rotateStartAngleRef.current = null; return; }
    const snapped = ((Math.round(liveRotation / 90) * 90) % 360 + 360) % 360;
    setLiveRotation(null);
    rotateStartAngleRef.current = null;
    onRotate(snapped);
  }

  return (
    <>
    <div
      ref={rootRef}
      className="tc-image-node"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        // When wrapper is resized to the visual bounding box, offset tc-image-node
        // so its rotation center stays at the wrapper's center.
        ...(normRot === 90 || normRot === 270 ? {
          position: "absolute" as const,
          left: (frameH - frameW) / 2,
          top: (frameW - frameH) / 2,
        } : {}),
        transform: `rotate(${displayRotation}deg)`,
        transformOrigin: "center",
        transition: liveRotation !== null ? "none" : "transform var(--motion-duration-small) var(--motion-easing-out)",
      }}
    >
      <div
        className="tc-image-node__frame"
        style={{
          position: "relative",
          padding: FRAME_PADDING,
          borderRadius: "var(--radius-lg)",
        }}
      >
        <CornerHandle corner="nw" active={active} selected={isSelected} scale={scale} />
        <CornerHandle corner="ne" active={active} selected={isSelected} scale={scale} />
        <CornerHandle corner="sw" active={active} selected={isSelected} scale={scale} />
        <CornerHandle corner="se" active={active} selected={isSelected} scale={scale} />

        {/* Rotate handles at all 4 corners */}
        {([
          { top: -14, left: -14 },
          { top: -14, right: -14 },
          { bottom: -14, left: -14 },
          { bottom: -14, right: -14 },
        ] as React.CSSProperties[]).map((pos, i) => (
          <div
            key={i}
            className="tc-image-node__rotate-handle"
            onPointerDown={onRotatePointerDown}
            onPointerMove={onRotatePointerMove}
            onPointerUp={onRotatePointerUp}
            onPointerCancel={onRotatePointerUp}
            style={{
              position: "absolute",
              ...pos,
              width: 16,
              height: 16,
              cursor: liveRotation !== null ? "grabbing" : "grab",
              zIndex: 10,
              opacity: showOverlay ? 1 : 0,
              pointerEvents: showOverlay ? "auto" : "none",
              transition: "opacity 0.15s ease",
            }}
          />
        ))}


        {/* Connect handle: drag to create a connection */}
        {(hovered || isSelected) && !isConnecting && (
          <div
            className="tc-image-node__connect-handle"
            data-connect-handle="true"
            data-node-id={node.id}
            onPointerDown={onConnectStart}
            title="Drag to connect"
            style={{
              position: "absolute",
              top: FRAME_PADDING,
              right: FRAME_PADDING,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--accent-default)",
              border: "2px solid var(--surface-background)",
              cursor: "crosshair",
              zIndex: 40,
            }}
          />
        )}

        <img
          className="tc-image-node__image"
          src={resolveUrl(node.src)}
          alt={node.alt}
          draggable={false}
          style={{
            width: node.canvasW,
            height: imgH,
            borderRadius: "var(--radius-md)",
            objectFit: "cover",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />

        {/* Toolbar: left */}
        <div
          className="tc-image-node__toolbar-slot"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "50%",
            right: "100%",
            transform: "translateY(-50%)",
            paddingRight: 16,
            paddingLeft: 12,
            paddingTop: 24,
            paddingBottom: 24,
            zIndex: 10,
            opacity: showOverlay ? 1 : 0,
            pointerEvents: showOverlay ? "auto" : "none",
            transition: "opacity 0.15s ease",
          }}
        >
          <HoverToolbar
            variant="vertical-right"
            onOpenLink={
              node.src.startsWith("http")
                ? () => window.open(node.src, "_blank", "noopener,noreferrer")
                : resolveUrl(node.src)
                ? () => window.open(resolveUrl(node.src), "_blank", "noopener,noreferrer")
                : undefined
            }
          />
        </div>

      </div>
    </div>

    {/* Annotation card: sits outside the rotation transform so it never overlaps the image */}
    {liveRotation === null && (
    <div
      className="tc-image-node__annotation-slot"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: annotLeft,
        top: annotTop,
        zIndex: 20,
        opacity: showOverlay ? 1 : 0,
        pointerEvents: showOverlay ? "auto" : "none",
        transition: "opacity 0.15s ease",
      }}
    >
      <AnnotationCard
        initialBody={node.annotation}
        onSave={onAnnotationSave}
        onEditingChange={setAnnotationEditing}
        hideToolbar
      />
    </div>
    )}
    </>
  );
}

// ---------------------------------------------------------------------------
// VideoNodeView
// ---------------------------------------------------------------------------

type VideoNodeViewProps = {
  node: VideoNode;
  isSelected: boolean;
  isConnecting: boolean;
  scale: number;
  resolveUrl: (src: string) => string;
  onAnnotationSave: (body: string) => void;
  onConnectStart: (e: React.PointerEvent) => void;
};

function VideoNodeView({ node, isSelected, isConnecting, scale, resolveUrl, onAnnotationSave, onConnectStart }: VideoNodeViewProps) {
  const { hovered, onMouseEnter, onMouseLeave } = useHoverWithDelay(200);
  const [annotationEditing, setAnnotationEditing] = useState(false);

  const showOverlay = hovered || isSelected || annotationEditing;
  const active = hovered || isSelected;
  const videoSrc = resolveUrl(node.src);

  return (
    <div className="tc-video-node" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div
        className="tc-video-node__frame"
        style={{ position: "relative", padding: FRAME_PADDING, borderRadius: "var(--radius-lg)" }}
      >
        <CornerHandle corner="nw" active={active} selected={isSelected} scale={scale} />
        <CornerHandle corner="ne" active={active} selected={isSelected} scale={scale} />
        <CornerHandle corner="sw" active={active} selected={isSelected} scale={scale} />
        <CornerHandle corner="se" active={active} selected={isSelected} scale={scale} />

        {(hovered || isSelected) && !isConnecting && (
          <div
            className="tc-video-node__connect-handle"
            data-connect-handle="true"
            data-node-id={node.id}
            onPointerDown={onConnectStart}
            title="Drag to connect"
            style={{
              position: "absolute",
              top: FRAME_PADDING,
              right: FRAME_PADDING,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--accent-default)",
              border: "2px solid var(--surface-background)",
              cursor: "crosshair",
              zIndex: 40,
            }}
          />
        )}

        <video
          src={videoSrc}
          preload="metadata"
          playsInline
          // Show native controls when the node is active so the user can play,
          // seek, and adjust volume. Pointer events are enabled at the same time
          // so the controls are interactive.
          controls={active}
          style={{
            width: node.canvasW,
            height: node.canvasH > 0 ? node.canvasH : undefined,
            display: "block",
            borderRadius: "var(--radius-md)",
            objectFit: "cover",
            pointerEvents: active ? "auto" : "none",
          }}
          // Stop propagation so interacting with the video (clicking controls,
          // scrubbing the seek bar) does not trigger the canvas drag handler.
          onPointerDown={active ? (e) => e.stopPropagation() : undefined}
        />

        {/* Play badge: indicates this is a video, hidden once controls are shown */}
        {!active && (
          <div
            style={{
              position: "absolute",
              inset: FRAME_PADDING,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                <path d="M1 1L13 8L1 15V1Z" fill="white" />
              </svg>
            </div>
          </div>
        )}

        <div
          className="tc-video-node__annotation-slot"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 0,
            left: "100%",
            paddingLeft: 12,
            zIndex: 10,
            opacity: showOverlay ? 1 : 0,
            pointerEvents: showOverlay ? "auto" : "none",
            transition: "opacity 0.15s ease",
          }}
        >
          <AnnotationCard
            initialBody={node.annotation}
            onSave={onAnnotationSave}
            onEditingChange={setAnnotationEditing}
            hideToolbar
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkNodeView
// ---------------------------------------------------------------------------

type LinkNodeViewProps = {
  node: LinkNode;
  isSelected: boolean;
  isConnecting: boolean;
  onAnnotationSave: (body: string) => void;
  onConnectStart: (e: React.PointerEvent) => void;
};

function LinkNodeView({ node, isSelected, isConnecting, onAnnotationSave, onConnectStart }: LinkNodeViewProps) {
  const { hovered, onMouseEnter, onMouseLeave } = useHoverWithDelay(200);
  const [annotationEditing, setAnnotationEditing] = useState(false);

  const showOverlay = hovered || isSelected || annotationEditing;
  const hasAnnotation = node.annotation.trim() !== "";

  const displayPreview = node.preview && node.name
    ? { ...node.preview, title: node.name }
    : node.preview;

  return (
    <div className="tc-link-node" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div
        className="tc-link-node__frame"
        style={{
          position: "relative",
          padding: FRAME_PADDING,
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* Connect handle */}
        {(hovered || isSelected) && !isConnecting && (
          <div
            className="tc-link-node__connect-handle"
            data-connect-handle="true"
            data-node-id={node.id}
            onPointerDown={onConnectStart}
            title="Drag to connect"
            style={{
              position: "absolute",
              top: FRAME_PADDING,
              right: FRAME_PADDING,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "var(--accent-default)",
              border: "2px solid var(--surface-background)",
              cursor: "crosshair",
              zIndex: 40,
            }}
          />
        )}


        <LinkPreviewCard data={displayPreview} fetchError={node.fetchError} width={node.canvasW} url={node.url} />

        <div
          className="tc-link-node__toolbar-slot"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "50%",
            right: "100%",
            transform: "translateY(-50%)",
            paddingRight: 16,
            paddingLeft: 12,
            paddingTop: 24,
            paddingBottom: 24,
            zIndex: 10,
            opacity: showOverlay ? 1 : 0,
            pointerEvents: showOverlay ? "auto" : "none",
            transition: "opacity 0.15s ease",
          }}
        >
          <HoverToolbar
            variant="vertical-right"
            onOpenLink={() => window.open(node.url, "_blank", "noopener,noreferrer")}
          />
        </div>

        <div
          className="tc-link-node__annotation-slot"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 0,
            left: "100%",
            paddingLeft: 12,
            zIndex: 10,
            width: 289 + 12,
            opacity: showOverlay ? 1 : 0,
            pointerEvents: showOverlay ? "auto" : "none",
            transition: "opacity 0.15s ease",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Preview info panel: site name, title, description */}
          {node.preview && !node.loading && !node.fetchError && (
            <div
              className="tc-link-node__preview-info"
              style={{
                width: 289,
                background: "var(--annotation-card-bg)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                borderRadius: "var(--radius-xs)",
                padding: 16,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--accent-default)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wide)",
                  marginBottom: 6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {node.preview.siteName}
              </p>
              {node.preview.title && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-base)",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    lineHeight: "var(--line-height-tight)",
                    marginBottom: node.preview.description ? 6 : 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {node.name ?? node.preview.title}
                </p>
              )}
              {node.preview.description && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                    lineHeight: "var(--line-height-normal)",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {node.preview.description}
                </p>
              )}
            </div>
          )}

          <AnnotationCard
            initialBody={node.annotation}
            onSave={onAnnotationSave}
            onEditingChange={setAnnotationEditing}
            hideToolbar
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CanvasView
// ---------------------------------------------------------------------------

type SelectionRect = { x: number; y: number; w: number; h: number };

type CanvasViewProps = {
  canvasId: string;
  nodes: CanvasNode[];
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  resolveUrl: (src: string) => string;
  signKey: (key: string) => Promise<string>;
  onNodeClick: (nodeId: string) => void;
  onNodeCreated: (nodeId: string) => void;
  checkpoint: () => void;
  activeFilterTags: Set<string>;
};

const DEFAULT_TRANSFORM = { x: 0, y: 0, scale: 1 };

function CanvasView({
  canvasId,
  nodes,
  setNodes,
  edges,
  setEdges,
  selectedIds,
  setSelectedIds,
  resolveUrl,
  signKey,
  onNodeClick,
  onNodeCreated,
  checkpoint,
  activeFilterTags,
}: CanvasViewProps) {
  const [transform, setTransform]       = useState(DEFAULT_TRANSFORM);
  const [isDragging, setIsDragging]     = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const restoredRef = useRef(false);

  // Restore transform from sessionStorage after hydration
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(`tc-transform-${canvasId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === "number" && typeof parsed.y === "number" && typeof parsed.scale === "number") {
          setTransform(parsed);
        }
      }
    } catch { /* ignore */ }
  }, [canvasId]);

  // Persist transform to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(`tc-transform-${canvasId}`, JSON.stringify(transform));
  }, [canvasId, transform]);

  // Connection drag state
  const connectingFromId  = useRef<string | null>(null);
  const [connectingCursor, setConnectingCursor] = useState<{ x: number; y: number } | null>(null);

  const canvasEl        = useRef<HTMLDivElement>(null);
  const transformRef    = useRef(transform);
  transformRef.current  = transform;
  const nodesRef        = useRef(nodes);
  nodesRef.current      = nodes;
  const edgesRef        = useRef(edges);
  edgesRef.current      = edges;
  const selectedIdsRef  = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const selectionRectRef = useRef<SelectionRect | null>(null);

  // Pointer refs
  const isPanning          = useRef(false);
  const draggingNodeId     = useRef<string | null>(null);
  const pendingNodeId      = useRef<string | null>(null);
  const pendingPan         = useRef(false);
  const pointerStart       = useRef<{ x: number; y: number } | null>(null);
  const lastPos            = useRef({ x: 0, y: 0 });
  const shiftKeyAtDown     = useRef(false);
  const didDrag            = useRef(false);

  // Resize refs
  const resizingNodeId = useRef<string | null>(null);
  const resizeCorner   = useRef<Corner | null>(null);
  const resizeStart    = useRef<{ w: number; h: number; x: number; y: number; ar: number; rotation: number } | null>(null);

  // Multi-select refs
  const isSelectingRect     = useRef(false);
  const selectionStart      = useRef<{ x: number; y: number } | null>(null);
  const lastCanvasPointerDown = useRef(0);

  // Convert client coords to canvas-world coords
  const clientToCanvas = useCallback((cx: number, cy: number) => {
    const { x: tx, y: ty, scale } = transformRef.current;
    return { x: (cx - tx) / scale, y: (cy - ty) / scale };
  }, []);

  // ---------------------------------------------------------------------------
  // Fit to view / zoom shortcuts
  // ---------------------------------------------------------------------------

  const fitToView = useCallback(() => {
    const ns = nodesRef.current;
    if (ns.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of ns) {
      const r = getNodeRect(node);
      minX = Math.min(minX, r.x - FRAME_PADDING);
      minY = Math.min(minY, r.y - FRAME_PADDING);
      maxX = Math.max(maxX, r.x + r.w + FRAME_PADDING);
      maxY = Math.max(maxY, r.y + r.h + FRAME_PADDING);
    }
    const PAD = 80;
    const contentW = maxX - minX + PAD * 2;
    const contentH = maxY - minY + PAD * 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.min(vw / contentW, vh / contentH)));
    const newX = (vw - (maxX - minX) * newScale) / 2 - minX * newScale;
    const newY = (vh - (maxY - minY) * newScale) / 2 - minY * newScale;
    setTransform({ x: newX, y: newY, scale: newScale });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "0") { e.preventDefault(); fitToView(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        setTransform((prev) => ({
          x: window.innerWidth / 2 - (window.innerWidth / 2 - prev.x) / prev.scale,
          y: window.innerHeight / 2 - (window.innerHeight / 2 - prev.y) / prev.scale,
          scale: 1,
        }));
      }
      // Cancel connecting mode
      if (e.key === "Escape" && connectingFromId.current) {
        connectingFromId.current = null;
        setConnectingCursor(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fitToView]);

  // ---------------------------------------------------------------------------
  // Wheel handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const el = canvasEl.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const { x, y, scale } = transformRef.current;
      if (e.ctrlKey) {
        const rawFactor = 1 - e.deltaY * 0.008;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * rawFactor));
        setTransform({
          scale: newScale,
          x: e.clientX - ((e.clientX - x) / scale) * newScale,
          y: e.clientY - ((e.clientY - y) / scale) * newScale,
        });
      } else {
        setTransform((prev) => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ---------------------------------------------------------------------------
  // Paste handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) return;

      if (nodesRef.current.length >= NODE_CAP) {
        toast.error("150-node limit reached. Remove a node or start a new canvas.");
        return;
      }

      const items = Array.from(e.clipboardData?.items ?? []);
      const { x: ox, y: oy, scale } = transformRef.current;
      const cx = Math.round((window.innerWidth / 2 - ox) / scale);
      const cy = Math.round((window.innerHeight / 2 - oy) / scale);

      // Pasted image file: upload to R2, then probe dimensions
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          toast.promise(
            uploadImageToR2(file).then(async ({ key }) => {
              const signedUrl = await signKey(key);
              const probe = new window.Image();
              probe.onload = () => {
                const w = Math.min(probe.naturalWidth, 600);
                const h = Math.round((probe.naturalHeight / probe.naturalWidth) * w);
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: ImageNode = {
                    id: nodeId, type: "image", src: key, alt: "Pasted image",
                    canvasX: cx - Math.round(w / 2), canvasY: cy - Math.round(h / 2),
                    canvasW: w, canvasH: h, annotation: "", tags: [], canvasRotation: 0, createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                onNodeCreated(nodeId);
              };
              probe.onerror = () => {
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: ImageNode = {
                    id: nodeId, type: "image", src: key, alt: "Pasted image",
                    canvasX: cx - 200, canvasY: cy - 150, canvasW: 400, canvasH: 300,
                    annotation: "", tags: [], canvasRotation: 0, createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                onNodeCreated(nodeId);
              };
              probe.src = signedUrl;
            }),
            {
              loading: "Uploading image...",
              success: "Image uploaded",
              error: "Upload failed",
            }
          );
          return;
        }
      }

      // Pasted video file: upload to R2, probe dimensions via video element
      const videoItem = items.find((item) => item.type.startsWith("video/"));
      if (videoItem) {
        const file = videoItem.getAsFile();
        if (file) {
          toast.promise(
            uploadImageToR2(file).then(async ({ key }) => {
              const signedUrl = await signKey(key);
              const probe = document.createElement("video");
              probe.preload = "metadata";
              probe.onloadedmetadata = () => {
                const raw = probe.videoWidth || 480;
                const w = Math.min(raw, 600);
                const h = probe.videoHeight
                  ? Math.round((probe.videoHeight / probe.videoWidth) * w)
                  : Math.round(w * 9 / 16);
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: VideoNode = {
                    id: nodeId, type: "video", src: key,
                    canvasX: cx - Math.round(w / 2), canvasY: cy - Math.round(h / 2),
                    canvasW: w, canvasH: h, annotation: "", tags: [], createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                onNodeCreated(nodeId);
                URL.revokeObjectURL(probe.src);
              };
              probe.onerror = () => {
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: VideoNode = {
                    id: nodeId, type: "video", src: key,
                    canvasX: cx - 240, canvasY: cy - 135, canvasW: 480, canvasH: 270,
                    annotation: "", tags: [], createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                onNodeCreated(nodeId);
                URL.revokeObjectURL(probe.src);
              };
              probe.src = signedUrl;
            }),
            {
              loading: "Uploading video...",
              success: "Video uploaded",
              error: "Upload failed",
            }
          );
          return;
        }
      }

      const textItem = items.find((item) => item.type === "text/plain");
      if (textItem) {
        textItem.getAsString((raw) => {
          const text = raw.trim();
          if (!text) return;

          let isUrl = false;
          try {
            const u = new URL(text);
            isUrl = u.protocol === "http:" || u.protocol === "https:";
          } catch { /* not a URL */ }

          if (isUrl) {
            // Duplicate URL detection
            const existing = nodesRef.current.find(
              (n) => n.type === "link" && (n as LinkNode).url === text
            );
            if (existing) {
              toast("Already on canvas.", { duration: 3000 });
              // Pan to the existing node
              const rect = getNodeRect(existing);
              const vw = window.innerWidth;
              const vh = window.innerHeight;
              const s = transformRef.current.scale;
              setTransform({
                x: vw / 2 - (rect.x + rect.w / 2) * s,
                y: vh / 2 - (rect.y + rect.h / 2) * s,
                scale: s,
              });
              return;
            }

            if (isDirectImageUrl(text)) {
              const probe = new window.Image();
              probe.crossOrigin = "anonymous";
              probe.onload = () => {
                const w = Math.min(probe.naturalWidth || 400, 600);
                const h = probe.naturalHeight && probe.naturalWidth
                  ? Math.round((probe.naturalHeight / probe.naturalWidth) * w)
                  : Math.round(w * 0.75);
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: ImageNode = {
                    id: nodeId, type: "image", src: text,
                    alt: new URL(text).pathname.split("/").pop() || "Image",
                    canvasX: cx - Math.round(w / 2), canvasY: cy - Math.round(h / 2),
                    canvasW: w, canvasH: h, annotation: "", tags: [], canvasRotation: 0, createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                onNodeCreated(nodeId);
              };
              probe.onerror = () => {
                // Still create an ImageNode with default dimensions; the URL is a known image format.
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: ImageNode = {
                    id: nodeId, type: "image", src: text,
                    alt: new URL(text).pathname.split("/").pop() || "Image",
                    canvasX: cx - 200, canvasY: cy - 150,
                    canvasW: 400, canvasH: 300, annotation: "", tags: [], canvasRotation: 0, createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                onNodeCreated(nodeId);
              };
              probe.src = text;
            } else {
              const nodeId = crypto.randomUUID();
              checkpoint();
              setNodes((prev) => {
                const newNode: LinkNode = {
                  id: nodeId, type: "link", url: text,
                  canvasX: cx - Math.round(LINK_CARD_W / 2), canvasY: cy - 120,
                  canvasW: LINK_CARD_W, annotation: "",
                  preview: null, loading: true, fetchError: false, tags: [], createdAt: Date.now(),
                };
                return resolveCollisions([newNode, ...prev], new Set([nodeId]));
              });
              fetchLinkPreview(nodeId, text, setNodes);
              onNodeCreated(nodeId);
            }
          } else {
            const nodeId = crypto.randomUUID();
            checkpoint();
            setNodes((prev) => {
              const newNode: AnnotationNode = {
                id: nodeId, type: "annotation", body: text,
                canvasX: cx - 144, canvasY: cy - 60, tags: [], createdAt: Date.now(),
              };
              return resolveCollisions([newNode, ...prev], new Set([nodeId]));
            });
            onNodeCreated(nodeId);
          }
        });
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [setNodes, onNodeCreated, checkpoint]);

  // ---------------------------------------------------------------------------
  // Pointer handlers
  // ---------------------------------------------------------------------------

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("textarea, input, button, a")) return;

      shiftKeyAtDown.current = e.shiftKey;
      didDrag.current = false;

      // 1. Check resize corner
      const resizeEl = target.closest("[data-resize-corner]") as HTMLElement | null;
      if (resizeEl) {
        const corner = resizeEl.getAttribute("data-resize-corner") as Corner;
        const resizeNodeEl = resizeEl.closest("[data-node-id]") as HTMLElement | null;
        if (resizeNodeEl && corner) {
          const nodeId = resizeNodeEl.getAttribute("data-node-id")!;
          const node = nodesRef.current.find((n) => n.id === nodeId);
          if (node && (node.type === "image" || node.type === "video")) {
            resizingNodeId.current = nodeId;
            resizeCorner.current   = corner;
            resizeStart.current    = {
              w: node.canvasW, h: node.canvasH || node.canvasW * 0.75,
              x: node.canvasX, y: node.canvasY,
              ar: node.canvasW / (node.canvasH || node.canvasW * 0.75),
              rotation: node.type === "image" ? (node as ImageNode).canvasRotation : 0,
            };
            pointerStart.current = { x: e.clientX, y: e.clientY };
            lastPos.current      = { x: e.clientX, y: e.clientY };
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            checkpoint();
            setIsDragging(true);
            return;
          }
        }
      }

      // 2. Check connect handle
      const connectHandleEl = target.closest("[data-connect-handle]") as HTMLElement | null;
      if (connectHandleEl) {
        const nodeId = connectHandleEl.dataset.nodeId!;
        connectingFromId.current = nodeId;
        const pos = clientToCanvas(e.clientX, e.clientY);
        setConnectingCursor(pos);
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        return;
      }

      pointerStart.current = { x: e.clientX, y: e.clientY };
      lastPos.current      = { x: e.clientX, y: e.clientY };

      const nodeEl = target.closest("[data-node-id]") as HTMLElement | null;
      if (nodeEl) {
        pendingNodeId.current = nodeEl.getAttribute("data-node-id")!;
      } else {
        // Click + drag on empty canvas = rubber-band selection (like Figma).
        // Panning is handled by scroll wheel / trackpad.
        pendingPan.current = true;
      }
    },
    [checkpoint, clientToCanvas]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Connection drag
      if (connectingFromId.current) {
        const pos = clientToCanvas(e.clientX, e.clientY);
        setConnectingCursor(pos);
        return;
      }

      if (isSelectingRect.current && selectionStart.current) {
        const sx = selectionStart.current.x;
        const sy = selectionStart.current.y;
        const rect = {
          x: Math.min(sx, e.clientX), y: Math.min(sy, e.clientY),
          w: Math.abs(e.clientX - sx), h: Math.abs(e.clientY - sy),
        };
        selectionRectRef.current = rect;
        setSelectionRect(rect);
        return;
      }

      if (resizingNodeId.current && resizeStart.current && resizeCorner.current && pointerStart.current) {
        const { scale } = transformRef.current;
        const { w: origW, h: origH, x: origX, y: origY, ar, rotation } = resizeStart.current;
        const dxScreen = (e.clientX - pointerStart.current.x) / scale;
        const dyScreen = (e.clientY - pointerStart.current.y) / scale;
        // Project screen-space delta onto the node's local X axis (which is rotated by θ).
        const θ = (rotation * Math.PI) / 180;
        const totalDx = dxScreen * Math.cos(θ) + dyScreen * Math.sin(θ);
        let newW: number;
        let newX = origX;
        let newY = origY;
        switch (resizeCorner.current) {
          case "se": newW = Math.max(MIN_NODE_W, origW + totalDx); break;
          case "sw": newW = Math.max(MIN_NODE_W, origW - totalDx); newX = origX + origW - newW; break;
          case "ne": newW = Math.max(MIN_NODE_W, origW + totalDx); newY = origY + origH - newW / ar; break;
          case "nw": newW = Math.max(MIN_NODE_W, origW - totalDx); newX = origX + origW - newW; newY = origY + origH - newW / ar; break;
          default: newW = origW;
        }
        const newH = Math.round(newW! / ar);
        setNodes((prev) =>
          prev.map((n) =>
            n.id === resizingNodeId.current
              ? { ...n, canvasX: newX, canvasY: newY, canvasW: Math.round(newW!), canvasH: newH }
              : n
          )
        );
        return;
      }

      if (!pointerStart.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      if (!draggingNodeId.current && !isPanning.current) {
        const totalDx = e.clientX - pointerStart.current.x;
        const totalDy = e.clientY - pointerStart.current.y;
        if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD) return;

        if (pendingNodeId.current) {
          draggingNodeId.current = pendingNodeId.current;
          pendingNodeId.current  = null;
          checkpoint(); // capture state before move
        } else if (pendingPan.current) {
          // Click + drag on empty canvas starts rubber-band selection.
          pendingPan.current       = false;
          isSelectingRect.current  = true;
          selectionStart.current   = pointerStart.current;
          const sx = pointerStart.current!.x;
          const sy = pointerStart.current!.y;
          const rect = {
            x: Math.min(sx, e.clientX), y: Math.min(sy, e.clientY),
            w: Math.abs(e.clientX - sx), h: Math.abs(e.clientY - sy),
          };
          selectionRectRef.current = rect;
          setSelectionRect(rect);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          setIsDragging(true);
          didDrag.current = true;
          return;
        } else {
          return;
        }
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        didDrag.current = true;
      }

      if (draggingNodeId.current) {
        const id = draggingNodeId.current;
        const { scale } = transformRef.current;
        const moveGroup = selectedIdsRef.current.size > 1 && selectedIdsRef.current.has(id);
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === id || (moveGroup && selectedIdsRef.current.has(n.id))) {
              return { ...n, canvasX: n.canvasX + dx / scale, canvasY: n.canvasY + dy / scale };
            }
            return n;
          })
        );
      }
    },
    [setNodes, checkpoint, clientToCanvas]
  );

  const onPointerUp = useCallback(() => {
    // Finish connection drag
    if (connectingFromId.current && connectingCursor) {
      const { x: cx, y: cy } = connectingCursor;
      const fromId = connectingFromId.current;
      const targetNode = nodesRef.current.find((n) => {
        if (n.id === fromId) return false;
        const r = getNodeRect(n);
        return cx >= r.x - 20 && cx <= r.x + r.w + 20 && cy >= r.y - 20 && cy <= r.y + r.h + 20;
      });
      if (targetNode) {
        const toId = targetNode.id;
        const isDupe = edgesRef.current.some(
          (e) => (e.fromId === fromId && e.toId === toId) || (e.fromId === toId && e.toId === fromId)
        );
        if (!isDupe) {
          checkpoint();
          setEdges((prev) => [...prev, { id: crypto.randomUUID(), fromId, toId }]);
        }
      }
      connectingFromId.current = null;
      setConnectingCursor(null);
      return;
    }

    if (isSelectingRect.current) {
      const rect = selectionRectRef.current;
      isSelectingRect.current  = false;
      selectionStart.current   = null;
      selectionRectRef.current = null;
      setSelectionRect(null);
      setIsDragging(false);

      if (rect && (rect.w > 6 || rect.h > 6)) {
        const { x: tx, y: ty, scale } = transformRef.current;
        const newIds = new Set<string>();
        nodesRef.current.forEach((node) => {
          const sx = node.canvasX * scale + tx;
          const sy = node.canvasY * scale + ty;
          const nw = (node.type === "image" || node.type === "video") ? node.canvasW * scale : LINK_CARD_W * scale;
          const nh = (node.type === "image" || node.type === "video") ? (node.canvasH ?? 200) * scale : 200 * scale;
          if (sx < rect.x + rect.w && sx + nw > rect.x && sy < rect.y + rect.h && sy + nh > rect.y) {
            newIds.add(node.id);
          }
        });
        setSelectedIds(newIds);
      }
      return;
    }

    const wasDragging  = draggingNodeId.current;
    const wasResizing  = resizingNodeId.current;
    const movedIds     = new Set<string>();
    if (wasDragging) {
      if (selectedIdsRef.current.size > 1 && selectedIdsRef.current.has(wasDragging)) {
        selectedIdsRef.current.forEach((id) => movedIds.add(id));
      } else {
        movedIds.add(wasDragging);
      }
    } else if (wasResizing) {
      movedIds.add(wasResizing);
    }

    // Handle click (no drag occurred)
    if (pendingNodeId.current) {
      const clickedId = pendingNodeId.current;
      if (shiftKeyAtDown.current) {
        // Shift+click: toggle in multi-select
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(clickedId)) next.delete(clickedId);
          else next.add(clickedId);
          return next;
        });
      } else {
        // Regular click: open expanded overlay
        onNodeClick(clickedId);
        setSelectedIds(new Set([clickedId]));
      }
    } else if (!wasDragging && !wasResizing) {
      // Clicked canvas background (no drag occurred): deselect all
      setSelectedIds(new Set());
    }


    isPanning.current        = false;
    draggingNodeId.current   = null;
    pendingNodeId.current    = null;
    pendingPan.current       = false;
    pointerStart.current     = null;
    resizingNodeId.current   = null;
    resizeCorner.current     = null;
    resizeStart.current      = null;
    setIsDragging(false);

    if (movedIds.size > 0) {
      setNodes((prev) => resolveCollisions(prev, movedIds));
    }
  }, [connectingCursor, setSelectedIds, setNodes, setEdges, onNodeClick, checkpoint]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Dot grid: fixed 24px spacing in viewport space so density never changes at any zoom level.
  // backgroundPosition uses modulo so dots track canvas panning without scaling.
  const DOT_GRID_SPACING = 24;

  // Compute connected node IDs for endpoint dot rendering
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    edges.forEach((e) => { ids.add(e.fromId); ids.add(e.toId); });
    return ids;
  }, [edges]);

  return (
    <>
      {/* Rubber-band selection rect */}
      {selectionRect && selectionRect.w > 2 && selectionRect.h > 2 && (
        <div
          className="tc-canvas__selection-rect"
          style={{
            position: "fixed",
            left: selectionRect.x, top: selectionRect.y,
            width: selectionRect.w, height: selectionRect.h,
            border: "1.5px solid var(--accent-default)",
            background: "rgba(255, 141, 70, 0.07)",
            zIndex: 50, pointerEvents: "none", borderRadius: 2,
          }}
        />
      )}

      {/* Connecting mode indicator */}
      {connectingCursor && (
        <div
          className="tc-canvas__connect-indicator"
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface-raised)",
            border: "1px solid var(--accent-default)",
            borderRadius: "var(--radius-full)",
            padding: "6px 16px",
            zIndex: 200,
            pointerEvents: "none",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-secondary)",
            letterSpacing: "var(--letter-spacing-wide)",
          }}
        >
          Release on a node to connect · Esc to cancel
        </div>
      )}

      <div
        className="tc-canvas__viewport"
        ref={canvasEl}
        style={{
          position: "absolute", inset: 0,
          overflow: "hidden",
          background: "var(--surface-background)",
          cursor: connectingCursor ? "crosshair" : isDragging ? "crosshair" : "default",
          userSelect: isDragging ? "none" : "auto",
          backgroundImage: "radial-gradient(circle, var(--dot-grid-color) 1.5px, transparent 1.5px)",
          backgroundSize: `${DOT_GRID_SPACING}px ${DOT_GRID_SPACING}px`,
          backgroundPosition: `${((transform.x % DOT_GRID_SPACING) + DOT_GRID_SPACING) % DOT_GRID_SPACING}px ${((transform.y % DOT_GRID_SPACING) + DOT_GRID_SPACING) % DOT_GRID_SPACING}px`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          if (
            !draggingNodeId.current && !isPanning.current &&
            !resizingNodeId.current && !isSelectingRect.current &&
            !connectingFromId.current
          ) {
            pendingNodeId.current = null;
            pendingPan.current    = false;
            pointerStart.current  = null;
          }
        }}
      >
        {/* Empty state */}
        {nodes.length === 0 && (
          <div
            className="tc-canvas__empty-state"
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 20,
              pointerEvents: "none",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-xl)",
                fontWeight: 600,
                color: "var(--text-primary)",
                opacity: 0.7,
              }}
            >
              Taste Canvas
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-lg)",
                color: "var(--text-tertiary)",
                fontWeight: 400,
              }}
            >
              Paste anything to begin
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-tertiary)",
                opacity: 0.6,
              }}
            >
              Images, links, and videos.
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 24,
                height: 22,
                padding: "0 8px",
                borderRadius: "var(--radius-xs)",
                background: "var(--surface-raised)",
                border: "1px solid var(--border-default)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--text-secondary)",
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              Cmd+V
            </span>

            {/* Feature hint cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "130px 130px",
                gap: 12,
                marginTop: 12,
              }}
            >
              {([
                { icon: <Plus size={16} />, label: "Create canvases" },
                { icon: <LayoutDashboard size={16} />, label: "Switch to grid" },
                { icon: <Code size={16} />, label: "Embed canvas" },
                { icon: <Keyboard size={16} />, label: "Shortcuts  ?" },
              ] as const).map((hint, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: 16,
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border-subtle)",
                    opacity: 0.5,
                  }}
                >
                  <div style={{ color: "var(--text-tertiary)" }}>{hint.icon}</div>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--text-tertiary)",
                      textAlign: "center",
                    }}
                  >
                    {hint.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* World div: pan + zoom transform */}
        <div
          className="tc-canvas__world"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 100000,
            height: 100000,
            transformOrigin: "0 0",
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            willChange: "transform",
            overflow: "visible",
          }}
        >
          {/* SVG connection layer (rendered below nodes) */}
          <svg
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: 0, height: 0,
              overflow: "visible",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {/* Permanent connection lines (shown on hover/select of endpoint) */}
            {edges.map((edge) => {
              const fromNode = nodesRef.current.find((n) => n.id === edge.fromId);
              const toNode   = nodesRef.current.find((n) => n.id === edge.toId);
              if (!fromNode || !toNode) return null;

              const fr = getNodeRect(fromNode);
              const tr = getNodeRect(toNode);
              const fx = fr.x + fr.w / 2;
              const fy = fr.y + fr.h / 2;
              const tx = tr.x + tr.w / 2;
              const ty = tr.y + tr.h / 2;

              const visible =
                hoveredNodeId === edge.fromId || hoveredNodeId === edge.toId ||
                selectedIds.has(edge.fromId) || selectedIds.has(edge.toId);

              if (!visible) return null;

              const dx  = tx - fx;
              const cp1x = fx + dx * 0.35;
              const cp2x = tx - dx * 0.35;
              const midX = (fx + tx) / 2;
              const midY = (fy + ty) / 2;

              return (
                <g key={edge.id} style={{ pointerEvents: "auto" }}>
                  <path
                    d={`M ${fx} ${fy} C ${cp1x} ${fy} ${cp2x} ${ty} ${tx} ${ty}`}
                    stroke="var(--accent-default)"
                    strokeWidth={1.5}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                  {/* Delete affordance at midpoint */}
                  <circle
                    cx={midX} cy={midY} r={9}
                    fill="var(--surface-raised)"
                    stroke="var(--border-default)"
                    strokeWidth={1}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      checkpoint();
                      setEdges((prev) => prev.filter((e) => e.id !== edge.id));
                    }}
                  />
                  <text
                    x={midX} y={midY}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--text-tertiary)"
                    style={{ cursor: "pointer", pointerEvents: "none" }}
                  >
                    ×
                  </text>
                </g>
              );
            })}

            {/* Temporary line while dragging from connect handle */}
            {connectingFromId.current && connectingCursor && (() => {
              const fromNode = nodesRef.current.find((n) => n.id === connectingFromId.current);
              if (!fromNode) return null;
              const fr = getNodeRect(fromNode);
              const fx = fr.x + fr.w / 2;
              const fy = fr.y + fr.h / 2;
              return (
                <line
                  x1={fx} y1={fy}
                  x2={connectingCursor.x} y2={connectingCursor.y}
                  stroke="var(--accent-default)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  opacity={0.6}
                  style={{ pointerEvents: "none" }}
                />
              );
            })()}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const isConnected = connectedNodeIds.has(node.id);
            const isFiltering = activeFilterTags.size > 0;
            const matchesFilter = !isFiltering || node.tags.some((t) => activeFilterTags.has(t));
            const nodeW = getNodeRect(node).w;

            // For image nodes at 90°/270°, reposition + resize the wrapper to match
            // the visual bounding box so hover/selection area matches the rotated image.
            let wrapperLeft = node.canvasX;
            let wrapperTop  = node.canvasY;
            let wrapperW: number | undefined;
            let wrapperH: number | undefined;
            if (node.type === "image") {
              const rot = (((node as ImageNode).canvasRotation % 360) + 360) % 360;
              if (rot === 90 || rot === 270) {
                const fw = (node as ImageNode).canvasW + 2 * FRAME_PADDING;
                const fh = ((node as ImageNode).canvasH > 0 ? (node as ImageNode).canvasH : (node as ImageNode).canvasW * 0.75) + 2 * FRAME_PADDING;
                wrapperLeft = node.canvasX + (fw - fh) / 2;
                wrapperTop  = node.canvasY + (fh - fw) / 2;
                wrapperW    = fh;
                wrapperH    = fw;
              }
            }

            return (
              <div
                className={`tc-canvas__node tc-canvas__node--${node.type}`}
                key={node.id}
                data-node-id={node.id}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId((prev) => prev === node.id ? null : prev)}
                style={{
                  position: "absolute",
                  left: wrapperLeft,
                  top: wrapperTop,
                  ...(wrapperW !== undefined ? { width: wrapperW } : {}),
                  ...(wrapperH !== undefined ? { height: wrapperH } : {}),
                  cursor: "grab",
                  transition: isDragging
                    ? "opacity var(--motion-duration-small) var(--motion-easing-out)"
                    : "left 0.22s ease, top 0.22s ease, opacity var(--motion-duration-small) var(--motion-easing-out)",
                  zIndex: selectedIds.has(node.id) ? 10 : 1,
                  opacity: matchesFilter ? 1 : 0.15,
                }}
              >
                {node.type === "video" ? (
                  <VideoNodeView
                    node={node}
                    isSelected={selectedIds.has(node.id)}
                    isConnecting={!!connectingFromId.current}
                    scale={transform.scale}
                    resolveUrl={resolveUrl}
                    onAnnotationSave={(body) => setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, annotation: body } as CanvasNode : n))}
                    onConnectStart={(e) => {
                      connectingFromId.current = node.id;
                      setConnectingCursor({ x: e.clientX, y: e.clientY });
                      (canvasEl.current as HTMLDivElement).setPointerCapture(e.pointerId);
                    }}
                  />
                ) : node.type === "image" ? (
                  <ImageNodeView
                    node={node}
                    isSelected={selectedIds.has(node.id)}
                    isConnecting={!!connectingCursor}
                    scale={transform.scale}
                    resolveUrl={resolveUrl}
                    onAnnotationSave={(body) =>
                      setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, annotation: body } : n))
                    }
                    onConnectStart={(e) => {
                      e.stopPropagation();
                      connectingFromId.current = node.id;
                      const pos = clientToCanvas(e.clientX, e.clientY);
                      setConnectingCursor(pos);
                      (canvasEl.current as HTMLDivElement).setPointerCapture(e.pointerId);
                    }}
                    onRotate={(deg) =>
                      setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, canvasRotation: deg } as CanvasNode : n))
                    }
                  />
                ) : node.type === "link" ? (
                  <LinkNodeView
                    node={node}
                    isSelected={selectedIds.has(node.id)}
                    isConnecting={!!connectingCursor}
                    onAnnotationSave={(body) =>
                      setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, annotation: body } : n))
                    }
                    onConnectStart={(e) => {
                      e.stopPropagation();
                      connectingFromId.current = node.id;
                      const pos = clientToCanvas(e.clientX, e.clientY);
                      setConnectingCursor(pos);
                      (canvasEl.current as HTMLDivElement).setPointerCapture(e.pointerId);
                    }}
                  />
                ) : (
                  <AnnotationCard initialBody={node.body} />
                )}

                {/* Tag chips displayed below node */}
                {node.tags.length > 0 && (
                  <div
                    className="tc-canvas__node-tags"
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      paddingTop: 6,
                      paddingLeft: FRAME_PADDING,
                      paddingRight: FRAME_PADDING,
                      maxWidth: nodeW + FRAME_PADDING * 2,
                      // When wrapper has explicit height (rotated image), flow tags below it.
                      ...(wrapperH !== undefined ? { position: "absolute" as const, top: wrapperH, left: 0 } : {}),
                    }}
                  >
                    {node.tags.map((tag) => (
                      <TagChip key={tag} label={tag} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDirectImageUrl(urlStr: string): boolean {
  try {
    const path = new URL(urlStr).pathname.toLowerCase();
    return /\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?)$/.test(path);
  } catch {
    return false;
  }
}

const NODE_GAP = 40;

function getNodeRect(node: CanvasNode): { x: number; y: number; w: number; h: number } {
  if (node.type === "image" || node.type === "video") return { x: node.canvasX, y: node.canvasY, w: node.canvasW, h: node.canvasH };
  if (node.type === "link") {
    const isTweet = parseTweetId(node.url) !== null;
    const h = isTweet ? 340 : !node.preview || node.loading ? 220 : node.preview.ogImage ? 260 : 110;
    return { x: node.canvasX, y: node.canvasY, w: node.canvasW, h };
  }
  return { x: node.canvasX, y: node.canvasY, w: 289, h: 110 };
}

function resolveCollisions(nodes: CanvasNode[], anchorIds: Set<string>): CanvasNode[] {
  const MAX_ITER = 80;
  const pos = new Map<string, { x: number; y: number }>(
    nodes.map((n) => [n.id, { x: n.canvasX, y: n.canvasY }])
  );

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let anyOverlap = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ni = nodes[i]; const nj = nodes[j];
        const pi = pos.get(ni.id)!; const pj = pos.get(nj.id)!;
        const ri = getNodeRect(ni); const rj = getNodeRect(nj);

        const overlapX = Math.min(pi.x + ri.w, pj.x + rj.w) - Math.max(pi.x, pj.x);
        const overlapY = Math.min(pi.y + ri.h, pj.y + rj.h) - Math.max(pi.y, pj.y);
        const needSepX = overlapX + NODE_GAP;
        const needSepY = overlapY + NODE_GAP;

        if (needSepX <= 0 || needSepY <= 0) continue;
        anyOverlap = true;

        const iAnchor = anchorIds.has(ni.id);
        const jAnchor = anchorIds.has(nj.id);
        if (iAnchor && jAnchor) continue;

        if (needSepX <= needSepY) {
          const dir = (pj.x + rj.w / 2) >= (pi.x + ri.w / 2) ? 1 : -1;
          if (iAnchor) pos.set(nj.id, { ...pj, x: pj.x + dir * needSepX });
          else if (jAnchor) pos.set(ni.id, { ...pi, x: pi.x - dir * needSepX });
          else {
            const half = needSepX / 2;
            pos.set(ni.id, { ...pi, x: pi.x - dir * half });
            pos.set(nj.id, { ...pj, x: pj.x + dir * half });
          }
        } else {
          const dir = (pj.y + rj.h / 2) >= (pi.y + ri.h / 2) ? 1 : -1;
          if (iAnchor) pos.set(nj.id, { ...pj, y: pj.y + dir * needSepY });
          else if (jAnchor) pos.set(ni.id, { ...pi, y: pi.y - dir * needSepY });
          else {
            const half = needSepY / 2;
            pos.set(ni.id, { ...pi, y: pi.y - dir * half });
            pos.set(nj.id, { ...pj, y: pj.y + dir * half });
          }
        }
      }
    }
    if (!anyOverlap) break;
  }

  return nodes.map((n) => {
    const p = pos.get(n.id)!;
    return { ...n, canvasX: Math.round(p.x), canvasY: Math.round(p.y) };
  });
}

function fetchLinkPreview(
  nodeId: string,
  url: string,
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>
) {
  fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
    .then((r) => r.json())
    .then((data) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? ({
                ...n,
                preview: {
                  url: data.url ?? url,
                  title: data.title ?? "",
                  description: data.description ?? "",
                  ogImage: data.ogImage ?? "",
                  siteName: data.siteName ?? "",
                } as LinkPreviewData,
                loading: false,
                fetchError: !!data.error,
              } as LinkNode)
            : n
        )
      );
    })
    .catch(() => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? ({ ...n, loading: false, fetchError: true } as LinkNode) : n
        )
      );
    });
}

// ---------------------------------------------------------------------------
// bookmarkGridPositions
// ---------------------------------------------------------------------------

function bookmarkGridPositions(
  count: number,
  centerX: number,
  centerY: number,
  cols = 3,
  cardW = LINK_CARD_W,
  cardH = 160,
  gapX = 24,
  gapY = 24
): { x: number; y: number }[] {
  const rows = Math.ceil(count / cols);
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const startX = centerX - Math.round(totalW / 2);
  const startY = centerY - Math.round(totalH / 2);

  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: startX + col * (cardW + gapX),
      y: startY + row * (cardH + gapY),
    };
  });
}

// ---------------------------------------------------------------------------
// GridView
// ---------------------------------------------------------------------------

type GridViewProps = {
  canvasId: string;
  nodes: CanvasNode[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  resolveUrl: (src: string) => string;
  onNodeClick: (nodeId: string) => void;
  selectedIds: Set<string>;
  sortNewest: boolean;
  setSortNewest: React.Dispatch<React.SetStateAction<boolean>>;
  columnCount: number;
  setColumnCount: React.Dispatch<React.SetStateAction<number>>;
};

type InsertionIndicator = {
  type: "horizontal";
  colIdx: number;
  position: number;
} | {
  type: "vertical";
  colIdx: number;
  height: number;
} | null;

function shallowEqualIndicator(a: InsertionIndicator, b: InsertionIndicator): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.type !== b.type || a.colIdx !== b.colIdx) return false;
  if (a.type === "horizontal" && b.type === "horizontal") return a.position === b.position;
  if (a.type === "vertical" && b.type === "vertical") return a.height === b.height;
  return false;
}

function GridView({ canvasId, nodes, edges, setNodes, resolveUrl, onNodeClick, selectedIds, sortNewest, setSortNewest, columnCount, setColumnCount }: GridViewProps) {
  const [draggedId, setDraggedId]   = useState<string | null>(null);
  const [insertionIndicator, setInsertionIndicator] = useState<InsertionIndicator>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const dragOccurredRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const masonryRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastIndicatorRef = useRef<InsertionIndicator>(null);
  const draggedNodeHeightRef = useRef(200);

  // Restore scroll position on mount
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    try {
      const saved = sessionStorage.getItem(`tc-grid-scroll-${canvasId}`);
      if (saved) el.scrollTop = Number(saved);
    } catch { /* ignore */ }
  }, [canvasId]);

  // Save scroll position on scroll (debounced via passive listener)
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onScroll() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(`tc-grid-scroll-${canvasId}`, String(el!.scrollTop));
      }, 150);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
      sessionStorage.setItem(`tc-grid-scroll-${canvasId}`, String(el.scrollTop));
    };
  }, [canvasId]);

  const displayNodes = useMemo(() => {
    if (sortNewest) return [...nodes].sort((a, b) => b.createdAt - a.createdAt);
    return nodes;
  }, [nodes, sortNewest]);

  const columns = useMemo(
    () => distributeToColumns(displayNodes, columnCount),
    [displayNodes, columnCount]
  );

  // --- Drag handlers ---

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.effectAllowed = "move";
    dragOccurredRef.current = true;
    setDraggedId(id);
    draggedNodeHeightRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect().height;
  }

  function computeInsertionPosition(clientX: number, clientY: number): InsertionIndicator {
    const cols = columnRefs.current;

    // Check if cursor is in a column gap
    for (let i = 0; i < cols.length - 1; i++) {
      const left = cols[i]?.getBoundingClientRect();
      const right = cols[i + 1]?.getBoundingClientRect();
      if (left && right && clientX > left.right && clientX < right.left) {
        return { type: "vertical", colIdx: i, height: draggedNodeHeightRef.current };
      }
    }

    // Find which column
    for (let colIdx = 0; colIdx < cols.length; colIdx++) {
      const colRect = cols[colIdx]?.getBoundingClientRect();
      if (!colRect || clientX < colRect.left || clientX > colRect.right) continue;

      const nodeEls = cols[colIdx]?.querySelectorAll("[data-grid-node]");
      if (!nodeEls || nodeEls.length === 0) {
        return { type: "horizontal", colIdx, position: 0 };
      }

      for (let i = 0; i < nodeEls.length; i++) {
        const r = nodeEls[i].getBoundingClientRect();
        const midY = r.top + r.height / 2;
        if (clientY < midY) {
          return { type: "horizontal", colIdx, position: i };
        }
      }

      return { type: "horizontal", colIdx, position: nodeEls.length };
    }

    return null;
  }

  function handleMasonryDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!draggedId) return;

    const next = computeInsertionPosition(e.clientX, e.clientY);
    if (!shallowEqualIndicator(lastIndicatorRef.current, next)) {
      lastIndicatorRef.current = next;
      setInsertionIndicator(next);
    }
  }

  function handleMasonryDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!draggedId || !insertionIndicator || insertionIndicator.type === "vertical") {
      setDraggedId(null);
      setInsertionIndicator(null);
      lastIndicatorRef.current = null;
      return;
    }

    const { colIdx, position } = insertionIndicator;
    const currentOrder = displayNodes.map((n) => n.id);
    const fromIdx = currentOrder.indexOf(draggedId);
    if (fromIdx === -1) {
      setDraggedId(null);
      setInsertionIndicator(null);
      lastIndicatorRef.current = null;
      return;
    }

    // Map column position to flat index
    const colNodes = columns[colIdx];
    const targetNodeId = colNodes?.[position]?.id;
    let targetFlatIdx = targetNodeId
      ? currentOrder.indexOf(targetNodeId)
      : currentOrder.length;

    const reordered = [...currentOrder];
    reordered.splice(fromIdx, 1);
    const adjusted = targetFlatIdx > fromIdx ? targetFlatIdx - 1 : targetFlatIdx;
    reordered.splice(Math.min(adjusted, reordered.length), 0, draggedId);

    setNodes((prev) => {
      const byId = Object.fromEntries(prev.map((n) => [n.id, n]));
      return reordered.map((id) => byId[id]).filter(Boolean) as CanvasNode[];
    });
    setSortNewest(false);
    setDraggedId(null);
    setInsertionIndicator(null);
    lastIndicatorRef.current = null;
  }

  function handleDragEnd() {
    setDraggedId(null);
    setInsertionIndicator(null);
    lastIndicatorRef.current = null;
    setTimeout(() => { dragOccurredRef.current = false; }, 0);
  }

  function handleMasonryDragLeave(e: React.DragEvent) {
    const masonry = masonryRef.current;
    if (!masonry) return;
    const related = e.relatedTarget as Node | null;
    if (related && masonry.contains(related)) return;
    setInsertionIndicator(null);
    lastIndicatorRef.current = null;
  }

  // --- Vertical indicator positioning ---
  const verticalLineStyle = useMemo((): React.CSSProperties | null => {
    if (!insertionIndicator || insertionIndicator.type !== "vertical") return null;
    const leftCol = columnRefs.current[insertionIndicator.colIdx];
    const masonry = masonryRef.current;
    if (!leftCol || !masonry) return null;
    const mRect = masonry.getBoundingClientRect();
    const lRect = leftCol.getBoundingClientRect();
    return {
      position: "absolute",
      left: lRect.right - mRect.left + 7, // center in the gap
      top: 0,
      width: "var(--grid-indicator-thickness)",
      height: insertionIndicator.height,
      background: "var(--grid-indicator-color)",
      borderRadius: "var(--radius-full)",
      opacity: 0.6,
      pointerEvents: "none",
      transition: `opacity var(--motion-duration-small) var(--motion-easing-out)`,
    };
  }, [insertionIndicator]);

  // --- Render ---

  const hasNodes = displayNodes.length > 0;

  return (
    <div
      className="tc-grid"
      ref={gridRef}
      style={{
        position: "absolute", inset: 0,
        background: "var(--surface-background)",
        overflowY: "auto",
      }}
    >
      <div className="tc-grid__container" style={{ maxWidth: "var(--grid-max-width)", margin: "0 auto", padding: "96px var(--grid-padding-x)" }}>
        {!hasNodes ? (
          /* Empty state */
          <div
            className="tc-grid__empty-state"
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              minHeight: "60vh",
              gap: 16,
              pointerEvents: "none",
            }}
          >
            <p style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-xl)",
              fontWeight: 600,
              color: "var(--text-primary)",
              opacity: 0.7,
            }}>
              Taste Canvas
            </p>
            <p style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-lg)",
              color: "var(--text-tertiary)",
              fontWeight: 400,
            }}>
              Paste anything to begin
            </p>
            <p style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-tertiary)",
              opacity: 0.6,
            }}>
              Images, links, and videos.
            </p>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 24,
              height: 22,
              padding: "0 8px",
              borderRadius: "var(--radius-xs)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border-default)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: 1,
              marginTop: 4,
            }}>
              Cmd+V
            </span>
          </div>
        ) : (
          <>

            {/* Manual flexbox masonry */}
            <div
              className="tc-grid__masonry"
              ref={masonryRef}
              onDragOver={handleMasonryDragOver}
              onDrop={handleMasonryDrop}
              onDragLeave={handleMasonryDragLeave}
              style={{ display: "flex", gap: "var(--grid-col-gap)", position: "relative" }}
            >
              {columns.map((colNodes, colIdx) => (
                <div
                  key={colIdx}
                  ref={(el) => { columnRefs.current[colIdx] = el; }}
                  className="tc-grid__column"
                  style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--grid-gap)" }}
                >
                  {colNodes.map((node, posInCol) => {
                    const hasAnnotation  = (node.type === "image" || node.type === "link" || node.type === "video") && (node as ImageNode | LinkNode | VideoNode).annotation.trim() !== "";
                    const annotationOpen = hoveredNodeId === node.id && hasAnnotation;

                    const isInsertBefore =
                      insertionIndicator?.type === "horizontal" &&
                      insertionIndicator.colIdx === colIdx &&
                      insertionIndicator.position === posInCol;

                    const isInsertAfterLast =
                      posInCol === colNodes.length - 1 &&
                      insertionIndicator?.type === "horizontal" &&
                      insertionIndicator.colIdx === colIdx &&
                      insertionIndicator.position === colNodes.length;

                    const isBelow =
                      insertionIndicator?.type === "horizontal" &&
                      insertionIndicator.colIdx === colIdx &&
                      posInCol >= insertionIndicator.position;

                    const indicatorLine = (
                      <div
                        className="tc-grid__insertion-line"
                        style={{
                          height: "var(--grid-indicator-thickness)",
                          background: "var(--grid-indicator-color)",
                          borderRadius: "var(--radius-full)",
                          opacity: 0.6,
                          margin: "-6px 0",
                        }}
                      />
                    );

                    return (
                      <Fragment key={node.id}>
                        {isInsertBefore && indicatorLine}
                        <div
                          className={`tc-grid__item tc-grid__item--${node.type}`}
                          data-grid-node={node.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node.id)}
                          onDragEnd={handleDragEnd}
                          onMouseEnter={() => setHoveredNodeId(node.id)}
                          onMouseLeave={() => setHoveredNodeId((prev) => prev === node.id ? null : prev)}
                          onClick={() => {
                            if (dragOccurredRef.current) return;
                            onNodeClick(node.id);
                          }}
                          style={{
                            position: "relative",
                            opacity: draggedId === node.id ? 0.4 : 1,
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            transform: isBelow ? "translateY(10px)" : "translateY(0)",
                            transition: `transform var(--motion-duration-small) var(--motion-easing-out), opacity 0.15s ease, box-shadow 120ms ease`,
                            boxShadow: selectedIds.has(node.id) ? `0 0 0 2px var(--accent-default)` : undefined,
                          }}
                        >
                          {node.type === "video" ? (
                            <>
                              <div className="tc-grid__item-media" style={{ position: "relative" }}>
                                <video
                                  className="tc-grid__item-video"
                                  src={resolveUrl(node.src)}
                                  preload="metadata"
                                  playsInline
                                  // Show controls on hover so the user can play/pause,
                                  // seek, and adjust volume directly in the grid card.
                                  controls={hoveredNodeId === node.id}
                                  style={{ width: "100%", height: "auto", borderRadius: "var(--radius-md)", display: "block" }}
                                  // Stop propagation so video interactions don't fire
                                  // the grid item's onClick (which would open the overlay).
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {/* Play badge: hidden once controls appear on hover */}
                                {hoveredNodeId !== node.id && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      pointerEvents: "none",
                                    }}
                                  >
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                                        <path d="M1 1L11 7L1 13V1Z" fill="white" />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div
                                className="tc-grid__item-annotation-collapse"
                                style={{
                                  marginTop: "var(--grid-inner-gap)",
                                  opacity: annotationOpen ? 1 : 0,
                                  maxHeight: annotationOpen ? "400px" : "0px",
                                  overflow: "hidden",
                                  pointerEvents: annotationOpen ? "auto" : "none",
                                  transition: "opacity var(--motion-duration-small) var(--motion-easing-out), max-height 0.25s var(--motion-easing-out)",
                                }}
                              >
                                <AnnotationCard initialBody={node.annotation} cardStyle={{ width: "100%" }} hideToolbar />
                              </div>
                              {node.tags.length > 0 && (
                                <div className="tc-grid__item-tags" style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                  {node.tags.map((tag) => <TagChip key={tag} label={tag} />)}
                                </div>
                              )}
                            </>
                          ) : node.type === "image" ? (
                            <>
                              <div className="tc-grid__item-media" style={{ position: "relative" }}>
                                <img
                                  className="tc-grid__item-image"
                                  src={resolveUrl(node.src)}
                                  alt={node.alt}
                                  draggable={false}
                                  style={{ width: "100%", height: "auto", borderRadius: "var(--radius-md)", display: "block", pointerEvents: "none" }}
                                />
                              </div>
                              <div
                                className="tc-grid__item-annotation-collapse"
                                style={{
                                  marginTop: "var(--grid-inner-gap)",
                                  opacity: annotationOpen ? 1 : 0,
                                  maxHeight: annotationOpen ? "400px" : "0px",
                                  overflow: "hidden",
                                  pointerEvents: annotationOpen ? "auto" : "none",
                                  transition: "opacity var(--motion-duration-small) var(--motion-easing-out), max-height 0.25s var(--motion-easing-out)",
                                }}
                              >
                                <AnnotationCard initialBody={node.annotation} cardStyle={{ width: "100%" }} hideToolbar />
                              </div>
                              {node.tags.length > 0 && (
                                <div className="tc-grid__item-tags" style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                  {node.tags.map((tag) => <TagChip key={tag} label={tag} />)}
                                </div>
                              )}
                            </>
                          ) : node.type === "link" ? (
                            <>
                              <div className="tc-grid__item-media" style={{ position: "relative" }}>
                                <LinkPreviewCard
                                  data={node.preview && node.name ? { ...node.preview, title: node.name } : node.preview}
                                  fetchError={node.fetchError}
                                  width="100%"
                                  url={node.url}
                                />
                              </div>
                              <div
                                className="tc-grid__item-annotation-collapse"
                                style={{
                                  marginTop: "var(--grid-inner-gap)",
                                  opacity: annotationOpen ? 1 : 0,
                                  maxHeight: annotationOpen ? "400px" : "0px",
                                  overflow: "hidden",
                                  pointerEvents: annotationOpen ? "auto" : "none",
                                  transition: "opacity var(--motion-duration-small) var(--motion-easing-out), max-height 0.25s var(--motion-easing-out)",
                                }}
                              >
                                <AnnotationCard initialBody={node.annotation} cardStyle={{ width: "100%" }} hideToolbar />
                              </div>
                              {node.tags.length > 0 && (
                                <div className="tc-grid__item-tags" style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                  {node.tags.map((tag) => <TagChip key={tag} label={tag} />)}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <AnnotationCard initialBody={node.body} cardStyle={{ width: "100%" }} />
                              {node.tags.length > 0 && (
                                <div className="tc-grid__item-tags" style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                                  {node.tags.map((tag) => <TagChip key={tag} label={tag} />)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {isInsertAfterLast && indicatorLine}
                      </Fragment>
                    );
                  })}

                  {/* Insertion line at top of empty column */}
                  {colNodes.length === 0 &&
                    insertionIndicator?.type === "horizontal" &&
                    insertionIndicator.colIdx === colIdx && (
                    <div
                      className="tc-grid__insertion-line"
                      style={{
                        height: "var(--grid-indicator-thickness)",
                        background: "var(--grid-indicator-color)",
                        borderRadius: "var(--radius-full)",
                        opacity: 0.6,
                      }}
                    />
                  )}
                </div>
              ))}

              {/* Vertical between-column indicator */}
              {verticalLineStyle && (
                <div className="tc-grid__insertion-line--vertical" style={verticalLineStyle} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// CanvasClient (main exported component, receives data from server)
// ---------------------------------------------------------------------------

export function CanvasClient({
  profile,
  userEmail,
  canvas,
  canvasList,
  initialNodes,
  initialEdges,
  initialSignedUrls,
}: CanvasClientProps) {
  const [view, setView]             = useState<View>(canvas.last_view);
  const [nodes, setNodes]           = useState<CanvasNode[]>(initialNodes);
  const [edges, setEdges]           = useState<Edge[]>(initialEdges);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortNewest, setSortNewest] = useState(false);
  const [columnCount, setColumnCount] = useState(4);

  // Signed URL resolution for R2 images
  const { resolveUrl, signKey } = useSignedUrls(nodes, initialSignedUrls);

  // Auto-save
  useAutoSave(canvas.id, nodes, edges);

  // Track current theme for Toaster (always start "dark" to match SSR)
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
    if (t) setCurrentTheme(t);

    const observer = new MutationObserver(() => {
      const next = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
      if (next) setCurrentTheme(next);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // UI state
  const [expandedNodeId, setExpandedNodeId]             = useState<string | null>(null);
  const [pendingReflectionNodeId, setPendingReflectionNodeId] = useState<string | null>(null);
  const [reflectionMode, setReflectionMode]             = useState(profile.reflection_mode);
  const [showSearch, setShowSearch]                     = useState(false);
  const [showShortcuts, setShowShortcuts]               = useState(false);
  const [showOnboarding, setShowOnboarding]             = useState(false);
  const [canvasTitle, setCanvasTitle]                   = useState(canvas.title);
  const [localCanvasList, setLocalCanvasList]           = useState(canvasList);
  const [bookmarkTree, setBookmarkTree]                 = useState<BookmarkFolder | null>(null);
  const bookmarkFileRef                                 = useRef<HTMLInputElement>(null);
  const [activeFilterTags, setActiveFilterTags]         = useState<Set<string>>(new Set());

  // Auto-show onboarding on first visit
  useEffect(() => {
    const completed = localStorage.getItem("tc-onboarding-completed");
    if (!completed) {
      const timer = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("tc-onboarding-completed", "1");
    setShowOnboarding(false);
  }, []);

  // Persist canvas title changes immediately
  const handleTitleChange = useCallback(
    (title: string) => {
      setCanvasTitle(title);
      const supabase = createClient();
      supabase.from("canvases").update({ title }).eq("id", canvas.id).then();
    },
    [canvas.id]
  );

  // Persist reflection mode changes immediately
  const handleReflectionModeChange = useCallback(
    (v: boolean) => {
      setReflectionMode(v);
      const supabase = createClient();
      supabase.from("profiles").update({ reflection_mode: v }).eq("id", profile.id).then();
    },
    [profile.id]
  );

  const router = useRouter();

  // Visibility toggle for a canvas
  const handleVisibilityChange = useCallback(
    (canvasId: string, visibility: "private" | "public") => {
      setLocalCanvasList((prev) =>
        prev.map((c) => (c.id === canvasId ? { ...c, visibility } : c))
      );
      const supabase = createClient();
      supabase.from("canvases").update({ visibility }).eq("id", canvasId).then();
    },
    []
  );

  // Delete a canvas
  const handleDeleteCanvas = useCallback(
    async (canvasId: string) => {
      const supabase = createClient();
      await supabase.from("canvas_edges").delete().eq("canvas_id", canvasId);
      await supabase.from("canvas_nodes").delete().eq("canvas_id", canvasId);
      await supabase.from("canvases").delete().eq("id", canvasId);

      const remaining = localCanvasList.filter((c) => c.id !== canvasId);
      setLocalCanvasList(remaining);

      if (canvasId === canvas.id) {
        if (remaining.length > 0) {
          router.push(`/canvas?id=${remaining[0].id}`);
        } else {
          router.push("/canvas");
        }
      }
    },
    [localCanvasList, canvas.id, router]
  );

  // ---------------------------------------------------------------------------
  // Bookmark import
  // ---------------------------------------------------------------------------

  function handleImportBookmarks() {
    bookmarkFileRef.current?.click();
  }

  function handleBookmarkFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    e.target.value = "";
    const reader = new FileReader();
    reader.onerror = () => toast.error("Could not read file.");
    reader.onload = () => {
      const html = reader.result as string;
      const tree = parseBookmarksHtml(html);
      setBookmarkTree(tree);
    };
    reader.readAsText(file);
  }

  function handleBookmarkConfirm(items: BookmarkItem[]) {
    setBookmarkTree(null);
    if (items.length === 0) return;

    checkpoint();

    // Determine viewport center in canvas-world coords.
    // We read the transform from sessionStorage since CanvasView owns it.
    let tx = 0, ty = 0, scale = 1;
    try {
      const raw = sessionStorage.getItem(`tc-transform-${canvas.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === "number") { tx = parsed.x; ty = parsed.y; scale = parsed.scale; }
      }
    } catch { /* ignore */ }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const originX = Math.round((vw / 2 - tx) / scale);
    const originY = Math.round((vh / 2 - ty) / scale);

    const positions = bookmarkGridPositions(items.length, originX, originY);

    const newNodes: LinkNode[] = items.map((item, i) => ({
      id: crypto.randomUUID(),
      type: "link",
      url: item.url,
      name: item.title || undefined,
      canvasX: positions[i].x,
      canvasY: positions[i].y,
      canvasW: LINK_CARD_W,
      annotation: "",
      preview: null,
      loading: true,
      fetchError: false,
      tags: [],
      createdAt: Date.now() + i,
    }));

    setNodes((prev) => {
      const newIds = new Set(newNodes.map((n) => n.id));
      return resolveCollisions([...newNodes, ...prev], newIds);
    });

    newNodes.forEach((node) => {
      fetchLinkPreview(node.id, node.url, setNodes);
    });

    toast.success(`${items.length} link${items.length === 1 ? "" : "s"} added to canvas`);
  }

  // Persist view changes
  const handleViewChange = useCallback(
    (v: View) => {
      setView(v);
      const supabase = createClient();
      supabase.from("canvases").update({ last_view: v }).eq("id", canvas.id).then();
    },
    [canvas.id]
  );

  // Undo / redo
  const undoStack = useRef<{ nodes: CanvasNode[]; edges: Edge[] }[]>([]);
  const redoStack = useRef<{ nodes: CanvasNode[]; edges: Edge[] }[]>([]);
  const nodesRef  = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef  = useRef(edges);
  edgesRef.current = edges;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const viewRef = useRef(view);
  viewRef.current = view;

  const checkpoint = useCallback(() => {
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    if (undoStack.current.length > 40) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  function undo() {
    const snap = undoStack.current.pop();
    if (!snap) return;
    redoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes(snap.nodes);
    setEdges(snap.edges);
  }

  function redo() {
    const snap = redoStack.current.pop();
    if (!snap) return;
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes(snap.nodes);
    setEdges(snap.edges);
  }

  // ---------------------------------------------------------------------------
  // Global keyboard handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const inTextField = active?.tagName === "TEXTAREA" || active?.tagName === "INPUT" || (active as HTMLElement)?.isContentEditable;

      // Search palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((v) => !v);
        return;
      }

      // Shortcuts sheet
      if (!inTextField && e.key === "?") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }

      // Undo / redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Esc: close overlays in order of precedence
      if (e.key === "Escape") {
        if (bookmarkTree) { setBookmarkTree(null); return; }
        if (showOnboarding) { handleOnboardingComplete(); return; }
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showSearch) { setShowSearch(false); return; }
        if (pendingReflectionNodeId) { setPendingReflectionNodeId(null); return; }
        if (expandedNodeId) { setExpandedNodeId(null); return; }
        setSelectedIds(new Set());
        return;
      }

      if (inTextField) return;

      // Delete selected nodes (canvas and grid views)
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIdsRef.current.size > 0) {
        e.preventDefault();
        const selIds = selectedIdsRef.current;
        const toDelete = nodesRef.current.filter((n) => selIds.has(n.id));
        if (toDelete.length > 0) {
          checkpoint();
          setNodes((prev) => prev.filter((n) => !selIds.has(n.id)));
          setEdges((prev) => prev.filter((edge) => !selIds.has(edge.fromId) && !selIds.has(edge.toId)));
          setSelectedIds(new Set());
          if (viewRef.current === "grid") setExpandedNodeId(null);
          const count = toDelete.length;
          toast(`Deleted ${count} node${count > 1 ? "s" : ""}`, {
            action: { label: "Undo", onClick: undo },
            duration: 5000,
          });
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showShortcuts, showSearch, expandedNodeId, pendingReflectionNodeId, showOnboarding, handleOnboardingComplete, checkpoint]);

  // Clear selection on view change
  useEffect(() => { setSelectedIds(new Set()); }, [view]);

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  const handleNodeDelete = useCallback((nodeId: string) => {
    checkpoint();
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.fromId !== nodeId && e.toId !== nodeId));
    setSelectedIds(new Set());
    setExpandedNodeId(null);
    toast("Deleted node", { action: { label: "Undo", onClick: undo }, duration: 5000 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpoint]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setExpandedNodeId((prev) => (prev === nodeId ? null : nodeId));
    if (viewRef.current === "grid") {
      setSelectedIds((prev) => {
        const next = new Set([nodeId]);
        return prev.size === 1 && prev.has(nodeId) ? new Set() : next;
      });
    }
  }, []);

  const handleNodeCreated = useCallback(
    (nodeId: string) => {
      if (reflectionMode) {
        setPendingReflectionNodeId(nodeId);
      }
    },
    [reflectionMode]
  );

  const handleReflectionSave = useCallback(
    (body: string) => {
      if (!pendingReflectionNodeId) return;
      if (body.trim()) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === pendingReflectionNodeId
              ? { ...n, annotation: body.trim() } as CanvasNode
              : n
          )
        );
      }
      setPendingReflectionNodeId(null);
    },
    [pendingReflectionNodeId]
  );

  const handleAnnotationSave = useCallback(
    (nodeId: string, body: string) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, annotation: body } as CanvasNode : n))
      );
    },
    []
  );

  const handleTagsSave = useCallback((nodeId: string, tags: string[]) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, tags } as CanvasNode : n))
    );
  }, []);

  const handleToggleFilterTag = useCallback((tag: string) => {
    setActiveFilterTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [nodes]);

  const handleNavigate = useCallback((nodeId: string) => {
    setExpandedNodeId(nodeId);
  }, []);

  // Jump to node in canvas (from search)
  const handleSearchJump = useCallback((nodeId: string) => {
    setView("canvas");
    setExpandedNodeId(nodeId);
    setSelectedIds(new Set([nodeId]));
  }, []);

  // ---------------------------------------------------------------------------
  // Grid-view paste handler (CanvasView has its own; this covers grid view)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleGridPaste(e: ClipboardEvent) {
      if (viewRef.current !== "grid") return;

      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) return;

      if (nodesRef.current.length >= NODE_CAP) {
        toast.error("150-node limit reached. Remove a node or start a new canvas.");
        return;
      }

      const items = Array.from(e.clipboardData?.items ?? []);

      // Default canvas position: place near center, collision resolution handles overlaps
      const cx = 0;
      const cy = 0;

      // Pasted image file
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          toast.promise(
            uploadImageToR2(file).then(async ({ key }) => {
              const signedUrl = await signKey(key);
              const probe = new window.Image();
              probe.onload = () => {
                const w = Math.min(probe.naturalWidth, 600);
                const h = Math.round((probe.naturalHeight / probe.naturalWidth) * w);
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: ImageNode = {
                    id: nodeId, type: "image", src: key, alt: "Pasted image",
                    canvasX: cx - Math.round(w / 2), canvasY: cy - Math.round(h / 2),
                    canvasW: w, canvasH: h, annotation: "", tags: [], canvasRotation: 0, createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                handleNodeCreated(nodeId);
              };
              probe.onerror = () => {
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: ImageNode = {
                    id: nodeId, type: "image", src: key, alt: "Pasted image",
                    canvasX: cx - 200, canvasY: cy - 150, canvasW: 400, canvasH: 300,
                    annotation: "", tags: [], canvasRotation: 0, createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                handleNodeCreated(nodeId);
              };
              probe.src = signedUrl;
            }),
            {
              loading: "Uploading image...",
              success: "Image uploaded",
              error: "Upload failed",
            }
          );
          return;
        }
      }

      // Pasted video file
      const videoItem = items.find((item) => item.type.startsWith("video/"));
      if (videoItem) {
        const file = videoItem.getAsFile();
        if (file) {
          toast.promise(
            uploadImageToR2(file).then(async ({ key }) => {
              const signedUrl = await signKey(key);
              const probe = document.createElement("video");
              probe.preload = "metadata";
              probe.onloadedmetadata = () => {
                const raw = probe.videoWidth || 480;
                const w = Math.min(raw, 600);
                const h = probe.videoHeight
                  ? Math.round((probe.videoHeight / probe.videoWidth) * w)
                  : Math.round(w * 9 / 16);
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: VideoNode = {
                    id: nodeId, type: "video", src: key,
                    canvasX: cx - Math.round(w / 2), canvasY: cy - Math.round(h / 2),
                    canvasW: w, canvasH: h, annotation: "", tags: [], createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                handleNodeCreated(nodeId);
                URL.revokeObjectURL(probe.src);
              };
              probe.onerror = () => {
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: VideoNode = {
                    id: nodeId, type: "video", src: key,
                    canvasX: cx - 240, canvasY: cy - 135, canvasW: 480, canvasH: 270,
                    annotation: "", tags: [], createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                handleNodeCreated(nodeId);
                URL.revokeObjectURL(probe.src);
              };
              probe.src = signedUrl;
            }),
            {
              loading: "Uploading video...",
              success: "Video uploaded",
              error: "Upload failed",
            }
          );
          return;
        }
      }

      // Pasted text (URL or plain text)
      const textItem = items.find((item) => item.type === "text/plain");
      if (textItem) {
        textItem.getAsString((raw) => {
          const text = raw.trim();
          if (!text) return;

          let isUrl = false;
          try {
            const u = new URL(text);
            isUrl = u.protocol === "http:" || u.protocol === "https:";
          } catch { /* not a URL */ }

          if (isUrl) {
            // Duplicate URL detection
            const existing = nodesRef.current.find(
              (n) => n.type === "link" && (n as LinkNode).url === text
            );
            if (existing) {
              toast("Already on canvas.", { duration: 3000 });
              return;
            }

            if (isDirectImageUrl(text)) {
              const probe = new window.Image();
              probe.crossOrigin = "anonymous";
              probe.onload = () => {
                const w = Math.min(probe.naturalWidth || 400, 600);
                const h = probe.naturalHeight && probe.naturalWidth
                  ? Math.round((probe.naturalHeight / probe.naturalWidth) * w)
                  : Math.round(w * 0.75);
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: ImageNode = {
                    id: nodeId, type: "image", src: text,
                    alt: new URL(text).pathname.split("/").pop() || "Image",
                    canvasX: cx - Math.round(w / 2), canvasY: cy - Math.round(h / 2),
                    canvasW: w, canvasH: h, annotation: "", tags: [], canvasRotation: 0, createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                handleNodeCreated(nodeId);
              };
              probe.onerror = () => {
                const nodeId = crypto.randomUUID();
                checkpoint();
                setNodes((prev) => {
                  const newNode: ImageNode = {
                    id: nodeId, type: "image", src: text,
                    alt: new URL(text).pathname.split("/").pop() || "Image",
                    canvasX: cx - 200, canvasY: cy - 150,
                    canvasW: 400, canvasH: 300, annotation: "", tags: [], canvasRotation: 0, createdAt: Date.now(),
                  };
                  return resolveCollisions([newNode, ...prev], new Set([nodeId]));
                });
                handleNodeCreated(nodeId);
              };
              probe.src = text;
            } else {
              const nodeId = crypto.randomUUID();
              checkpoint();
              setNodes((prev) => {
                const newNode: LinkNode = {
                  id: nodeId, type: "link", url: text,
                  canvasX: cx - Math.round(LINK_CARD_W / 2), canvasY: cy - 120,
                  canvasW: LINK_CARD_W, annotation: "",
                  preview: null, loading: true, fetchError: false, tags: [], createdAt: Date.now(),
                };
                return resolveCollisions([newNode, ...prev], new Set([nodeId]));
              });
              fetchLinkPreview(nodeId, text, setNodes);
              handleNodeCreated(nodeId);
            }
          } else {
            const nodeId = crypto.randomUUID();
            checkpoint();
            setNodes((prev) => {
              const newNode: AnnotationNode = {
                id: nodeId, type: "annotation", body: text,
                canvasX: cx - 144, canvasY: cy - 60, tags: [], createdAt: Date.now(),
              };
              return resolveCollisions([newNode, ...prev], new Set([nodeId]));
            });
            handleNodeCreated(nodeId);
          }
        });
      }
    }

    window.addEventListener("paste", handleGridPaste);
    return () => window.removeEventListener("paste", handleGridPaste);
  }, [setNodes, checkpoint, signKey, handleNodeCreated]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const expandedNode = nodes.find((n) => n.id === expandedNodeId) ?? null;

  return (
    <div className="tc-page" style={{ position: "fixed", inset: 0 }}>
      <Toaster position="bottom-right" theme={currentTheme} />

      {/* View area */}
      <div
        className="tc-page__view-area"
        key={view}
        style={{
          position: "absolute", inset: 0,
          animation: "fadeIn var(--motion-duration-small) var(--motion-easing-out) both",
        }}
      >
        {view === "canvas" ? (
          <CanvasView
            canvasId={canvas.id}
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            resolveUrl={resolveUrl}
            signKey={signKey}
            onNodeClick={handleNodeClick}
            onNodeCreated={handleNodeCreated}
            checkpoint={checkpoint}
            activeFilterTags={activeFilterTags}
          />
        ) : (
          <GridView
            canvasId={canvas.id}
            nodes={
              activeFilterTags.size > 0
                ? nodes.filter((n) => n.tags.some((t) => activeFilterTags.has(t)))
                : nodes
            }
            edges={edges}
            setNodes={setNodes}
            resolveUrl={resolveUrl}
            onNodeClick={handleNodeClick}
            selectedIds={selectedIds}
            sortNewest={sortNewest}
            setSortNewest={setSortNewest}
            columnCount={columnCount}
            setColumnCount={setColumnCount}
          />
        )}
      </div>

      {/* Bottom chrome */}
      <div
        className="tc-page__bottom-chrome"
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          pointerEvents: "none",
          background: "linear-gradient(to bottom, transparent 0%, var(--surface-background) 100%)",
          padding: "30px 40px 40px",
        }}
      >
        <div
          className="tc-page__bottom-chrome-inner"
          style={{
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            width: "100%",
          }}
        >
          <div className="tc-page__view-toggle-slot" style={{ pointerEvents: "auto" }}>
            <ViewTogglePill value={view} onChange={handleViewChange} />
          </div>
        </div>
      </div>


      {/* Hidden file input for bookmark import */}
      <input
        ref={bookmarkFileRef}
        type="file"
        accept=".html"
        style={{ display: "none" }}
        onChange={handleBookmarkFile}
        aria-hidden="true"
      />

      {/* Tag filter bar: floats top-center when tags exist */}
      <TagFilterBar
        allTags={allTags}
        activeTags={activeFilterTags}
        onToggleTag={handleToggleFilterTag}
        onClearAll={() => setActiveFilterTags(new Set())}
      />

      {/* Top-right: grid controls + AppMenu */}
      <div
        className="tc-page__top-right"
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {view === "grid" && (
          <>
            {/* Column count slider */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                letterSpacing: "var(--letter-spacing-wide)",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                minWidth: 18,
                textAlign: "right",
                userSelect: "none",
              }}>
                {columnCount}
              </span>
              <input
                type="range"
                min={2}
                max={4}
                step={1}
                value={columnCount}
                onChange={(e) => setColumnCount(Number(e.target.value))}
                aria-label="Column count"
                style={{ width: 56, cursor: "pointer", accentColor: "var(--accent-default)" }}
              />
            </div>

            {/* Sort button */}
            <button
              onClick={() => setSortNewest((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: sortNewest ? "var(--accent-subtle)" : "var(--surface-raised)",
                border: `1px solid ${sortNewest ? "var(--accent-default)" : "var(--border-subtle)"}`,
                color: sortNewest ? "var(--accent-default)" : "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                letterSpacing: "var(--letter-spacing-wide)",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all var(--motion-duration-small) var(--motion-easing-out)",
              }}
            >
              <ArrowDownUp size={11} />
              Newest first
            </button>
          </>
        )}

        <AppMenuPanel
          displayName={profile.display_name}
          userEmail={userEmail}
          canvasTitle={canvasTitle}
          onTitleChange={handleTitleChange}
          reflectionMode={reflectionMode}
          onReflectionModeChange={handleReflectionModeChange}
          onShowShortcuts={() => setShowShortcuts(true)}
          onShowOnboarding={() => setShowOnboarding(true)}
          onImportBookmarks={handleImportBookmarks}
          canvasList={localCanvasList}
          currentCanvasId={canvas.id}
          profileId={profile.id}
          onVisibilityChange={handleVisibilityChange}
          onDeleteCanvas={handleDeleteCanvas}
        />
      </div>

      {/* Reflection prompt (appears after paste) */}
      {pendingReflectionNodeId && (
        <ReflectionPrompt
          onSave={handleReflectionSave}
          onSkip={() => setPendingReflectionNodeId(null)}
        />
      )}

      {/* Expanded node overlay */}
      {expandedNode && (
        <ExpandedOverlay
          node={expandedNode}
          allNodes={nodes}
          edges={edges}
          resolveUrl={resolveUrl}
          onClose={() => setExpandedNodeId(null)}
          onAnnotationSave={handleAnnotationSave}
          onNavigate={handleNavigate}
          onTagsSave={handleTagsSave}
          onDelete={handleNodeDelete}
          allCanvasTags={allTags}
        />
      )}

      {/* Search palette */}
      {showSearch && (
        <SearchPalette
          nodes={nodes}
          resolveUrl={resolveUrl}
          onClose={() => setShowSearch(false)}
          onJump={handleSearchJump}
        />
      )}

      {/* Shortcuts sheet */}
      {showShortcuts && (
        <ShortcutsSheet onClose={() => setShowShortcuts(false)} />
      )}

      {/* Onboarding spotlight tour */}
      {showOnboarding && (
        <OnboardingSpotlight onComplete={handleOnboardingComplete} />
      )}

      {/* Bookmark import dialog */}
      {bookmarkTree && (
        <BookmarkImportDialog
          tree={bookmarkTree}
          existingUrls={new Set(nodes.filter((n) => n.type === "link").map((n) => (n as LinkNode).url))}
          remainingCap={NODE_CAP - nodes.length}
          onConfirm={handleBookmarkConfirm}
          onClose={() => setBookmarkTree(null)}
        />
      )}
    </div>
  );
}
