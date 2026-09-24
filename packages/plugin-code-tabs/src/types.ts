export type CodeTabsOptions = {
  syncTabs?: boolean;
};

export type CodeTabsClientOptions = CodeTabsOptions;

export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export type TextNode = {
  type: "text";
  value: string;
};

export type HastNode =
  | ElementNode
  | TextNode
  | { type: string; [key: string]: unknown };
