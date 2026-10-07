import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";
import { jsxRenderer } from "hono/jsx-renderer";
import { config } from "virtual:riebeckite/config";

// Riebeckite plugin client entries need the HonoX client bundle even without
// an island component.
export const __importing_islands = true;

export default jsxRenderer(({ children }, c) => (
  <ThemeRoot
    theme={config.theme}
    lang={c.get("htmlLanguage") ?? config.site.locale}
  >
    <head>
      <RiebeckiteHead
        title={config.site.title}
        headTags={c.get("headTags") ?? []}
        colorModeScript={false}
      />
    </head>
    <body class="riebeckite-page rb-site">{children}</body>
  </ThemeRoot>
));
