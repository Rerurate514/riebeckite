import {
  getThemeStyle,
  getThemeStylesheets,
  RiebeckiteHead,
  ThemeRoot,
} from "@riebeckite/honox/ui";
import { createPublicContentView } from "@riebeckite/core";
import { SiteProvider } from "@riebeckite/ui";
import { jsxRenderer } from "hono/jsx-renderer";
import { SiteFooter, SiteHeader } from "../components/site-header";
import { content } from "virtual:riebeckite/content";
import { config } from "virtual:riebeckite/config";

// Riebeckite plugin client entries need the HonoX client bundle even without
// an island component.
export const __importing_islands = true;

export default jsxRenderer(async ({ children }, c) => {
  const manifest = await content.getManifest();
  const themeStyle = getThemeStyle(config.theme);

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
          <RiebeckiteHead 
            themeStyle={themeStyle}
            themeStylesheets={getThemeStylesheets(config.theme.stylesheets)}
          />
        </head>
        <body class="riebeckite-page rb-site">
          <a class="rb-skip-link" href="#main-content">Skip to main content</a>
          <SiteHeader />
          <main id="main-content" tabindex={-1} class="riebeckite-main">
            {children}
          </main>
          <SiteFooter />
        </body>
      </ThemeRoot>
    </SiteProvider>
  );
});
