import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import SearchBar from "../components/search-bar/search-bar";
import { config } from "../config";
import { buildWebsiteSeo, getHtmlLanguage } from "../lib/seo";

export default jsxRenderer(({ children }, c) => {
  const { site } = config;
  const seo =
    c.get("seo") ??
    buildWebsiteSeo({
      title: site.title,
      description: site.description,
      path: c.req.path,
    });
  const twitterCard = seo.imageUrl ? "summary_large_image" : "summary";

  return (
    <html lang={getHtmlLanguage()}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={seo.description} />
        <meta name="author" content={site.author} />
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
        {seo.tags.map((tag) => (
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
        {seo.jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.jsonLd) }}
          />
        )}
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>
      <body class="w-full flex flex-col items-center py-16">
        <SearchBar />
        {children}
      </body>
    </html>
  );
});
