"use client";

import { useState, useMemo } from "react";
import { ChevronRight, Bookmark, Globe, AlertCircle } from "lucide-react";
import type { BookmarkFolder, BookmarkItem } from "@/lib/parse-bookmarks";
import { flattenFolder } from "@/lib/parse-bookmarks";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type BookmarkImportDialogProps = {
  tree: BookmarkFolder;
  existingUrls: Set<string>;
  remainingCap: number;
  onConfirm: (items: BookmarkItem[]) => void;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Returns all valid (non-existing) items from a folder recursively
function validItems(folder: BookmarkFolder, existingUrls: Set<string>): BookmarkItem[] {
  return flattenFolder(folder).filter((item) => !existingUrls.has(item.url));
}

// Checkbox state: "all" | "none" | "some"
type CheckState = "all" | "none" | "some";

function folderCheckState(
  folder: BookmarkFolder,
  selected: Set<string>,
  existingUrls: Set<string>
): CheckState {
  const valid = validItems(folder, existingUrls);
  if (valid.length === 0) return "none";
  const selectedCount = valid.filter((i) => selected.has(i.url)).length;
  if (selectedCount === 0) return "none";
  if (selectedCount === valid.length) return "all";
  return "some";
}

// ---------------------------------------------------------------------------
// TriStateCheckbox
// ---------------------------------------------------------------------------

function TriStateCheckbox({
  state,
  disabled,
  onChange,
}: {
  state: CheckState;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={state === "some" ? "mixed" : state === "all"}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: 16,
        height: 16,
        flexShrink: 0,
        borderRadius: "var(--radius-xs)",
        border: `1.5px solid ${state === "all" ? "var(--accent-default)" : "var(--border-default)"}`,
        background: state === "all" ? "var(--accent-default)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        padding: 0,
        transition: "background var(--motion-duration-small) var(--motion-easing-out), border-color var(--motion-duration-small) var(--motion-easing-out)",
      }}
    >
      {state === "all" && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="var(--text-inverse)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {state === "some" && (
        <div style={{ width: 8, height: 2, background: "var(--accent-default)", borderRadius: 1 }} />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ItemRow
// ---------------------------------------------------------------------------

function ItemRow({
  item,
  isExisting,
  isSelected,
  isDisabled,
  onToggle,
}: {
  item: BookmarkItem;
  isExisting: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}) {
  const domain = getDomain(item.url);

  return (
    <div
      className="tc-bm-item"
      onClick={!isExisting && !isDisabled ? onToggle : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px 6px 28px",
        borderRadius: "var(--radius-sm)",
        cursor: isExisting || isDisabled ? "default" : "pointer",
        opacity: isExisting ? 0.4 : 1,
        transition: "background var(--motion-duration-small) var(--motion-easing-out)",
      }}
      onMouseEnter={(e) => {
        if (!isExisting && !isDisabled) {
          (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {isExisting ? (
        <div style={{ width: 16, height: 16, flexShrink: 0 }} />
      ) : (
        <TriStateCheckbox
          state={isSelected ? "all" : "none"}
          disabled={isDisabled && !isSelected}
          onChange={onToggle}
        />
      )}

      <Globe size={12} style={{ flexShrink: 0, color: "var(--text-tertiary)" }} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 1,
          }}
        >
          {item.title || domain}
        </p>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-xs)",
            color: "var(--text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {isExisting ? "Already on canvas" : domain}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FolderRow
// ---------------------------------------------------------------------------

function FolderRow({
  folder,
  existingUrls,
  selected,
  remainingCap,
  onToggleFolder,
  onToggleItem,
}: {
  folder: BookmarkFolder;
  existingUrls: Set<string>;
  selected: Set<string>;
  remainingCap: number;
  onToggleFolder: (folder: BookmarkFolder) => void;
  onToggleItem: (item: BookmarkItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const valid = useMemo(() => validItems(folder, existingUrls), [folder, existingUrls]);
  const checkState = folderCheckState(folder, selected, existingUrls);
  const totalCount = flattenFolder(folder).length;
  const existingCount = flattenFolder(folder).filter((i) => existingUrls.has(i.url)).length;
  const selectedCount = valid.filter((i) => selected.has(i.url)).length;
  const hasValid = valid.length > 0;

  // A folder checkbox is "disabled for adding more" only when cap is full
  // and not all items are already selected (so user can still deselect)
  const capFull = remainingCap <= 0;

  return (
    <div className="tc-bm-folder">
      {/* Folder header */}
      <div
        className="tc-bm-folder__header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 8px",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          transition: "background var(--motion-duration-small) var(--motion-easing-out)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        onClick={() => setExpanded((v) => !v)}
      >
        <TriStateCheckbox
          state={checkState}
          disabled={!hasValid || (capFull && checkState === "none")}
          onChange={() => { if (hasValid) onToggleFolder(folder); }}
        />

        <ChevronRight
          size={13}
          style={{
            flexShrink: 0,
            color: "var(--text-tertiary)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform var(--motion-duration-small) var(--motion-easing-out)",
          }}
        />

        <Bookmark size={13} style={{ flexShrink: 0, color: "var(--text-secondary)" }} />

        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--text-primary)",
            fontWeight: 500,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {folder.name}
        </span>

        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-xs)",
            color: selectedCount > 0 ? "var(--accent-default)" : "var(--text-tertiary)",
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          {selectedCount > 0
            ? `${selectedCount}/${totalCount - existingCount}`
            : `${totalCount - existingCount}`}
        </span>
      </div>

      {/* Folder items */}
      {expanded && (
        <div className="tc-bm-folder__items">
          {/* Direct items */}
          {folder.items.map((item) => {
            const isExisting = existingUrls.has(item.url);
            const isSelected = selected.has(item.url);
            const isDisabled = !isExisting && capFull && !isSelected;
            return (
              <ItemRow
                key={item.url}
                item={item}
                isExisting={isExisting}
                isSelected={isSelected}
                isDisabled={isDisabled}
                onToggle={() => onToggleItem(item)}
              />
            );
          })}

          {/* Nested child folders */}
          {folder.children.map((child) => (
            <div key={child.name} style={{ paddingLeft: 20 }}>
              <FolderRow
                folder={child}
                existingUrls={existingUrls}
                selected={selected}
                remainingCap={remainingCap}
                onToggleFolder={onToggleFolder}
                onToggleItem={onToggleItem}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BookmarkImportDialog
// ---------------------------------------------------------------------------

export function BookmarkImportDialog({
  tree,
  existingUrls,
  remainingCap,
  onConfirm,
  onClose,
}: BookmarkImportDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allTopLevelFolders = [
    // Surface direct items of the root as a virtual "Uncategorised" folder only if they exist
    ...(tree.items.length > 0
      ? [{ name: "Uncategorised", items: tree.items, children: [] } as BookmarkFolder]
      : []),
    ...tree.children,
  ];

  const isEmpty = allTopLevelFolders.length === 0;
  const selectedCount = selected.size;
  const atCap = remainingCap <= 0;
  const overCap = selectedCount > remainingCap;
  const canImport = selectedCount > 0 && !overCap;

  function toggleItem(item: BookmarkItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.url)) {
        next.delete(item.url);
      } else {
        // Only add if below cap
        if (next.size < remainingCap) {
          next.add(item.url);
        }
      }
      return next;
    });
  }

  function toggleFolder(folder: BookmarkFolder) {
    const valid = validItems(folder, existingUrls);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = valid.every((i) => next.has(i.url));
      if (allSelected) {
        // Deselect all
        valid.forEach((i) => next.delete(i.url));
      } else {
        // Select as many as the cap allows
        for (const item of valid) {
          if (next.size >= remainingCap) break;
          next.add(item.url);
        }
      }
      return next;
    });
  }

  function handleConfirm() {
    const allItems = flattenFolder(tree);
    const toImport = allItems.filter((i) => selected.has(i.url));
    onConfirm(toImport);
  }

  // Current remaining after selection
  const slotsLeft = remainingCap - selectedCount;

  return (
    // Backdrop
    <div
      className="tc-bm-dialog__backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="tc-bm-dialog"
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          animation: "panelIn 140ms ease-out both",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-md)",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Import bookmarks
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            {isEmpty
              ? "No valid bookmarks found in this file."
              : atCap
              ? "Canvas is at capacity. Remove nodes before importing."
              : `Select folders or individual links to add to the canvas. ${remainingCap} slot${remainingCap === 1 ? "" : "s"} available.`}
          </p>
        </div>

        {/* Body */}
        {!isEmpty && !atCap && (
          <div
            className="tc-bm-dialog__body"
            style={{
              overflowY: "auto",
              flex: 1,
              padding: "8px 12px",
            }}
          >
            {allTopLevelFolders.map((folder) => (
              <FolderRow
                key={folder.name}
                folder={folder}
                existingUrls={existingUrls}
                selected={selected}
                remainingCap={slotsLeft}
                onToggleFolder={toggleFolder}
                onToggleItem={toggleItem}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Capacity status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {slotsLeft === 0 && (
                  <AlertCircle size={13} style={{ flexShrink: 0, color: "var(--text-tertiary)" }} />
                )}
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-xs)",
                    color: slotsLeft === 0 ? "var(--text-secondary)" : "var(--text-tertiary)",
                  }}
                >
                  {selectedCount} selected{slotsLeft === 0
                    ? ". Canvas limit reached."
                    : `. ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} remaining.`}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-secondary)",
              background: "transparent",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              padding: "7px 16px",
              cursor: "pointer",
              transition: "background var(--motion-duration-small) var(--motion-easing-out)",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!canImport}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 500,
              color: canImport ? "var(--text-inverse)" : "var(--text-tertiary)",
              background: canImport ? "var(--accent-default)" : "var(--surface-subtle)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "7px 16px",
              cursor: canImport ? "pointer" : "not-allowed",
              transition: "background var(--motion-duration-small) var(--motion-easing-out)",
              flexShrink: 0,
            }}
          >
            {selectedCount > 0 ? `Import ${selectedCount} link${selectedCount === 1 ? "" : "s"}` : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
