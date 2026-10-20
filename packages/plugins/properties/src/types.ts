/**
 * Public option and rendering types for `@riebeckite/plugin-properties`.
 */

export type PropertyTagVariant = "text" | "links" | "chips";

export type PropertiesFieldConfig =
  | { readonly type: "text" }
  | { readonly type: "link" }
  | {
      readonly type: "tags";
      readonly link?: boolean;
      readonly tagBase?: string;
      readonly variant?: PropertyTagVariant;
    }
  | {
      readonly type: "badge";
      readonly variants?: Readonly<Record<string, string>>;
    }
  | { readonly type: "date"; readonly format?: string }
  | { readonly type: "wikilinks" };

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
  fields?: Readonly<Record<string, PropertiesFieldConfig>>;
};

export type ResolvedPropertiesOptions = {
  title: string | null;
  include: readonly string[] | undefined;
  exclude: readonly string[];
  order: readonly string[] | undefined;
  hideEmpty: boolean;
  className: string;
  collapsed: boolean;
  fields: Readonly<Record<string, PropertiesFieldConfig>>;
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

export type PropertyTextPart = {
  readonly kind: "text";
  readonly text: string;
};

export type PropertyLinkPart = {
  readonly kind: "link";
  readonly text: string;
  readonly href: string;
  readonly external: boolean;
};

export type PropertyInlinePart = PropertyTextPart | PropertyLinkPart;

export type PropertyTag = {
  readonly tag: string;
  readonly text: string;
  readonly href?: string;
};

export type PropertiesData = {
  readonly title: string | null;
  readonly className: string;
  readonly collapsed: boolean;
  readonly items: readonly {
    readonly key: string;
    readonly value: PropertyValue;
  }[];
};

export type PropertyValue =
  | PropertyTextPart
  | PropertyLinkPart
  | {
      readonly kind: "tags";
      readonly tags: readonly PropertyTag[];
      readonly variant: PropertyTagVariant;
    }
  | {
      readonly kind: "badge";
      readonly text: string;
      readonly variant?: string;
    }
  | {
      readonly kind: "date";
      readonly value: string;
      readonly formatted: string;
    }
  | {
      readonly kind: "inline";
      readonly parts: readonly PropertyInlinePart[];
    }
  | {
      readonly kind: "list";
      readonly items: readonly PropertyValue[];
    }
  | {
      readonly kind: "group";
      readonly entries: readonly {
        readonly key: string;
        readonly value: PropertyValue;
      }[];
    }
  | {
      readonly kind: "boolean";
      readonly value: boolean;
    }
  | {
      readonly kind: "number";
      readonly value: string;
    };
