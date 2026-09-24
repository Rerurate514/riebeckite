import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type TokyonightThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  neon?: boolean;
  userCss?: string[];
};

export function tokyonightTheme(options: TokyonightThemeOptions = {}) {
  const { neon = false, ...config } = options;

  return defineTheme({
    name: "tokyonight",
    options,
    attributes: {
      "data-tokyonight-neon": neon ? "on" : undefined,
    },
    styles: [{ moduleSpecifier: "@riebeckite/theme-tokyonight/style.css" }],
    config,
  });
}
