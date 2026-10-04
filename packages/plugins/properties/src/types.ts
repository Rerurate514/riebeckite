/**
 * Public option and rendering types for `@riebeckite/plugin-properties`.
 */

export type PropertiesOptions = {
  /**
   * Heading text. Defaults to `"Properties"`. Pass `null` to omit the heading
   * entirely.
   */
  title?: string | null;
  /**
   * When set, only these frontmatter keys are rendered. An explicitly included
   * key wins over `exclude`.
   */
  include?: readonly string[];
  /** Frontmatter keys that are never rendered. */
  exclude?: readonly string[];
  /**
   * Explicit display order for selected keys. Listed keys come first in this
   * exact order, then the remaining selected keys keep their frontmatter order.
   * Keys that are not selected are ignored; no selected key is dropped.
   */
  order?: readonly string[];
  /** Skip properties whose value is empty (`null`, `""`, `[]`, `{}`). */
  hideEmpty?: boolean;
  /** Root CSS class. */
  className?: string;
  /** Render the panel inside a `<details>` element. */
  collapsed?: boolean;
};

export type ResolvedPropertiesOptions = {
  title: string | null;
  include: readonly string[] | undefined;
  exclude: readonly string[];
  order: readonly string[] | undefined;
  hideEmpty: boolean;
  className: string;
  collapsed: boolean;
};

/**
 * Resolves a wikilink target (without the surrounding brackets) to a public
 * permalink, or `null` when the target cannot be resolved.
 */
export type PropertiesLinkResolver = (target: string) => string | null;

export type PropertiesMessage = {
  reason: string;
  propertyKey: string;
  value: unknown;
};

export type PropertiesRenderContext = {
  /** Resolves `[[wikilinks]]` found inside string values. */
  resolveLink?: PropertiesLinkResolver;
  /** Builds the `href` for a tag value. Defaults to the `/tags/` route. */
  resolveTag?: (tag: string) => string;
  /**
   * Called when a value cannot be rendered as structured HTML. The value is
   * still emitted as escaped text.
   */
  onMessage?: (message: PropertiesMessage) => void;
};
