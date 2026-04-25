import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Skeleton } from "@/components/primitives/Skeleton";

export default function SkeletonPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Skeleton</h1>
      <p className="text-sm text-text-secondary mb-8">
        Loading placeholder with pulse animation. Three shape variants.
      </p>

      <ComponentPreview label="Variants" className="flex-col items-start gap-3">
        <div className="flex items-center gap-3 w-full">
          <Skeleton variant="circle" className="h-10 w-10 shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
        <Skeleton variant="rect" className="h-32 w-full" />
      </ComponentPreview>
    </div>
  );
}
