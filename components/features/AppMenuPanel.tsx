"use client";

import { useState, useRef, useEffect } from "react";
import { Keyboard, Plus, LogOut, Pencil, Sun, Moon, MoreVertical, Globe, Lock, Code, Trash2, Lightbulb } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

type CanvasListItem = { id: string; title: string; visibility: "private" | "public" };

type AppMenuPanelProps = {
  displayName: string;
  userEmail: string;
  canvasTitle: string;
  onTitleChange: (title: string) => void;
  reflectionMode: boolean;
  onReflectionModeChange: (v: boolean) => void;
  onShowShortcuts: () => void;
  onShowOnboarding?: () => void;
  canvasList?: CanvasListItem[];
  currentCanvasId?: string;
  profileId?: string;
  onVisibilityChange?: (canvasId: string, visibility: "private" | "public") => void;
  onDeleteCanvas?: (canvasId: string) => void;
};

function SimpleToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      className="tc-app-menu__toggle"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        background: checked ? "var(--accent-default)" : "var(--border-default)",
        position: "relative",
        cursor: "pointer",
        border: "none",
        padding: 0,
        flexShrink: 0,
        transition: "background var(--motion-duration-small) var(--motion-easing-out)",
      }}
    >
      <div
        className="tc-app-menu__toggle-knob"
        style={{
          position: "absolute",
          top: 2,
          left: checked ? "calc(100% - 16px)" : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "white",
          transition: "left var(--motion-duration-small) var(--motion-easing-out)",
        }}
      />
    </button>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--font-size-sm)",
  textAlign: "left" as const,
  transition: "background var(--motion-duration-small) var(--motion-easing-out)",
};

const dropdownItemStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--font-size-xs)",
  textAlign: "left" as const,
  transition: "background var(--motion-duration-small) var(--motion-easing-out)",
  whiteSpace: "nowrap" as const,
};

// ---------------------------------------------------------------------------
// CanvasKebabMenu
// ---------------------------------------------------------------------------

