import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type EditorialThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function editorialTheme(options: EditorialThemeOptions = {}) {
  return defineTheme({
    name: "editorial",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-editorial/style.css" }],
    config: options,
  });
}
