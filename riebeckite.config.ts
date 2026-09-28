import { defineConfig } from "@riebeckite/core";
import { analytics } from "@riebeckite/plugin-analytics";
import { attachment } from "@riebeckite/plugin-attachment";
import { aliasPlugin } from "@riebeckite/plugin-alias";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { canvas } from "@riebeckite/plugin-canvas";
import { chartjs } from "@riebeckite/plugin-chartjs";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";
import { highlight } from "@riebeckite/plugin-highlight";
import { hoverPreviewPlugin } from "@riebeckite/plugin-hover-preview";
import { kanban } from "@riebeckite/plugin-kanban";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";
import { media } from "@riebeckite/plugin-media";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { plantuml } from "@riebeckite/plugin-plantuml";
import { properties } from "@riebeckite/plugin-properties";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { richEmbed } from "@riebeckite/plugin-rich-embed";
import { searchPlugin } from "@riebeckite/plugin-search";
import { seo } from "@riebeckite/plugin-seo";
import { series } from "@riebeckite/plugin-series";
import { shortcodes } from "@riebeckite/plugin-shortcodes";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "Riebeckite Blog",
    description: "An Obsidian-to-Hono Blog Framework",
    author: "Your Name",
    baseUrl: "https://my-blog.pages.dev",
    locale: "ja_JP",
    defaultOgImage: "/ogp.png",
    feed: {
      language: "ja",
    },
  },
  content: {
    directory: "../../content",
    exclude: ["**/templates/**", "**/private/**"],
    filters: {
      publishStrategy: "explicit",
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
    analytics({ provider: "plausible", domain: "my-blog.pages.dev" }),
    obsidianMarkdown(),
    properties(),
    aliasPlugin(),
    seo({
      siteName: "Riebeckite Blog",
      defaultImage: "/ogp.png",
      feed: {
        rss: true,
        atom: true,
        json: true,
      },
      sitemap: true,
      robots: true,
    }),
    mermaid({
      render: "build",
      theme: {
        light: "default",
        dark: "dark",
      },
    }),
    chartjs(),
    plantuml(),
    excalidraw(),
    canvas(),
    media(),
    richEmbed(),
    attachment(),
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
    codeAnnotations(),
    lightboxPlugin(),
    searchPlugin(),
    tocPlugin(),
    backlinksPlugin(),
    queryPlugin(),
    dataviewPlugin(),
    flashcardsPlugin(),
    kanban(),
    recentPostsPlugin(),
    relatedPosts(),
    responsiveImage(),
    localGraphPlugin(),
    gardenExplorerPlugin(),
    hoverPreviewPlugin(),
    shortcodes(),
    series(),
    diagnostics({
      reportUnusedAssets: true,
      reportOrphans: true,
      requiredFrontmatter: ["title"],
    }),
  ],
});
