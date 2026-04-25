"use client";

import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
export default function DropdownMenuPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">DropdownMenu</h1>
      <p className="text-sm text-text-secondary mb-8">
        Base UI dropdown. Opens on click, closes on item select or Esc.
      </p>

      <ComponentPreview label="Example">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border-default bg-surface-raised px-4 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle">
            Open menu
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Canvas</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Share</DropdownMenuItem>
            <DropdownMenuItem>Rename</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive-default focus:text-destructive-default">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ComponentPreview>
    </div>
  );
}
