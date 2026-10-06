import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { colorModePlugin } from "@riebeckite/plugin-color-mode";
import { l10n } from "@riebeckite/plugin-l10n";
import { seo } from "@riebeckite/plugin-seo";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { properties } from "@riebeckite/plugin-properties";
import { aliasPlugin } from "@riebeckite/plugin-alias";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { searchPlugin } from "@riebeckite/plugin-search";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import { breadcrumbsPlugin } from "@riebeckite/plugin-breadcrumbs";
import { navigation } from "@riebeckite/plugin-navigation";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";
import { series } from "@riebeckite/plugin-series";
import { taxonomy } from "@riebeckite/plugin-taxonomy";
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
    colorModePlugin(),
    l10n({ defaultLang: "en", languages: ["en","ja","zh-CN","es","de","fr","ko"] }),
    seo({ sitemap: true, robots: true }),
    tocPlugin(),
    properties({ render: "slot", include: ["created", "modified", "tags", "status"], order: ["created", "modified", "tags", "status"] }),
    aliasPlugin({ status: 308 }),
    codeEnhance({ lineNumbers: true, copyButton: true, filename: true, lineHighlight: true, diffHighlight: true }),
    searchPlugin(),
    backlinksPlugin(),
    breadcrumbsPlugin(),
    navigation({ items: [{ label: "Guide", href: "/guide" }, { label: "Examples", href: "/examples" }, { label: "Notes", href: "/notes/planning", children: [{ label: "Planning", href: "/notes/planning" }, { label: "Writing", href: "/notes/writing" }] }], secondary: [{ label: "Guide", href: "/guide" }, { label: "Examples", href: "/examples" }] }),
    relatedPosts({ limit: 5, useTags: true, useBacklinks: true }),
    recentPostsPlugin(),
    responsiveImage({ lazy: true, decoding: true, sizes: "100vw", widths: [640, 1280, 1920] }),
    lightboxPlugin({ selectorClass: "rr-lightbox-trigger" }),
    series({ key: "series", orderKey: "series_order", titleKey: "series_title", positionLabel: false }),
    taxonomy({ tags: true, folders: true, related: true }),
  ],
});
