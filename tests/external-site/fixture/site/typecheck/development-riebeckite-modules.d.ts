// biome-ignore-all lint/suspicious/noExplicitAny: These editor-only declarations deliberately avoid duplicating public package contracts.

/**
 * Editor-only module declarations for this uninstalled fixture.
 *
 * tests/external-site/run.mjs excludes this file before type-checking packed
 * tarballs, so it cannot mask published declaration regressions.
 */
declare module "@riebeckite/core" {
  export const ContentManager: any;
  export const defineConfig: any;
  export const isPublished: any;
  export const resolveConfigModule: any;
  export type PostContent = any;
  export type RiebeckiteConfig = any;
}

declare module "@riebeckite/honox" {
  export const buildHonoxApplication: any;
  export const loadRiebeckiteConfig: any;
  export const resolveHonoxApplicationRoot: any;
  export const resolveHonoxConfig: any;
  export const riebeckite: any;
  export const riebeckiteSsg: any;
  export const riebeckiteSsgExtensionMap: any;
}

declare module "@riebeckite/honox/server" {
  export const mountRiebeckiteEndpoints: any;
  export const resolveContentRoute: any;
}

declare module "@riebeckite/honox/ui" {
  export const Article: any;
  export const ArticleContent: any;
  export const ArticleHeader: any;
  export const ArticleLayout: any;
}

declare module "@riebeckite/plugin-autocardlink" {
  export const autoCardLinkPlugin: any;
}

declare module "@riebeckite/plugin-autocardlink/client" {
  export const initAutoCardLink: any;
}

declare module "@riebeckite/plugin-backlinks" {
  export const backlinksPlugin: any;
}

declare module "@riebeckite/plugin-backlinks/components" {
  const Backlinks: any;
  export default Backlinks;
}

declare module "@riebeckite/plugin-obsidian-markdown" {
  export const obsidianMarkdown: any;
}

declare module "@riebeckite/plugin-graphviz" {
  export const graphviz: any;
  export const graphvizPlugin: any;
}

declare module "@riebeckite/plugin-query" {
  export const queryPlugin: any;
}

declare module "@riebeckite/plugin-recent-posts" {
  export const recentPostsPlugin: any;
}

declare module "@riebeckite/plugin-recent-posts/components" {
  const RecentPosts: any;
  export default RecentPosts;
}

declare module "@riebeckite/plugin-search" {
  export const initSearch: any;
  export const searchPlugin: any;
}

declare module "@riebeckite/plugin-search/client" {
  export const initSearch: any;
}

declare module "@riebeckite/plugin-search/components" {
  const SearchBar: any;
  export default SearchBar;
}

declare module "@riebeckite/plugin-toc" {
  export const initTableOfContents: any;
  export const tocPlugin: any;
}

declare module "@riebeckite/plugin-toc/client" {
  export const initTableOfContents: any;
}

declare module "@riebeckite/plugin-toc/components" {
  const TableOfContents: any;
  export default TableOfContents;
}

declare module "@riebeckite/theme-default" {
  export const defaultTheme: any;
}
