import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function TooltipPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Tooltip</h1>
      <p className="text-sm text-text-secondary mb-8">
        Base UI tooltip. Appears on hover and keyboard focus.
      </p>

      <ComponentPreview label="Examples">
        <Tooltip>
          <TooltipTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border-default bg-surface-raised px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle">
            Hover me
          </TooltipTrigger>
          <TooltipContent>Helpful information</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary">
            And me
          </TooltipTrigger>
          <TooltipContent side="bottom">Appears below</TooltipContent>
        </Tooltip>
      </ComponentPreview>
    </div>
  );
}
