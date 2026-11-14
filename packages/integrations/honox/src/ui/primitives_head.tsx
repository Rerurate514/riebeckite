import { escapeScriptJson, type PluginHeadTag } from "@riebeckite/core";
import { ColorModeScript } from "@riebeckite/plugin-color-mode";
import { Link, Script } from "honox/server";
import { useSiteContext } from "./context.js";
import type {
  PluginHeadTagsProps,
  RiebeckiteHeadProps,
  SeoHeadProps,
} from "./primitives_types.js";

export function PluginHeadTags(props: PluginHeadTagsProps) {
  return <>{props.tags?.map(renderPluginHeadTag)}</>;
}

export function renderPluginHeadTag(tag: PluginHeadTag, index: number) {
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

export function isDataScript(tag: PluginHeadTag): boolean {
  if (tag.tag !== "script") return false;
  const type = tag.attrs?.type?.trim().toLowerCase();
  return type === "application/ld+json" || type === "application/json";
}

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
      {props.seo ? (
        <SeoHead
          seo={props.seo}
          siteTitle={site?.config.site.title ?? ""}
          author={site?.config.site.author}
          ogLocale={ogLocale(site?.config.site.locale)}
          twitterSite={site?.config.site.twitterSite}
        />
      ) : (
        <title>{props.title ?? site?.config.site.title}</title>
      )}
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

export function ogLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  if (/^ja(?:$|[-_])/i.test(locale)) return "ja_JP";
  if (/^en(?:$|[-_])/i.test(locale)) return "en_US";
  return locale.replace("-", "_");
}

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
