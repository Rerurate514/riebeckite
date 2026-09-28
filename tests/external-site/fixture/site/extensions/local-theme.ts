import { defineTheme } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

/**
 * A site-local theme. It composes the published default theme and adds its own
 * stylesheet and attribute through the same `defineTheme` contract an installed
 * `@riebeckite/theme-*` package uses.
 */
export function localFixtureTheme() {
  const base = defaultTheme({ colorMode: "dark", articleLayout: "article" });

  return defineTheme({
    name: "fixture-local",
    styles: [
      ...(base.styles ?? []),
      { moduleSpecifier: "/extensions/local-theme.css" },
    ],
    config: {
      ...base.config,
      tokens: { color: { accent: "#c2410c" } },
    },
    attributes: { "data-fixture-theme": "local" },
  });
}
