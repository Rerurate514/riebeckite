import type { PackageSpec } from "@riebeckite/test/e2e";

export const PACKAGES: PackageSpec[] = [
  { directory: "packages/core", name: "@riebeckite/core" },
  { directory: "packages/cli", name: "@riebeckite/cli" },
  {
    directory: "packages/integrations/analytics-cloudflare",
    name: "@riebeckite/analytics-cloudflare",
  },
  { directory: "packages/integrations/honox", name: "@riebeckite/honox" },
  { directory: "packages/themes/default", name: "@riebeckite/theme-default" },
  {
    directory: "packages/plugins/obsidian-markdown",
    name: "@riebeckite/plugin-obsidian-markdown",
  },
  {
    directory: "packages/plugins/d2",
    name: "@riebeckite/plugin-d2",
  },
  {
    directory: "packages/plugins/autocardlink",
    name: "@riebeckite/plugin-autocardlink",
  },
  {
    directory: "packages/plugins/attachment",
    name: "@riebeckite/plugin-attachment",
  },
  {
    directory: "packages/plugins/code-annotations",
    name: "@riebeckite/plugin-code-annotations",
  },
  {
    directory: "packages/plugins/highlight",
    name: "@riebeckite/plugin-highlight",
  },
  { directory: "packages/plugins/toc", name: "@riebeckite/plugin-toc" },
  {
    directory: "packages/plugins/backlinks",
    name: "@riebeckite/plugin-backlinks",
  },
  { directory: "packages/plugins/bases", name: "@riebeckite/plugin-bases" },
  {
    directory: "packages/plugins/canvas",
    name: "@riebeckite/plugin-canvas",
  },
  { directory: "packages/plugins/query", name: "@riebeckite/plugin-query" },
  { directory: "packages/plugins/alias", name: "@riebeckite/plugin-alias" },
  { directory: "packages/plugins/kanban", name: "@riebeckite/plugin-kanban" },
  {
    directory: "packages/plugins/dataview",
    name: "@riebeckite/plugin-dataview",
  },
  {
    directory: "packages/plugins/properties",
    name: "@riebeckite/plugin-properties",
  },
  {
    directory: "packages/plugins/recent-posts",
    name: "@riebeckite/plugin-recent-posts",
  },
  {
    directory: "packages/plugins/related-posts",
    name: "@riebeckite/plugin-related-posts",
  },
  {
    directory: "packages/plugins/responsive-image",
    name: "@riebeckite/plugin-responsive-image",
  },
  {
    directory: "packages/plugins/rich-embed",
    name: "@riebeckite/plugin-rich-embed",
  },
  { directory: "packages/plugins/search", name: "@riebeckite/plugin-search" },
  {
    directory: "packages/plugins/color-mode",
    name: "@riebeckite/plugin-color-mode",
  },
  {
    directory: "packages/plugins/diagnostics",
    name: "@riebeckite/plugin-diagnostics",
  },
  {
    directory: "packages/plugins/plantuml",
    name: "@riebeckite/plugin-plantuml",
  },
  { directory: "packages/plugins/series", name: "@riebeckite/plugin-series" },
  {
    directory: "packages/plugins/taxonomy",
    name: "@riebeckite/plugin-taxonomy",
  },
  {
    directory: "packages/plugins/analytics",
    name: "@riebeckite/plugin-analytics",
  },
  { directory: "packages/plugins/media", name: "@riebeckite/plugin-media" },
  {
    directory: "packages/plugins/graphviz",
    name: "@riebeckite/plugin-graphviz",
  },
  {
    directory: "packages/plugins/chartjs",
    name: "@riebeckite/plugin-chartjs",
  },
  {
    directory: "packages/plugins/hover-preview",
    name: "@riebeckite/plugin-hover-preview",
  },
  {
    directory: "packages/plugins/flashcards",
    name: "@riebeckite/plugin-flashcards",
  },
  {
    directory: "packages/plugins/shortcodes",
    name: "@riebeckite/plugin-shortcodes",
  },
  {
    directory: "packages/plugins/vega-lite",
    name: "@riebeckite/plugin-vega-lite",
  },
  {
    directory: "packages/plugins/wavedrom",
    name: "@riebeckite/plugin-wavedrom",
  },
  {
    directory: "packages/plugins/ux",
    name: "@riebeckite/plugin-ux",
  },
  { directory: "packages/plugins/marp", name: "@riebeckite/plugin-marp" },
  { directory: "packages/plugins/qr-code", name: "@riebeckite/plugin-qr-code" },
  {
    directory: "packages/plugins/markmap",
    name: "@riebeckite/plugin-markmap",
  },
  {
    directory: "packages/plugins/excalibrain",
    name: "@riebeckite/plugin-excalibrain",
  },
  {
    directory: "packages/plugins/discord-embed",
    name: "@riebeckite/plugin-discord-embed",
  },
  {
    directory: "packages/create-riebeckite",
    name: "create-riebeckite",
  },
];

