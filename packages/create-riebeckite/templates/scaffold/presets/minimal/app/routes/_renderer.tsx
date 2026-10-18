import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";
import { createPublicContentView } from "@riebeckite/core";
import { SiteProvider } from "@riebeckite/ui";
import { jsxRenderer } from "hono/jsx-renderer";
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
          <RiebeckiteHead colorModeScript={false} />
        </head>
        <body class="riebeckite-page rb-site">{children}</body>
      </ThemeRoot>
    </SiteProvider>
  );
});
