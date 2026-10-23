import type {
  PluginHeadTag,
  PostContent,
  PublicContentEntry,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { ColorModeScript } from "@riebeckite/plugin-color-mode";
import { raw } from "hono/html";
import { Link, Script } from "honox/server";
import {
  ArticleProvider,
  useArticleContext,
  useSiteContext,
} from "./context.js";

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

export function Article(props: ArticleProps) {
  const article = (
    <article class={joinClassNames("rb-article", props.class, props.className)}>
      {props.children}
    </article>
  );
  if (!props.post) return article;
  return (
    <ArticleProvider entry={props.entry} post={props.post}>
      {article}
    </ArticleProvider>
  );
}

export function ArticleLayout(props: ArticleLayoutProps) {
  return (
    <div
      class={joinClassNames("rb-article-layout", props.class, props.className)}
    >
      {props.children}
    </div>
  );
}

export function ArticleHeader(props: ArticleHeaderProps) {
  const className = joinClassNames(
    "rb-article-header",
    props.class,
    props.className,
  );

  if (props.dangerouslySetInnerHTML !== undefined) {
    return (
      <header
        class={className}
        dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
      />
    );
  }

  return <header class={className}>{props.children}</header>;
}

export function ArticleMeta(props: ArticleMetaProps) {
  return (
    <aside
      class={joinClassNames("rb-article-meta", props.class, props.className)}
      aria-label={props.label ?? "Article metadata"}
    >
      {props.children}
    </aside>
  );
}

export function ArticleContent(props: ArticleContentProps) {
  const className = joinClassNames(
    "rb-article-body",
    props.class,
    props.className,
  );
  return <div class={className}>{props.children}</div>;
}

export type ArticleBodyProps = PrimitiveClassProps & {
  html?: string;
};

export type HtmlFragmentSource = "markdown" | "plugin-page";

export type HtmlFragmentProps = {
  html: string;
  source: HtmlFragmentSource;
};

export function HtmlFragment(props: HtmlFragmentProps) {
  return raw(props.html);
}

/**
 * Renders Markdown-produced HTML as the canonical article body.
 *
 * Owns the `.rb-article-content` Stable Hook so Sites never hand-write it.
 */
export function ArticleBody(props: ArticleBodyProps) {
  const article = useArticleContext();
  const html = props.html ?? article?.post.html;
  if (html === undefined) return null;
  return (
    <div
      class={joinClassNames("rb-article-content", props.class, props.className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export type PageBodyProps = PrimitiveClassProps & {
  html: string;
};

/**
 * Renders framework-resolved Plugin Page HTML.
 *
 * Owns the raw injection of a `PluginPageType` body so Sites never hand-write
 * `dangerouslySetInnerHTML` for a resolved page.
 */
export function PageBody(props: PageBodyProps) {
  return (
    <div
      class={joinClassNames("rb-page-body", props.class, props.className)}
      dangerouslySetInnerHTML={{ __html: props.html }}
    />
  );
}

export function ArticleFooter(props: ArticleFooterProps) {
  return (
    <footer
      class={joinClassNames("rb-article-footer", props.class, props.className)}
    >
      {props.children}
    </footer>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside
      class={joinClassNames("rb-sidebar", props.class, props.className)}
      aria-label={props.label}
    >
      {props.children}
    </aside>
  );
}

export type ThemeRootProps = {
  theme?: ResolvedRiebeckiteConfig["theme"];
  lang?: string;
  children?: PrimitiveChildren;
};

/**
 * Derives the `<html>` attributes from a resolved theme.
 *
 * Combines the theme's custom `data-*` attributes with the reserved
 * color-mode, name, typography, and article-layout attributes.
 */
export function themeRootAttributes(
  theme: ResolvedRiebeckiteConfig["theme"],
): Record<string, string | undefined> {
  return {
    ...theme.attributes,
    "data-theme": theme.colorMode === "system" ? undefined : theme.colorMode,
    "data-theme-name": theme.name,
    "data-typography": theme.typography,
    "data-article-layout": theme.articleLayout,
  };
}

/**
 * Root `<html>` element carrying the resolved theme's attributes.
 *
 * The Site keeps ownership of the document composition by rendering its own
 * `<head>` and `<body>` as children.
 */
export function ThemeRoot(props: ThemeRootProps) {
  const site = useSiteContext();
  const theme = props.theme ?? site?.config.theme;
  const lang = props.lang ?? site?.language ?? site?.config.site.locale;
  if (!theme) return <html lang={lang}>{props.children}</html>;

  return (
    <html lang={lang} {...themeRootAttributes(theme)}>
      {props.children}
    </html>
  );
}

export type PluginHeadTagsProps = {
  tags?: readonly PluginHeadTag[];
};

/**
 * Renders Plugin-provided head tags as `meta` / `link` / `script` elements.
 *
 * The Site owns placement; this primitive owns the conversion and ordering.
 */
export function PluginHeadTags(props: PluginHeadTagsProps) {
  return <>{props.tags?.map(renderPluginHeadTag)}</>;
}

function renderPluginHeadTag(tag: PluginHeadTag, index: number) {
  const key = `${tag.tag}-${index}`;

  if (tag.tag === "meta") {
    return (
      <meta {...tag.attrs} data-riebeckite-head="page" key={key} />
    );
  }

  if (tag.tag === "link") {
    return (
      <link {...tag.attrs} data-riebeckite-head="page" key={key} />
    );
  }

  return (
    <script
      {...tag.attrs}
      data-riebeckite-head="page"
      key={key}
      dangerouslySetInnerHTML={
        tag.children ? { __html: tag.children } : undefined
      }
    />
  );
}

export type RiebeckiteHeadProps = {
  title?: string;
  headTags?: readonly PluginHeadTag[];
  faviconHref?: string | null;
  colorModeScript?: boolean;
  stylesheets?: readonly string[];
  clientSrc?: string | null;
  prod?: boolean;
  children?: PrimitiveChildren;
};

/**
 * Renders the standard Riebeckite `<head>` contents.
 *
 * Owns the charset, viewport, default title, favicon, color-mode bootstrap,
 * stylesheet and client entries, and Plugin head tags. The Site keeps the
 * surrounding `<head>` so it can add its own elements next to this primitive.
 */
export function RiebeckiteHead(props: RiebeckiteHeadProps) {
  const site = useSiteContext();
  const faviconHref =
    props.faviconHref === undefined ? "/favicon.ico" : props.faviconHref;
  const stylesheets = props.stylesheets ?? ["/app/style.css"];
  const clientSrc =
    props.clientSrc === undefined ? "/app/client.ts" : props.clientSrc;
  const colorModeScript = props.colorModeScript ?? true;

  return (
    <>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{props.title ?? site?.config.site.title}</title>
      {faviconHref ? <link rel="icon" href={faviconHref} /> : null}
      {colorModeScript ? <ColorModeScript /> : null}
      {stylesheets.map((href) => (
        <Link href={href} rel="stylesheet" key={href} prod={props.prod} />
      ))}
      <PluginHeadTags tags={props.headTags ?? site?.headTags} />
      {clientSrc ? <Script src={clientSrc} async prod={props.prod} /> : null}
      {props.children}
    </>
  );
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
