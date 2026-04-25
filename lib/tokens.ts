export type TokenEntry = {
  name: string;
  cssVar: string;
  layer: "primitive" | "semantic" | "component";
  description?: string;
};

export const primitiveTokens: TokenEntry[] = [
  /* Gray scale */
  { name: "color.gray.50", cssVar: "--color-gray-50", layer: "primitive" },
  { name: "color.gray.100", cssVar: "--color-gray-100", layer: "primitive" },
  { name: "color.gray.200", cssVar: "--color-gray-200", layer: "primitive" },
  { name: "color.gray.300", cssVar: "--color-gray-300", layer: "primitive" },
  { name: "color.gray.400", cssVar: "--color-gray-400", layer: "primitive" },
  { name: "color.gray.500", cssVar: "--color-gray-500", layer: "primitive" },
  { name: "color.gray.600", cssVar: "--color-gray-600", layer: "primitive" },
  { name: "color.gray.700", cssVar: "--color-gray-700", layer: "primitive" },
  { name: "color.gray.750", cssVar: "--color-gray-750", layer: "primitive" },
  { name: "color.gray.800", cssVar: "--color-gray-800", layer: "primitive" },
  { name: "color.gray.850", cssVar: "--color-gray-850", layer: "primitive" },
  { name: "color.gray.900", cssVar: "--color-gray-900", layer: "primitive" },
  { name: "color.gray.950", cssVar: "--color-gray-950", layer: "primitive" },
  /* Warm scale */
  { name: "color.warm.50", cssVar: "--color-warm-50", layer: "primitive" },
  { name: "color.warm.100", cssVar: "--color-warm-100", layer: "primitive" },
  { name: "color.warm.200", cssVar: "--color-warm-200", layer: "primitive" },
  { name: "color.warm.300", cssVar: "--color-warm-300", layer: "primitive" },
  { name: "color.warm.400", cssVar: "--color-warm-400", layer: "primitive" },
  /* Orange scale */
  { name: "color.orange.50", cssVar: "--color-orange-50", layer: "primitive" },
  { name: "color.orange.100", cssVar: "--color-orange-100", layer: "primitive" },
  { name: "color.orange.200", cssVar: "--color-orange-200", layer: "primitive" },
  { name: "color.orange.300", cssVar: "--color-orange-300", layer: "primitive" },
  { name: "color.orange.400", cssVar: "--color-orange-400", layer: "primitive" },
  { name: "color.orange.500", cssVar: "--color-orange-500", layer: "primitive" },
  { name: "color.orange.600", cssVar: "--color-orange-600", layer: "primitive" },
  { name: "color.orange.700", cssVar: "--color-orange-700", layer: "primitive" },
  /* Red scale */
  { name: "color.red.500", cssVar: "--color-red-500", layer: "primitive" },
  { name: "color.red.600", cssVar: "--color-red-600", layer: "primitive" },
  /* Green scale */
  { name: "color.green.500", cssVar: "--color-green-500", layer: "primitive" },
  { name: "color.green.600", cssVar: "--color-green-600", layer: "primitive" },
  /* Radius */
  { name: "radius.xs", cssVar: "--radius-xs", layer: "primitive" },
  { name: "radius.sm", cssVar: "--radius-sm", layer: "primitive" },
  { name: "radius.md", cssVar: "--radius-md", layer: "primitive" },
  { name: "radius.lg", cssVar: "--radius-lg", layer: "primitive" },
  { name: "radius.xl", cssVar: "--radius-xl", layer: "primitive" },
  { name: "radius.full", cssVar: "--radius-full", layer: "primitive" },
  /* Motion */
  { name: "motion.duration.micro", cssVar: "--motion-duration-micro", layer: "primitive" },
  { name: "motion.duration.small", cssVar: "--motion-duration-small", layer: "primitive" },
  { name: "motion.duration.medium", cssVar: "--motion-duration-medium", layer: "primitive" },
  { name: "motion.duration.large", cssVar: "--motion-duration-large", layer: "primitive" },
];

export const semanticTokens: TokenEntry[] = [
  { name: "surface.background", cssVar: "--surface-background", layer: "semantic", description: "Page/canvas background" },
  { name: "surface.subtle", cssVar: "--surface-subtle", layer: "semantic", description: "Sidebars, secondary panels" },
  { name: "surface.raised", cssVar: "--surface-raised", layer: "semantic", description: "Cards, nodes" },
  { name: "surface.raised.glass", cssVar: "--surface-raised-glass", layer: "semantic", description: "AnnotationCard glass surface" },
  { name: "surface.overlay", cssVar: "--surface-overlay", layer: "semantic", description: "Modal scrims" },
  { name: "border.subtle", cssVar: "--border-subtle", layer: "semantic" },
  { name: "border.default", cssVar: "--border-default", layer: "semantic" },
  { name: "border.strong", cssVar: "--border-strong", layer: "semantic" },
  { name: "border.focus", cssVar: "--border-focus", layer: "semantic" },
  { name: "text.primary", cssVar: "--text-primary", layer: "semantic" },
  { name: "text.secondary", cssVar: "--text-secondary", layer: "semantic" },
  { name: "text.tertiary", cssVar: "--text-tertiary", layer: "semantic" },
  { name: "text.inverse", cssVar: "--text-inverse", layer: "semantic" },
  { name: "accent.default", cssVar: "--accent-default", layer: "semantic", description: "Primary actions, selection, connections" },
  { name: "accent.hover", cssVar: "--accent-hover", layer: "semantic" },
  { name: "accent.subtle", cssVar: "--accent-subtle", layer: "semantic" },
  { name: "destructive.default", cssVar: "--destructive-default", layer: "semantic" },
  { name: "success.default", cssVar: "--success-default", layer: "semantic" },
  { name: "dot-grid.color", cssVar: "--dot-grid-color", layer: "semantic", description: "Canvas dot grid texture" },
];

export const componentTokens: TokenEntry[] = [
  { name: "annotation-card.bg", cssVar: "--annotation-card-bg", layer: "component" },
  { name: "annotation-card.border", cssVar: "--annotation-card-border", layer: "component" },
  { name: "annotation-card.border.editing", cssVar: "--annotation-card-border-editing", layer: "component" },
  { name: "hover-toolbar.button.bg", cssVar: "--hover-toolbar-button-bg", layer: "component" },
  { name: "hover-toolbar.button.fg", cssVar: "--hover-toolbar-button-fg", layer: "component" },
  { name: "button.primary.bg", cssVar: "--button-primary-bg", layer: "component" },
  { name: "button.primary.fg", cssVar: "--button-primary-fg", layer: "component" },
  { name: "button.secondary.bg", cssVar: "--button-secondary-bg", layer: "component" },
  { name: "button.secondary.border", cssVar: "--button-secondary-border", layer: "component" },
  { name: "node.bg", cssVar: "--node-bg", layer: "component" },
  { name: "node.border", cssVar: "--node-border", layer: "component" },
  { name: "connection.stroke", cssVar: "--connection-stroke", layer: "component" },
  { name: "connection.dot", cssVar: "--connection-dot", layer: "component" },
  { name: "chip.bg", cssVar: "--chip-bg", layer: "component" },
  { name: "chip.fg", cssVar: "--chip-fg", layer: "component" },
  { name: "chip.border", cssVar: "--chip-border", layer: "component" },
];

export const allTokens = [...primitiveTokens, ...semanticTokens, ...componentTokens];
