import type { PluginHeadTag } from "@riebeckite/core";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { ColorModeScript } from "@riebeckite/plugin-color-mode";
import { SearchBar } from "@riebeckite/plugin-search";
import { resolveSiteNavigation } from "@riebeckite/plugin-navigation";
import { SiteFooter, SiteHeader } from "../components/site-header";
import { content } from "../content";
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

// Riebeckite plugin client entries need the HonoX client bundle even without
// an island component.
export const __importing_islands = true;

export default jsxRenderer(async ({ children }, c) => {
  const headTags: readonly PluginHeadTag[] = c.get("headTags") ?? [];
  const navigation = resolveSiteNavigation(config, await content.getManifest(), c.get("htmlLanguage")) ?? { primary: [], secondary: [] };

  return (
    <html
      lang={c.get("htmlLanguage") ?? config.site.locale}
      {...themeAttributes()}
    >
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{config.site.title}</title>
        <link rel="icon" href="/favicon.ico" />
        <ColorModeScript />
        <Link href="/app/style.css" rel="stylesheet" />
        {headTags.map(renderHeadTag)}
        <Script src="/app/client.ts" async />
      </head>
      <body class="riebeckite-page rb-site">
         <SiteHeader path={c.req.path} items={navigation.primary} />
        <SearchBar />
        {children}
        <SiteFooter path={c.req.path} items={navigation.secondary} />
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
