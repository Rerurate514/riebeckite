import type {
  ContentManifest,
  PluginHeadTag,
  PostContent,
  PublicContentEntry,
  PublicContentView,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { Child } from "hono/jsx";
import { createContext, useContext } from "hono/jsx";

export type SiteContextValue = {
  config: ResolvedRiebeckiteConfig;
  manifest: ContentManifest;
  view: PublicContentView;
  path: string;
  language?: string;
  headTags?: readonly PluginHeadTag[];
};

export type ArticleContextValue = {
  entry?: PublicContentEntry;
  post: PostContent;
};

const SiteContext = createContext<SiteContextValue | undefined>(undefined);
const ArticleContext = createContext<ArticleContextValue | undefined>(
  undefined,
);

export function SiteProvider(props: SiteContextValue & { children?: Child }) {
  const { children, ...value } = props;
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function ArticleProvider(
  props: ArticleContextValue & { children?: Child },
) {
  const { children, ...value } = props;
  return (
    <ArticleContext.Provider value={value}>{children}</ArticleContext.Provider>
  );
}

export function useSiteContext(): SiteContextValue | undefined {
  return useContext(SiteContext);
}

export function useArticleContext(): ArticleContextValue | undefined {
  return useContext(ArticleContext);
}
