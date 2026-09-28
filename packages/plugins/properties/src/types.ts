/**
 * Public option and rendering types for `@riebeckite/plugin-properties`.
 */

export type PropertiesPosition = "start" | "end";

/**
 * How the panel reaches the rendered page. `"html"` (default) prepends or
 * appends it to the note HTML; `"slot"` publishes it on
 * `ContentManifestEntry.bodySlots` so the Site decides where to render it.
 */
export type PropertiesRenderMode = "html" | "slot";

export type PropertiesOptions = {
  /**
   * Heading text. Defaults to `"Properties"`. Pass `null` to omit the heading
   * entirely.
   */
  title?: string | null;
  /** Where the panel is inserted relative to the rendered note body. */
  position?: PropertiesPosition;
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
  /**
   * Where the panel HTML goes. Defaults to `"html"` for backward compatibility.
   */
  render?: PropertiesRenderMode;
  /** Skip properties whose value is empty (`null`, `""`, `[]`, `{}`). */
  hideEmpty?: boolean;
  /** Root CSS class. */
  className?: string;
  /** Render the panel inside a `<details>` element. */
  collapsed?: boolean;
};

export type ResolvedPropertiesOptions = {
  title: string | null;
  position: PropertiesPosition;
  include: readonly string[] | undefined;
  exclude: readonly string[];
  order: readonly string[] | undefined;
  render: PropertiesRenderMode;
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
