import { TokenTable } from "@/components/design-system/TokenTable";
import { primitiveTokens, semanticTokens, componentTokens } from "@/lib/tokens";

export default function TokensPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Tokens</h1>
      <p className="text-sm text-text-secondary mb-8 leading-relaxed">
        Three-layer architecture. Primitives are raw values. Semantic tokens are theme-aware. Component tokens bind to semantic only. Resolved values update live with the theme toggle.
      </p>

      <TokenTable tokens={primitiveTokens} title="Layer 1 — Primitive" />
      <TokenTable tokens={semanticTokens} title="Layer 2 — Semantic" />
      <TokenTable tokens={componentTokens} title="Layer 3 — Component" />
    </div>
  );
}
