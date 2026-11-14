import { defaultLanguageForLocale } from "./presets_languages.js";
import type { ScaffoldOptions, ScaffoldPluginSpec } from "./presets_types.js";

export const np = (
  package_: string,
  factory: string,
  options?: ScaffoldOptions,
): ScaffoldPluginSpec => ({
  package: package_,
  factory,
  options,
});

/**
 * Option-bearing plugins carry tiered option definitions so the generated
 * `riebeckite.config.ts` doubles as a settings reference and each preset tier
 * demonstrates the configuration surface step by step:
 *
 * - `starter` uses the practical options needed by its included plugins
 * - `showcase` shows every available option
 *
 * Factories that take no options (or are left deliberately bare, like the
 * color-mode toggle) stay as `factory()`. Options may reference the scaffold
 * context so plugin defaults follow the user's answers.
 */

/** The foundation plugin, shared by every non-empty preset. */
export const obsidianMarkdown = np(
  "@riebeckite/plugin-obsidian-markdown",
  "obsidianMarkdown",
);

/** The next tier: look and language. */
export const colorMode = np("@riebeckite/plugin-color-mode", "colorMode");
export const l10n = np("@riebeckite/plugin-l10n", "l10n", (context) => {
  const defaultLang = defaultLanguageForLocale(context.variables.locale);
  return `{ defaultLang: ${JSON.stringify(defaultLang)}, languages: ${JSON.stringify(context.languages)} }`;
});

/** Core publishing and reading experience. */
export const seo = np("@riebeckite/plugin-seo", "seo", {
  sitemap: { depth: 1, value: "true" },
  robots: { depth: 2, value: "true" },
  feed: { depth: 3, value: "{ rss: true, atom: true, json: true }" },
});
export const blogSeo = np(
  "@riebeckite/plugin-seo",
  "seo",
  `{ sitemap: true, robots: true, feed: { rss: true, atom: true, json: true } }`,
);
export const blogOgImage = np(
  "@riebeckite/plugin-og-image",
  "ogImage",
  `{ preset: "editorial" }`,
);
export const toc = np("@riebeckite/plugin-toc", "toc");
export const mdx = np("@riebeckite/plugin-mdx", "mdx", "{ trusted: true }");
export const properties = np("@riebeckite/plugin-properties", "properties", {
  include: { depth: 2, value: '["created", "modified", "tags", "status"]' },
  fields: {
    depth: 2,
    value:
      '{ created: { type: "date", format: "yyyy-MM-dd" }, modified: { type: "date", format: "yyyy-MM-dd" }, tags: { type: "tags", variant: "chips" }, status: { type: "badge", variants: { active: "success", draft: "warning", archived: "danger" } } }',
  },
});
export const alias = np("@riebeckite/plugin-alias", "alias", `{ status: 308 }`);
export const codeEnhance = np(
  "@riebeckite/plugin-code-enhance",
  "codeEnhance",
  {
    lineNumbers: { depth: 1, value: "true" },
    copyButton: { depth: 1, value: "true" },
    filename: { depth: 2, value: "true" },
    lineHighlight: { depth: 2, value: "true" },
    diffHighlight: { depth: 2, value: "true" },
    theme: {
      depth: 3,
      value: '{ light: "github-light", dark: "github-dark" }',
    },
    wrapToggle: { depth: 3, value: "true" },
  },
);

