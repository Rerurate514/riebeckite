import { fence } from "./readme_demos_fence.js";
import type { ReadmeDemo } from "./readme_demos_types.js";

export const README_DEMOS_A: Readonly<Record<string, ReadmeDemo>> = {
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
};
