import type { ContentSource, PluginRenderContext } from "@riebeckite/core";
import type { Parent } from "mdast";

/**
 * Attributes parsed from a directive's `{ ... }` block. Values are always
 * strings; shorthand `#id` / `.class` syntax is expanded by `remark-directive`.
 */
export type ShortcodeAttributes = Record<string, string>;

/**
 * Input passed to a {@link ShortcodeRenderer}.
 *
 * `childrenHtml` is present for container shortcodes. It contains a sentinel
 * that the renderer must place where the container body belongs; the plugin
 * swaps the sentinel for the rendered children. Renderers that need the body
 * must echo `input.childrenHtml` verbatim.
 */
export type ShortcodeRenderInput = {
  name: string;
  label: string;
  attributes: ShortcodeAttributes;
  childrenHtml?: string;
  context: PluginRenderContext;
  container: boolean;
};

export type ShortcodeRenderer = (input: ShortcodeRenderInput) => string;

export type ShortcodeOptions = {
  /** Root CSS class applied to every wrapper. Defaults to `rb-shortcode`. */
  className?: string;
  /** Optional BCP-47 language tag applied to wrappers as `lang`. */
  language?: string;
  /** Register the built-in shortcode renderers. Defaults to `true`. */
  builtins?: boolean;
  /** Custom renderers, merged on top of the built-ins by name. */
  shortcodes?: Record<string, ShortcodeRenderer>;
};

export type ResolvedShortcodeOptions = {
  className: string;
  language?: string;
  builtins: boolean;
  shortcodes: Record<string, ShortcodeRenderer>;
};

/** Input accepted by {@link renderShortcode}. */
export type ShortcodeRenderRequest = {
  name: string;
  label?: string;
  attributes?: ShortcodeAttributes;
  childrenHtml?: string;
  container?: boolean;
  context?: PluginRenderContext;
};

/**
 * Options for the standalone remark transform. It mirrors
 * {@link ShortcodeOptions} and additionally forwards pipeline state so the
 * render context handed to renderers can expose the content index.
 */
export type RemarkShortcodesOptions = ShortcodeOptions & {
  contentIndex?: Map<string, string>;
  contentSource?: ContentSource;
};

export type DirectiveName = "leafDirective" | "containerDirective";

export type DirectiveNode = Parent & {
  type: DirectiveName;
  name: string;
  attributes?: Record<string, unknown>;
};
