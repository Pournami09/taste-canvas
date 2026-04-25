import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Input, Textarea } from "@/components/primitives/Input";

export default function InputPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Input</h1>
      <p className="text-sm text-text-secondary mb-8">
        Text input and textarea. Supports label, placeholder, error state, and disabled.
      </p>

      <ComponentPreview label="Text input" className="flex-col items-start">
        <div className="w-full max-w-xs">
          <Input label="Label" placeholder="Placeholder text" />
        </div>
        <div className="w-full max-w-xs">
          <Input label="With value" defaultValue="Hello world" />
        </div>
        <div className="w-full max-w-xs">
          <Input label="Error state" defaultValue="bad input" error="This field is required." />
        </div>
        <div className="w-full max-w-xs">
          <Input label="Disabled" disabled defaultValue="Cannot edit" />
        </div>
      </ComponentPreview>

      <ComponentPreview label="Textarea" className="flex-col items-start">
        <div className="w-full max-w-xs">
          <Textarea label="Notes" placeholder="Write something..." rows={3} />
        </div>
      </ComponentPreview>
    </div>
  );
}
