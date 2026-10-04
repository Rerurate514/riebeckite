import { escapeScriptJson, type PluginHeadTag } from "@riebeckite/core";
import {
  ColorModeScript,
  ColorModeToggle,
} from "@riebeckite/plugin-color-mode";
import { SearchBar } from "@riebeckite/plugin-search";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { SiteFooter, SiteHeader } from "../components/site-navigation";
import { config } from "../config";
import { buildWebsiteSeo, getHtmlLanguage } from "../lib/seo";
import {
  getPluginScripts,
  getThemeAttributes,
  getThemeStyle,
  getThemeStylesheets,
} from "../lib/theme";

// Plugin client entries are browser capabilities, not HonoX islands. HonoX
// gates its client `<Script>` on this export, so keep the client runtime in
// SSG output even when a page has no island component.
export const __importing_islands = true;

export default jsxRenderer(({ children }, c) => {
  const { site } = config;
  const headTags: readonly PluginHeadTag[] = c.get("headTags") ?? [];
  const seo =
    c.get("seo") ??
    buildWebsiteSeo(
      {
        title: site.title,
        description: site.description,
        path: c.req.path,
      },
      headTags,
    );
  const twitterCard = seo.imageUrl ? "summary_large_image" : "summary";
  const themeStyle = getThemeStyle();

  return (
    <html
      lang={c.get("htmlLanguage") ?? getHtmlLanguage()}
      {...getThemeAttributes()}
    >
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {headTags.map(renderHeadTag)}
        <meta name="description" content={seo.description} />
        <meta name="author" content={site.author} />
        {seo.noindex && <meta name="robots" content="noindex, nofollow" />}
        <title>{seo.title}</title>
        <link rel="icon" href="/favicon.ico" />
        {seo.canonicalUrl && <link rel="canonical" href={seo.canonicalUrl} />}
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content={seo.type} />
        <meta property="og:url" content={seo.canonicalUrl} />
        <meta property="og:site_name" content={site.title} />
        <meta property="og:locale" content={site.locale} />
        {seo.imageUrl && <meta property="og:image" content={seo.imageUrl} />}
        {seo.publishedTime && (
          <meta property="article:published_time" content={seo.publishedTime} />
        )}
        {seo.modifiedTime && (
          <meta property="article:modified_time" content={seo.modifiedTime} />
        )}
        {seo.tags.map((tag: string | undefined) => (
          <meta property="article:tag" content={tag} key={tag} />
        ))}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        {site.twitterSite && (
          <meta name="twitter:site" content={site.twitterSite} />
        )}
        {seo.imageUrl && <meta name="twitter:image" content={seo.imageUrl} />}
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" href="/atom.xml" />
        <link rel="alternate" type="application/feed+json" href="/feed.json" />
        {seo.jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: escapeScriptJson(JSON.stringify(seo.jsonLd)),
            }}
          />
        )}
        <ColorModeScript />
        <Link href="/app/style.css" rel="stylesheet" />
        {themeStyle && (
          <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        )}
        {getThemeStylesheets().map((href) => (
          <link href={href} rel="stylesheet" key={href} />
        ))}
        {getPluginScripts().map((src) => (
          <script src={src} defer key={src} />
        ))}
        <Script src="/app/client.ts" async />
      </head>
      <body class="riebeckite-page rb-site">
        <SiteHeader path={c.req.path} />
        <ColorModeToggle />
        <SearchBar />
        {children}
        <SiteFooter path={c.req.path} />
      </body>
    </html>
  );
});

/**
 * Maps a plugin-provided head tag to JSX. The site owns the shell; this is
 * where `entry.headTags` from plugins become actual document elements.
 */
function renderHeadTag(tag: PluginHeadTag, index: number) {
  const key = `${tag.tag}-${index}`;
  if (tag.tag === "meta") return <meta {...tag.attrs} key={key} />;
  if (tag.tag === "link") return <link {...tag.attrs} key={key} />;
  return (
    <script
      {...tag.attrs}
      key={key}
      dangerouslySetInnerHTML={
        tag.children ? { __html: tag.children } : undefined
      }
    />
  );
}
