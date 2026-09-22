import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { seo } from "@riebeckite/plugin-seo";

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
    lightboxPlugin(),
    diagnostics({
      reportUnusedAssets: true,
      reportOrphans: true,
      requiredFrontmatter: ["title"],
    }),
  ],
});
