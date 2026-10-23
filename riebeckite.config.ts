import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { bases } from "@riebeckite/plugin-bases";
import { breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { canvas } from "@riebeckite/plugin-canvas";
import { chartjs } from "@riebeckite/plugin-chartjs";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { colorModePlugin } from "@riebeckite/plugin-color-mode";
import { d2 } from "@riebeckite/plugin-d2";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";
import { deployPlugin } from "@riebeckite/plugin-deploy";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { diff } from "@riebeckite/plugin-diff";
import { discordEmbed } from "@riebeckite/plugin-discord-embed";
import { docs } from "@riebeckite/plugin-docs";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { folderPages } from "@riebeckite/plugin-folder-pages";
import { galleryPlugin } from "@riebeckite/plugin-gallery";
import { glossary } from "@riebeckite/plugin-glossary";
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
import { mermaidPele } from "@riebeckite/plugin-mermaid-pele";
import { navigation } from "@riebeckite/plugin-navigation";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { plantuml } from "@riebeckite/plugin-plantuml";
import { properties } from "@riebeckite/plugin-properties";
import { qrCode } from "@riebeckite/plugin-qr-code";
import { qualityPlugin } from "@riebeckite/plugin-quality";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { richEmbed } from "@riebeckite/plugin-rich-embed";
import { searchPlugin } from "@riebeckite/plugin-search";
import { seo } from "@riebeckite/plugin-seo";
import { share } from "@riebeckite/plugin-share";
import { shortcodes } from "@riebeckite/plugin-shortcodes";
import { sidenotes } from "@riebeckite/plugin-sidenotes";
import { sourceFiles } from "@riebeckite/plugin-source-files";
import { taxonomy } from "@riebeckite/plugin-taxonomy";
import { textFragmentPlugin } from "@riebeckite/plugin-text-fragment";
import { timeline } from "@riebeckite/plugin-timeline";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { uxPlugin } from "@riebeckite/plugin-ux";
import { vegaLite } from "@riebeckite/plugin-vega-lite";
import { wavedrom } from "@riebeckite/plugin-wavedrom";
import { webmention } from "@riebeckite/plugin-webmention";
import { defaultTheme } from "@riebeckite/theme-default";
import { webmentionProvider } from "./webmention";

export default defineConfig({
  site: {
    title: "Riebeckite",
    description:
      "An open-source framework for building extensible websites from Markdown and Obsidian notes.",
    author: "Riebeckite Maintainers: Rerurate_514",
    baseUrl: "https://riebeckite.dev",
    locale: "en_US",
    defaultOgImage: "/ogp.png",
    feed: {
      language: "en",
    },
  },
  content: {
    directory: "../../docs",
    exclude: ["agents/**", "**/templates/**", "**/private/**"],
    filters: {
      publishStrategy: "selective",
    },
  },
  theme: defaultTheme({
    colorMode: "system",
  }),
  spa: { prefetch: "hover", viewTransitions: true },
  plugins: [
    obsidianMarkdown(),
    properties({
      include: ["created", "modified", "tags", "status", "kind", "source"],
      order: ["created", "modified", "tags", "status", "kind", "source"],
    }),
    seo({
      feed: {
        rss: true,
        atom: true,
        json: true,
      },
      sitemap: true,
      robots: true,
    }),
    discordEmbed(),
    mermaidPele(),
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
    excaliBrain({
      auto: false,
      heading: false,
    }),
    excalidraw(),
    canvas(),
    richEmbed(),
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
    sourceFiles({ include: ["assets/*.ts"] }),
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
    glossary(),
    dataviewPlugin(),
    flashcardsPlugin(),
    kanban(),
    uxPlugin(),
    share(),
    recentPostsPlugin(),
    relatedPosts(),
    diff({ ui: { maxRevisions: 10 } }),
    webmention({ provider: webmentionProvider }),
    responsiveImage(),
    localGraphPlugin(),
    l10n({ defaultLang: "en", languages: ["en", "ja"] }),
    folderPages(),
    navigation({
      items: [
        {
          label: "Docs",
          href: "/docs/",
        },
        {
          label: "Plugins",
          href: "/docs/plugins/",
        },
        {
          label: "Themes",
          href: "/docs/themes/",
        },
      ],
      secondary: [
        {
          label: "GitHub",
          href: "https://github.com/Rerurate514/riebeckite",
          external: true,
        },
      ],
    }),
    docs({
      root: "docs",
      sidebar: { auto: true, label: "Documentation" },
      prevNext: true,
    }),
    hoverPreviewPlugin(),
    shortcodes(),
    sidenotes(),
    taxonomy(),
    textFragmentPlugin(),
    timeline(),
    qualityPlugin(),
    deployPlugin({ provider: "cloudflare-pages" }),
    diagnostics({
      reportUnusedAssets: true,
      reportOrphans: true,
    }),
  ],
});
