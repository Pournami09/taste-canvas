import { DesignSystemSidebar } from "@/components/design-system/DesignSystemSidebar";
import { ThemeToggle } from "@/components/design-system/ThemeToggle";

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-surface-background">
      <DesignSystemSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-end px-6 py-3 border-b border-border-subtle shrink-0">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
