import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { colorMode } from "@riebeckite/plugin-color-mode";
import { seo } from "@riebeckite/plugin-seo";
import { toc } from "@riebeckite/plugin-toc";
import { properties } from "@riebeckite/plugin-properties";
import { alias } from "@riebeckite/plugin-alias";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { search } from "@riebeckite/plugin-search";
import { backlinks } from "@riebeckite/plugin-backlinks";
import { breadcrumbs } from "@riebeckite/plugin-breadcrumbs";
import { navigation } from "@riebeckite/plugin-navigation";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { recentPosts } from "@riebeckite/plugin-recent-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { lightbox } from "@riebeckite/plugin-lightbox";
import { taxonomy } from "@riebeckite/plugin-taxonomy";
import { folderPages } from "@riebeckite/plugin-folder-pages";
import { hoverPreview } from "@riebeckite/plugin-hover-preview";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "starter",
    description: "",
    baseUrl: "",
    locale: "en",
    defaultOgImage: "/ogp.png",
  },
  content: {
    directory: "content",
  },
  theme: defaultTheme(),
  plugins: [
    obsidianMarkdown(),
    colorMode(),
    seo({ sitemap: true, robots: true }),
    toc(),
    properties({ include: ["created", "modified", "tags", "status"], fields: { created: { type: "date", format: "yyyy-MM-dd" }, modified: { type: "date", format: "yyyy-MM-dd" }, tags: { type: "tags", variant: "chips" }, status: { type: "badge", variants: { active: "success", draft: "warning", archived: "danger" } } } }),
    alias({ status: 308 }),
    codeEnhance({ lineNumbers: true, copyButton: true, filename: true, lineHighlight: true, diffHighlight: true }),
    search(),
    backlinks(),
    breadcrumbs(),
    navigation(),
    relatedPosts({ limit: 5, useTags: true, useBacklinks: true }),
    recentPosts(),
    responsiveImage({ lazy: true, decoding: true, sizes: "100vw", widths: [640, 1280, 1920] }),
    lightbox({ selectorClass: "rr-lightbox-trigger" }),
    taxonomy({ tags: true, folders: true, related: true }),
    folderPages(),
    hoverPreview({ delay: 120, excerptLength: 160, selector: 'a[href^="/"]' }),
  ],
});
