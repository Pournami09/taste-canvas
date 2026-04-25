"use client";

import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/primitives/Button";

export default function DialogPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Dialog</h1>
      <p className="text-sm text-text-secondary mb-8">
        Base UI modal. Focus-trapped, closes on Esc or outside click.
      </p>

      <ComponentPreview label="Example">
        <Dialog>
          <DialogTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border-default bg-surface-raised px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle">
            Open dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete canvas?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. All nodes and annotations will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">Cancel</Button>
              <Button variant="destructive">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ComponentPreview>
    </div>
  );
}
