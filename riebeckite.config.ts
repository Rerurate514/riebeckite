import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";
import { media } from "@riebeckite/plugin-media";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { searchPlugin } from "@riebeckite/plugin-search";
import { seo } from "@riebeckite/plugin-seo";
import { tocPlugin } from "@riebeckite/plugin-toc";

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
  theme: {
    name: "riebeckite",
    colorMode: "light",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  },
  plugins: [
    obsidianMarkdown(),
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
    recentPostsPlugin(),
    localGraphPlugin(),
    gardenExplorerPlugin(),
    diagnostics({
      reportUnusedAssets: true,
      reportOrphans: true,
      requiredFrontmatter: ["title"],
    }),
  ],
});
