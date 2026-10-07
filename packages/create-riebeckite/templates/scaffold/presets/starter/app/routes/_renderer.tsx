import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";
import { jsxRenderer } from "hono/jsx-renderer";
import { resolveSiteNavigation } from "@riebeckite/plugin-navigation";
import { SearchBar } from "@riebeckite/plugin-search";
import { SiteFooter, SiteHeader } from "../components/site-header";
import { content } from "virtual:riebeckite/content";
import { config } from "virtual:riebeckite/config";

// Riebeckite plugin client entries need the HonoX client bundle even without
// an island component.
export const __importing_islands = true;

export default jsxRenderer(async ({ children }, c) => {
  const navigation =
    resolveSiteNavigation(
      config,
      await content.getManifest(),
      c.get("htmlLanguage"),
    ) ?? { primary: [], secondary: [] };

  return (
    <ThemeRoot
      theme={config.theme}
      lang={c.get("htmlLanguage") ?? config.site.locale}
    >
      <head>
        <RiebeckiteHead
          title={config.site.title}
          headTags={c.get("headTags") ?? []}
        />
      </head>
      <body class="riebeckite-page rb-site">
        <SiteHeader
          path={c.req.path}
          items={navigation.primary}
          language={c.get("htmlLanguage")}
        />
        <SearchBar />
        {children}
        <SiteFooter
          path={c.req.path}
          items={navigation.secondary}
          language={c.get("htmlLanguage")}
        />
      </body>
    </ThemeRoot>
  );
});
