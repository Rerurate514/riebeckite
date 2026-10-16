import { config } from "virtual:riebeckite/config";
import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { SearchBar } from "@riebeckite/plugin-search";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";
import { SiteHeader } from "../components/site-header";

export const __importing_islands = true;

export default jsxRenderer(({ children }, c) => (
  <ThemeRoot theme={config.theme} lang="en">
    <head>
      <RiebeckiteHead
        title={config.site.title}
        headTags={c.get("headTags") ?? []}
        faviconHref={null}
      />
      <Link href="/app/style.css" rel="stylesheet" />
      <Script src="/app/client.ts" async />
    </head>
    <body class="riebeckite-page rb-site">
      <SiteHeader />
      <ColorModeToggle />
      <SearchBar />
      {children}
    </body>
  </ThemeRoot>
));
