/**
 * Scaffold presets.
 *
 * A preset is the declarative description of one starter template. The
 * scaffolder consumes a preset to decide which files it generates:
 *
 * - which plugins are registered in `riebeckite.config.ts`
 * - which theme is applied
 * - which content pages are emitted (localized, or English-only extras)
 * - which `app/` shell files are written
 *
 * Presets are cumulative in spirit but defined explicitly so each tier is
 * self-contained and can be selected by name:
 *
 *    import { scaffoldRiebeckiteSite } from "create-riebeckite/scaffold";
 *
 *    await scaffoldRiebeckiteSite({ targetDirectory: "./site", preset: "showcase" });
 */

export const SCAFFOLD_LANGUAGES = [
  "en",
  "ja",
  "zh-CN",
  "es",
  "de",
  "fr",
  "ko",
] as const;

export type ScaffoldLanguage = (typeof SCAFFOLD_LANGUAGES)[number];

export function defaultLanguageForLocale(locale: string): string {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("ko")) return "ko";
  return "en";
}

export type ScaffoldPresetName =
  | "starter"
  | "digital-garden"
  | "blog"
  | "docs"
  | "portfolio"
  | "minimal"
  | "showcase"
  | "empty";

export const SCAFFOLD_PRESET_NAMES: readonly ScaffoldPresetName[] = [
  "starter",
  "digital-garden",
  "blog",
  "docs",
  "portfolio",
  "minimal",
  "showcase",
  "empty",
];

export function isScaffoldPresetName(
  value: string,
): value is ScaffoldPresetName {
  return (SCAFFOLD_PRESET_NAMES as readonly string[]).includes(value);
}

/** How a theme factory is referenced in the generated config file. */
type ScaffoldThemeSpec = {
  /** Npm package, for example `@riebeckite/theme-minimal`. */
  readonly package: string;
  /** Factory/import name, for example `minimalTheme`. */
  readonly factory: string;
  /** Optional literal source for the factory call arguments, e.g. `{ colorMode: "light" }`. */
  readonly options?: string;
};

/** How a plugin factory is referenced in the generated config file. */
export type ScaffoldPluginSpec = {
  /** Npm package, for example `@riebeckite/plugin-seo`. */
  readonly package: string;
  /** Factory/import name, for example `seo`. */
  readonly factory: string;
  /** Options source for the factory call; see {@link ScaffoldOptions}. */
  readonly options?: ScaffoldOptions;
};

/**
 * Context passed to option sources. `variables` are the user-supplied site
 * values (`title`, `baseUrl`, ...), `languages` the preset's configured
 * languages, and configuration detail depth. `showcase` uses depth 3 so its
 * generated config is a complete options reference; the other presets keep
 * their configuration intentionally small.
 */
export type ScaffoldOptionContext = {
  readonly variables: {
    readonly name: string;
    readonly title: string;
    readonly description: string;
    readonly baseUrl: string;
    readonly locale: string;
  };
  readonly languages: readonly ScaffoldLanguage[];
  readonly depth: number;
};

/** A single option value: a literal, or a function of the scaffold context. */
export type ScaffoldOptionValue =
  | string
  | ((context: ScaffoldOptionContext) => string);

/** A config field gated to a minimum preset depth. */
type ScaffoldOptionField = {
  /** The lowest `ScaffoldOptionContext.depth` that includes this field. */
  readonly depth: number;
  readonly value: ScaffoldOptionValue;
};

/**
 * Options for a generated plugin call: a literal source string, a function
 * producing one, or a field map whose fields appear from a minimum depth.
 * The field map form lets each preset tier demonstrate the configuration
 * surface step by step while keeping one source of truth per plugin.
 */
export type ScaffoldOptions =
  | string
  | ((context: ScaffoldOptionContext) => string)
  | Readonly<Record<string, ScaffoldOptionField>>;

/** Content pages the scaffold can emit. */
type ScaffoldPageKey =
  | "index"
  | "framework/plugins"
  | "framework/themes"
  | "guide"
  | "examples"
  | "reference/plugins"
  | "reference/themes";

