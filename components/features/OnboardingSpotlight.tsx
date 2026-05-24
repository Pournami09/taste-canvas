"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ClipboardPaste, Plus, LayoutDashboard, Code } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TooltipPosition = "top" | "bottom" | "left" | "right";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector: string;
  fallbackSelector?: string;
  tooltipPosition: TooltipPosition;
  spotlightPadding: number;
  requiresMenu?: boolean;
  /** Also open the kebab (three-dot) dropdown on the first canvas row. */
  requiresKebab?: boolean;
  /** Skip the scrim overlay for this step. */
  noScrim?: boolean;
  /** Do not apply any outline highlight to the target element. */
  noHighlight?: boolean;
  /** Let pointer events pass through the cutout so the user can interact with the target. */
  allowInteraction?: boolean;
};

type OnboardingSpotlightProps = {
  onComplete: () => void;
};

// ---------------------------------------------------------------------------
// Step definitions (ordered to minimize menu transitions:
// non-menu steps first, then menu steps back-to-back)
// ---------------------------------------------------------------------------

const STEPS: OnboardingStep[] = [
  {
    id: "paste",
    title: "Paste anything",
    description:
      "Add images, video links, and URLs with Cmd+V. Works in both canvas and grid views.",
    icon: <ClipboardPaste size={24} />,
    targetSelector: "",
    tooltipPosition: "bottom",
    spotlightPadding: 0,
    noScrim: true,
    noHighlight: true,
  },
  {
    id: "views",
    title: "Two ways to browse",
    description:
      "Switch between a spatial canvas and a tidy grid. Try clicking it!",
    icon: <LayoutDashboard size={24} />,
    targetSelector: ".tc-view-toggle__pill",
    tooltipPosition: "top",
    spotlightPadding: 10,
    allowInteraction: true,
  },
  {
    id: "canvases",
    title: "Create more canvases",
    description:
      "Each canvas is a collection. Create as many as you need for different themes.",
    icon: <Plus size={24} />,
    targetSelector: ".tc-app-menu__canvas-list",
    fallbackSelector: ".tc-app-menu__panel",
    tooltipPosition: "left",
    spotlightPadding: 6,
    requiresMenu: true,
  },
  {
    id: "embed",
    title: "Share your canvas",
    description:
      "Make a canvas public from this menu, then copy the embed code to share it anywhere.",
    icon: <Code size={24} />,
    targetSelector: ".tc-app-menu__kebab-dropdown",
    fallbackSelector: ".tc-app-menu__canvas-row",
    tooltipPosition: "left",
    spotlightPadding: 8,
    requiresMenu: true,
    requiresKebab: true,
  },
];

const TOOLTIP_W = 320;
const TOOLTIP_GAP = 12;
const VIEWPORT_MARGIN = 16;

// Easing tokens (matching the app's motion system)
const EASE_OUT = "cubic-bezier(0, 0, 0.2, 1)";

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function findTarget(step: OnboardingStep): HTMLElement | null {
  if (!step.targetSelector) return null;
  const el = document.querySelector(step.targetSelector) as HTMLElement | null;
  if (el) return el;
  if (step.fallbackSelector) {
    return document.querySelector(step.fallbackSelector) as HTMLElement | null;
  }
  return null;
}

function ensureMenuOpen() {
  if (!document.querySelector(".tc-app-menu__panel")) {
    (document.querySelector(".tc-app-menu__avatar") as HTMLElement | null)?.click();
  }
}

function ensureMenuClosed() {
  if (document.querySelector(".tc-app-menu__panel")) {
    (document.querySelector(".tc-app-menu__avatar") as HTMLElement | null)?.click();
  }
}

function openKebab() {
  const btn = document.querySelector(
    'button[aria-label^="Options for"]'
  ) as HTMLElement | null;
  if (btn && !document.querySelector(".tc-app-menu__kebab-dropdown")) {
    btn.click();
  }
}

