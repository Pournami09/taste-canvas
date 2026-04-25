import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { IconButton } from "@/components/primitives/IconButton";
import { Pencil, Link2, X, Plus } from "lucide-react";

export default function IconButtonPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">IconButton</h1>
      <p className="text-sm text-text-secondary mb-8">
        Circular icon buttons. Requires aria-label for accessibility. Two variants, three sizes.
      </p>

      <ComponentPreview label="Default variant">
        <IconButton aria-label="Edit" size="sm"><Pencil size={12} /></IconButton>
        <IconButton aria-label="Link" size="md"><Link2 size={14} /></IconButton>
        <IconButton aria-label="Add" size="lg"><Plus size={18} /></IconButton>
      </ComponentPreview>

      <ComponentPreview label="Ghost variant">
        <IconButton aria-label="Edit" variant="ghost" size="sm"><Pencil size={12} /></IconButton>
        <IconButton aria-label="Close" variant="ghost" size="md"><X size={14} /></IconButton>
        <IconButton aria-label="Add" variant="ghost" size="lg"><Plus size={18} /></IconButton>
      </ComponentPreview>

      <ComponentPreview label="Disabled">
        <IconButton aria-label="Edit" disabled><Pencil size={14} /></IconButton>
      </ComponentPreview>
    </div>
  );
}
