"use client";

import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/primitives/Button";

export default function ToastPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Toast</h1>
      <p className="text-sm text-text-secondary mb-8">
        Sonner-powered toasts. Fire-and-forget notifications with optional actions.
      </p>

      <ComponentPreview label="Trigger toasts">
        <Button variant="secondary" onClick={() => toast("Node added to canvas.")}>
          Default
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.success("Canvas saved.", { description: "All changes persisted." })
          }
        >
          Success
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.error("Couldn't load preview.", {
              action: { label: "Retry", onClick: () => {} },
            })
          }
        >
          Error
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast("Node deleted.", {
              action: { label: "Undo", onClick: () => toast("Restored.") },
            })
          }
        >
          With action
        </Button>
      </ComponentPreview>
      <Toaster />
    </div>
  );
}
