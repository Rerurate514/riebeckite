import {
  createWorker,
  d1Storage,
  kvStorage,
} from "@riebeckite/analytics-cloudflare";
import {
  buildContentCollections,
  type ContentCollection,
  type ContentCollectionDefinition,
  type ContentQueryGroup,
  defineConfig,
  groupContentEntries,
  type PostContent,
  queryContentEntries,
  queryContentPage,
  type RiebeckiteConfig,
} from "@riebeckite/core";
import {
  buildHonoxApplication,
  createRiebeckiteSsg,
  defaultSsgEntry,
  defaultSsrExternals,
  loadRiebeckiteConfig,
  type RiebeckiteViteOptions,
  resolveHonoxApplicationRoot,
  resolveHonoxConfig,
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
  riebeckiteVite,
} from "@riebeckite/honox";
import {
  mountRiebeckiteEndpoints,
  resolveContentRoute,
} from "@riebeckite/honox/server";
import {
  ArticleContent,
  type ArticleContentProps,
  ArticleFooter,
  type ArticleFooterProps,
  ArticleHeader,
  type ArticleHeaderProps,
  ArticleLayout,
  type ArticleLayoutProps,
  ArticleMeta,
  type ArticleMetaProps,
  Article as ArticlePrimitive,
  type ArticleProps,
  Sidebar,
  type SidebarProps,
} from "@riebeckite/honox/ui";
import {
  analytics,
  MemoryAnalyticsProvider,
} from "@riebeckite/plugin-analytics";
import { initAnalytics } from "@riebeckite/plugin-analytics/client";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { initAutoCardLink } from "@riebeckite/plugin-autocardlink/client";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import Backlinks from "@riebeckite/plugin-backlinks/components";
import { bases } from "@riebeckite/plugin-bases";
import { canvas } from "@riebeckite/plugin-canvas";
import { initCanvas } from "@riebeckite/plugin-canvas/client";
import {
  codeAnnotations,
  parseCodeAnnotations,
} from "@riebeckite/plugin-code-annotations";
import { d2 } from "@riebeckite/plugin-d2";
import { initD2Diagrams } from "@riebeckite/plugin-d2/client";
import { discordEmbed } from "@riebeckite/plugin-discord-embed";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";
import { initExcaliBrain } from "@riebeckite/plugin-excalibrain/client";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { initFlashcards } from "@riebeckite/plugin-flashcards/client";
import { graphviz } from "@riebeckite/plugin-graphviz";
import { highlight, highlightPlugin } from "@riebeckite/plugin-highlight";
import {
  hoverPreviewPlugin,
  resolveHoverPreviewOptions,
} from "@riebeckite/plugin-hover-preview";
import { initHoverPreview } from "@riebeckite/plugin-hover-preview/client";
import {
  type KanbanOptions,
  type KanbanParseResult,
  kanban,
  kanbanPlugin,
  parseKanban,
  type ResolvedKanbanOptions,
  renderKanban,
  resolveKanbanOptions,
} from "@riebeckite/plugin-kanban";
import { markmap } from "@riebeckite/plugin-markmap";
import { initMarkmap } from "@riebeckite/plugin-markmap/client";
import { marp, marpPlugin } from "@riebeckite/plugin-marp";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { properties } from "@riebeckite/plugin-properties";
import { qrCode } from "@riebeckite/plugin-qr-code";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import RecentPosts from "@riebeckite/plugin-recent-posts/components";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { searchPlugin } from "@riebeckite/plugin-search";
import { initSearch } from "@riebeckite/plugin-search/client";
import SearchBar from "@riebeckite/plugin-search/components";
import { series } from "@riebeckite/plugin-series";
import {
  type ShortcodeRenderer,
  shortcodes,
} from "@riebeckite/plugin-shortcodes";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { initTableOfContents } from "@riebeckite/plugin-toc/client";
import TableOfContents from "@riebeckite/plugin-toc/components";
import { uxPlugin } from "@riebeckite/plugin-ux";
import { initUx } from "@riebeckite/plugin-ux/client";
import { vegaLite } from "@riebeckite/plugin-vega-lite";
import { initVegaLite } from "@riebeckite/plugin-vega-lite/client";
import { wavedrom } from "@riebeckite/plugin-wavedrom";
import { initWaveDrom } from "@riebeckite/plugin-wavedrom/client";
import { defaultTheme } from "@riebeckite/theme-default";

