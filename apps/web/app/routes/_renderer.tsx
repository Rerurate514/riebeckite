import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import SearchBar from "../components/search-bar/search-bar";
import { config } from "../config";

export default jsxRenderer(({ children }, c) => {
  const { site } = config;
  const canonical =
    site.baseUrl && c.req.path
      ? new URL(c.req.path, site.baseUrl).toString()
      : "";

  return (
    <html lang={site.locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={site.description} />
        <meta name="author" content={site.author} />
        <title>{site.title}</title>
        <link rel="icon" href="/favicon.ico" />
        {canonical && <link rel="canonical" href={canonical} />}
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
