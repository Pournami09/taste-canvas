import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Badge } from "@/components/primitives/Badge";

export default function BadgePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Badge</h1>
      <p className="text-sm text-text-secondary mb-8">
        Monospace caps label with four semantic variants.
      </p>

      <ComponentPreview label="Variants">
        <Badge variant="default">Default</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="success">Success</Badge>
      </ComponentPreview>
    </div>
  );
}
