"use client";

import { ComponentPreview } from "@/components/design-system/ComponentPreview";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function TabsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Tabs</h1>
      <p className="text-sm text-text-secondary mb-8">
        Radix-powered tabs. Keyboard navigable with arrow keys.
      </p>

      <ComponentPreview label="Default">
        <Tabs defaultValue="canvas" className="w-80">
          <TabsList>
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="grid">Grid</TabsTrigger>
          </TabsList>
          <TabsContent value="canvas" className="text-sm text-text-secondary pt-2">
            Infinite pan-and-zoom surface.
          </TabsContent>
          <TabsContent value="grid" className="text-sm text-text-secondary pt-2">
            Masonry layout, 3 fixed columns.
          </TabsContent>
        </Tabs>
      </ComponentPreview>
    </div>
  );
}
