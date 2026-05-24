"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AnnotationCard } from "./AnnotationCard";
import { LinkPreviewCard } from "./LinkPreviewCard";
import type { CanvasNode, ImageNode, LinkNode, Edge } from "@/lib/canvas-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;
const FRAME_PADDING = 10;
const DRAG_THRESHOLD = 4;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ReadOnlyCanvasViewProps = {
  nodes: CanvasNode[];
  edges: Edge[];
  resolveUrl: (src: string) => string;
  onNodeClick?: (nodeId: string) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNodeRect(node: CanvasNode): { x: number; y: number; w: number; h: number } {
  if (node.type === "image") return { x: node.canvasX, y: node.canvasY, w: node.canvasW, h: node.canvasH };
  if (node.type === "link") {
    const h = !node.preview || node.loading ? 220 : node.preview.ogImage ? 260 : 110;
    return { x: node.canvasX, y: node.canvasY, w: node.canvasW, h };
  }
  return { x: node.canvasX, y: node.canvasY, w: 289, h: 110 };
}

// ---------------------------------------------------------------------------
// ReadOnlyCanvasView
// ---------------------------------------------------------------------------

export function ReadOnlyCanvasView({
  nodes,
  edges,
  resolveUrl,
  onNodeClick,
}: ReadOnlyCanvasViewProps) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  // Local-only position overrides (never persisted; reset on reload)
  const [posOverrides, setPosOverrides] = useState<Map<string, { x: number; y: number }>>(new Map());

  const canvasEl = useRef<HTMLDivElement>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const panStart = useRef<{ x: number; y: number } | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  // Node drag refs
  const pendingNodeId = useRef<string | null>(null);
  const draggingNodeId = useRef<string | null>(null);

  // Z-index stacking: most recently dragged node stays on top
  const zCounter = useRef(1);
  const [zLayers, setZLayers] = useState<Map<string, number>>(new Map());

  // Resolve position: override if viewer dragged, otherwise original
  function nodePos(node: CanvasNode): { x: number; y: number } {
    const ov = posOverrides.get(node.id);
    return ov ?? { x: node.canvasX, y: node.canvasY };
  }

  // ---------------------------------------------------------------------------
  // Fit to view on mount
  // ---------------------------------------------------------------------------

  const fitToView = useCallback(() => {
    if (nodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
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
  }, [nodes]);

  useEffect(() => {
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Wheel handler (zoom + pan)
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
  // Pointer handlers (pan, node drag, click)
  // ---------------------------------------------------------------------------

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button")) return;

    // Detect if the pointer landed on a node
    const nodeEl = target.closest("[data-node-id]") as HTMLElement | null;
    pendingNodeId.current = nodeEl ? nodeEl.getAttribute("data-node-id") : null;

    panStart.current = { x: e.clientX, y: e.clientY };
    lastPos.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    const totalDx = e.clientX - panStart.current.x;
    const totalDy = e.clientY - panStart.current.y;
    if (!didDrag.current && Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD) return;

    if (!didDrag.current) {
      didDrag.current = true;
      if (pendingNodeId.current) {
        draggingNodeId.current = pendingNodeId.current;
        setIsDraggingNode(true);
        // Bring this node to front
        zCounter.current += 1;
        const nodeId = pendingNodeId.current;
        const z = zCounter.current;
        setZLayers((prev) => { const next = new Map(prev); next.set(nodeId, z); return next; });
      } else {
        setIsPanning(true);
      }
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    }

    if (draggingNodeId.current) {
      const scale = transformRef.current.scale;
      setPosOverrides((prev) => {
        const next = new Map(prev);
        const nodeId = draggingNodeId.current!;
        const existing = next.get(nodeId);
        const node = nodes.find((n) => n.id === nodeId);
        const base = existing ?? (node ? { x: node.canvasX, y: node.canvasY } : { x: 0, y: 0 });
        next.set(nodeId, { x: base.x + dx / scale, y: base.y + dy / scale });
        return next;
      });
    } else {
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    }
  }, [nodes]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!didDrag.current && panStart.current && onNodeClick) {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest("[data-node-id]") as HTMLElement | null;
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute("data-node-id");
        if (nodeId) onNodeClick(nodeId);
      }
    }
    panStart.current = null;
    pendingNodeId.current = null;
    draggingNodeId.current = null;
    didDrag.current = false;
    setIsPanning(false);
    setIsDraggingNode(false);
  }, [onNodeClick]);

  // ---------------------------------------------------------------------------
  // Keyboard: Cmd+0 to fit
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        fitToView();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fitToView]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const dotSize = 24 * transform.scale;

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    edges.forEach((e) => { ids.add(e.fromId); ids.add(e.toId); });
    return ids;
  }, [edges]);

  return (
    <div
      className="tc-readonly-canvas__viewport"
      ref={canvasEl}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "var(--surface-background)",
        cursor: isPanning || isDraggingNode ? "grabbing" : "grab",
        userSelect: "none",
        backgroundImage: "radial-gradient(circle, var(--dot-grid-color) 1.5px, transparent 1.5px)",
        backgroundSize: `${dotSize}px ${dotSize}px`,
        backgroundPosition: `${transform.x}px ${transform.y}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Empty state */}
      {nodes.length === 0 && (
        <div
          className="tc-readonly-canvas__empty"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-lg)",
              color: "var(--text-tertiary)",
            }}
          >
            Nothing here yet
          </p>
        </div>
      )}

      {/* World transform layer */}
      <div
        className="tc-readonly-canvas__world"
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
        {/* SVG edge layer */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            overflow: "visible",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.fromId);
            const toNode = nodes.find((n) => n.id === edge.toId);
            if (!fromNode || !toNode) return null;

            const fr = getNodeRect(fromNode);
            const tr = getNodeRect(toNode);
            const fromPos = nodePos(fromNode);
            const toPos = nodePos(toNode);
            const fx = fromPos.x + fr.w / 2;
            const fy = fromPos.y + fr.h / 2;
            const tx = toPos.x + tr.w / 2;
            const ty = toPos.y + tr.h / 2;

            const ddx = tx - fx;
            const cp1x = fx + ddx * 0.35;
            const cp2x = tx - ddx * 0.35;

            return (
              <path
                key={edge.id}
                d={`M ${fx} ${fy} C ${cp1x} ${fy} ${cp2x} ${ty} ${tx} ${ty}`}
                stroke="var(--accent-default)"
                strokeWidth={1.5}
                fill="none"
                strokeLinecap="round"
                opacity={0.5}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = nodePos(node);
          const isBeingDragged = isDraggingNode && draggingNodeId.current === node.id;
          return (
            <div
              className={`tc-readonly-canvas__node tc-readonly-canvas__node--${node.type}`}
              key={node.id}
              data-node-id={node.id}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                cursor: isBeingDragged ? "grabbing" : "grab",
                zIndex: zLayers.get(node.id) ?? 1,
                transition: isBeingDragged ? "none" : "left 0.22s ease, top 0.22s ease",
              }}
            >
              {node.type === "image" ? (
                <div style={{ position: "relative", padding: FRAME_PADDING, borderRadius: "var(--radius-lg)" }}>
                  <img
                    src={resolveUrl(node.src)}
                    alt={node.alt}
                    draggable={false}
                    style={{
                      width: node.canvasW,
                      height: node.canvasH > 0 ? node.canvasH : undefined,
                      borderRadius: "var(--radius-md)",
                      objectFit: "cover",
                      display: "block",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ) : node.type === "link" ? (
                <div style={{ position: "relative", padding: FRAME_PADDING, borderRadius: "var(--radius-lg)" }}>
                  <LinkPreviewCard
                    data={node.preview && node.name ? { ...node.preview, title: node.name } : node.preview}
                    fetchError={node.fetchError}
                    width={node.canvasW}
                  />
                </div>
              ) : (
                <AnnotationCard initialBody={node.body} readOnly hideToolbar />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
