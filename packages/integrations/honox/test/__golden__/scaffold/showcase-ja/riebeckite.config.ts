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
import { share } from "@riebeckite/plugin-share";
import { changelog } from "@riebeckite/plugin-changelog";
import { webmention } from "@riebeckite/plugin-webmention";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import { attachment } from "@riebeckite/plugin-attachment";
import { pdf } from "@riebeckite/plugin-pdf";
import { media } from "@riebeckite/plugin-media";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";
import { highlight } from "@riebeckite/plugin-highlight";
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";
import { shortcodes } from "@riebeckite/plugin-shortcodes";
import { series } from "@riebeckite/plugin-series";
import { taxonomy } from "@riebeckite/plugin-taxonomy";
import { folderPagesPlugin } from "@riebeckite/plugin-folder-pages";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { richEmbed } from "@riebeckite/plugin-rich-embed";
import { gallery } from "@riebeckite/plugin-gallery";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { graphviz } from "@riebeckite/plugin-graphviz";
import { d2 } from "@riebeckite/plugin-d2";
import { plantuml } from "@riebeckite/plugin-plantuml";
import { chartjs } from "@riebeckite/plugin-chartjs";
import { vegaLite } from "@riebeckite/plugin-vega-lite";
import { wavedrom } from "@riebeckite/plugin-wavedrom";
import { markmap } from "@riebeckite/plugin-markmap";
import { map } from "@riebeckite/plugin-map";
import { marp } from "@riebeckite/plugin-marp";
import { qrCode } from "@riebeckite/plugin-qr-code";
import { discordEmbed } from "@riebeckite/plugin-discord-embed";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";
import { canvas } from "@riebeckite/plugin-canvas";
import { bases } from "@riebeckite/plugin-bases";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { kanban } from "@riebeckite/plugin-kanban";
import { queryPlugin } from "@riebeckite/plugin-query";
import { localGraphPlugin } from "@riebeckite/plugin-local-graph";
import { hoverPreviewPlugin } from "@riebeckite/plugin-hover-preview";
import { gardenExplorerPlugin } from "@riebeckite/plugin-garden-explorer";
import { uxPlugin } from "@riebeckite/plugin-ux";
import { dailyNotesPlugin } from "@riebeckite/plugin-daily-notes";
import { renamePlugin } from "@riebeckite/plugin-rename";
import { textFragmentPlugin } from "@riebeckite/plugin-text-fragment";
import { qualityPlugin } from "@riebeckite/plugin-quality";
import { deployPlugin } from "@riebeckite/plugin-deploy";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "showcase-ja",
    description: "",
    baseUrl: "",
    locale: "ja_JP",
    defaultOgImage: "/ogp.png",
  },
  content: {
    directory: "content",
  },
  theme: defaultTheme({ colorMode: "system", typography: "system", articleLayout: "article", userCss: [] }),
  plugins: [
    obsidianMarkdown(),
    colorModePlugin(),
    l10n({ defaultLang: "ja", languages: ["en","ja","zh-CN","es","de","fr","ko"] }),
    seo({ sitemap: true, robots: true, feed: { rss: true, atom: true, json: true } }),
    tocPlugin(),
    properties({ render: "slot", include: ["created", "modified", "tags", "status"], order: ["created", "modified", "tags", "status"] }),
    aliasPlugin({ status: 308 }),
    codeEnhance({ lineNumbers: true, copyButton: true, filename: true, lineHighlight: true, diffHighlight: true, theme: { light: "github-light", dark: "github-dark" }, wrapToggle: true }),
    searchPlugin(),
    backlinksPlugin(),
    breadcrumbsPlugin(),
    navigation({ items: [{ label: "Guide", href: "/guide" }, { label: "Examples", href: "/examples" }, { label: "Framework", href: "/framework/plugins", children: [{ label: "Plugins", href: "/framework/plugins" }, { label: "Themes", href: "/framework/themes" }] }], secondary: [{ label: "Guide", href: "/guide" }, { label: "Examples", href: "/examples" }] }),
    relatedPosts({ limit: 5, useTags: true, useBacklinks: true, minScore: 1, heading: true, headingText: "Related", className: "rb-related-posts" }),
    share({ placement: "bottom", services: ["x", "bluesky", "mastodon", "facebook", "linkedin", "hatena", "copy"], mastodonInstance: "mastodon.social" }),
    changelog({ perNote: true, lookbackDays: 90, dateFormat: "iso", siteWide: false }),
    webmention({ headingText: "Mentions", limit: 20 }),
    recentPostsPlugin(),
    attachment({ showSize: true }),
    pdf({ height: "640px", initialPage: 1, toolbar: true, showMetadata: true, downloadLabel: "Download PDF" }),
    media({ preload: "metadata", lazy: true, showCaption: true, showDownload: false, showOpenOriginal: true }),
    responsiveImage({ lazy: true, decoding: true, sizes: "100vw", widths: [640, 1280, 1920], formats: ["webp", "avif"], className: "rb-responsive-image" }),
    lightboxPlugin({ selectorClass: "rr-lightbox-trigger" }),
    highlight({ tag: "mark", className: "rb-mark" }),
    codeTabs({ syncTabs: true }),
    codeAnnotations({ className: "rb-code" }),
    shortcodes({ builtins: true }),
    series({ key: "series", orderKey: "series_order", titleKey: "series_title", positionLabel: false, heading: true, className: "rb-series" }),
    taxonomy({ tags: true, folders: true, related: true, feeds: { rss: true, atom: true, json: true }, relatedLimit: 8 }),
    folderPagesPlugin(),
    autoCardLinkPlugin({ className: "rb-cardlink" }),
    richEmbed({ providers: ["youtube", "vimeo", "spotify"] }),
    gallery({ columns: 3, aspect: "4/3", language: "gallery" }),
    mermaid({ render: "build", theme: { light: "default", dark: "dark" }, caption: true, fallback: true }),
    graphviz({ render: "build", engine: "dot", caption: true, fallback: true }),
    d2({ render: "build", theme: { light: 0, dark: 1 }, layout: "dagre", caption: true }),
    plantuml({ server: "https://www.plantuml.com/plantuml", format: "svg", caption: true, fallback: true }),
    chartjs({ responsive: true, caption: true, className: "rb-chartjs" }),
    vegaLite({ caption: true, theme: "light", renderer: "canvas", actions: false, className: "rb-vega-lite" }),
    wavedrom({ skin: "default", caption: true, fallback: true, className: "rb-wavedrom" }),
    markmap({ caption: true, height: 320, colorFreezeLevel: 2 }),
    map({ zoom: 13, height: 320, tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors" }),
    marp({ theme: "default", allowHtml: true, math: true, caption: true }),
    qrCode({ level: "M", margin: 1, width: 160, dark: "#000000", light: "#ffffff", caption: true, className: "rb-qr" }),
    discordEmbed({ themeColor: "#5865F2", imageAlt: true, imageDimensions: true }),
    excalidraw({ lazy: true }),
    excaliBrain({ render: "build", auto: true, heading: true, infer: true, siblings: true, headingText: "ExcaliBrain", width: 720, height: 480 }),
    canvas({ language: "canvas", render: "both", className: "rb-canvas" }),
    bases({ language: "base", limit: 100, className: "rb-bases", showFallback: true }),
    dataviewPlugin({ limit: 50, className: "rb-dataview", hideFallback: false }),
    flashcardsPlugin({ shuffle: true, fallback: true, className: "rb-flashcards" }),
    kanban({ columnMarker: "##", autoDetect: true, className: "rb-kanban", fallback: true }),
    queryPlugin({ defaultFormat: "list", defaultLimit: 50, className: "rb-query", excludeSelf: true }),
    localGraphPlugin(),
    hoverPreviewPlugin({ delay: 120, excerptLength: 160, selector: 'a[href^="/"]', includeTitles: true }),
    gardenExplorerPlugin(),
    uxPlugin({ progress: true, backToTop: true, tocScrollSpy: true, codeCopy: true }),
    dailyNotesPlugin({ source: { directory: "Daily", pathPattern: "Daily/{YYYY}-{MM}-{DD}" }, extract: { frontmatter: "daily-summary", codeBlock: "daily-snippet" }, widget: { limit: 5 } }),
    renamePlugin({ enabled: true, status: 308, onUnexpectedRemoval: "warning" }),
    textFragmentPlugin({ prefix: "showcase-ja: " }),
    qualityPlugin({ a11y: { enabled: true }, ignoreRules: [] }),
    deployPlugin({ provider: "cloudflare-pages" }),
    diagnostics({ reportUnusedAssets: true, reportOrphans: true, requiredFrontmatter: ["title"] }),
  ],
});
