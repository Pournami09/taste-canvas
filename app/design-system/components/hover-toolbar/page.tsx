import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { HoverToolbar } from "@/components/features/HoverToolbar";

export default function HoverToolbarPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">HoverToolbar</h1>
      <p className="text-sm text-text-secondary mb-8">
        Appears on node hover. Two layout variants: vertical-right (Canvas view) and horizontal-below (Grid view). 24px circular buttons with Edit and Open-link icons.
      </p>

      <ComponentPreview label="Vertical-right (Canvas view)">
        <div className="relative">
          <div className="w-48 h-32 rounded-md bg-surface-raised border border-border-subtle flex items-center justify-center text-sm text-text-tertiary">
            Node
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+12px)]">
            <HoverToolbar variant="vertical-right" />
          </div>
        </div>
      </ComponentPreview>

      <ComponentPreview label="Horizontal-below (Grid view)">
        <div className="relative">
          <div className="w-48 h-32 rounded-md bg-surface-raised border border-border-subtle flex items-center justify-center text-sm text-text-tertiary">
            Node
          </div>
          <div className="absolute top-[calc(100%+12px)] left-0">
            <HoverToolbar variant="horizontal-below" />
          </div>
        </div>
      </ComponentPreview>
    </div>
  );
}
