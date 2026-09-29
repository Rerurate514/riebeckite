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
 * self-contained and can be imported and reused on its own:
 *
 *    import { full, starter } from "@riebeckite/honox/scaffold";
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
  | "empty"
  | "minimal"
  | "starter"
  | "rich"
  | "full"
  | "max"
  | "ultra";

export const SCAFFOLD_PRESET_NAMES: readonly ScaffoldPresetName[] = [
  "empty",
  "minimal",
  "starter",
  "rich",
  "full",
  "max",
  "ultra",
];

export function isScaffoldPresetName(
  value: string,
): value is ScaffoldPresetName {
  return (SCAFFOLD_PRESET_NAMES as readonly string[]).includes(value);
}

/** How a theme factory is referenced in the generated config file. */
export type ScaffoldThemeSpec = {
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
  /** Optional literal source for the factory call arguments. */
  readonly options?: string;
};

/** Content pages the scaffold can emit. */
export type ScaffoldPageKey =
  | "index"
  | "framework/plugins"
  | "framework/themes"
  | "guide"
  | "examples"
  | "reference/plugins"
  | "reference/themes";

/** `app/` shell files the scaffold can emit. */
export type ScaffoldAppFileKey =
  | "server"
  | "client"
  | "config"
  | "content"
  | "paths"
  | "global"
  | "style"
  | "renderer"
  | "index"
  | "slug"
  | "header"
  | "article";

/** README verbosity. */
export type ScaffoldReadmeLevel = "short" | "standard" | "rich";

export type ScaffoldPreset = {
  readonly name: ScaffoldPresetName;
  /** One-line human description, shown by `--list-presets`. */
  readonly description: string;
  /** Languages the l10n plugin is configured with. A single entry means no l10n. */
  readonly languages: readonly ScaffoldLanguage[];
  readonly theme: ScaffoldThemeSpec | null;
  readonly plugins: readonly ScaffoldPluginSpec[];
  readonly contentPages: readonly ScaffoldPageKey[];
  /**
   * Order-sensitive; the scaffolder writes `app/` files in this order.
   * Structural files (`server`, `client`, `config`, `content`, `paths`,
   * `global`, `style`, `renderer`) are always included.
   */
  readonly appFiles: readonly ScaffoldAppFileKey[];
  readonly readme: ScaffoldReadmeLevel;
};

const np = (
  package_: string,
  factory: string,
  options?: string,
): ScaffoldPluginSpec => ({
  package: package_,
  factory,
  options,
});

/** The foundation plugin, shared by every non-empty preset. */
const obsidianMarkdown = np(
  "@riebeckite/plugin-obsidian-markdown",
  "obsidianMarkdown",
);

/** The next tier: look and language. */
const colorMode = np("@riebeckite/plugin-color-mode", "colorModePlugin");
const l10n = np("@riebeckite/plugin-l10n", "l10n");

/** Core publishing and reading experience. */
const seo = np("@riebeckite/plugin-seo", "seo");
const toc = np("@riebeckite/plugin-toc", "tocPlugin");
const properties = np("@riebeckite/plugin-properties", "properties");
const alias = np("@riebeckite/plugin-alias", "aliasPlugin");
const codeEnhance = np("@riebeckite/plugin-code-enhance", "codeEnhance");

/** Discovery, media, and reading polish. */
const search = np("@riebeckite/plugin-search", "searchPlugin");
const backlinks = np("@riebeckite/plugin-backlinks", "backlinksPlugin");
const relatedPosts = np("@riebeckite/plugin-related-posts", "relatedPosts");
const recentPosts = np("@riebeckite/plugin-recent-posts", "recentPostsPlugin");
const attachment = np("@riebeckite/plugin-attachment", "attachment");
const media = np("@riebeckite/plugin-media", "media");
const responsiveImage = np(
  "@riebeckite/plugin-responsive-image",
  "responsiveImage",
);
const lightbox = np("@riebeckite/plugin-lightbox", "lightboxPlugin");
const highlight = np("@riebeckite/plugin-highlight", "highlight");
const codeTabs = np("@riebeckite/plugin-code-tabs", "codeTabs");
const codeAnnotations = np(
  "@riebeckite/plugin-code-annotations",
  "codeAnnotations",
);
const shortcodes = np("@riebeckite/plugin-shortcodes", "shortcodes");
const series = np("@riebeckite/plugin-series", "series");
const autoCardLink = np(
  "@riebeckite/plugin-autocardlink",
  "autoCardLinkPlugin",
);
const richEmbed = np("@riebeckite/plugin-rich-embed", "richEmbed");

