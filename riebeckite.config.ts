import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { dailyNotesPlugin } from "@riebeckite/plugin-daily-notes";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";
import { deployPlugin } from "@riebeckite/plugin-deploy";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";
import { hoverPreviewPlugin } from "@riebeckite/plugin-hover-preview";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";
import { media } from "@riebeckite/plugin-media";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { properties } from "@riebeckite/plugin-properties";
import { qualityPlugin } from "@riebeckite/plugin-quality";
import { queryPlugin } from "@riebeckite/plugin-query";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { renamePlugin } from "@riebeckite/plugin-rename";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { searchPlugin } from "@riebeckite/plugin-search";
import { seo } from "@riebeckite/plugin-seo";
import { textFragmentPlugin } from "@riebeckite/plugin-text-fragment";
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
    obsidianMarkdown(),
    properties(),
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
    excalidraw(),
    media(),
    attachment(),
    autoCardLinkPlugin(),
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
    lightboxPlugin(),
    searchPlugin(),
    tocPlugin(),
    backlinksPlugin(),
    queryPlugin(),
    dataviewPlugin(),
    recentPostsPlugin(),
    relatedPosts(),
    responsiveImage(),
    localGraphPlugin(),
    gardenExplorerPlugin(),
    hoverPreviewPlugin(),
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
