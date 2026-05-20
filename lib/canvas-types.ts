// Shared types for the canvas feature. Import from here in all canvas-related components.

export type LinkPreviewData = {
  url: string;
  title: string;
  description: string;
  ogImage: string;
  siteName: string;
};

export type ImageNode = {
  id: string;
  type: "image";
  src: string;
  alt: string;
  canvasX: number;
  canvasY: number;
  canvasW: number;
  canvasH: number;
  annotation: string;
  createdAt: number;
};

export type AnnotationNode = {
  id: string;
  type: "annotation";
  body: string;
  canvasX: number;
  canvasY: number;
  createdAt: number;
};

export type LinkNode = {
  id: string;
  type: "link";
  url: string;
  /** Optional display-name override (user-edited, falls back to OG title). */
  name?: string;
  canvasX: number;
  canvasY: number;
  canvasW: number;
  annotation: string;
  preview: LinkPreviewData | null;
  loading: boolean;
  fetchError: boolean;
  createdAt: number;
};

export type CanvasNode = ImageNode | AnnotationNode | LinkNode;

export type Edge = {
  id: string;
  fromId: string;
  toId: string;
};
