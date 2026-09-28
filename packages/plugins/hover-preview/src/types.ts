export type HoverPreviewOptions = {
  /**
   * Delay in milliseconds before a popover appears after the pointer enters a
   * link. Defaults to `120`.
   */
  delay?: number;
  /**
   * Maximum number of characters kept in a preview excerpt. Defaults to `160`.
   */
  excerptLength?: number;
  /**
   * Maximum number of entries stored in the per-page payload. Unset keeps every
   * entry.
   */
  maxEntries?: number;
  /**
   * CSS selector used to find the internal links that receive a preview.
   * Defaults to `a[href^="/"]`.
   */
  selector?: string;
  /**
   * Base class name applied to the popover element. Defaults to
   * `rb-hover-preview`.
   */
  className?: string;
  /**
   * Whether the popover shows the target entry's title. Defaults to `true`.
   */
  includeTitles?: boolean;
};

export type ResolvedHoverPreviewOptions = {
  delay: number;
  excerptLength: number;
  maxEntries: number | undefined;
  selector: string;
  className: string;
  includeTitles: boolean;
};

export type HoverPreviewEntry = {
  title: string;
  excerpt: string;
  slug: string;
};

export type HoverPreviewIndex = Record<string, HoverPreviewEntry>;
