import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type TokyonightThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function tokyonightTheme(options: TokyonightThemeOptions = {}) {
  return defineTheme({
    name: "tokyonight",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-tokyonight/style.css" }],
    config: options,
  });
}
