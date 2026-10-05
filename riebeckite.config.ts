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
import { mermaid } from "@riebeckite/plugin-mermaid";
import { navigation } from "@riebeckite/plugin-navigation";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { plantuml } from "@riebeckite/plugin-plantuml";
import { properties } from "@riebeckite/plugin-properties";
import { qrCode } from "@riebeckite/plugin-qr-code";
import { qualityPlugin } from "@riebeckite/plugin-quality";
import { queryPlugin } from "@riebeckite/plugin-query";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { richEmbed } from "@riebeckite/plugin-rich-embed";
import { searchPlugin } from "@riebeckite/plugin-search";
import { seo } from "@riebeckite/plugin-seo";
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
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  site: {
    title: "Riebeckite Documentation",
    description: "Official documentation for the Riebeckite framework",
    author: "Riebeckite Maintainers: Rerurate_514",
    baseUrl: "https://riebeckite.dev",
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
  theme: rerurateTheme({
    colorMode: "system",
    motion: true,
  }),
  plugins: [
    obsidianMarkdown(),
    properties({
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
    uxPlugin(),
    share(),
    relatedPosts(),
    diff({ ui: { maxRevisions: 10 } }),
    webmention({ provider: new MemoryWebmentionProvider() }),
    responsiveImage(),
    localGraphPlugin(),
    l10n({ defaultLang: "ja", languages: ["ja", "en"] }),
    folderPages(),
    navigation({
      items: [
        { label: "Docs", href: "/docs/" },
        { label: "Reference", href: "/docs/reference/" },
        {
          label: "Themes",
          href: "/docs/themes/",
          children: [
            { label: "Default", href: "/docs/themes/default" },
            { label: "Writing a theme", href: "/docs/themes/writing-a-theme" },
          ],
        },
        { label: "Explore", href: "/explore/" },
      ],
      secondary: [
        { label: "Docs", href: "/docs/" },
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
    gardenExplorerPlugin(),
    hoverPreviewPlugin(),
    shortcodes(),
    sidenotes(),
    taxonomy(),
    textFragmentPlugin(),
    qualityPlugin(),
    deployPlugin({ provider: "cloudflare-pages" }),
    diagnostics({
      reportUnusedAssets: true,
      reportOrphans: true,
    }),
  ],
});
