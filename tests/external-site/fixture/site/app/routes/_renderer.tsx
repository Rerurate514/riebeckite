import type { PluginHeadTag } from "@riebeckite/core";
import {
  ColorModeScript,
  ColorModeToggle,
} from "@riebeckite/plugin-color-mode";
import { SearchBar } from "@riebeckite/plugin-search";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { SiteHeader } from "../components/site-header";
import { config } from "../config";

function themeAttributes() {
  const { theme } = config;

  return {
    ...theme.attributes,
    "data-theme": theme.colorMode === "system" ? undefined : theme.colorMode,
    "data-theme-name": theme.name,
    "data-typography": theme.typography,
    "data-article-layout": theme.articleLayout,
  };
}

export default jsxRenderer(({ children }, c) => {
  const headTags: readonly PluginHeadTag[] = c.get("headTags") ?? [];

  return (
    <html lang="en" {...themeAttributes()}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {headTags.map(renderHeadTag)}
        <title>{config.site.title}</title>
        <ColorModeScript />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>
      <body class="riebeckite-page rb-site">
        <SiteHeader />
        <ColorModeToggle />
        <SearchBar />
        {children}
      </body>
    </html>
  );
});

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
