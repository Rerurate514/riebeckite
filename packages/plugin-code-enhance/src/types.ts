export type CodeEnhanceTheme =
  | string
  | {
      light: string;
      dark: string;
    };

export type CodeEnhanceOptions = {
  theme?: CodeEnhanceTheme;
  lineNumbers?: boolean;
  copyButton?: boolean;
  filename?: boolean;
  lineHighlight?: boolean;
  diffHighlight?: boolean;
  collapsible?: boolean;
  terminal?: boolean;
  commandPrompt?: boolean;
  wrapToggle?: boolean;
  defaultCollapsed?: boolean;
};

export type CodeEnhanceClientOptions = {
  copyLabel?: string;
  copiedLabel?: string;
};

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
