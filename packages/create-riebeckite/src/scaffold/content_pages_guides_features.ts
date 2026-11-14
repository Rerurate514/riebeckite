import { fence } from "./readme_demos.js";

const FEATURE_MARKDOWN_GUIDES: Readonly<
  Record<string, { readonly summary: string; readonly markdown: string }>
> = {
  "@riebeckite/plugin-series": {
    summary: "Groups Markdown pages into a reading series using frontmatter.",
    markdown: [
      "---",
      "series: riebeckite-guide",
      "series_title: Riebeckite Guide",
      "series_order: 2",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-taxonomy": {
    summary:
      "Builds tag/folder taxonomy pages from Markdown metadata and content location.",
    markdown: ["---", "tags: [design, notes]", "---", "", "# Tagged note"].join(
      "\n",
    ),
  },
  "@riebeckite/plugin-autocardlink": {
    summary: "Turns suitable standalone links into rich card links.",
    markdown: "https://example.com/articles/riebeckite-introduction",
  },
  "@riebeckite/plugin-plantuml": {
    summary:
      "A `plantuml` fence is rendered to SVG through the configured PlantUML server.",
    markdown: fence(
      "plantuml",
      ["@startuml", "Alice -> Bob: Hello", "Bob --> Alice: Hi", "@enduml"].join(
        "\n",
      ),
    ),
  },
  "@riebeckite/plugin-discord-embed": {
    summary:
      "Renders Discord-style rich embed metadata from frontmatter or embed blocks.",
    markdown: [
      "---",
      "title: Discord preview",
      "description: A page with rich metadata for card rendering.",
      "image: /images/card.png",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-excalidraw": {
    summary: "Embeds Excalidraw drawings referenced from Markdown.",
    markdown:
      "![[Architecture.excalidraw]]\n\n![Sketch](./drawings/sketch.excalidraw)",
  },
  "@riebeckite/plugin-excalibrain": {
    summary:
      "Builds an Excalibrain-style local graph from links, tags, headings, and inferred relationships.",
    markdown:
      "# Concept\n\nLinks to [[Parent idea]], [[Sibling idea]], and [[Related idea]] become graph relationships.",
  },
  "@riebeckite/plugin-canvas": {
    summary: "Embeds Obsidian Canvas JSON as a rendered canvas/fallback.",
    markdown: '```canvas\n{ "nodes": [], "edges": [] }\n```',
  },
  "@riebeckite/plugin-flashcards": {
    summary: "Turns Q/A style Markdown into flashcards.",
    markdown: [
      "# Flashcards",
      "",
      "Q: What is Riebeckite?",
      "A: A content-first static site framework.",
      "",
      "---",
      "",
      "What does SSG mean?::Static Site Generation",
    ].join("\n"),
  },
  "@riebeckite/plugin-local-graph": {
    summary: "Shows nearby notes based on Markdown links and wikilinks.",
    markdown:
      "# Local graph source\n\nConnect this page to [[guide]], [[examples]], and [[reference/plugins]].",
  },
  "@riebeckite/plugin-hover-preview": {
    summary:
      "Shows previews when hovering internal links generated from Markdown.",
    markdown:
      "Hover this internal link: [Guide](/guide/) or this wikilink: [[guide]].",
  },
  "@riebeckite/plugin-garden-explorer": {
    summary:
      "Adds garden navigation/explorer UI from the content tree. Markdown files and folders become the source data.",
    markdown: fence(
      "text",
      [
        "content/",
        "  notes/",
        "    ideas.md",
        "    projects.md",
        "  reference/",
        "    plugins.md",
      ].join("\n"),
    ),
  },
  "@riebeckite/plugin-ux": {
    summary:
      "Adds reading UX such as progress, back-to-top, scroll spy, and copy buttons. Markdown headings and code blocks provide the anchors.",
    markdown: [
      "## Long section",
      "",
      "```ts",
      "console.log('copy me')",
      "```",
    ].join("\n"),
  },
  "@riebeckite/plugin-daily-notes": {
    summary:
      "Extracts daily-note summaries/snippets from dated Markdown files.",
    markdown: [
      "---",
      "daily-summary: Shipped the plugin reference page.",
      "---",
      "",
      "```daily-snippet",
      "Updated the showcase examples.",
      "```",
    ].join("\n"),
  },
  "@riebeckite/plugin-rename": {
    summary:
      "Creates redirects when Markdown entries declare previous paths or when rename data is available.",
    markdown: [
      "---",
      "previousPaths:",
      "  - /old-slug/",
      "  - /notes/old-title/",
      "---",
    ].join("\n"),
  },
  "@riebeckite/plugin-text-fragment": {
    summary:
      "Adds text-fragment friendly copy/open behavior for selected Markdown text.",
    markdown:
      "Select this sentence in the rendered page and copy a text-fragment link to it.",
  },
  "@riebeckite/plugin-quality": {
    summary:
      "Reports accessibility/content quality diagnostics from rendered Markdown output.",
    markdown:
      "![Missing alt text example](./images/needs-alt.png)\n\nUse headings in order: #, then ##, then ###.",
  },
  "@riebeckite/plugin-deploy": {
    summary:
      "Adds deployment integration for the generated site. Markdown does not need syntax; published pages become deployable output.",
    markdown: [
      "---",
      "publish: true",
      "---",
      "",
      "# This page is included in the deployed site",
    ].join("\n"),
  },
  "@riebeckite/plugin-diagnostics": {
    summary:
      "Reports diagnostics such as missing required frontmatter, orphan pages, and unused assets.",
    markdown: [
      "---",
      "title: Required title",
      "publish: true",
      "---",
      "",
      "Link orphan pages from another note to clear orphan diagnostics.",
    ].join("\n"),
  },
};

export { FEATURE_MARKDOWN_GUIDES };
