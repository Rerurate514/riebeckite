import {
  breadcrumbs,
  codeEnhance,
  colorMode,
  navigationStarter,
  np,
  obsidianMarkdown,
  search,
  toc,
} from "./presets_plugins_a.js";

export const gallery = np("@riebeckite/plugin-gallery", "gallery", {
  columns: { depth: 2, value: "3" },
  aspect: { depth: 2, value: '"4/3"' },
  language: { depth: 3, value: '"gallery"' },
});

/** Diagrams, charts, and knowledge tools for the heavy tiers. */
export const mermaidPele = np("@riebeckite/plugin-mermaid-pele", "mermaidPele");
export const graphviz = np("@riebeckite/plugin-graphviz", "graphviz", {
  render: { depth: 2, value: '"build"' },
  engine: { depth: 2, value: '"dot"' },
  caption: { depth: 3, value: "true" },
  fallback: { depth: 3, value: "true" },
});
export const d2 = np("@riebeckite/plugin-d2", "d2", {
  render: { depth: 2, value: '"build"' },
  theme: { depth: 2, value: "{ light: 0, dark: 1 }" },
  layout: { depth: 2, value: '"dagre"' },
  caption: { depth: 3, value: "true" },
});
export const plantuml = np("@riebeckite/plugin-plantuml", "plantuml", {
  server: { depth: 2, value: '"https://www.plantuml.com/plantuml"' },
  format: { depth: 2, value: '"svg"' },
  caption: { depth: 3, value: "true" },
  fallback: { depth: 3, value: "true" },
});
export const chartjs = np("@riebeckite/plugin-chartjs", "chartjs", {
  responsive: { depth: 2, value: "true" },
  caption: { depth: 2, value: "true" },
  className: { depth: 3, value: '"rb-chartjs"' },
});
export const vegaLite = np("@riebeckite/plugin-vega-lite", "vegaLite", {
  caption: { depth: 2, value: "true" },
  theme: { depth: 2, value: '"light"' },
  renderer: { depth: 2, value: '"canvas"' },
  actions: { depth: 3, value: "false" },
  className: { depth: 3, value: '"rb-vega-lite"' },
});
export const wavedrom = np("@riebeckite/plugin-wavedrom", "wavedrom", {
  skin: { depth: 2, value: '"default"' },
  caption: { depth: 2, value: "true" },
  fallback: { depth: 3, value: "true" },
  className: { depth: 3, value: '"rb-wavedrom"' },
});
export const markmap = np("@riebeckite/plugin-markmap", "markmap", {
  caption: { depth: 2, value: "true" },
  height: { depth: 2, value: "320" },
  colorFreezeLevel: { depth: 3, value: "2" },
});
export const map = np("@riebeckite/plugin-map", "map", {
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
export const marp = np("@riebeckite/plugin-marp", "marp", {
  theme: { depth: 2, value: '"default"' },
  allowHtml: { depth: 2, value: "true" },
  math: { depth: 2, value: "true" },
  caption: { depth: 3, value: "true" },
});
export const qrCode = np("@riebeckite/plugin-qr-code", "qrCode", {
  level: { depth: 2, value: '"M"' },
  margin: { depth: 2, value: "1" },
  width: { depth: 2, value: "160" },
  dark: { depth: 3, value: '"#000000"' },
  light: { depth: 3, value: '"#ffffff"' },
  caption: { depth: 3, value: "true" },
  className: { depth: 3, value: '"rb-qr"' },
});
export const discordEmbed = np(
  "@riebeckite/plugin-discord-embed",
  "discordEmbed",
  {
    themeColor: { depth: 2, value: '"#5865F2"' },
    imageAlt: { depth: 3, value: "true" },
    imageDimensions: { depth: 3, value: "true" },
  },
);
export const excalidraw = np("@riebeckite/plugin-excalidraw", "excalidraw");
export const excaliBrain = np("@riebeckite/plugin-excalibrain", "excaliBrain", {
  render: { depth: 2, value: '"build"' },
  auto: { depth: 2, value: "true" },
  heading: { depth: 2, value: "true" },
  infer: { depth: 2, value: "true" },
  siblings: { depth: 2, value: "true" },
  headingText: { depth: 3, value: '"ExcaliBrain"' },
  width: { depth: 3, value: "720" },
  height: { depth: 3, value: "480" },
});
export const canvas = np("@riebeckite/plugin-canvas", "canvas", {
  language: { depth: 2, value: '"canvas"' },
  render: { depth: 2, value: '"both"' },
  className: { depth: 3, value: '"rb-canvas"' },
});
export const bases = np("@riebeckite/plugin-bases", "bases", {
  language: { depth: 2, value: '"base"' },
  limit: { depth: 2, value: "100" },
  className: { depth: 3, value: '"rb-bases"' },
  showFallback: { depth: 3, value: "true" },
});
export const dataview = np("@riebeckite/plugin-dataview", "dataview", {
  limit: { depth: 2, value: "50" },
  className: { depth: 3, value: '"rb-dataview"' },
  hideFallback: { depth: 3, value: "false" },
});
export const flashcards = np("@riebeckite/plugin-flashcards", "flashcards", {
  shuffle: { depth: 2, value: "true" },
  fallback: { depth: 2, value: "true" },
  className: { depth: 3, value: '"rb-flashcards"' },
});
export const kanban = np("@riebeckite/plugin-kanban", "kanban", {
  columnMarker: { depth: 2, value: '"##"' },
  autoDetect: { depth: 2, value: "true" },
  className: { depth: 3, value: '"rb-kanban"' },
  fallback: { depth: 3, value: "true" },
});
export const query = np("@riebeckite/plugin-query", "query", {
  defaultFormat: { depth: 2, value: '"list"' },
  className: { depth: 3, value: '"rb-query"' },
  excludeSelf: { depth: 3, value: "true" },
});
export const localGraph = np("@riebeckite/plugin-local-graph", "localGraph");
export const docs = np(
  "@riebeckite/plugin-docs",
  "docs",
  `{ root: "docs", sidebar: { auto: true }, prevNext: true }`,
);

export const readingPlugins = [
  obsidianMarkdown,
  colorMode,
  toc,
  codeEnhance,
  search,
  breadcrumbs,
  navigationStarter,
] as const;
export const hoverPreview = np(
  "@riebeckite/plugin-hover-preview",
  "hoverPreview",
  {
    delay: { depth: 2, value: "120" },
    excerptLength: { depth: 2, value: "160" },
    selector: { depth: 2, value: "'a[href^=\"/\"]'" },
    includeTitles: { depth: 3, value: "true" },
  },
);
export const gardenExplorer = np(
  "@riebeckite/plugin-garden-explorer",
  "gardenExplorer",
);
export const glossary = np("@riebeckite/plugin-glossary", "glossary");
export const ux = np("@riebeckite/plugin-ux", "ux", {
  progress: { depth: 2, value: "true" },
  backToTop: { depth: 2, value: "true" },
});

/** Developer-experience and ops plugins for the top tier. */
export const dailyNotes = np(
  "@riebeckite/plugin-daily-notes",
  "dailyNotes",
  `{ source: { directory: "Daily", pathPattern: "Daily/{YYYY}-{MM}-{DD}" }, extract: { frontmatter: "daily-summary", codeBlock: "daily-snippet" }, widget: { limit: 5 } }`,
);
export const rename = np(
  "@riebeckite/plugin-rename",
  "rename",
  `{ enabled: true, status: 308, onUnexpectedRemoval: "warning" }`,
);
export const textFragment = np(
  "@riebeckite/plugin-text-fragment",
  "textFragment",
);
export const timeline = np("@riebeckite/plugin-timeline", "timeline");
export const quality = np(
  "@riebeckite/plugin-quality",
  "quality",
  `{ a11y: { enabled: true }, ignoreRules: [] }`,
);
export const deploy = np(
  "@riebeckite/plugin-deploy",
  "deploy",
  `{ provider: "cloudflare-pages" }`,
);
export const diagnostics = np(
  "@riebeckite/plugin-diagnostics",
  "diagnostics",
  `{ reportUnusedAssets: true, reportOrphans: true, requiredFrontmatter: ["title"] }`,
);
