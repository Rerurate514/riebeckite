import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type DefaultThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function defaultTheme(options: DefaultThemeOptions = {}) {
  return defineTheme({
    name: "riebeckite",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-default/style.css" }],
    config: options,
  });
}