/** Discovery, media, and reading polish. */
export const search = np("@riebeckite/plugin-search", "search");
export const backlinks = np("@riebeckite/plugin-backlinks", "backlinks");
export const breadcrumbs = np("@riebeckite/plugin-breadcrumbs", "breadcrumbs");
export const navigationStarter = np(
  "@riebeckite/plugin-navigation",
  "navigation",
);
export const navigationBlog = np(
  "@riebeckite/plugin-navigation",
  "navigation",
  `{ items: [{ label: "Posts", href: "/posts" }, { label: "Tags", href: "/tags" }, { label: "Series", href: "/series" }] }`,
);
export const navigationShowcase = np(
  "@riebeckite/plugin-navigation",
  "navigation",
  `{ items: [{ label: "Guide", href: "/guide" }, { label: "Examples", href: "/examples" }, { label: "Framework", href: "/framework/plugins", children: [{ label: "Plugins", href: "/framework/plugins" }, { label: "Themes", href: "/framework/themes" }] }], secondary: [{ label: "Guide", href: "/guide" }, { label: "Examples", href: "/examples" }] }`,
);
export const relatedPosts = np(
  "@riebeckite/plugin-related-posts",
  "relatedPosts",
  {
    limit: { depth: 2, value: "5" },
    useTags: { depth: 2, value: "true" },
    useBacklinks: { depth: 2, value: "true" },
    minScore: { depth: 3, value: "1" },
    heading: { depth: 3, value: "true" },
    headingText: { depth: 3, value: '"Related"' },
    className: { depth: 3, value: '"rb-related-posts"' },
  },
);
export const share = np("@riebeckite/plugin-share", "share", {
  services: {
    depth: 3,
    value:
      '["x", "bluesky", "mastodon", "facebook", "linkedin", "hatena", "copy"]',
  },
  mastodonInstance: { depth: 3, value: '"mastodon.social"' },
});
export const recentPosts = np("@riebeckite/plugin-recent-posts", "recentPosts");
export const changelog = np("@riebeckite/plugin-changelog", "changelog", {
  perNote: { depth: 2, value: "true" },
  lookbackDays: { depth: 3, value: "90" },
  dateFormat: { depth: 3, value: '"iso"' },
  siteWide: { depth: 3, value: "false" },
});
export const webmention = np("@riebeckite/plugin-webmention", "webmention", {
  headingText: { depth: 2, value: '"Mentions"' },
  limit: { depth: 3, value: "20" },
});
export const attachment = np(
  "@riebeckite/plugin-attachment",
  "attachment",
  `{ showSize: true }`,
);
export const pdf = np("@riebeckite/plugin-pdf", "pdf", {
  height: { depth: 2, value: '"640px"' },
  initialPage: { depth: 2, value: "1" },
  toolbar: { depth: 2, value: "true" },
  showMetadata: { depth: 3, value: "true" },
  downloadLabel: { depth: 3, value: '"Download PDF"' },
});
export const media = np("@riebeckite/plugin-media", "media", {
  preload: { depth: 2, value: '"metadata"' },
  lazy: { depth: 2, value: "true" },
  showCaption: { depth: 3, value: "true" },
  showDownload: { depth: 3, value: "false" },
  showOpenOriginal: { depth: 3, value: "true" },
});
export const responsiveImage = np(
  "@riebeckite/plugin-responsive-image",
  "responsiveImage",
  {
    lazy: { depth: 2, value: "true" },
    decoding: { depth: 2, value: "true" },
    sizes: { depth: 2, value: '"100vw"' },
    widths: { depth: 2, value: "[640, 1280, 1920]" },
    formats: { depth: 3, value: '["webp", "avif"]' },
    className: { depth: 3, value: '"rb-responsive-image"' },
  },
);
export const lightbox = np(
  "@riebeckite/plugin-lightbox",
  "lightbox",
  `{ selectorClass: "rr-lightbox-trigger" }`,
);
export const highlight = np("@riebeckite/plugin-highlight", "highlight", {
  tag: { depth: 2, value: '"mark"' },
  className: { depth: 3, value: '"rb-mark"' },
});
export const codeTabs = np(
  "@riebeckite/plugin-code-tabs",
  "codeTabs",
  `{ syncTabs: true }`,
);
export const codeAnnotations = np(
  "@riebeckite/plugin-code-annotations",
  "codeAnnotations",
);
export const shortcodes = np(
  "@riebeckite/plugin-shortcodes",
  "shortcodes",
  `{ builtins: true }`,
);
export const series = np("@riebeckite/plugin-series", "series", {
  key: { depth: 2, value: '"series"' },
  orderKey: { depth: 2, value: '"series_order"' },
  titleKey: { depth: 2, value: '"series_title"' },
  positionLabel: { depth: 2, value: "false" },
  heading: { depth: 3, value: "true" },
  className: { depth: 3, value: '"rb-series"' },
});
export const taxonomy = np("@riebeckite/plugin-taxonomy", "taxonomy", {
  tags: { depth: 2, value: "true" },
  folders: { depth: 2, value: "true" },
  related: { depth: 2, value: "true" },
  feeds: { depth: 3, value: "{ rss: true, atom: true, json: true }" },
  relatedLimit: { depth: 3, value: "8" },
});
export const blogTaxonomy = np(
  "@riebeckite/plugin-taxonomy",
  "taxonomy",
  `{ tags: true, folders: true, related: true, feeds: { rss: true, atom: true, json: true } }`,
);
export const gardenTaxonomy = np("@riebeckite/plugin-taxonomy", "taxonomy", {
  tags: { depth: 2, value: "true" },
  folders: { depth: 2, value: "true" },
  related: { depth: 2, value: "true" },
  folderDepth: { depth: 2, value: "1" },
  feeds: { depth: 3, value: "{ rss: true, atom: true, json: true }" },
  relatedLimit: { depth: 3, value: "8" },
});
export const folderPages = np("@riebeckite/plugin-folder-pages", "folderPages");
export const autoCardLink = np(
  "@riebeckite/plugin-autocardlink",
  "autoCardLink",
  `{ className: "rb-cardlink" }`,
);
export const richEmbed = np(
  "@riebeckite/plugin-rich-embed",
  "richEmbed",
  `{ providers: ["youtube", "vimeo", "spotify"] }`,
);