function CanvasKebabMenu({
  canvas,
  isCurrent,
  onVisibilityChange,
  onDeleteCanvas,
}: {
  canvas: CanvasListItem;
  isCurrent: boolean;
  onVisibilityChange?: (canvasId: string, visibility: "private" | "public") => void;
  onDeleteCanvas?: (canvasId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embedTheme, setEmbedTheme] = useState<"dark" | "light">("dark");
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setCopied(false);
      return;
    }
    function onPointerDown(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  function toggleVisibility() {
    const next = canvas.visibility === "public" ? "private" : "public";
    onVisibilityChange?.(canvas.id, next);
    setOpen(false);
  }

  function copyEmbedCode() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<iframe src="${origin}/embed/${canvas.id}?theme=${embedTheme}" width="100%" height="500" style="border:none;border-radius:8px;" loading="lazy"></iframe>`;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
    });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDeleteCanvas?.(canvas.id);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={`Options for ${canvas.title || "Untitled"}`}
        style={{
          width: 24,
          height: 24,
          borderRadius: "var(--radius-sm)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-tertiary)",
          flexShrink: 0,
          transition: "background var(--motion-duration-small) var(--motion-easing-out), color var(--motion-duration-small) var(--motion-easing-out)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
        }}
      >
        <MoreVertical size={13} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="tc-app-menu__kebab-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 180,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: 4,
            zIndex: 400,
            animation: "panelIn 100ms ease-out both",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Visibility toggle */}
          <button
            onClick={toggleVisibility}
            style={dropdownItemStyle}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {canvas.visibility === "public" ? <Lock size={12} /> : <Globe size={12} />}
            {canvas.visibility === "public" ? "Make private" : "Make public"}
          </button>

          {/* Embed section (only when public) */}
          {canvas.visibility === "public" && (
            <>
              {/* Embed theme selector */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-tertiary)",
                    marginRight: "auto",
                  }}
                >
                  Embed theme
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setEmbedTheme("dark"); }}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-xs)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid",
                    borderColor: embedTheme === "dark" ? "var(--accent-default)" : "var(--border-subtle)",
                    background: embedTheme === "dark" ? "var(--accent-default)" : "transparent",
                    color: embedTheme === "dark" ? "var(--text-inverse)" : "var(--text-tertiary)",
                    cursor: "pointer",
                    transition: "all var(--motion-duration-small) var(--motion-easing-out)",
                  }}
                >
                  Dark
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEmbedTheme("light"); }}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-xs)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid",
                    borderColor: embedTheme === "light" ? "var(--accent-default)" : "var(--border-subtle)",
                    background: embedTheme === "light" ? "var(--accent-default)" : "transparent",
                    color: embedTheme === "light" ? "var(--text-inverse)" : "var(--text-tertiary)",
                    cursor: "pointer",
                    transition: "all var(--motion-duration-small) var(--motion-easing-out)",
                  }}
                >
                  Light
                </button>
              </div>
              <button
                onClick={copyEmbedCode}
                style={dropdownItemStyle}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Code size={12} />
                {copied ? "Copied!" : "Copy embed code"}
              </button>
            </>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />

          {/* Delete */}
          <button
            onClick={handleDelete}
            style={{
              ...dropdownItemStyle,
              color: confirmDelete ? "var(--destructive-default)" : "var(--text-tertiary)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Trash2 size={12} />
            {confirmDelete ? "Click again to confirm" : "Delete canvas"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppMenuPanel
// ---------------------------------------------------------------------------

export function AppMenuPanel({
  displayName,
  userEmail,
  canvasTitle,
  onTitleChange,
  reflectionMode,
  onReflectionModeChange,
  onShowShortcuts,
  onShowOnboarding,
  canvasList,
  currentCanvasId,
  profileId,
  onVisibilityChange,
  onDeleteCanvas,
}: AppMenuPanelProps) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get("menu") === "1");
  const [titleValue, setTitleValue] = useState(canvasTitle);
  const [theme, setLocalTheme] = useState<Theme>("dark");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    setLocalTheme(getTheme());
  }, []);

  // Clean menu param from URL after mount
  useEffect(() => {
    if (searchParams.get("menu") === "1") {
      const url = new URL(window.location.href);
      url.searchParams.delete("menu");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // Sync title from props
  useEffect(() => {
    setTitleValue(canvasTitle);
  }, [canvasTitle]);

  // Close on outside click or Esc
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initials = (displayName || userEmail)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "U";

  async function handleNewCanvas() {
    if (!profileId) return;
    if (canvasList && canvasList.length >= 2) {
      return; // Limit reached
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("canvases")
      .insert({ owner_id: profileId, title: "Untitled" })
      .select("id")
      .single();

    if (!error && data) {
      router.push(`/canvas?id=${data.id}`);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  function switchCanvas(id: string) {
    if (id === currentCanvasId) return;
    router.push(`/canvas?id=${id}&menu=1`);
  }

  return (
    <div
      className="tc-app-menu"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 300,
      }}
    >
      {/* Avatar button */}
      <button
        className="tc-app-menu__avatar"
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open app menu"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--surface-raised)",
          border: `1.5px solid ${open ? "var(--accent-default)" : "var(--border-default)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          transition: "border-color var(--motion-duration-small) var(--motion-easing-out)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {initials}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="tc-app-menu__panel"
          ref={panelRef}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            animation: "panelIn 140ms ease-out both",
          }}
        >
          {/* Signed in as */}
          <div
            className="tc-app-menu__user-section"
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                color: "var(--text-tertiary)",
                letterSpacing: "var(--letter-spacing-wide)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Signed in as
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-xs)",
                color: "var(--text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {userEmail}
            </p>
          </div>

          {/* Canvas title */}
          <div
            className="tc-app-menu__title-section"
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="tc-app-menu__title-label"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-wide)",
                marginBottom: 8,
              }}
            >
              Canvas
            </p>
            <div style={{ position: "relative" }}>
              <input
                className="tc-app-menu__title-input"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={() => onTitleChange(titleValue.trim() || "Untitled")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Untitled"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--font-size-md)",
                  fontWeight: 500,
                  padding: "4px 20px 4px 0",
                  outline: "none",
                }}
              />
              <Pencil
                size={12}
                style={{
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-tertiary)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Canvas list (if multiple canvases) */}
          {canvasList && canvasList.length > 0 && (
            <div
              className="tc-app-menu__canvas-list"
              style={{
                padding: "8px 20px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wide)",
                  marginBottom: 6,
                }}
              >
                Your canvases
              </p>
              {canvasList.map((c) => (
                <div
                  key={c.id}
                  className="tc-app-menu__canvas-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <button
                    onClick={() => switchCanvas(c.id)}
                    style={{
                      ...menuItemStyle,
                      padding: "8px 4px",
                      flex: "1 1 auto",
                      minWidth: 0,
                      color:
                        c.id === currentCanvasId
                          ? "var(--accent-default)"
                          : "var(--text-secondary)",
                      fontWeight: c.id === currentCanvasId ? 500 : 400,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--surface-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 auto", minWidth: 0 }}>
                      {c.title || "Untitled"}
                    </span>
                    {c.visibility === "public" && (
                      <Globe
                        size={11}
                        style={{
                          flexShrink: 0,
                          color: "var(--text-tertiary)",
                          marginLeft: 4,
                        }}
                      />
                    )}
                  </button>
                  <CanvasKebabMenu
                    canvas={c}
                    isCurrent={c.id === currentCanvasId}
                    onVisibilityChange={onVisibilityChange}
                    onDeleteCanvas={onDeleteCanvas}
                  />
                </div>
              ))}
              {canvasList.length < 2 && (
                <button
                  onClick={handleNewCanvas}
                  style={{
                    ...menuItemStyle,
                    padding: "8px 4px",
                    color: "var(--text-tertiary)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--surface-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  <Plus size={14} />
                  New canvas
                </button>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="tc-app-menu__settings" style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            {/* Reflection mode */}
            <div
              className="tc-app-menu__toggle-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
              }}
            >
              <div className="tc-app-menu__toggle-text">
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  Reflection Mode
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Prompt on every paste
                </p>
              </div>
              <SimpleToggle
                checked={reflectionMode}
                onChange={onReflectionModeChange}
                label="Toggle reflection mode"
              />
            </div>

            {/* Theme toggle */}
            <div
              className="tc-app-menu__toggle-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
              }}
            >
              <div className="tc-app-menu__toggle-text" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {theme === "dark" ? <Moon size={14} style={{ color: "var(--text-tertiary)" }} /> : <Sun size={14} style={{ color: "var(--text-tertiary)" }} />}
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-primary)",
                  }}
                >
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </p>
              </div>
              <SimpleToggle
                checked={theme === "light"}
                onChange={(v) => {
                  const next: Theme = v ? "light" : "dark";
                  setTheme(next);
                  setLocalTheme(next);
                  // Persist to profile
                  if (profileId) {
                    const supabase = createClient();
                    supabase.from("profiles").update({ theme: next }).eq("id", profileId).then();
                  }
                }}
                label="Toggle theme"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="tc-app-menu__actions" style={{ padding: "8px" }}>
            <button
              className="tc-app-menu__action"
              onClick={() => { setOpen(false); onShowShortcuts(); }}
              style={menuItemStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Keyboard size={14} />
              Keyboard shortcuts
            </button>
            <button
              className="tc-app-menu__action"
              onClick={() => { setOpen(false); onShowOnboarding?.(); }}
              style={menuItemStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Lightbulb size={14} />
              Show onboarding
            </button>
            <button
              className="tc-app-menu__action tc-app-menu__action--signout"
              onClick={handleSignOut}
              style={{
                ...menuItemStyle,
                color: "var(--text-tertiary)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