function closeKebab() {
  if (document.querySelector(".tc-app-menu__kebab-dropdown")) {
    const btn = document.querySelector(
      'button[aria-label^="Options for"]'
    ) as HTMLElement | null;
    btn?.click();
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function computeSpotlight(
  rect: DOMRect,
  padding: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: rect.left - padding,
    y: rect.top - padding,
    w: rect.width + padding * 2,
    h: rect.height + padding * 2,
  };
}

function computeTooltipPosition(
  spotlight: { x: number; y: number; w: number; h: number } | null,
  preferred: TooltipPosition,
  tooltipHeight: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!spotlight) {
    return { top: vh / 2 - tooltipHeight / 2, left: vw / 2 - TOOLTIP_W / 2 };
  }

  const order: TooltipPosition[] = [preferred];
  if (preferred === "left") order.push("right", "bottom", "top");
  else if (preferred === "right") order.push("left", "bottom", "top");
  else if (preferred === "top") order.push("bottom", "left", "right");
  else order.push("top", "left", "right");

  for (const pos of order) {
    let top = 0;
    let left = 0;

    if (pos === "bottom") {
      top = spotlight.y + spotlight.h + TOOLTIP_GAP;
      left = spotlight.x + spotlight.w / 2 - TOOLTIP_W / 2;
    } else if (pos === "top") {
      top = spotlight.y - tooltipHeight - TOOLTIP_GAP;
      left = spotlight.x + spotlight.w / 2 - TOOLTIP_W / 2;
    } else if (pos === "left") {
      top = spotlight.y + spotlight.h / 2 - tooltipHeight / 2;
      left = spotlight.x - TOOLTIP_W - TOOLTIP_GAP;
    } else {
      top = spotlight.y + spotlight.h / 2 - tooltipHeight / 2;
      left = spotlight.x + spotlight.w + TOOLTIP_GAP;
    }

    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - TOOLTIP_W - VIEWPORT_MARGIN));
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - tooltipHeight - VIEWPORT_MARGIN));

    const fits =
      (pos === "bottom" && spotlight.y + spotlight.h + TOOLTIP_GAP + tooltipHeight < vh - VIEWPORT_MARGIN) ||
      (pos === "top" && spotlight.y - TOOLTIP_GAP - tooltipHeight > VIEWPORT_MARGIN) ||
      (pos === "left" && spotlight.x - TOOLTIP_GAP - TOOLTIP_W > VIEWPORT_MARGIN) ||
      (pos === "right" && spotlight.x + spotlight.w + TOOLTIP_GAP + TOOLTIP_W < vw - VIEWPORT_MARGIN);

    if (fits) return { top, left };
  }

  return {
    top: Math.min(spotlight.y + spotlight.h + TOOLTIP_GAP, vh - tooltipHeight - VIEWPORT_MARGIN),
    left: Math.max(VIEWPORT_MARGIN, Math.min(spotlight.x + spotlight.w / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - VIEWPORT_MARGIN)),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingSpotlight({ onComplete }: OnboardingSpotlightProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [ready, setReady] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);
  const highlightedRef = useRef<HTMLElement[]>([]);
  const pulsedRef = useRef<HTMLElement | null>(null);
  const currentStepRef = useRef(0);
  const completedRef = useRef(false);
  const measuredHeight = useRef(220);

  currentStepRef.current = currentStep;
  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  // -- Highlight: outline transitions in on target elements ------------------

  function applyHighlight(el: HTMLElement, s: OnboardingStep) {
    removeHighlight();
    if (s.noHighlight) return;

    // Start transparent, then transition to visible on the next frame.
    // Uses outline-color transition (200ms ease-out) to match the app's
    // entrance animation timing (--motion-duration-medium).
    el.style.outline = "2px solid transparent";
    el.style.outlineOffset = "4px";
    el.style.transition = `outline-color 200ms ${EASE_OUT}`;
    highlightedRef.current = [el];

    // Double rAF ensures the browser paints the transparent state first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (highlightedRef.current.includes(el)) {
          el.style.outlineColor = "var(--onboarding-spotlight-ring)";
        }
      });
    });
  }

  function removeHighlight() {
    for (const el of highlightedRef.current) {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.transition = "";
    }
    highlightedRef.current = [];
  }

  // -- Pulse: brief scale press on a button (simulated click feel) -----------

  function clearPulse() {
    if (pulsedRef.current) {
      pulsedRef.current.style.transform = "";
      pulsedRef.current.style.transition = "";
      pulsedRef.current = null;
    }
  }

  // -- Complete handler (idempotent) -----------------------------------------

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    removeHighlight();
    clearPulse();
    closeKebab();
    ensureMenuClosed();
    onComplete();
  }, [onComplete]);

  // -- Measure helper --------------------------------------------------------

  function measureAndShow(s: OnboardingStep) {
    const target = findTarget(s);
    if (target) {
      applyHighlight(target, s);
      const rect = target.getBoundingClientRect();
      const sp = computeSpotlight(rect, s.spotlightPadding);
      setSpotlight(sp);
      const h = tooltipRef.current?.offsetHeight || measuredHeight.current;
      setTooltipPos(computeTooltipPosition(sp, s.tooltipPosition, h));
    } else {
      setSpotlight(null);
      const h = tooltipRef.current?.offsetHeight || measuredHeight.current;
      setTooltipPos(computeTooltipPosition(null, s.tooltipPosition, h));
    }
    setReady(true);
  }

  // -- Step setup: choreographed animation sequence --------------------------
  //
  // Each step type has a distinct timing chain that mirrors how the UI
  // would animate if the user interacted with it directly:
  //
  // No-menu steps:    brief pause → highlight fades in + tooltip appears
  // Menu steps:       menu slides in (panelIn 140ms) → highlight fades in
  // Kebab steps:      menu settles → kebab button pulses → dropdown opens
  //                   (panelIn 100ms) → highlight fades in
  //
  // The highlight outline uses a 200ms CSS transition on outline-color
  // so it fades in rather than popping. The tooltip entrance uses the
  // existing overlayIn keyframe (200ms ease-out, scale 0.92 → 1).

  useEffect(() => {
    removeHighlight();
    clearPulse();
    setReady(false);

    const s = STEPS[currentStep];
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Close kebab if the new step does not need it
    if (!s.requiresKebab) {
      closeKebab();
    }

    // Manage menu state based on current step
    if (s.requiresMenu) {
      ensureMenuOpen();
    } else {
      ensureMenuClosed();
    }

    if (s.requiresKebab) {
      // Choreography: menu settles → pulse kebab → dropdown opens → show
      //
      // t=200ms  Menu has settled (panelIn 140ms + 60ms buffer).
      //          Apply scale(0.95) press to the kebab button.
      // t=320ms  Release press and click the button.
      //          Dropdown starts its panelIn (100ms).
      // t=380ms  Clean up pulse transition on the button.
      // t=500ms  Dropdown has settled. Measure target, fade in highlight,
      //          show tooltip.

      timers.push(setTimeout(() => {
        if (cancelled) return;
        const kebabBtn = document.querySelector(
          'button[aria-label^="Options for"]'
        ) as HTMLElement | null;
        if (kebabBtn) {
          pulsedRef.current = kebabBtn;
          kebabBtn.style.transition = `transform 80ms ${EASE_OUT}`;
          kebabBtn.style.transform = "scale(0.95)";
        }
      }, 200));

      timers.push(setTimeout(() => {
        if (cancelled) return;
        if (pulsedRef.current) {
          pulsedRef.current.style.transform = "";
        }
        openKebab();
      }, 320));

      timers.push(setTimeout(() => {
        if (cancelled) return;
        clearPulse();
      }, 400));

      timers.push(setTimeout(() => {
        if (cancelled) return;
        measureAndShow(s);
      }, 500));
    } else if (s.requiresMenu) {
      // Choreography: menu slides in → highlight fades in
      //
      // t=250ms  Menu has settled (panelIn 140ms + 110ms buffer).
      //          Measure target, fade in highlight, show tooltip.

      timers.push(setTimeout(() => {
        if (cancelled) return;
        measureAndShow(s);
      }, 250));
    } else {
      // Choreography: brief pause for previous step to fade out,
      // then highlight fades in alongside tooltip.
      //
      // t=150ms  Measure target, fade in highlight, show tooltip.

      timers.push(setTimeout(() => {
        if (cancelled) return;
        measureAndShow(s);
      }, 150));
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      removeHighlight();
      clearPulse();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // -- Re-measure on resize -------------------------------------------------

  useEffect(() => {
    function onResize() {
      const s = STEPS[currentStepRef.current];
      const target = findTarget(s);
      if (target) {
        const rect = target.getBoundingClientRect();
        const sp = computeSpotlight(rect, s.spotlightPadding);
        setSpotlight(sp);
        const h = tooltipRef.current?.offsetHeight || measuredHeight.current;
        setTooltipPos(computeTooltipPosition(sp, s.tooltipPosition, h));
      } else {
        setSpotlight(null);
        const h = tooltipRef.current?.offsetHeight || measuredHeight.current;
        setTooltipPos(computeTooltipPosition(null, s.tooltipPosition, h));
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // -- Track tooltip height --------------------------------------------------

  useEffect(() => {
    if (tooltipRef.current) {
      const h = tooltipRef.current.offsetHeight;
      if (h > 0) measuredHeight.current = h;
    }
  });

  // -- Auto-focus Next button on step change ---------------------------------

  useEffect(() => {
    const timer = setTimeout(() => nextBtnRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // -- Keyboard handling -----------------------------------------------------

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleComplete();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentStepRef.current === STEPS.length - 1) handleComplete();
        else setCurrentStep((s) => s + 1);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentStepRef.current > 0) setCurrentStep((s) => s - 1);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (document.activeElement === nextBtnRef.current) skipBtnRef.current?.focus();
        else nextBtnRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [handleComplete]);

  // -- Cleanup on unmount ----------------------------------------------------

  useEffect(() => {
    return () => {
      if (!completedRef.current) {
        removeHighlight();
        clearPulse();
        closeKebab();
        ensureMenuClosed();
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const showScrim = !step.noScrim;
  const interactive = step.allowInteraction;

  return (
    <div
      className="tc-onboarding"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        opacity: ready ? 1 : 0,
        transition: `opacity 200ms ${EASE_OUT}`,
        pointerEvents: interactive ? "none" : "auto",
      }}
    >
      {/* Scrim (purely visual; does not dismiss on click) */}
      {showScrim && spotlight ? (
        <ScrimWithCutout spotlight={spotlight} />
      ) : showScrim ? (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--onboarding-scrim)",
            pointerEvents: "auto",
          }}
        />
      ) : null}

      {/* Tooltip card */}
      {tooltipPos && (
        <div
          key={currentStep}
          ref={tooltipRef}
          className="tc-onboarding__tooltip"
          style={{
            position: "fixed",
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: TOOLTIP_W,
            background: "var(--onboarding-tooltip-bg)",
            border: "1px solid var(--onboarding-tooltip-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--onboarding-tooltip-shadow)",
            padding: 24,
            animation: `overlayIn 200ms ${EASE_OUT} both`,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            pointerEvents: "auto",
          }}
        >
          {/* Step counter */}
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-tertiary)",
              letterSpacing: "var(--letter-spacing-wide)",
              textTransform: "uppercase",
            }}
          >
            Step {currentStep + 1} of {STEPS.length}
          </p>

          {/* Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: "var(--accent-default)", flexShrink: 0 }}>
              {step.icon}
            </div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-md)",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {step.title}
            </p>
          </div>

          {/* Description */}
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              fontWeight: 400,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
            }}
          >
            {step.description}
          </p>

          {/* Step dots */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background:
                    i === currentStep
                      ? "var(--onboarding-dot-active)"
                      : "var(--onboarding-dot-inactive)",
                  transition: "background 200ms ease",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              ref={skipBtnRef}
              onClick={handleComplete}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-sm)",
                color: "var(--text-tertiary)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                transition: "color 150ms ease, background 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                (e.currentTarget as HTMLElement).style.background = "var(--surface-subtle)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.outline = "2px solid var(--border-focus)";
                (e.currentTarget as HTMLElement).style.outlineOffset = "2px";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.outline = "none";
              }}
            >
              Skip tour
            </button>
            <button
              ref={nextBtnRef}
              onClick={() => {
                if (isLast) handleComplete();
                else setCurrentStep((s) => s + 1);
              }}
              style={{
                background: "var(--accent-default)",
                color: "var(--text-inverse)",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 500,
                padding: "8px 20px",
                borderRadius: "var(--radius-sm)",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--accent-default)";
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.outline = "2px solid var(--border-focus)";
                (e.currentTarget as HTMLElement).style.outlineOffset = "2px";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.outline = "none";
              }}
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scrim with cutout: four overlay divs around the spotlight rectangle.
// pointerDown is stopped to prevent AppMenuPanel's outside-click handler
// from closing the menu during onboarding. The scrim does NOT dismiss on
// click; only "Skip tour", "Got it", and Escape dismiss the tour.
// ---------------------------------------------------------------------------

function ScrimWithCutout({
  spotlight,
}: {
  spotlight: { x: number; y: number; w: number; h: number };
}) {
  const base: React.CSSProperties = {
    position: "fixed",
    background: "var(--onboarding-scrim)",
    pointerEvents: "auto",
  };
  const { x, y, w, h } = spotlight;

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
  }

  return (
    <>
      {/* Top */}
      <div
        onPointerDown={handlePointerDown}
        style={{ ...base, top: 0, left: 0, right: 0, height: Math.max(0, y) }}
      />
      {/* Bottom */}
      <div
        onPointerDown={handlePointerDown}
        style={{ ...base, top: y + h, left: 0, right: 0, bottom: 0 }}
      />
      {/* Left */}
      <div
        onPointerDown={handlePointerDown}
        style={{ ...base, top: y, left: 0, width: Math.max(0, x), height: h }}
      />
      {/* Right */}
      <div
        onPointerDown={handlePointerDown}
        style={{ ...base, top: y, left: x + w, right: 0, height: h }}
      />
    </>
  );
}