export const resolvedEntries = {
  createWorker,
  d1Storage,
  kvStorage,
  buildContentCollections,
  groupContentEntries,
  queryContentEntries,
  queryContentPage,
  buildHonoxApplication,
  createRiebeckiteSsg,
  defaultSsgEntry,
  defaultSsrExternals,
  loadRiebeckiteConfig,
  resolveHonoxApplicationRoot,
  resolveHonoxConfig,
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
  riebeckiteVite,
  mountRiebeckiteEndpoints,
  resolveContentRoute,
  ArticlePrimitive,
  ArticleContent,
  ArticleFooter,
  ArticleHeader,
  ArticleLayout,
  ArticleMeta,
  Sidebar,
  autoCardLinkPlugin,
  initAutoCardLink,
  analytics,
  initAnalytics,
  backlinksPlugin,
  Backlinks,
  discordEmbed,
  excaliBrain,
  initExcaliBrain,
  markmap,
  initMarkmap,
  bases,
  hoverPreviewPlugin,
  resolveHoverPreviewOptions,
  initHoverPreview,
  flashcardsPlugin,
  initFlashcards,
  codeAnnotations,
  parseCodeAnnotations,
  canvas,
  initCanvas,
  highlight,
  highlightPlugin,
  d2,
  initD2Diagrams,
  graphviz,
  obsidianMarkdown,
  marp,
  marpPlugin,
  qrCode,
  properties,
  kanban,
  kanbanPlugin,
  parseKanban,
  renderKanban,
  resolveKanbanOptions,
  recentPostsPlugin,
  RecentPosts,
  relatedPosts,
  responsiveImage,
  searchPlugin,
  initSearch,
  SearchBar,
  series,
  shortcodes,
  tocPlugin,
  initTableOfContents,
  TableOfContents,
  uxPlugin,
  initUx,
  vegaLite,
  initVegaLite,
  wavedrom,
  initWaveDrom,
  defaultTheme,
} as const;

export type UiPrimitiveProps =
  | ArticleProps
  | ArticleContentProps
  | ArticleFooterProps
  | ArticleHeaderProps
  | ArticleLayoutProps
  | ArticleMetaProps
  | SidebarProps;

export type CollectionInputs = {
  definition: ContentCollectionDefinition;
  collection: ContentCollection;
  group: ContentQueryGroup;
};

export type ViteHelperOptions = RiebeckiteViteOptions;

export type KanbanFixtureTypes = {
  options: KanbanOptions;
  resolved: ResolvedKanbanOptions;
  parsed: KanbanParseResult;
};

export const config: RiebeckiteConfig = defineConfig({
  site: { title: "fixture" },
  theme: defaultTheme(),
  plugins: [
    analytics({
      provider: new MemoryAnalyticsProvider(),
      publicConfig: { collectorUrl: "https://analytics.example.com/events" },
    }),
    obsidianMarkdown(),
    markmap(),
    autoCardLinkPlugin(),
    excaliBrain(),
    highlight(),
    tocPlugin(),
    searchPlugin(),
    hoverPreviewPlugin({ delay: 0 }),
    canvas(),
    graphviz(),
    uxPlugin(),
    wavedrom(),
    marp(),
  ],
});

export const shortcodeRenderer: ShortcodeRenderer = ({ label }) =>
  `<span>${label}</span>`;

export function html(post: PostContent): string {
  return post.html ?? "";
}
