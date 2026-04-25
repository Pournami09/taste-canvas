import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { AnnotationCard } from "@/components/features/AnnotationCard";

export default function AnnotationCardPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">AnnotationCard</h1>
      <p className="text-sm text-text-secondary mb-8">
        The visual signature of the product. Glass surface, 5px radius, 16px padding, 289px wide. Click to edit inline. Cmd+Enter to save, Esc to cancel. Hover reveals HoverToolbar on the right.
      </p>

      <ComponentPreview
        label="Default (empty)"
        className="items-start py-12 overflow-visible"
        description="Hover to see the toolbar. Click to begin editing."
      >
        <AnnotationCard />
      </ComponentPreview>

      <ComponentPreview
        label="With content"
        className="items-start py-12 overflow-visible"
        description="Hover to see the toolbar. Click to edit inline."
      >
        <AnnotationCard
          initialBody="The restraint in the negative space is doing all the work. When you remove decoration, what's left has to earn its place."
        />
      </ComponentPreview>

      <ComponentPreview
        label="Read-only"
        className="items-start py-12"
        description="No toolbar, no edit affordance."
      >
        <AnnotationCard
          initialBody="Warmth comes from imprecision. The slight misalignment, the hand-drawn edge. Perfection reads as cold."
          readOnly
        />
      </ComponentPreview>
    </div>
  );
}
