import { config } from "virtual:riebeckite/config";
import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";
import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";

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
      <header class="fixture-site-header">
        <a class="fixture-site-header__home" href="/">
          Meta Bind Contract
        </a>
      </header>
      <main id="main-content" tabindex={-1}>
        {children}
      </main>
    </body>
  </ThemeRoot>
));
