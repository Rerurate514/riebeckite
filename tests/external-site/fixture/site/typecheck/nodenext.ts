/**
 * NodeNext declaration-surface check.
 *
 * This file is type-checked with `module: "NodeNext"` and
 * `moduleResolution: "NodeNext"` against the *packed tarballs* installed into
 * `node_modules`. It intentionally imports every published entry point of the
 * Riebeckite packages used by the fixture so that any undeclared dependency or
 * extensionless relative specifier in an emitted `.d.ts` fails the build.
 *
 * `skipLibCheck` must stay `false` in `tsconfig.nodenext.json`: the point is to
 * validate the published declarations, not to silence them.
 */
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
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { marp, marpPlugin } from "@riebeckite/plugin-marp";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";
import RecentPosts from "@riebeckite/plugin-recent-posts/components";
import { searchPlugin } from "@riebeckite/plugin-search";
import { initSearch } from "@riebeckite/plugin-search/client";
import SearchBar from "@riebeckite/plugin-search/components";
import { tocPlugin } from "@riebeckite/plugin-toc";
import { initTableOfContents } from "@riebeckite/plugin-toc/client";
import TableOfContents from "@riebeckite/plugin-toc/components";
import { defaultTheme } from "@riebeckite/theme-default";

// Touch the resolved values so that unused-import elimination cannot hide a
// broken declaration.
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
  obsidianMarkdown,
  marp,
  marpPlugin,
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

// Keep the public UI primitive prop contracts covered by the packed-tarball
// NodeNext declaration check as well as the component exports above.
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
  plugins: [
    obsidianMarkdown(),
    autoCardLinkPlugin(),
    tocPlugin(),
    searchPlugin(),
    marp(),
  ],
});

export function html(post: PostContent): string {
  return post.html ?? "";
}
