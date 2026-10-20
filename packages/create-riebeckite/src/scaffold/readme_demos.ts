import type { ScaffoldPreset } from "./presets.js";
export type ReadmeDemo = {
  readonly title: { readonly en: string; readonly ja: string };
  readonly intro: { readonly en: string; readonly ja: string };
  readonly markdown: string;
};

export const README_DEMOS: Readonly<Record<string, ReadmeDemo>> = {
  "@riebeckite/plugin-obsidian-markdown/callout": {
    title: { en: "Callouts", ja: "コールアウト" },
    intro: {
      en: "A block quote with a `[!type]` marker becomes a styled callout panel.",
      ja: "`[!type]` マーカー付きブロック引用をスタイル付きパネルに変換します。",
    },
    markdown: [
      "> [!tip] Try it",
      "> A callout is a block quote with a `[!type]` marker. `[!info]`,",
      "> `[!warning]`, and `[!question]` render the same way.",
    ].join("\n"),
  },
  "@riebeckite/plugin-obsidian-markdown/wikilinks": {
    title: { en: "Wikilinks and embeds", ja: "ウィキリンクと埋め込み" },
    intro: {
      en: "`[[...]]` links and `![[...]]` embeds resolve to real permalinks from the content manifest.",
      ja: "`[[...]]` リンクと `![[...]]` 埋め込みは、コンテンツマニフェストから実際のパーマリンクへ解決されます。",
    },
    markdown:
      "Read the [[guide]] and [[index]] pages. `![[index]]` embeds the note inline.",
  },
  "@riebeckite/plugin-code-enhance": {
    title: { en: "Code with a toolbar", ja: "ツールバー付きコード" },
    intro: {
      en: "Code fences get line numbers, a filename bar, line highlighting, and a copy button.",
      ja: "コードフェンスに行番号・ファイル名バー・行ハイライト・コピーボタンが付きます。",
    },
    markdown: fence(
      "ts",
      [
        "// Syntax highlighting, line numbers, and a copy button",
        "export function hello(name: string): string {",
        '  return "Hello, " + name + "!";',
        "}",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-code-tabs": {
    title: { en: "Code tabs", ja: "タブ切り替えコード" },
    intro: {
      en: 'Adjacent `tab="..."` fences become one tabbed group; `syncTabs: true` keeps the same label in sync across groups.',
      ja: '隣り合う `tab="..."` フェンスがタブグループになります。`syncTabs: true` でページ内の同じラベルを同期できます。',
    },
    markdown: [
      fence('ts tab="React"', 'const greeting = "Hello from React";'),
      fence('js tab="Vanilla"', 'console.log("Hello from JavaScript");'),
    ].join("\n"),
  },
  "@riebeckite/plugin-mermaid-pele": {
    title: { en: "Mermaid (Pele)", ja: "Mermaid (Pele)" },
    intro: {
      en: "A `mermaid` fence becomes a static diagram at build time without Chromium.",
      ja: "`mermaid` フェンスは Chromium を使わずビルド時に静的な図になります。",
    },
    markdown: fence(
      "mermaid",
      [
        "flowchart LR",
        "  A[Note] --> B{Published?}",
        "  B -->|yes| C[Site]",
        "  B -->|no| D[Draft]",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-d2": {
    title: { en: "D2", ja: "D2" },
    intro: {
      en: "A `d2` fence is compiled into an SVG diagram.",
      ja: "`d2` フェンスが SVG 図にコンパイルされます。",
    },
    markdown: fence("d2", "site: Riebeckite\n  content -> build -> deploy"),
  },
  "@riebeckite/plugin-graphviz": {
    title: { en: "Graphviz / DOT", ja: "Graphviz / DOT" },
    intro: {
      en: "A `dot` fence is rendered with a configurable engine (here `dot`).",
      ja: "`dot` フェンスが指定のエンジン（ここでは `dot`）でレンダリングされます。",
    },
    markdown: fence(
      "dot",
      "digraph G {\n  notes -> pages;\n  pages -> html;\n}",
    ),
  },
  "@riebeckite/plugin-chartjs": {
    title: { en: "Chart.js", ja: "Chart.js" },
    intro: {
      en: "A `chart` JSON fence renders with Chart.js; a caption comes from the block `title`.",
      ja: "`chart` JSON フェンスが Chart.js で描画されます。キャプションはブロックの `title` から取られます。",
    },
    markdown: fence(
      "chart",
      `{
  "type": "bar",
  "data": {
    "labels": ["Mon", "Tue", "Wed"],
    "datasets": [{ "label": "Visits", "data": [12, 19, 8] }]
  }
}`,
    ),
  },
  "@riebeckite/plugin-vega-lite": {
    title: { en: "Vega-Lite", ja: "Vega-Lite" },
    intro: {
      en: "A `vega-lite` JSON specification becomes a Vega chart.",
      ja: "`vega-lite` の JSON 仕様が Vega チャートになります。",
    },
    markdown: fence(
      "vega-lite",
      `{
  "title": "Revenue",
  "data": {
    "values": [
      { "category": "A", "value": 28 },
      { "category": "B", "value": 55 }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": { "field": "category", "type": "nominal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}`,
    ),
  },
  "@riebeckite/plugin-wavedrom": {
    title: { en: "WaveDrom", ja: "WaveDrom" },
    intro: {
      en: "A `wavedrom` JSON fence becomes a digital timing diagram.",
      ja: "`wavedrom` JSON フェンスがデジタルタイミング図になります。",
    },
    markdown: fence(
      "wavedrom",
      `{
  "signal": [
    { "name": "clk", "wave": "p......" },
    { "name": "bus", "wave": "x.34.5x", "data": "head body tail" }
  ]
}`,
    ),
  },
  "@riebeckite/plugin-markmap": {
    title: { en: "Markmap", ja: "Markmap" },
    intro: {
      en: "A `markmap` fence turns its heading outline into an interactive mind map.",
      ja: "`markmap` フェンスの見出し構成がインタラクティブなマインドマップになります。",
    },
    markdown: fence(
      "markmap",
      [
        "# Project",
        "",
        "## Design",
        "",
        "### Notation",
        "### Rendering",
        "",
        "## Delivery",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-map": {
    title: { en: "Maps", ja: "地図" },
    intro: {
      en: "A `map` fence embeds an OpenStreetMap: a static fallback (coordinates and links) first, upgraded to an interactive map when JavaScript is available.",
      ja: "`map` フェンスが OpenStreetMap を埋め込みます。まず静的なフォールバック（座標とリンク）を表示し、JavaScript がある場合はインタラクティブな地図に拡張します。",
    },
    markdown: fence(
      "map",
      [
        "center: 35.6812, 139.7671",
        "zoom: 13",
        "label: Tokyo Station",
        "markers:",
        "  - 35.6812, 139.7671 | Tokyo Station",
        "  - 35.6586, 139.7454 | Tokyo Tower",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-marp": {
    title: { en: "Marp slides", ja: "Marp スライド" },
    intro: {
      en: "A `marp` fence renders slides, separated by `---`.",
      ja: "`marp` フェンスがスライドとして描画されます。スライドは `---` で区切ります。",
    },
    markdown: fence(
      'marp title="Intro deck"',
      ["# First slide", "", "- a bullet", "", "---", "", "# Second slide"].join(
        "\n",
      ),
    ),
  },
  "@riebeckite/plugin-qr-code": {
    title: { en: "QR codes", ja: "QR コード" },
    intro: {
      en: "A `qr` fence becomes an inline SVG QR code, encoded entirely at build time.",
      ja: "`qr` フェンスがインライン SVG の QR コードになります（ビルド時に全てエンコードされます）。",
    },
    markdown: fence("qr", "# caption: Project page\nhttps://example.com/"),
  },
  "@riebeckite/plugin-rich-embed": {
    title: { en: "Rich embeds", ja: "リッチ埋め込み" },
    intro: {
      en: "An `embed` fence turns a URL into a YouTube, Vimeo, Spotify, CodePen, or Gist embed.",
      ja: "`embed` フェンスの URL が YouTube・Vimeo・Spotify・CodePen・Gist の埋め込みになります。",
    },
    markdown: fence(
      "embed",
      [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "title: Demo video",
        "caption: A short caption",
        "aspect: 16/9",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-gallery": {
    title: { en: "Gallery cards", ja: "ギャラリーカード" },
    intro: {
      en: "A `gallery` YAML fence renders a responsive grid of cards — handy for theme or project showcases.",
      ja: "`gallery` の YAML フェンスがレスポンシブなカードグリッドを描画します。テーマやプロジェクトの紹介に便利です。",
    },
    markdown: fence(
      "gallery",
      [
        "columns: 3",
        "items:",
        "  - title: Default",
        "    description: A clean, typographic theme.",
        "    meta: v0.0.5",
        "    href: https://riebeckite.dev/docs/themes/default",
        "  - title: Minimal",
        "    description: Stripped back to the essentials.",
        "    meta: v0.0.5",
        "    href: https://riebeckite.dev/docs/themes/minimal",
        "  - title: Gruvbox",
        "    description: A warm, high-contrast palette.",
        "    meta: v0.0.5",
        "    href: https://riebeckite.dev/docs/themes/gruvbox",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-dataview": {
    title: { en: "Dataview", ja: "Dataview" },
    intro: {
      en: "A `dataview` query renders a table of notes from the manifest.",
      ja: "`dataview` クエリがマニフェストからノート一覧を描画します。",
    },
    markdown: fence(
      "dataview",
      [
        'TABLE file.name AS "Name", status',
        "FROM #project",
        'WHERE status = "active"',
        "SORT file.name asc",
        "LIMIT 10",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-query": {
    title: { en: "Query", ja: "Query" },
    intro: {
      en: "A `query` fence is YAML that filters and sorts entries from the manifest.",
      ja: "`query` フェンスの YAML でマニフェストのエントリを絞り込み・並べ替えできます。",
    },
    markdown: fence(
      "query",
      [
        "filter:",
        "  tags:",
        "    any: [diary]",
        "sort:",
        "  field: date",
        "  order: desc",
        "limit: 5",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-bases": {
    title: { en: "Base views", ja: "Base ビュー" },
    intro: {
      en: "A `base` YAML fence renders a Base table view.",
      ja: "`base` YAML フェンスが Base のテーブルビューを描画します。",
    },
    markdown: fence(
      "base",
      [
        "filters:",
        "  and:",
        '    - file.hasTag("featured")',
        "properties:",
        "  file.name:",
        "    displayName: Title",
        "views:",
        "  - type: table",
        "    name: Featured",
        "    limit: 10",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-kanban": {
    title: { en: "Kanban boards", ja: "カンバンボード" },
    intro: {
      en: "A note whose body is `##` columns of task lists becomes a board; `#tags` and `[[wikilinks]]` work inside cards.",
      ja: "本文が `##` 列とタスクリストでできたノートはボードになります。カード内では `#タグ` や `[[ウィキリンク]]` も使えます。",
    },
    markdown: fence(
      "md",
      [
        "## Backlog",
        "",
        "- [ ] Draft the release notes",
        "- [ ] Link to [[index]]",
        "",
        "## Done",
        "",
        "- [x] Publish the fixture",
      ].join("\n"),
    ),
  },
};

/**
 * English-only content pages keep a `.en` suffix unless `en` is the default
 * language. `examples` is intentionally absent: it is localized like the
 * tour pages, with English as the fallback for untranslated languages.
 */
export const ENGLISH_ONLY_PAGES = new Set([
  "guide",
  "reference/plugins",
  "reference/themes",
]);

export function fence(language: string, body: string): string {
  const tick = "```";
  return `${tick}${language}\n${body}\n${tick}`;
}

export function hasPlugin(
  preset: ScaffoldPreset,
  packageName: string,
): boolean {
  return preset.plugins.some((plugin) => plugin.package === packageName);
}

/**
 * A demo key is either `@scope/package` or `@scope/package/topic`. Recover the
 * package name: the first two `/`-separated segments form the scoped name.
 */
export function demoPackage(key: string): string {
  return key.split("/", 2).join("/");
}

export const README_DEMO_ORDER = [
  "@riebeckite/plugin-obsidian-markdown/callout",
  "@riebeckite/plugin-obsidian-markdown/wikilinks",
  "@riebeckite/plugin-code-enhance",
  "@riebeckite/plugin-code-tabs",
  "@riebeckite/plugin-mermaid-pele",
  "@riebeckite/plugin-d2",
  "@riebeckite/plugin-graphviz",
  "@riebeckite/plugin-chartjs",
  "@riebeckite/plugin-vega-lite",
  "@riebeckite/plugin-wavedrom",
  "@riebeckite/plugin-markmap",
  "@riebeckite/plugin-map",
  "@riebeckite/plugin-marp",
  "@riebeckite/plugin-qr-code",
  "@riebeckite/plugin-rich-embed",
  "@riebeckite/plugin-gallery",
  "@riebeckite/plugin-dataview",
  "@riebeckite/plugin-query",
  "@riebeckite/plugin-bases",
  "@riebeckite/plugin-kanban",
];
