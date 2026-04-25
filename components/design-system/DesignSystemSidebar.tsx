"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const navSections = [
  {
    label: "Foundation",
    items: [{ href: "/design-system/tokens", label: "Tokens" }],
  },
  {
    label: "Primitives",
    items: [
      { href: "/design-system/primitives/button", label: "Button" },
      { href: "/design-system/primitives/icon-button", label: "IconButton" },
      { href: "/design-system/primitives/input", label: "Input" },
      { href: "/design-system/primitives/tabs", label: "Tabs" },
      { href: "/design-system/primitives/toggle", label: "Toggle" },
      { href: "/design-system/primitives/tooltip", label: "Tooltip" },
      { href: "/design-system/primitives/toast", label: "Toast" },
      { href: "/design-system/primitives/dialog", label: "Dialog" },
      { href: "/design-system/primitives/dropdown-menu", label: "DropdownMenu" },
      { href: "/design-system/primitives/avatar", label: "Avatar" },
      { href: "/design-system/primitives/badge", label: "Badge" },
      { href: "/design-system/primitives/skeleton", label: "Skeleton" },
      { href: "/design-system/primitives/spinner", label: "Spinner" },
      { href: "/design-system/primitives/kbd", label: "Kbd" },
    ],
  },
  {
    label: "Components",
    items: [
      { href: "/design-system/components/hover-toolbar", label: "HoverToolbar" },
      { href: "/design-system/components/annotation-card", label: "AnnotationCard" },
    ],
  },
];

export function DesignSystemSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-52 shrink-0 border-r border-border-subtle py-6 overflow-y-auto">
      <div className="px-4 mb-6">
        <Link
          href="/design-system"
          className="font-mono text-xs tracking-[var(--letter-spacing-wider)] uppercase text-text-tertiary hover:text-text-primary transition-colors"
        >
          Design System
        </Link>
      </div>

      {navSections.map((section) => (
        <div key={section.label} className="mb-6">
          <p className="px-4 mb-2 font-mono text-[10px] tracking-[var(--letter-spacing-wider)] uppercase text-text-tertiary">
            {section.label}
          </p>
          <ul>
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-1.5 text-sm transition-colors",
                      "hover:text-text-primary hover:bg-surface-raised",
                      active
                        ? "text-text-primary bg-surface-raised font-medium"
                        : "text-text-secondary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
