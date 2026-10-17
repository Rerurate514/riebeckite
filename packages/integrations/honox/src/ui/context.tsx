import type {
  ContentManifest,
  PostContent,
  PublicContentEntry,
  PublicContentView,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { createContext, useContext } from "hono/jsx";
import type { Child } from "hono/jsx";

export type SiteContextValue = {
  config: ResolvedRiebeckiteConfig;
  manifest: ContentManifest;
  view: PublicContentView;
  path: string;
};

export type ArticleContextValue = {
  entry?: PublicContentEntry;
  post: PostContent;
};

const SiteContext = createContext<SiteContextValue | undefined>(undefined);
const ArticleContext = createContext<ArticleContextValue | undefined>(undefined);

export function SiteProvider(props: SiteContextValue & { children?: Child }) {
  return <SiteContext.Provider value={props}>{props.children}</SiteContext.Provider>;
}

export function ArticleProvider(
  props: ArticleContextValue & { children?: Child },
) {
  return (
    <ArticleContext.Provider value={props}>{props.children}</ArticleContext.Provider>
  );
}

export function useSiteContext(): SiteContextValue | undefined {
  return useContext(SiteContext);
}

export function useArticleContext(): ArticleContextValue | undefined {
  return useContext(ArticleContext);
}
