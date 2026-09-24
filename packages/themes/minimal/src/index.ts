import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type MinimalThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function minimalTheme(options: MinimalThemeOptions = {}) {
  return defineTheme({
    name: "minimal",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-minimal/style.css" }],
    config: options,
  });
}