/** README verbosity. */
type ScaffoldReadmeLevel = "short" | "standard" | "rich";

export type ScaffoldPreset = {
  readonly name: ScaffoldPresetName;
  /** One-line human description, shown by `--list-presets`. */
  readonly description: string;
  /** Languages the l10n plugin is configured with. A single entry means no l10n. */
  readonly languages: readonly ScaffoldLanguage[];
  readonly theme: ScaffoldThemeSpec | null;
  readonly plugins: readonly ScaffoldPluginSpec[];
  readonly contentPages: readonly ScaffoldPageKey[];
  readonly readme: ScaffoldReadmeLevel;
};

const np = (
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
const obsidianMarkdown = np(
  "@riebeckite/plugin-obsidian-markdown",
  "obsidianMarkdown",
);

/** The next tier: look and language. */
const colorMode = np("@riebeckite/plugin-color-mode", "colorMode");
const l10n = np("@riebeckite/plugin-l10n", "l10n", (context) => {
  const defaultLang = defaultLanguageForLocale(context.variables.locale);
  return `{ defaultLang: ${JSON.stringify(defaultLang)}, languages: ${JSON.stringify(context.languages)} }`;
});

/** Core publishing and reading experience. */
const seo = np("@riebeckite/plugin-seo", "seo", {
  sitemap: { depth: 1, value: "true" },
  robots: { depth: 2, value: "true" },
  feed: { depth: 3, value: "{ rss: true, atom: true, json: true }" },
});
const blogSeo = np(
  "@riebeckite/plugin-seo",
  "seo",
  `{ sitemap: true, robots: true, feed: { rss: true, atom: true, json: true } }`,
);
const toc = np("@riebeckite/plugin-toc", "toc");
const properties = np("@riebeckite/plugin-properties", "properties", {
  include: { depth: 2, value: '["created", "modified", "tags", "status"]' },
  fields: {
    depth: 2,
    value:
      '{ created: { type: "date", format: "yyyy-MM-dd" }, modified: { type: "date", format: "yyyy-MM-dd" }, tags: { type: "tags", variant: "chips" }, status: { type: "badge", variants: { active: "success", draft: "warning", archived: "danger" } } }',
  },
});
const alias = np("@riebeckite/plugin-alias", "alias", `{ status: 308 }`);
const codeEnhance = np("@riebeckite/plugin-code-enhance", "codeEnhance", {
  lineNumbers: { depth: 1, value: "true" },
  copyButton: { depth: 1, value: "true" },
  filename: { depth: 2, value: "true" },
  lineHighlight: { depth: 2, value: "true" },
  diffHighlight: { depth: 2, value: "true" },
  theme: { depth: 3, value: '{ light: "github-light", dark: "github-dark" }' },
  wrapToggle: { depth: 3, value: "true" },
});

/** Discovery, media, and reading polish. */
const search = np("@riebeckite/plugin-search", "search");
const backlinks = np("@riebeckite/plugin-backlinks", "backlinks");
const breadcrumbs = np("@riebeckite/plugin-breadcrumbs", "breadcrumbs");
const navigationStarter = np("@riebeckite/plugin-navigation", "navigation");
const navigationShowcase = np(
  "@riebeckite/plugin-navigation",
  "navigation",
  `{ items: [{ label: "Guide", href: "/guide" }, { label: "Examples", href: "/examples" }, { label: "Framework", href: "/framework/plugins", children: [{ label: "Plugins", href: "/framework/plugins" }, { label: "Themes", href: "/framework/themes" }] }], secondary: [{ label: "Guide", href: "/guide" }, { label: "Examples", href: "/examples" }] }`,
);
const relatedPosts = np("@riebeckite/plugin-related-posts", "relatedPosts", {
  limit: { depth: 2, value: "5" },
  useTags: { depth: 2, value: "true" },
  useBacklinks: { depth: 2, value: "true" },
  minScore: { depth: 3, value: "1" },
  heading: { depth: 3, value: "true" },
  headingText: { depth: 3, value: '"Related"' },
  className: { depth: 3, value: '"rb-related-posts"' },
});
const share = np("@riebeckite/plugin-share", "share", {
  services: {
    depth: 3,
    value:
      '["x", "bluesky", "mastodon", "facebook", "linkedin", "hatena", "copy"]',
  },
  mastodonInstance: { depth: 3, value: '"mastodon.social"' },
});
const recentPosts = np("@riebeckite/plugin-recent-posts", "recentPosts");
const changelog = np("@riebeckite/plugin-changelog", "changelog", {
  perNote: { depth: 2, value: "true" },
  lookbackDays: { depth: 3, value: "90" },
  dateFormat: { depth: 3, value: '"iso"' },
  siteWide: { depth: 3, value: "false" },
});
const webmention = np("@riebeckite/plugin-webmention", "webmention", {
  headingText: { depth: 2, value: '"Mentions"' },
  limit: { depth: 3, value: "20" },
});
const attachment = np(
  "@riebeckite/plugin-attachment",
  "attachment",
  `{ showSize: true }`,
);
const pdf = np("@riebeckite/plugin-pdf", "pdf", {
  height: { depth: 2, value: '"640px"' },
  initialPage: { depth: 2, value: "1" },
  toolbar: { depth: 2, value: "true" },
  showMetadata: { depth: 3, value: "true" },
  downloadLabel: { depth: 3, value: '"Download PDF"' },
});
const media = np("@riebeckite/plugin-media", "media", {
  preload: { depth: 2, value: '"metadata"' },
  lazy: { depth: 2, value: "true" },
  showCaption: { depth: 3, value: "true" },
  showDownload: { depth: 3, value: "false" },
  showOpenOriginal: { depth: 3, value: "true" },
});
const responsiveImage = np(
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
const lightbox = np(
  "@riebeckite/plugin-lightbox",
  "lightbox",
  `{ selectorClass: "rr-lightbox-trigger" }`,
);
const highlight = np("@riebeckite/plugin-highlight", "highlight", {
  tag: { depth: 2, value: '"mark"' },
  className: { depth: 3, value: '"rb-mark"' },
});
const codeTabs = np(
  "@riebeckite/plugin-code-tabs",
  "codeTabs",
  `{ syncTabs: true }`,
);
const codeAnnotations = np(
  "@riebeckite/plugin-code-annotations",
  "codeAnnotations",
);
const shortcodes = np(
  "@riebeckite/plugin-shortcodes",
  "shortcodes",
  `{ builtins: true }`,
);
const series = np("@riebeckite/plugin-series", "series", {
  key: { depth: 2, value: '"series"' },
  orderKey: { depth: 2, value: '"series_order"' },
  titleKey: { depth: 2, value: '"series_title"' },
  positionLabel: { depth: 2, value: "false" },
  heading: { depth: 3, value: "true" },
  className: { depth: 3, value: '"rb-series"' },
});
const taxonomy = np("@riebeckite/plugin-taxonomy", "taxonomy", {
  tags: { depth: 2, value: "true" },
  folders: { depth: 2, value: "true" },
  related: { depth: 2, value: "true" },
  feeds: { depth: 3, value: "{ rss: true, atom: true, json: true }" },
  relatedLimit: { depth: 3, value: "8" },
});
const blogTaxonomy = np(
  "@riebeckite/plugin-taxonomy",
  "taxonomy",
  `{ tags: true, folders: true, related: true, feeds: { rss: true, atom: true, json: true } }`,
);
const folderPages = np("@riebeckite/plugin-folder-pages", "folderPages");
const autoCardLink = np(
  "@riebeckite/plugin-autocardlink",
  "autoCardLink",
  `{ className: "rb-cardlink" }`,
);
const richEmbed = np(
  "@riebeckite/plugin-rich-embed",
  "richEmbed",
  `{ providers: ["youtube", "vimeo", "spotify"] }`,
);
const gallery = np("@riebeckite/plugin-gallery", "gallery", {
  columns: { depth: 2, value: "3" },
  aspect: { depth: 2, value: '"4/3"' },
  language: { depth: 3, value: '"gallery"' },
});

/** Diagrams, charts, and knowledge tools for the heavy tiers. */
const mermaidPele = np("@riebeckite/plugin-mermaid-pele", "mermaidPele");
const graphviz = np("@riebeckite/plugin-graphviz", "graphviz", {
  render: { depth: 2, value: '"build"' },
  engine: { depth: 2, value: '"dot"' },
  caption: { depth: 3, value: "true" },
  fallback: { depth: 3, value: "true" },
});
const d2 = np("@riebeckite/plugin-d2", "d2", {
  render: { depth: 2, value: '"build"' },
  theme: { depth: 2, value: "{ light: 0, dark: 1 }" },
  layout: { depth: 2, value: '"dagre"' },
  caption: { depth: 3, value: "true" },
});
const plantuml = np("@riebeckite/plugin-plantuml", "plantuml", {
  server: { depth: 2, value: '"https://www.plantuml.com/plantuml"' },
  format: { depth: 2, value: '"svg"' },
  caption: { depth: 3, value: "true" },
  fallback: { depth: 3, value: "true" },
});
const chartjs = np("@riebeckite/plugin-chartjs", "chartjs", {
  responsive: { depth: 2, value: "true" },
  caption: { depth: 2, value: "true" },
  className: { depth: 3, value: '"rb-chartjs"' },
});
const vegaLite = np("@riebeckite/plugin-vega-lite", "vegaLite", {
  caption: { depth: 2, value: "true" },
  theme: { depth: 2, value: '"light"' },
  renderer: { depth: 2, value: '"canvas"' },
  actions: { depth: 3, value: "false" },
  className: { depth: 3, value: '"rb-vega-lite"' },
});
const wavedrom = np("@riebeckite/plugin-wavedrom", "wavedrom", {
  skin: { depth: 2, value: '"default"' },
  caption: { depth: 2, value: "true" },
  fallback: { depth: 3, value: "true" },
  className: { depth: 3, value: '"rb-wavedrom"' },
});
const markmap = np("@riebeckite/plugin-markmap", "markmap", {
  caption: { depth: 2, value: "true" },
  height: { depth: 2, value: "320" },
  colorFreezeLevel: { depth: 3, value: "2" },
});
const map = np("@riebeckite/plugin-map", "map", {
  zoom: { depth: 2, value: "13" },
  height: { depth: 2, value: "320" },
  tileUrl: {
    depth: 3,
    value: JSON.stringify("https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
  },
  attribution: {
    depth: 3,
    value: JSON.stringify(
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ),
  },
});
const marp = np("@riebeckite/plugin-marp", "marp", {
  theme: { depth: 2, value: '"default"' },
  allowHtml: { depth: 2, value: "true" },
  math: { depth: 2, value: "true" },
  caption: { depth: 3, value: "true" },
});
const qrCode = np("@riebeckite/plugin-qr-code", "qrCode", {
  level: { depth: 2, value: '"M"' },
  margin: { depth: 2, value: "1" },
  width: { depth: 2, value: "160" },
  dark: { depth: 3, value: '"#000000"' },
  light: { depth: 3, value: '"#ffffff"' },
  caption: { depth: 3, value: "true" },
  className: { depth: 3, value: '"rb-qr"' },
});
const discordEmbed = np("@riebeckite/plugin-discord-embed", "discordEmbed", {
  themeColor: { depth: 2, value: '"#5865F2"' },
  imageAlt: { depth: 3, value: "true" },
  imageDimensions: { depth: 3, value: "true" },
});
const excalidraw = np(
  "@riebeckite/plugin-excalidraw",
  "excalidraw",
  `{ lazy: true }`,
);
const excaliBrain = np("@riebeckite/plugin-excalibrain", "excaliBrain", {
  render: { depth: 2, value: '"build"' },
  auto: { depth: 2, value: "true" },
  heading: { depth: 2, value: "true" },
  infer: { depth: 2, value: "true" },
  siblings: { depth: 2, value: "true" },
  headingText: { depth: 3, value: '"ExcaliBrain"' },
  width: { depth: 3, value: "720" },
  height: { depth: 3, value: "480" },
});
const canvas = np("@riebeckite/plugin-canvas", "canvas", {
  language: { depth: 2, value: '"canvas"' },
  render: { depth: 2, value: '"both"' },
  className: { depth: 3, value: '"rb-canvas"' },
});
const bases = np("@riebeckite/plugin-bases", "bases", {
  language: { depth: 2, value: '"base"' },
  limit: { depth: 2, value: "100" },
  className: { depth: 3, value: '"rb-bases"' },
  showFallback: { depth: 3, value: "true" },
});
const dataview = np("@riebeckite/plugin-dataview", "dataview", {
  limit: { depth: 2, value: "50" },
  className: { depth: 3, value: '"rb-dataview"' },
  hideFallback: { depth: 3, value: "false" },
});
const flashcards = np("@riebeckite/plugin-flashcards", "flashcards", {
  shuffle: { depth: 2, value: "true" },
  fallback: { depth: 2, value: "true" },
  className: { depth: 3, value: '"rb-flashcards"' },
});
const kanban = np("@riebeckite/plugin-kanban", "kanban", {
  columnMarker: { depth: 2, value: '"##"' },
  autoDetect: { depth: 2, value: "true" },
  className: { depth: 3, value: '"rb-kanban"' },
  fallback: { depth: 3, value: "true" },
});
const query = np("@riebeckite/plugin-query", "query", {
  defaultFormat: { depth: 2, value: '"list"' },
  defaultLimit: { depth: 2, value: "50" },
  className: { depth: 3, value: '"rb-query"' },
  excludeSelf: { depth: 3, value: "true" },
});
const localGraph = np("@riebeckite/plugin-local-graph", "localGraph");
const docs = np(
  "@riebeckite/plugin-docs",
  "docs",
  `{ root: "docs", sidebar: { auto: true }, prevNext: true }`,
);

const readingPlugins = [
  obsidianMarkdown,
  colorMode,
  toc,
  codeEnhance,
  search,
  breadcrumbs,
  navigationStarter,
] as const;
const hoverPreview = np("@riebeckite/plugin-hover-preview", "hoverPreview", {
  delay: { depth: 2, value: "120" },
  excerptLength: { depth: 2, value: "160" },
  selector: { depth: 2, value: "'a[href^=\"/\"]'" },
  includeTitles: { depth: 3, value: "true" },
});
const gardenExplorer = np(
  "@riebeckite/plugin-garden-explorer",
  "gardenExplorer",
);
const glossary = np("@riebeckite/plugin-glossary", "glossary");
const ux = np("@riebeckite/plugin-ux", "ux", {
  progress: { depth: 2, value: "true" },
  backToTop: { depth: 2, value: "true" },
  tocScrollSpy: { depth: 2, value: "true" },
});

/** Developer-experience and ops plugins for the top tier. */
const dailyNotes = np(
  "@riebeckite/plugin-daily-notes",
  "dailyNotes",
  `{ source: { directory: "Daily", pathPattern: "Daily/{YYYY}-{MM}-{DD}" }, extract: { frontmatter: "daily-summary", codeBlock: "daily-snippet" }, widget: { limit: 5 } }`,
);
const rename = np(
  "@riebeckite/plugin-rename",
  "rename",
  `{ enabled: true, status: 308, onUnexpectedRemoval: "warning" }`,
);
const textFragment = np(
  "@riebeckite/plugin-text-fragment",
  "textFragment",
  (context) => `{ prefix: ${JSON.stringify(`${context.variables.title}: `)} }`,
);
const timeline = np("@riebeckite/plugin-timeline", "timeline");
const quality = np(
  "@riebeckite/plugin-quality",
  "quality",
  `{ a11y: { enabled: true }, ignoreRules: [] }`,
);
const deploy = np(
  "@riebeckite/plugin-deploy",
  "deploy",
  `{ provider: "cloudflare-pages" }`,
);
const diagnostics = np(
  "@riebeckite/plugin-diagnostics",
  "diagnostics",
  `{ reportUnusedAssets: true, reportOrphans: true, requiredFrontmatter: ["title"] }`,
);

const defaultTheme = {
  package: "@riebeckite/theme-default",
  factory: "defaultTheme",
} satisfies ScaffoldThemeSpec;

const gardenTheme = {
  package: "@riebeckite/theme-garden",
  factory: "gardenTheme",
} satisfies ScaffoldThemeSpec;

const editorialTheme = {
  package: "@riebeckite/theme-editorial",
  factory: "editorialTheme",
} satisfies ScaffoldThemeSpec;

const technicalTheme = {
  package: "@riebeckite/theme-technical",
  factory: "technicalTheme",
} satisfies ScaffoldThemeSpec;

const folioTheme = {
  package: "@riebeckite/theme-folio",
  factory: "folioTheme",
} satisfies ScaffoldThemeSpec;

/**
 * The showcasing tiers also set every theme option so `riebeckite.config.ts`
 * demonstrates the theme configuration surface.
 */
const showCaseTheme: ScaffoldThemeSpec = {
  package: "@riebeckite/theme-default",
  factory: "defaultTheme",
  options: '{ colorMode: "system" }',
};

const minimalTheme = {
  package: "@riebeckite/theme-minimal",
  factory: "minimalTheme",
} satisfies ScaffoldThemeSpec;

export const empty: ScaffoldPreset = {
  name: "empty",
  description:
    "A blank canvas with only the Riebeckite wiring. Add the theme, plugins, and content yourself.",
  languages: [],
  theme: null,
  plugins: [],
  contentPages: [],
  readme: "short",
};

export const minimal: ScaffoldPreset = {
  name: "minimal",
  description:
    "The smallest readable site, for learning how a Riebeckite site is assembled.",
  languages: ["en"],
  theme: minimalTheme,
  plugins: [obsidianMarkdown],
  contentPages: ["index"],
  readme: "short",
};

export const starter: ScaffoldPreset = {
  name: "starter",
  description:
    "Recommended default: a practical Markdown garden with search, navigation, and reading essentials.",
  languages: ["en"],
  theme: defaultTheme,
  plugins: [
    obsidianMarkdown,
    colorMode,
    seo,
    toc,
    properties,
    alias,
    codeEnhance,
    search,
    backlinks,
    breadcrumbs,
    navigationStarter,
    relatedPosts,
    recentPosts,
    responsiveImage,
    lightbox,
    taxonomy,
    folderPages,
    hoverPreview,
  ],
  contentPages: ["index", "guide", "examples"],
  readme: "standard",
};

const digitalGarden: ScaffoldPreset = {
  name: "digital-garden",
  description:
    "An Obsidian-compatible digital garden with linked notes, backlinks, and a local graph.",
  languages: ["en"],
  theme: gardenTheme,
  plugins: [
    seo,
    ...readingPlugins,
    properties,
    alias,
    backlinks,
    relatedPosts,
    recentPosts,
    taxonomy,
    folderPages,
    localGraph,
    hoverPreview,
  ],
  contentPages: [],
  readme: "standard",
};

export const blog: ScaffoldPreset = {
  name: "blog",
  description:
    "A publishing-focused blog with tags, series, related posts, sharing, and feeds.",
  languages: ["en"],
  theme: editorialTheme,
  plugins: [
    ...readingPlugins,
    blogSeo,
    properties,
    backlinks,
    relatedPosts,
    share,
    recentPosts,
    series,
    blogTaxonomy,
    folderPages,
  ],
  contentPages: [],
  readme: "standard",
};

const documentation: ScaffoldPreset = {
  name: "docs",
  description:
    "A documentation site with an automatic sidebar, table of contents, and previous/next navigation.",
  languages: ["en"],
  theme: technicalTheme,
  plugins: [seo, ...readingPlugins, docs],
  contentPages: [],
  readme: "standard",
};

export const portfolio: ScaffoldPreset = {
  name: "portfolio",
  description:
    "A calm portfolio for projects and contact details, with image and media support when you add it.",
  languages: ["en"],
  theme: folioTheme,
  plugins: [
    ...readingPlugins,
    seo,
    properties,
    backlinks,
    relatedPosts,
    recentPosts,
    responsiveImage,
    lightbox,
    media,
    gallery,
  ],
  contentPages: [],
  readme: "standard",
};

export const showcase: ScaffoldPreset = {
  name: "showcase",
  description:
    "A feature-rich example that demonstrates the Riebeckite plugin ecosystem with rendered samples and references.",
  languages: [...SCAFFOLD_LANGUAGES],
  theme: showCaseTheme,
  plugins: [
    obsidianMarkdown,
    colorMode,
    l10n,
    seo,
    toc,
    properties,
    alias,
    codeEnhance,
    search,
    backlinks,
    breadcrumbs,
    navigationShowcase,
    relatedPosts,
    share,
    changelog,
    webmention,
    recentPosts,
    attachment,
    pdf,
    media,
    responsiveImage,
    lightbox,
    highlight,
    codeTabs,
    codeAnnotations,
    shortcodes,
    series,
    taxonomy,
    folderPages,
    autoCardLink,
    richEmbed,
    gallery,
    glossary,
    mermaidPele,
    graphviz,
    d2,
    plantuml,
    chartjs,
    vegaLite,
    wavedrom,
    markmap,
    map,
    marp,
    qrCode,
    discordEmbed,
    excalidraw,
    excaliBrain,
    canvas,
    bases,
    dataview,
    flashcards,
    kanban,
    query,
    localGraph,
    hoverPreview,
    gardenExplorer,
    ux,
    dailyNotes,
    rename,
    textFragment,
    timeline,
    quality,
    deploy,
    diagnostics,
  ],
  contentPages: [
    "index",
    "framework/plugins",
    "framework/themes",
    "guide",
    "examples",
    "reference/plugins",
    "reference/themes",
  ],
  readme: "rich",
};

export const scaffoldPresets: Readonly<
  Record<ScaffoldPresetName, ScaffoldPreset>
> = {
  starter,
  "digital-garden": digitalGarden,
  blog,
  docs: documentation,
  portfolio,
  minimal,
  showcase,
  empty,
} as const;

export const SCAFFOLD_DEFAULT_PRESET: ScaffoldPresetName = "starter";

export type ScaffoldPresetSummary = {
  readonly name: ScaffoldPresetName;
  readonly description: string;
};

export const SCAFFOLD_PRESETS: readonly ScaffoldPresetSummary[] =
  SCAFFOLD_PRESET_NAMES.map((name) => ({
    name,
    description: scaffoldPresets[name].description,
  }));

export function resolveScaffoldPreset(
  value: ScaffoldPresetName | undefined,
): ScaffoldPreset {
  if (value === undefined) {
    const preset = scaffoldPresets[SCAFFOLD_DEFAULT_PRESET];
    validateScaffoldPreset(preset);
    return preset;
  }
  const preset = scaffoldPresets[value];
  if (!preset) {
    throw new Error(
      `Unknown scaffold preset: ${value}. ` +
        `Available presets: ${SCAFFOLD_PRESET_NAMES.join(", ")}.`,
    );
  }
  validateScaffoldPreset(preset);
  return preset;
}

export function validateScaffoldPreset(preset: ScaffoldPreset): void {
  const factories = new Map<string, string>();
  const packages = new Map<string, string>();

  for (const plugin of preset.plugins) {
    if (plugin.package.trim() === "" || plugin.factory.trim() === "") {
      throw new Error(`Invalid plugin declaration in preset "${preset.name}".`);
    }
    const factoryPackage = factories.get(plugin.factory);
    if (factoryPackage !== undefined && factoryPackage !== plugin.package) {
      throw new Error(
        `Preset "${preset.name}" imports "${plugin.factory}" from both "${factoryPackage}" and "${plugin.package}".`,
      );
    }
    const packageFactory = packages.get(plugin.package);
    if (packageFactory === plugin.factory) {
      throw new Error(
        `Preset "${preset.name}" registers "${plugin.factory}" from "${plugin.package}" more than once.`,
      );
    }
    factories.set(plugin.factory, plugin.package);
    packages.set(plugin.package, plugin.factory);
  }

  if (
    preset.theme &&
    preset.plugins.some((plugin) => plugin.factory === preset.theme?.factory)
  ) {
    throw new Error(
      `Preset "${preset.name}" reuses theme factory "${preset.theme.factory}" as a plugin import.`,
    );
  }
}
