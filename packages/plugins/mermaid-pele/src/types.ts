export type MermaidPeleOptions = {
  theme?: "auto";
};

export type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};
