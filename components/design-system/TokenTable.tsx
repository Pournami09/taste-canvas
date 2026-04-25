"use client";

import { useEffect, useState } from "react";
import { type TokenEntry } from "@/lib/tokens";

function resolveVar(cssVar: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
}

function ColorSwatch({ cssVar }: { cssVar: string }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(resolveVar(cssVar));
  }, [cssVar]);

  const isColor =
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl") ||
    value.startsWith("oklch");

  if (!isColor) return null;

  return (
    <span
      className="inline-block w-4 h-4 rounded-sm border border-border-subtle shrink-0"
      style={{ background: `var(${cssVar})` }}
    />
  );
}

function TokenRow({ token }: { token: TokenEntry }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(resolveVar(token.cssVar));
  }, [token.cssVar]);

  return (
    <tr className="border-b border-border-subtle last:border-0 hover:bg-surface-subtle transition-colors">
      <td className="py-2.5 pr-4 font-mono text-xs text-text-secondary whitespace-nowrap">
        {token.name}
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs text-text-tertiary whitespace-nowrap">
        {token.cssVar}
      </td>
      <td className="py-2.5 pr-4">
        <div className="flex items-center gap-2">
          <ColorSwatch cssVar={token.cssVar} />
          <span className="font-mono text-xs text-text-secondary truncate max-w-[200px]">
            {value || "-"}
          </span>
        </div>
      </td>
      {token.description && (
        <td className="py-2.5 text-xs text-text-tertiary">{token.description}</td>
      )}
    </tr>
  );
}

type Props = {
  tokens: TokenEntry[];
  title?: string;
};

export function TokenTable({ tokens, title }: Props) {
  return (
    <div className="mb-10">
      {title && (
        <h3 className="font-mono text-xs tracking-[var(--letter-spacing-wider)] uppercase text-text-tertiary mb-3">
          {title}
        </h3>
      )}
      <div className="rounded-lg border border-border-subtle overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-subtle">
              <th className="py-2 px-4 text-left font-mono text-[10px] tracking-wider uppercase text-text-tertiary">
                Token
              </th>
              <th className="py-2 px-4 text-left font-mono text-[10px] tracking-wider uppercase text-text-tertiary">
                CSS Variable
              </th>
              <th className="py-2 px-4 text-left font-mono text-[10px] tracking-wider uppercase text-text-tertiary">
                Resolved Value
              </th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <TokenRow key={token.cssVar} token={token} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
