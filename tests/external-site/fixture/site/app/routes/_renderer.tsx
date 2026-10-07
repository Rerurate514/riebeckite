import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";
import { ColorModeToggle } from "@riebeckite/plugin-color-mode";
import { SearchBar } from "@riebeckite/plugin-search";
import { jsxRenderer } from "hono/jsx-renderer";
import { SiteHeader } from "../components/site-header";
import { config } from "../config";

export default jsxRenderer(({ children }, c) => (
  <ThemeRoot theme={config.theme} lang="en">
    <head>
      <RiebeckiteHead
        title={config.site.title}
        headTags={c.get("headTags") ?? []}
        faviconHref={null}
      />
    </head>
    <body class="riebeckite-page rb-site">
      <SiteHeader />
      <ColorModeToggle />
      <SearchBar />
      {children}
    </body>
  </ThemeRoot>
));
