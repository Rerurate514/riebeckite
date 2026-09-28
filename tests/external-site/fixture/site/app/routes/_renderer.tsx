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

export default jsxRenderer(({ children }) => {
  return (
    <html lang="en" {...themeAttributes()}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{config.site.title}</title>
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>
      <body class="riebeckite-page rb-site">
        <SiteHeader />
        <SearchBar />
        {children}
      </body>
    </html>
  );
});
