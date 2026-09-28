import { defineConfig, type PostContent, type RiebeckiteConfig } from "@riebeckite/core";
import {
  buildHonoxApplication,
  loadRiebeckiteConfig,
  resolveHonoxApplicationRoot,
  resolveHonoxConfig,
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
} from "@riebeckite/honox";
import { mountRiebeckiteEndpoints, resolveContentRoute } from "@riebeckite/honox/server";
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
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";
import Backlinks from "@riebeckite/plugin-backlinks/components";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";
import { initFlashcards } from "@riebeckite/plugin-flashcards/client";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import RecentPosts from "@riebeckite/plugin-recent-posts/components";
import { searchPlugin } from "@riebeckite/plugin-search";
import { initSearch } from "@riebeckite/plugin-search/client";
import SearchBar from "@riebeckite/plugin-search/components";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { initTableOfContents } from "@riebeckite/plugin-toc/client";
import TableOfContents from "@riebeckite/plugin-toc/components";
import { defaultTheme } from "@riebeckite/theme-default";

export const resolvedEntries = {
  buildHonoxApplication,
  loadRiebeckiteConfig,
  resolveHonoxApplicationRoot,
  resolveHonoxConfig,
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
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
  backlinksPlugin,
  Backlinks,
  flashcardsPlugin,
  initFlashcards,
  obsidianMarkdown,
  recentPostsPlugin,
  RecentPosts,
  searchPlugin,
  initSearch,
  SearchBar,
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

export const config: RiebeckiteConfig = defineConfig({
  site: { title: "fixture" },
  theme: defaultTheme(),
  plugins: [obsidianMarkdown(), autoCardLinkPlugin(), tocPlugin(), searchPlugin()],
});

export function html(post: PostContent): string {
  return post.html ?? "";
}