/** Diagrams, charts, and knowledge tools for the heavy tiers. */
const mermaid = np("@riebeckite/plugin-mermaid", "mermaid");
const graphviz = np("@riebeckite/plugin-graphviz", "graphviz");
const d2 = np("@riebeckite/plugin-d2", "d2");
const plantuml = np("@riebeckite/plugin-plantuml", "plantuml");
const chartjs = np("@riebeckite/plugin-chartjs", "chartjs");
const vegaLite = np("@riebeckite/plugin-vega-lite", "vegaLite");
const wavedrom = np("@riebeckite/plugin-wavedrom", "wavedrom");
const markmap = np("@riebeckite/plugin-markmap", "markmap");
const marp = np("@riebeckite/plugin-marp", "marp");
const qrCode = np("@riebeckite/plugin-qr-code", "qrCode");
const discordEmbed = np("@riebeckite/plugin-discord-embed", "discordEmbed");
const excalidraw = np("@riebeckite/plugin-excalidraw", "excalidraw");
const excaliBrain = np("@riebeckite/plugin-excalibrain", "excaliBrain");
const canvas = np("@riebeckite/plugin-canvas", "canvas");
const bases = np("@riebeckite/plugin-bases", "bases");
const dataview = np("@riebeckite/plugin-dataview", "dataviewPlugin");
const flashcards = np("@riebeckite/plugin-flashcards", "flashcardsPlugin");
const kanban = np("@riebeckite/plugin-kanban", "kanban");
const query = np("@riebeckite/plugin-query", "queryPlugin");
const localGraph = np("@riebeckite/plugin-local-graph", "localGraphPlugin");
const hoverPreview = np(
  "@riebeckite/plugin-hover-preview",
  "hoverPreviewPlugin",
);
const gardenExplorer = np(
  "@riebeckite/plugin-garden-explorer",
  "gardenExplorerPlugin",
);
const ux = np("@riebeckite/plugin-ux", "uxPlugin");

/** Developer-experience and ops plugins for the top tier. */
const dailyNotes = np("@riebeckite/plugin-daily-notes", "dailyNotesPlugin");
const rename = np("@riebeckite/plugin-rename", "renamePlugin");
const textFragment = np(
  "@riebeckite/plugin-text-fragment",
  "textFragmentPlugin",
);
const quality = np("@riebeckite/plugin-quality", "qualityPlugin");
const deploy = np("@riebeckite/plugin-deploy", "deployPlugin");
const diagnostics = np("@riebeckite/plugin-diagnostics", "diagnostics");

const defaultTheme = {
  package: "@riebeckite/theme-default",
  factory: "defaultTheme",
} satisfies ScaffoldThemeSpec;

const minimalTheme = {
  package: "@riebeckite/theme-minimal",
  factory: "minimalTheme",
} satisfies ScaffoldThemeSpec;

/** Structural `app/` files every preset shares. */
const BASE_APP_FILES = [
  "server",
  "client",
  "config",
  "content",
  "paths",
  "global",
  "style",
  "renderer",
] as const satisfies readonly ScaffoldAppFileKey[];

export const empty: ScaffoldPreset = {
  name: "empty",
  description:
    "A blank application shell: no plugins, no theme, no content, no components.",
  languages: [],
  theme: null,
  plugins: [],
  contentPages: [],
  appFiles: [...BASE_APP_FILES, "index"],
  readme: "short",
};

export const minimal: ScaffoldPreset = {
  name: "minimal",
  description:
    "The smallest useful site: Obsidian Markdown, the minimal theme, and one page.",
  languages: ["en"],
  theme: minimalTheme,
  plugins: [obsidianMarkdown],
  contentPages: ["index"],
  appFiles: [...BASE_APP_FILES, "index", "slug", "article"],
  readme: "short",
};

