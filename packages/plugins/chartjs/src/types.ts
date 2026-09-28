export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export type ParentNode = HastNode & {
  children?: HastNode[];
};

export type TextNode = {
  type: "text";
  value: string;
};

export type RawNode = {
  type: "raw";
  value: string;
};

export type HastNode =
  | ElementNode
  | TextNode
  | RawNode
  | { type: string; [key: string]: unknown };

/** Any Chart.js chart type string, e.g. `"bar"`, `"line"`, `"pie"`. */
export type ChartJsType = string;

/** An `options` object handed to Chart.js. */
export type ChartJsConfig = {
  type: ChartJsType;
  data: {
    labels?: unknown[];
    datasets: unknown[];
    [key: string]: unknown;
  };
  options?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ChartJsOptions = {
  /**
   * Default value applied to `options.responsive` for every chart that does
   * not already define it. Defaults to `true`.
   */
  responsive?: boolean;
  /** Render the extracted caption as a `figcaption`. Defaults to `true`. */
  caption?: boolean;
  /** Base class applied to the figure. Defaults to `"rb-chartjs"`. */
  className?: string;
};
