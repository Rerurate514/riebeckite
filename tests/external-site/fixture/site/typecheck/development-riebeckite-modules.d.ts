// biome-ignore-all lint/suspicious/noExplicitAny: These editor-only declarations deliberately avoid duplicating public package contracts.

declare module "@riebeckite/core" {
  export const ContentManager: any;
  export const defineConfig: any;
  export const definePlugin: any;
  export const defineTheme: any;
  export const isPublished: any;
  export const resolveConfigModule: any;
  export type PostContent = any;
  export type RiebeckiteConfig = any;
}

declare module "@riebeckite/honox" {
  export const buildHonoxApplication: any;
  export const createRiebeckiteSsg: any;
  export const defaultSsgEntry: any;
  export const defaultSsrExternals: any;
  export const loadRiebeckiteConfig: any;
  export const resolveHonoxApplicationRoot: any;
  export const resolveHonoxConfig: any;
  export const riebeckite: any;
  export const riebeckiteSsg: any;
  export const riebeckiteSsgExtensionMap: any;
  export const riebeckiteVite: any;
}

declare module "@riebeckite/honox/server" {
  export const mountRiebeckiteEndpoints: any;
  export const resolveContentRoute: any;
}

declare module "@riebeckite/honox/ui" {
  export const Article: any;
  export const ArticleContent: any;
  export const ArticleFooter: any;
  export const ArticleHeader: any;
  export const ArticleLayout: any;
  export const ArticleMeta: any;
  export const Sidebar: any;
  export type ArticleContentProps = any;
  export type ArticleFooterProps = any;
  export type ArticleHeaderProps = any;
  export type ArticleLayoutProps = any;
  export type ArticleMetaProps = any;
  export type ArticleProps = any;
  export type SidebarProps = any;
}

declare module "@riebeckite/plugin-attachment" {
  export const attachment: any;
}

declare module "@riebeckite/plugin-flashcards" {
  export const flashcards: any;
  export const flashcardsPlugin: any;
  export const initFlashcards: any;
}

declare module "@riebeckite/plugin-flashcards/client" {
  export const initFlashcards: any;
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

declare module "@riebeckite/plugin-hover-preview" {
  export const hoverPreview: any;
  export const hoverPreviewPlugin: any;
}

declare module "@riebeckite/plugin-hover-preview/client" {
  export const initHoverPreview: any;
}

declare module "@riebeckite/plugin-media" {
  export const media: any;
}

declare module "@riebeckite/plugin-obsidian-markdown" {
  export const obsidianMarkdown: any;
}

declare module "@riebeckite/plugin-properties" {
  export const properties: any;
}

declare module "@riebeckite/plugin-query" {
  export const queryPlugin: any;
}

declare module "@riebeckite/plugin-dataview" {
  export const dataviewPlugin: any;
  export const dataview: any;
}

declare module "@riebeckite/plugin-recent-posts" {
  export const recentPostsPlugin: any;
}

declare module "@riebeckite/plugin-recent-posts/components" {
  const RecentPosts: any;
  export default RecentPosts;
}

declare module "@riebeckite/plugin-related-posts" {
  export const relatedPosts: any;
  export const relatedPostsPlugin: any;
  export const resolveRelatedPostsOptions: any;
  export const buildRelatedPosts: any;
  export const renderRelatedPosts: any;
}

declare module "@riebeckite/plugin-responsive-image" {
  export const responsiveImage: any;
}

declare module "@riebeckite/plugin-search" {
  export const initSearch: any;
  export const SearchBar: any;
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
