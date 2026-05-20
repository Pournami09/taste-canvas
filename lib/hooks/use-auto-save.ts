"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { clientNodeToDb, clientEdgeToDb } from "@/lib/canvas-db";
import type { CanvasNode, Edge } from "@/lib/canvas-types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1500;

export function useAutoSave(
  canvasId: string | null,
  nodes: CanvasNode[],
  edges: Edge[]
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastSavedRef = useRef<string>("");

  const save = useCallback(
    async (currentNodes: CanvasNode[], currentEdges: Edge[]) => {
      if (!canvasId || savingRef.current) return;

      const snapshot = JSON.stringify({ nodes: currentNodes, edges: currentEdges });
      if (snapshot === lastSavedRef.current) return;

      savingRef.current = true;
      setStatus("saving");

      try {
        const supabase = createClient();

        // Full-replace strategy: delete all, then re-insert.
        // Safe at 30-node scale.
        const { error: delNodesErr } = await supabase
          .from("canvas_nodes")
          .delete()
          .eq("canvas_id", canvasId);

        if (delNodesErr) throw delNodesErr;

        // Edges are cascade-deleted with nodes, but explicitly clear them
        // in case there were orphaned edges.
        const { error: delEdgesErr } = await supabase
          .from("canvas_edges")
          .delete()
          .eq("canvas_id", canvasId);

        if (delEdgesErr) throw delEdgesErr;

        // Insert nodes
        if (currentNodes.length > 0) {
          const dbNodes = currentNodes.map((n, i) =>
            clientNodeToDb(n, canvasId, i)
          );
          const { error: insertNodesErr } = await supabase
            .from("canvas_nodes")
            .insert(dbNodes);

          if (insertNodesErr) throw insertNodesErr;
        }

        // Insert edges (need node IDs to exist first)
        if (currentEdges.length > 0) {
          const dbEdges = currentEdges.map((e) =>
            clientEdgeToDb(e, canvasId)
          );
          const { error: insertEdgesErr } = await supabase
            .from("canvas_edges")
            .insert(dbEdges);

          if (insertEdgesErr) throw insertEdgesErr;
        }

        lastSavedRef.current = snapshot;
        setStatus("saved");

        // Reset to idle after a moment
        setTimeout(() => setStatus("idle"), 2000);
      } catch (err) {
        console.error("Auto-save failed:", err);
        setStatus("error");
      } finally {
        savingRef.current = false;
      }
    },
    [canvasId]
  );

  // Debounced watcher
  useEffect(() => {
    if (!canvasId) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      save(nodes, edges);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [canvasId, nodes, edges, save]);

  return status;
}
