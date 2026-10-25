import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type FolioThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function folioTheme(options: FolioThemeOptions = {}) {
  return defineTheme({
    name: "folio",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-folio/style.css" }],
    config: options,
  });
}
