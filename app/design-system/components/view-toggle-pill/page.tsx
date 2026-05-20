"use client";

import { useState } from "react";
import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { ViewTogglePill, type View } from "@/components/features/ViewTogglePill";

export default function ViewTogglePillPage() {
  const [view, setView] = useState<View>("canvas");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">ViewTogglePill</h1>
      <p className="text-sm text-text-secondary mb-8">
        Switches between Canvas and Grid layouts. Pill-shaped container with two toggle buttons.
        Active state gets an elevated background. Keyboard accessible via Tab and Enter/Space.
      </p>

      <ComponentPreview label="Canvas active">
        <ViewTogglePill value="canvas" onChange={() => {}} />
      </ComponentPreview>

      <ComponentPreview label="Grid active">
        <ViewTogglePill value="grid" onChange={() => {}} />
      </ComponentPreview>

      <ComponentPreview label="Interactive">
        <div className="flex flex-col items-center gap-4">
          <ViewTogglePill value={view} onChange={setView} />
          <p className="font-mono text-xs text-text-tertiary">
            Current view: {view}
          </p>
        </div>
      </ComponentPreview>
    </div>
  );
}
