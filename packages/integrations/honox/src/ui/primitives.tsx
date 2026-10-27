import type {
  PluginHeadTag,
  PostContent,
  PublicContentEntry,
  ResolvedRiebeckiteConfig,
  SeoMetadata,
} from "@riebeckite/core";
import { escapeScriptJson, uniqueStrings } from "@riebeckite/core";
import { ColorModeScript } from "@riebeckite/plugin-color-mode";
import { raw } from "hono/html";
import { Link, Script } from "honox/server";
import {
  ArticleProvider,
  useArticleContext,
  useSiteContext,
} from "./context.js";

type PrimitiveChildren = unknown;

type PrimitiveProps = {
  children?: PrimitiveChildren;
  class?: string;
  className?: string;
};

type PrimitiveClassProps = {
  class?: string;
  className?: string;
};

type ArticleProps = PrimitiveProps & {
  post?: PostContent;
  entry?: PublicContentEntry;
};

type ArticleLayoutProps = PrimitiveProps;

type ArticleHeaderProps =
  | (PrimitiveClassProps & {
      dangerouslySetInnerHTML: { __html: string };
      children?: never;
    })
  | (PrimitiveClassProps & {
      dangerouslySetInnerHTML?: never;
      children?: PrimitiveChildren;
    });

type ArticleContentProps = PrimitiveClassProps & {
  children?: PrimitiveChildren;
};

type ArticleMetaProps = PrimitiveProps & {
  label?: string;
};

type SidebarProps = PrimitiveProps & {
  label?: string;
};

type ArticleFooterProps = PrimitiveProps;

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

type ArticleBodyProps = PrimitiveClassProps & {
  html?: string;
};

type HtmlFragmentSource = "markdown" | "plugin-page";

type HtmlFragmentProps = {
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

type PageBodyProps = PrimitiveClassProps & {
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

type ThemeRootProps = {
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
    ...theme.settings.attributes,
    "data-rb-theme": theme.name,
    "data-rb-mode": theme.colorMode === "system" ? undefined : theme.colorMode,
    "data-rb-layout": theme.layout,
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

type PluginHeadTagsProps = {
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
    return <meta {...tag.attrs} data-riebeckite-head="page" key={key} />;
  }

  if (tag.tag === "link") {
    return <link {...tag.attrs} data-riebeckite-head="page" key={key} />;
  }

  return (
    <script
      {...tag.attrs}
      data-riebeckite-head={isDataScript(tag) ? "page" : undefined}
      key={key}
      dangerouslySetInnerHTML={
        tag.children ? { __html: tag.children } : undefined
      }
    />
  );
}

function isDataScript(tag: PluginHeadTag): boolean {
  if (tag.tag !== "script") return false;
  const type = tag.attrs?.type?.trim().toLowerCase();
  return type === "application/ld+json" || type === "application/json";
}

type RiebeckiteHeadProps = {
  title?: string;
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
      {props.themeStyle ? (
        <style dangerouslySetInnerHTML={{ __html: props.themeStyle }} />
      ) : null}
      {props.themeStylesheets?.map((href) => (
        <Link href={href} rel="stylesheet" key={href} prod={props.prod} />
      ))}
      <PluginHeadTags tags={props.headTags ?? site?.headTags} />
      {clientSrc ? <Script src={clientSrc} async prod={props.prod} /> : null}
      {props.children}
    </>
  );
}

type SeoHeadProps = {
  seo: SeoMetadata;
  siteTitle: string;
  author?: string;
  ogLocale?: string;
  ogAlternates?: readonly string[];
  twitterSite?: string;
  feedLinks?: readonly { href: string; type: string }[];
};

export function SeoHead(props: SeoHeadProps) {
  const { seo } = props;
  const twitterCard = seo.imageUrl ? "summary_large_image" : "summary";
  return (
    <>
      <meta
        name="description"
        content={seo.description}
        data-riebeckite-head="page"
      />
      {props.author ? (
        <meta
          name="author"
          content={props.author}
          data-riebeckite-head="page"
        />
      ) : null}
      {seo.noindex ? (
        <meta
          name="robots"
          content="noindex, nofollow"
          data-riebeckite-head="page"
        />
      ) : null}
      <title>{seo.title}</title>
      {seo.canonicalUrl ? (
        <link
          rel="canonical"
          href={seo.canonicalUrl}
          data-riebeckite-head="page"
        />
      ) : null}
      <meta
        property="og:title"
        content={seo.title}
        data-riebeckite-head="page"
      />
      <meta
        property="og:description"
        content={seo.description}
        data-riebeckite-head="page"
      />
      <meta property="og:type" content={seo.type} data-riebeckite-head="page" />
      {seo.canonicalUrl ? (
        <meta
          property="og:url"
          content={seo.canonicalUrl}
          data-riebeckite-head="page"
        />
      ) : null}
      <meta
        property="og:site_name"
        content={props.siteTitle}
        data-riebeckite-head="page"
      />
      {props.ogLocale ? (
        <meta
          property="og:locale"
          content={props.ogLocale}
          data-riebeckite-head="page"
        />
      ) : null}
      {props.ogAlternates?.map((locale) => (
        <meta
          property="og:locale:alternate"
          content={locale}
          data-riebeckite-head="page"
          key={locale}
        />
      ))}
      {seo.imageUrl ? (
        <meta
          property="og:image"
          content={seo.imageUrl}
          data-riebeckite-head="page"
        />
      ) : null}
      {seo.publishedTime ? (
        <meta
          property="article:published_time"
          content={seo.publishedTime}
          data-riebeckite-head="page"
        />
      ) : null}
      {seo.modifiedTime ? (
        <meta
          property="article:modified_time"
          content={seo.modifiedTime}
          data-riebeckite-head="page"
        />
      ) : null}
      {seo.tags.map((tag) => (
        <meta
          property="article:tag"
          content={tag}
          data-riebeckite-head="page"
          key={tag}
        />
      ))}
      <meta
        name="twitter:card"
        content={twitterCard}
        data-riebeckite-head="page"
      />
      <meta
        name="twitter:title"
        content={seo.title}
        data-riebeckite-head="page"
      />
      <meta
        name="twitter:description"
        content={seo.description}
        data-riebeckite-head="page"
      />
      {props.twitterSite ? (
        <meta
          name="twitter:site"
          content={props.twitterSite}
          data-riebeckite-head="page"
        />
      ) : null}
      {seo.imageUrl ? (
        <meta
          name="twitter:image"
          content={seo.imageUrl}
          data-riebeckite-head="page"
        />
      ) : null}
      {props.feedLinks?.map((feed) => (
        <link
          rel="alternate"
          type={feed.type}
          href={feed.href}
          data-riebeckite-head="global"
          key={feed.href}
        />
      ))}
      {seo.jsonLd ? (
        <script
          type="application/ld+json"
          data-riebeckite-head="page"
          dangerouslySetInnerHTML={{
            __html: escapeScriptJson(JSON.stringify(seo.jsonLd)),
          }}
        />
      ) : null}
    </>
  );
}

export function getThemeStyle(
  theme: ResolvedRiebeckiteConfig["theme"],
): string {
  return theme.settings.style;
}

export function getThemeStylesheets(stylesheets: readonly string[]): string[] {
  return uniqueStrings([...stylesheets]);
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