export const starter: ScaffoldPreset = {
  name: "starter",
  description:
    "The default starter: Obsidian Markdown, color mode, seven languages, and a site header.",
  languages: [...SCAFFOLD_LANGUAGES],
  theme: defaultTheme,
  plugins: [obsidianMarkdown, colorMode, l10n],
  contentPages: ["index"],
  appFiles: [...BASE_APP_FILES, "index", "slug", "header", "article"],
  readme: "standard",
};

export const rich: ScaffoldPreset = {
  name: "rich",
  description:
    "A showcasing starter: publishing and reading plugins plus guided ecosystem tour pages in seven languages.",
  languages: [...SCAFFOLD_LANGUAGES],
  theme: defaultTheme,
  plugins: [
    obsidianMarkdown,
    colorMode,
    l10n,
    seo,
    toc,
    properties,
    alias,
    codeEnhance,
  ],
  contentPages: ["index", "framework/plugins", "framework/themes"],
  appFiles: [...BASE_APP_FILES, "index", "slug", "header", "article"],
  readme: "rich",
};

export const full: ScaffoldPreset = {
  name: "full",
  description:
    "A ready blog: discovery, media, and reading plugins plus a build guide.",
  languages: [...SCAFFOLD_LANGUAGES],
  theme: defaultTheme,
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
    relatedPosts,
    recentPosts,
    attachment,
    media,
    responsiveImage,
    lightbox,
    highlight,
    codeTabs,
    codeAnnotations,
    shortcodes,
    series,
    autoCardLink,
    richEmbed,
  ],
  contentPages: ["index", "framework/plugins", "framework/themes", "guide"],
  appFiles: [...BASE_APP_FILES, "index", "slug", "header", "article"],
  readme: "rich",
};

export const max: ScaffoldPreset = {
  name: "max",
  description:
    "Diagram and knowledge plugins on top of full, with showcase example pages.",
  languages: [...SCAFFOLD_LANGUAGES],
  theme: defaultTheme,
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
    relatedPosts,
    recentPosts,
    attachment,
    media,
    responsiveImage,
    lightbox,
    highlight,
    codeTabs,
    codeAnnotations,
    shortcodes,
    series,
    autoCardLink,
    richEmbed,
    mermaid,
    graphviz,
    d2,
    plantuml,
    chartjs,
    vegaLite,
    wavedrom,
    markmap,
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
  ],
  contentPages: [
    "index",
    "framework/plugins",
    "framework/themes",
    "guide",
    "examples",
  ],
  appFiles: [...BASE_APP_FILES, "index", "slug", "header", "article"],
  readme: "rich",
};

export const ultra: ScaffoldPreset = {
  name: "ultra",
  description:
    "The full plugin catalog and theme reference pages — everything the ecosystem offers.",
  languages: [...SCAFFOLD_LANGUAGES],
  theme: defaultTheme,
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
    relatedPosts,
    recentPosts,
    attachment,
    media,
    responsiveImage,
    lightbox,
    highlight,
    codeTabs,
    codeAnnotations,
    shortcodes,
    series,
    autoCardLink,
    richEmbed,
    mermaid,
    graphviz,
    d2,
    plantuml,
    chartjs,
    vegaLite,
    wavedrom,
    markmap,
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
  appFiles: [...BASE_APP_FILES, "index", "slug", "header", "article"],
  readme: "rich",
};

export const scaffoldPresets: Readonly<
  Record<ScaffoldPresetName, ScaffoldPreset>
> = { empty, minimal, starter, rich, full, max, ultra } as const;

export const SCAFFOLD_DEFAULT_PRESET: ScaffoldPresetName = "starter";

export function resolveScaffoldPreset(
  value: ScaffoldPresetName | ScaffoldPreset | undefined,
): ScaffoldPreset {
  if (value === undefined) return scaffoldPresets[SCAFFOLD_DEFAULT_PRESET];
  if (typeof value === "object") return value;
  const preset = scaffoldPresets[value];
  if (!preset) {
    throw new Error(
      `Unknown scaffold preset: ${value}. ` +
        `Available presets: ${SCAFFOLD_PRESET_NAMES.join(", ")}.`,
    );
  }
  return preset;
}
