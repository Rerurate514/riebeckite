export type ImageCompareOrientation = "horizontal" | "vertical";

export type ImageCompareOptions = {
  /** Fenced code block language treated as an image comparison. */
  language?: string;
};

export type ImageCompareSpec = {
  readonly before: string;
  readonly after: string;
  readonly beforeAlt: string;
  readonly afterAlt: string;
  readonly orientation: ImageCompareOrientation;
  readonly label?: string;
};

export type ResolvedImageCompareSpec = Omit<
  ImageCompareSpec,
  "before" | "after"
> & {
  readonly before: string;
  readonly after: string;
};

export type ImageCompareParseResult =
  | { readonly ok: true; readonly spec: ImageCompareSpec }
  | { readonly ok: false; readonly reason: string };
