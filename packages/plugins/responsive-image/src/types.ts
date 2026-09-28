export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export type HastNode =
  | ElementNode
  | { type: string; [key: string]: unknown };

export type HastFile = {
  message(reason: string, options?: { source?: string }): unknown;
};

export type ParsedAttribute = {
  name: string;
  value: string | null;
};

export type ResponsiveImageVariant = {
  path: string;
  format: string;
  width?: number;
};

export type ResponsiveImageSource = {
  type: string;
  srcset: string;
};

export type ResponsiveImagePlan = {
  hasVariants: boolean;
  assetPath: string | null;
  sources: ResponsiveImageSource[];
  imgSrcset: string;
};
