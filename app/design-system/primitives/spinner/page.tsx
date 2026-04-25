import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Spinner } from "@/components/primitives/Spinner";

export default function SpinnerPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Spinner</h1>
      <p className="text-sm text-text-secondary mb-8">
        Loading indicator. Three sizes.
      </p>

      <ComponentPreview label="Sizes">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
      </ComponentPreview>
    </div>
  );
}
