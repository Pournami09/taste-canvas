export default function DesignSystemPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-3">Taste Canvas</h1>
      <p className="text-sm text-text-secondary mb-8 leading-relaxed">
        Design system foundation. Three-layer token architecture: primitives, semantic, components.
        Use the sidebar to explore tokens and components. Toggle light/dark in the header.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Tokens", href: "/design-system/tokens", desc: "Full token inventory with resolved values" },
          { label: "Button", href: "/design-system/primitives/button", desc: "Primary, secondary, ghost, destructive" },
          { label: "AnnotationCard", href: "/design-system/components/annotation-card", desc: "The visual signature of the product" },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="block rounded-lg border border-border-subtle bg-surface-raised p-4 hover:border-border-default transition-colors"
          >
            <p className="text-sm font-medium text-text-primary mb-1">{card.label}</p>
            <p className="text-xs text-text-tertiary leading-relaxed">{card.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
