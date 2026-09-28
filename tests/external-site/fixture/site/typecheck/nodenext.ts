import {
  buildContentCollections,
  defineConfig,
  groupContentEntries,
  queryContentEntries,
  queryContentPage,
  type ContentCollection,
  type ContentCollectionDefinition,
  type ContentQueryGroup,
  type PostContent,
  type RiebeckiteConfig,
} from "@riebeckite/core";
import {
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
  type RiebeckiteViteOptions,
} from "@riebeckite/honox";
import {
  mountRiebeckiteEndpoints,
  resolveContentRoute,
} from "@riebeckite/honox/server";
import {
  Article as ArticlePrimitive,
  ArticleContent,
  ArticleFooter,
  ArticleHeader,
  ArticleLayout,
  ArticleMeta,
  Sidebar,
  type ArticleContentProps,
  type ArticleFooterProps,
  type ArticleHeaderProps,
  type ArticleLayoutProps,
  type ArticleMetaProps,
  type ArticleProps,
  type SidebarProps,
} from "@riebeckite/honox/ui";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { initAutoCardLink } from "@riebeckite/plugin-autocardlink/client";
import { analytics } from "@riebeckite/plugin-analytics";
import { initAnalytics } from "@riebeckite/plugin-analytics/client";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import Backlinks from "@riebeckite/plugin-backlinks/components";
import {
  hoverPreviewPlugin,
  resolveHoverPreviewOptions,
} from "@riebeckite/plugin-hover-preview";
import { initHoverPreview } from "@riebeckite/plugin-hover-preview/client";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { initFlashcards } from "@riebeckite/plugin-flashcards/client";
import { codeAnnotations, parseCodeAnnotations } from "@riebeckite/plugin-code-annotations";
import { canvas } from "@riebeckite/plugin-canvas";
import { initCanvas } from "@riebeckite/plugin-canvas/client";
import { highlight, highlightPlugin } from "@riebeckite/plugin-highlight";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { properties } from "@riebeckite/plugin-properties";
import {
  kanban,
  kanbanPlugin,
  parseKanban,
  renderKanban,
  resolveKanbanOptions,
  type KanbanOptions,
  type KanbanParseResult,
  type ResolvedKanbanOptions,
} from "@riebeckite/plugin-kanban";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import RecentPosts from "@riebeckite/plugin-recent-posts/components";
import { relatedPosts } from "@riebeckite/plugin-related-posts";
import { responsiveImage } from "@riebeckite/plugin-responsive-image";
import { searchPlugin } from "@riebeckite/plugin-search";
import { initSearch } from "@riebeckite/plugin-search/client";
import SearchBar from "@riebeckite/plugin-search/components";
import { series } from "@riebeckite/plugin-series";
import { shortcodes, type ShortcodeRenderer } from "@riebeckite/plugin-shortcodes";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { initTableOfContents } from "@riebeckite/plugin-toc/client";
import TableOfContents from "@riebeckite/plugin-toc/components";
import { defaultTheme } from "@riebeckite/theme-default";

export const resolvedEntries = {
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
  obsidianMarkdown,
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
    analytics({ provider: "plausible", domain: "example.com" }),
    obsidianMarkdown(),
    autoCardLinkPlugin(),
    highlight(),
    tocPlugin(),
    searchPlugin(),
    hoverPreviewPlugin({ delay: 0 }),
    canvas(),
  ],
});

export const shortcodeRenderer: ShortcodeRenderer = ({ label }) =>
  `<span>${label}</span>`;

export function html(post: PostContent): string {
  return post.html ?? "";
}
