import { defineConfig } from "@riebeckite/core";
import { aliasPlugin } from "@riebeckite/plugin-alias";
import { attachment } from "@riebeckite/plugin-attachment";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { bases } from "@riebeckite/plugin-bases";
import { breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { canvas } from "@riebeckite/plugin-canvas";
import { changelog } from "@riebeckite/plugin-changelog";
import { chartjs } from "@riebeckite/plugin-chartjs";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { colorModePlugin } from "@riebeckite/plugin-color-mode";
import { d2 } from "@riebeckite/plugin-d2";
import { dailyNotesPlugin } from "@riebeckite/plugin-daily-notes";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";
import { deployPlugin } from "@riebeckite/plugin-deploy";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { discordEmbed } from "@riebeckite/plugin-discord-embed";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { galleryPlugin } from "@riebeckite/plugin-gallery";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";
import { graphviz } from "@riebeckite/plugin-graphviz";
import { highlight } from "@riebeckite/plugin-highlight";
import { hoverPreviewPlugin } from "@riebeckite/plugin-hover-preview";
import { kanban } from "@riebeckite/plugin-kanban";
import { l10n } from "@riebeckite/plugin-l10n";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";
import { map } from "@riebeckite/plugin-map";
import { markmap } from "@riebeckite/plugin-markmap";
import { marp } from "@riebeckite/plugin-marp";
import { media } from "@riebeckite/plugin-media";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { pdf } from "@riebeckite/plugin-pdf";
import { plantuml } from "@riebeckite/plugin-plantuml";
import { properties } from "@riebeckite/plugin-properties";
import { qrCode } from "@riebeckite/plugin-qr-code";
import { qualityPlugin } from "@riebeckite/plugin-quality";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { renamePlugin } from "@riebeckite/plugin-rename";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { richEmbed } from "@riebeckite/plugin-rich-embed";
import { searchPlugin } from "@riebeckite/plugin-search";
import { seo } from "@riebeckite/plugin-seo";
import { series } from "@riebeckite/plugin-series";
import { share } from "@riebeckite/plugin-share";
import { shortcodes } from "@riebeckite/plugin-shortcodes";
import { sidenotes } from "@riebeckite/plugin-sidenotes";
import { taxonomy } from "@riebeckite/plugin-taxonomy";
import { textFragmentPlugin } from "@riebeckite/plugin-text-fragment";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { uxPlugin } from "@riebeckite/plugin-ux";
import { vegaLite } from "@riebeckite/plugin-vega-lite";
import { wavedrom } from "@riebeckite/plugin-wavedrom";
import {
  MemoryWebmentionProvider,
  webmention,
} from "@riebeckite/plugin-webmention";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "Riebeckite Documentation",
    description: "Official documentation for the Riebeckite framework",
    author: "Riebeckite Maintainers",
    baseUrl: "https://docs.riebeckite.dev",
    locale: "ja_JP",
    defaultOgImage: "/ogp.png",
    feed: {
      language: "ja",
    },
  },
  content: {
    directory: "../../docs",
    exclude: ["agents/**", "**/templates/**", "**/private/**"],
    filters: {
      publishStrategy: "selective",
    },
  },
  markdown: {},
  theme: defaultTheme({
    colorMode: "light",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
  plugins: [
    obsidianMarkdown(),
    properties({
      render: "slot",
      include: [
        "created",
        "modified",
        "tags",
        "status",
        "kind",
        "date",
        "source",
      ],
      order: [
        "created",
        "modified",
        "tags",
        "status",
        "kind",
        "date",
        "source",
      ],
    }),
    aliasPlugin(),
    seo({
      siteName: "Riebeckite Documentation",
      defaultImage: "/ogp.png",
      feed: {
        rss: true,
        atom: true,
        json: true,
      },
      sitemap: true,
      robots: true,
    }),
    discordEmbed(),
    mermaid({
      render: "build",
      theme: {
        light: "default",
        dark: "dark",
      },
    }),
    markmap(),
    map(),
    marp(),
    qrCode(),
    chartjs(),
    vegaLite(),
    wavedrom(),
    plantuml(),
    d2({
      render: "build",
      theme: {
        light: 0,
        dark: 1,
      },
      layout: "dagre",
    }),
    graphviz({
      render: "build",
      engine: "dot",
    }),
    excaliBrain(),
    excalidraw(),
    canvas(),
    media(),
    richEmbed(),
    attachment(),
    pdf(),
    autoCardLinkPlugin(),
    highlight(),
    codeEnhance({
      theme: {
        light: "github-light",
        dark: "github-dark",
      },
      lineNumbers: true,
      copyButton: true,
      filename: true,
      lineHighlight: true,
      diffHighlight: true,
      wrapToggle: true,
    }),
    codeTabs(),
    colorModePlugin(),
    codeAnnotations(),
    lightboxPlugin(),
    searchPlugin(),
    tocPlugin(),
    backlinksPlugin(),
    breadcrumbs(),
    queryPlugin(),
    bases(),
    galleryPlugin(),
    dataviewPlugin(),
    flashcardsPlugin(),
    kanban(),
    recentPostsPlugin(),
    uxPlugin(),
    share(),
    relatedPosts(),
    changelog(),
    webmention({ provider: new MemoryWebmentionProvider() }),
    responsiveImage(),
    localGraphPlugin(),
    l10n({ defaultLang: "ja", languages: ["ja", "en"] }),
    gardenExplorerPlugin(),
    hoverPreviewPlugin(),
    shortcodes(),
    sidenotes(),
    series(),
    taxonomy({ folderIndexes: true }),
    dailyNotesPlugin(),
    renamePlugin(),
    textFragmentPlugin(),
    qualityPlugin(),
    deployPlugin({ provider: "cloudflare-pages" }),
    diagnostics({
      reportUnusedAssets: true,
      reportOrphans: true,
      requiredFrontmatter: ["title"],
    }),
  ],
});
