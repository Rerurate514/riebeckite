import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type RerurateThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function rerurateTheme(options: RerurateThemeOptions = {}) {
  return defineTheme({
    name: "rerurate",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-rerurate/style.css" }],
    config: options,
  });
}