export const HOME_MARKER = "RIEBECKITE_EXTERNAL_HOME_MARKER";
export const NOTE_MARKER = "RIEBECKITE_EXTERNAL_NOTE_MARKER";
export const QUERY_MARKER = "RIEBECKITE_EXTERNAL_QUERY_MARKER";
export const BASES_MARKER = "RIEBECKITE_EXTERNAL_BASES_MARKER";
export const DATAVIEW_NOTE_TITLE = "Dataview Alpha";
export const PROPERTY_MARKER = "RIEBECKITE_EXTERNAL_PROPERTY_MARKER";
export const KANBAN_MARKER = "RIEBECKITE_EXTERNAL_KANBAN_MARKER";
export const KANBAN_BLOCK_MARKER = "RIEBECKITE_EXTERNAL_KANBAN_BLOCK_MARKER";
export const SITE_COMPONENT_MARKER = "RIEBECKITE_SITE_COMPONENT_MARKER";
export const SITE_ISLAND_MARKER = "RIEBECKITE_SITE_ISLAND_MARKER";
export const LOCAL_PLUGIN_MARKER = "RIEBECKITE_EXTERNAL_LOCAL_PLUGIN_MARKER";
export const LOCAL_PLUGIN_PAGE_MARKER =
  "RIEBECKITE_EXTERNAL_PLUGIN_PAGE_MARKER";
export const QR_MARKER = "RIEBECKITE_EXTERNAL_QR_MARKER";
export const MARKMAP_MARKER = "RIEBECKITE_EXTERNAL_MARKMAP_MARKER";
export const EXCALIBRAIN_MARKER = "RIEBECKITE_EXTERNAL_EXCALIBRAIN_MARKER";
export const PRIVATE_MARKER = "RIEBECKITE_EXTERNAL_PRIVATE_MARKER";
export const HOVER_PREVIEW_TITLE_MARKER = "Hover Preview Alpha Note";
export const FLASHCARDS_MARKER = "RIEBECKITE_EXTERNAL_FLASHCARDS_MARKER";
export const FLASHCARDS_CLIENT_IDENTIFIER = "rb-flashcards";
export const CODE_ANNOTATIONS_MARKER =
  "RIEBECKITE_EXTERNAL_CODE_ANNOTATIONS_MARKER";
export const SHORTCODE_MARKER = "RIEBECKITE_EXTERNAL_SHORTCODE_MARKER";
export const CANVAS_MARKER = "RIEBECKITE_EXTERNAL_CANVAS_MARKER";
export const RICHEMBED_MARKER = "RIEBECKITE_EXTERNAL_RICHEMBED_MARKER";
export const CHARTJS_MARKER = "RIEBECKITE_EXTERNAL_CHARTJS_MARKER";
export const PLANTUML_MARKER = "RIEBECKITE_EXTERNAL_PLANTUML_MARKER";
export const ALIAS_MARKER = "RIEBECKITE_EXTERNAL_ALIAS_MARKER";
export const HIGHLIGHT_MARKER = "RIEBECKITE_EXTERNAL_HIGHLIGHT_MARKER";
export const SERIES_MARKER = "RIEBECKITE_EXTERNAL_SERIES_MARKER";
export const SERIES_PART_1_PERMALINK = "/notes/series-demo-1";
export const SERIES_PART_2_PERMALINK = "/notes/series-demo-2";
export const ANALYTICS_CONTENT_ID_ATTRIBUTE = "data-riebeckite-content-id";
export const ANALYTICS_CONTENT_ID = "external-fixture-home";
export const ANALYTICS_DEMO_CONTENT_ID = "analytics-demo";
export const ANALYTICS_PAGE_MARKER =
  "RIEBECKITE_EXTERNAL_ANALYTICS_PAGE_MARKER";
export const D2_MARKER = "RIEBECKITE_EXTERNAL_D2_MARKER";
export const GRAPHVIZ_MARKER = "RIEBECKITE_EXTERNAL_GRAPHVIZ_MARKER";
export const VEGALITE_MARKER = "RIEBECKITE_EXTERNAL_VEGALITE_MARKER";
export const WAVEDROM_MARKER = "RIEBECKITE_EXTERNAL_WAVEDROM_MARKER";
export const MARP_MARKER = "RIEBECKITE_EXTERNAL_MARP_MARKER";
