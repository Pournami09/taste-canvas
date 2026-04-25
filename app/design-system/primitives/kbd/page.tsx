import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Kbd } from "@/components/primitives/Kbd";

export default function KbdPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Kbd</h1>
      <p className="text-sm text-text-secondary mb-8">
        Keyboard key indicator for shortcut references.
      </p>

      <ComponentPreview label="Examples">
        <Kbd>Cmd</Kbd>
        <Kbd>K</Kbd>
        <span className="flex items-center gap-1 text-text-secondary text-sm">
          <Kbd>Cmd</Kbd>
          <span>+</span>
          <Kbd>V</Kbd>
        </span>
        <span className="flex items-center gap-1 text-text-secondary text-sm">
          <Kbd>Esc</Kbd>
        </span>
        <span className="flex items-center gap-1 text-text-secondary text-sm">
          <Kbd>Cmd</Kbd>
          <span>+</span>
          <Kbd>Z</Kbd>
        </span>
      </ComponentPreview>
    </div>
  );
}
