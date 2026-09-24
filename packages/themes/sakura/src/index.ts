import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type SakuraThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  bloom?: "soft" | "vivid";
  userCss?: string[];
};

export function sakuraTheme(options: SakuraThemeOptions = {}) {
  const { bloom = "soft", ...config } = options;

  return defineTheme({
    name: "sakura",
    options,
    attributes: {
      "data-sakura-bloom": bloom,
    },
    styles: [{ moduleSpecifier: "@riebeckite/theme-sakura/style.css" }],
    config,
  });
}
