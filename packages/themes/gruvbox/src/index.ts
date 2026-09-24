import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type GruvboxThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function gruvboxTheme(options: GruvboxThemeOptions = {}) {
  return defineTheme({
    name: "gruvbox",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-gruvbox/style.css" }],
    config: options,
  });
}
