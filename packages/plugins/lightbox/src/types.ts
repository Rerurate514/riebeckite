export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export type HastNode = ElementNode | { type: string; [key: string]: unknown };

export type LightboxOptions = {
  selectorClass?: string;
};

export type LightboxInitOptions = LightboxOptions & {
  autoWrapImages?: boolean;
};

export const DEFAULT_TRIGGER_CLASS = "rr-lightbox-trigger";
