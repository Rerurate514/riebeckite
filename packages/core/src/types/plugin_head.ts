/**
 * A document `<head>` element contributed by a plugin.
 *
 * A plugin provides these on a `ContentManifestEntry` (see
 * `headTags`) and the Site shell decides whether and how to render them.
 * Plugins still do not own the shell; they only describe tags.
 */
export type PluginHeadTag =
  | { tag: "meta"; attrs: Record<string, string> }
  | { tag: "link"; attrs: Record<string, string> }
  | { tag: "script"; attrs?: Record<string, string>; children?: string };
