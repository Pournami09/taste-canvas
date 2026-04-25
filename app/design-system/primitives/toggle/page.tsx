"use client";

import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

function SwitchDemo({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Switch checked={checked} onCheckedChange={setChecked} id={label} />
      <label htmlFor={label} className="text-sm text-text-secondary cursor-pointer">
        {label}
      </label>
    </div>
  );
}

export default function TogglePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Toggle</h1>
      <p className="text-sm text-text-secondary mb-8">
        Radix-powered Switch. Click or Space to toggle. Fully keyboard accessible.
      </p>

      <ComponentPreview label="Examples" className="flex-col items-start gap-3">
        <SwitchDemo label="Reflection Mode" />
        <SwitchDemo label="Dark Mode" />
      </ComponentPreview>
    </div>
  );
}
