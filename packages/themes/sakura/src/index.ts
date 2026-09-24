import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type SakuraThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function sakuraTheme(options: SakuraThemeOptions = {}) {
  return defineTheme({
    name: "sakura",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-sakura/style.css" }],
    config: options,
  });
}
