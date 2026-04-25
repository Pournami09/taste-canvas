import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Button } from "@/components/primitives/Button";

export default function ButtonPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Button</h1>
      <p className="text-sm text-text-secondary mb-8">
        Four variants (primary, secondary, ghost, destructive) at three sizes. Keyboard-focusable with visible focus ring.
      </p>

      <ComponentPreview label="Variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </ComponentPreview>

      <ComponentPreview label="Sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </ComponentPreview>

      <ComponentPreview label="Disabled">
        <Button variant="primary" disabled>Primary</Button>
        <Button variant="secondary" disabled>Secondary</Button>
        <Button variant="ghost" disabled>Ghost</Button>
      </ComponentPreview>
    </div>
  );
}
