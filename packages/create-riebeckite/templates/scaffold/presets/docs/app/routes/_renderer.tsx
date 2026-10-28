import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";
import { createPublicContentView } from "@riebeckite/core";
import { SiteProvider } from "@riebeckite/ui";
import { jsxRenderer } from "hono/jsx-renderer";
import { SearchBar } from "@riebeckite/plugin-search";
import { SiteFooter } from "../components/site-header";
import { content } from "virtual:riebeckite/content";
import { config } from "virtual:riebeckite/config";

// Riebeckite plugin client entries need the HonoX client bundle even without
// an island component.
export const __importing_islands = true;

export default jsxRenderer(async ({ children }, c) => {
  const manifest = await content.getManifest();

  return (
    <SiteProvider
      config={config}
      manifest={manifest}
      view={createPublicContentView(manifest)}
      path={c.req.path}
      language={c.get("htmlLanguage")}
      headTags={c.get("headTags")}
    >
      <ThemeRoot>
        <head>
          <RiebeckiteHead />
        </head>
        <body class="riebeckite-page rb-site">
          <a class="rb-skip-link" href="#main-content">Skip to main content</a>
          <SearchBar />
          {children}
          <SiteFooter />
        </body>
      </ThemeRoot>
    </SiteProvider>
  );
});
