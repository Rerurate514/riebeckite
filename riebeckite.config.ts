import { defineConfig } from "@riebeckite/core";
import { archive } from "@riebeckite/plugin-archive";
import { articleMetadata } from "@riebeckite/plugin-article-metadata";
import { attachment } from "@riebeckite/plugin-attachment";
import { autoCardLink } from "@riebeckite/plugin-autocardlink";
import { backlinks } from "@riebeckite/plugin-backlinks";
import { bases } from "@riebeckite/plugin-bases";
import { breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { canvas } from "@riebeckite/plugin-canvas";
import { chartjs } from "@riebeckite/plugin-chartjs";
import { citations } from "@riebeckite/plugin-citations";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { colorMode } from "@riebeckite/plugin-color-mode";
import { d2 } from "@riebeckite/plugin-d2";
import { dataview } from "@riebeckite/plugin-dataview";
import { deploy } from "@riebeckite/plugin-deploy";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { diff } from "@riebeckite/plugin-diff";
import { discordEmbed } from "@riebeckite/plugin-discord-embed";
import { docs } from "@riebeckite/plugin-docs";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { flashcards } from "@riebeckite/plugin-flashcards";
import { folderPages } from "@riebeckite/plugin-folder-pages";
import { gallery } from "@riebeckite/plugin-gallery";
import { glossary } from "@riebeckite/plugin-glossary";
import { graphviz } from "@riebeckite/plugin-graphviz";
import { highlight } from "@riebeckite/plugin-highlight";
import { hoverPreview } from "@riebeckite/plugin-hover-preview";
import { kanban } from "@riebeckite/plugin-kanban";
import { l10n } from "@riebeckite/plugin-l10n";
import { lightbox } from "@riebeckite/plugin-lightbox";
import { localGraph } from "@riebeckite/plugin-local-graph";
import { map } from "@riebeckite/plugin-map";
import { markmap } from "@riebeckite/plugin-markmap";
import { marp } from "@riebeckite/plugin-marp";
import { media } from "@riebeckite/plugin-media";
import { mermaidPele } from "@riebeckite/plugin-mermaid-pele";
import { metaBind } from "@riebeckite/plugin-meta-bind";
import { navigation } from "@riebeckite/plugin-navigation";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { pdf } from "@riebeckite/plugin-pdf";
import { plantuml } from "@riebeckite/plugin-plantuml";
import { properties } from "@riebeckite/plugin-properties";
import { qrCode } from "@riebeckite/plugin-qr-code";
import { quality } from "@riebeckite/plugin-quality";
import { query } from "@riebeckite/plugin-query";
import { recentPosts } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { richEmbed } from "@riebeckite/plugin-rich-embed";
import { search } from "@riebeckite/plugin-search";
import { seo } from "@riebeckite/plugin-seo";
import { series } from "@riebeckite/plugin-series";
import { share } from "@riebeckite/plugin-share";
import { shortcodes } from "@riebeckite/plugin-shortcodes";
import { sidenotes } from "@riebeckite/plugin-sidenotes";
import { sourceFiles } from "@riebeckite/plugin-source-files";
import { taxonomy } from "@riebeckite/plugin-taxonomy";
import { textFragment } from "@riebeckite/plugin-text-fragment";
import { timeline } from "@riebeckite/plugin-timeline";
import { toc } from "@riebeckite/plugin-toc";
import { ux } from "@riebeckite/plugin-ux";
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
    media(),
    attachment(),
    pdf(),
    properties({
      include: ["created", "modified", "tags", "status", "kind", "source"],
      order: ["created", "modified", "tags", "status", "kind", "source"],
    }),
    articleMetadata(),
    seo({
      feed: {
        rss: true,
        atom: true,
        json: true,
      },
      sitemap: true,
      robots: true,
    }),
    citations({
      bibliography: "assets/showcase-references.bib",
    }),
    discordEmbed(),
    mermaidPele(),
    metaBind(),
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
    autoCardLink(),
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
    colorMode(),
    codeAnnotations(),
    lightbox(),
    search(),
    toc(),
    backlinks(),
    breadcrumbs(),
    query(),
    bases(),
    gallery(),
    glossary(),
    dataview(),
    flashcards(),
    kanban(),
    ux(),
    share(),
    recentPosts(),
    relatedPosts(),
    series(),
    diff({ ui: { maxRevisions: 10 } }),
    webmention({ provider: webmentionProvider }),
    responsiveImage(),
    localGraph(),
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
    hoverPreview(),
    shortcodes(),
    sidenotes(),
    taxonomy(),
    textFragment(),
    timeline(),
    archive(),
    quality(),
    deploy({ provider: "cloudflare-pages" }),
    diagnostics({
      reportUnusedAssets: true,
      reportOrphans: true,
    }),
  ],
});
