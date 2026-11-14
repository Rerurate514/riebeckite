import type {
  PluginHeadTag,
  PluginPageLayout,
  PostContent,
  PublicContentEntry,
  ResolvedRiebeckiteConfig,
  SeoMetadata,
} from "@riebeckite/core";
import type { Child } from "hono/jsx";

export type PrimitiveChildren = unknown;

export type PrimitiveProps = {
  children?: PrimitiveChildren;
  class?: string;
  className?: string;
};

export type PrimitiveClassProps = {
  class?: string;
  className?: string;
};

export type ArticleProps = PrimitiveProps & {
  post?: PostContent;
  entry?: PublicContentEntry;
  body?: Child;
};

export type ArticleLayoutProps = PrimitiveProps;

export type ArticleHeaderProps =
  | (PrimitiveClassProps & {
      dangerouslySetInnerHTML: { __html: string };
      children?: never;
    })
  | (PrimitiveClassProps & {
      dangerouslySetInnerHTML?: never;
      children?: PrimitiveChildren;
    });

export type ArticleContentProps = PrimitiveClassProps & {
  children?: PrimitiveChildren;
};

export type ArticleMetaProps = PrimitiveProps & {
  label?: string;
};

export type SidebarProps = PrimitiveProps & {
  label?: string;
};

export type ArticleFooterProps = PrimitiveProps;

export type ArticleBodyProps = PrimitiveClassProps & {
  html?: string;
};

export type HtmlFragmentSource = "markdown" | "plugin-page";

export type HtmlFragmentProps = {
  html: string;
  source: HtmlFragmentSource;
};

export type PageBodyProps = PrimitiveClassProps & {
  html: string;
  layout?: PluginPageLayout;
};

export type ThemeRootProps = {
  theme?: ResolvedRiebeckiteConfig["theme"];
  lang?: string;
  children?: PrimitiveChildren;
};

export type PluginHeadTagsProps = {
  tags?: readonly PluginHeadTag[];
};

export type RiebeckiteHeadProps = {
  title?: string;
  seo?: SeoMetadata;
  headTags?: readonly PluginHeadTag[];
  faviconHref?: string | null;
  colorModeScript?: boolean;
  stylesheets?: readonly string[];
  themeStyle?: string;
  themeStylesheets?: readonly string[];
  clientSrc?: string | null;
  prod?: boolean;
  children?: PrimitiveChildren;
};

export type SeoHeadProps = {
  seo: SeoMetadata;
  siteTitle: string;
  author?: string;
  ogLocale?: string;
  ogAlternates?: readonly string[];
  twitterSite?: string;
  feedLinks?: readonly { href: string; type: string }[];
};
