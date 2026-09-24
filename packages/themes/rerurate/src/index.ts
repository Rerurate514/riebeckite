import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type RerurateThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  initial?: boolean;
  userCss?: string[];
};

export function rerurateTheme(options: RerurateThemeOptions = {}) {
  const { initial = false, ...config } = options;

  return defineTheme({
    name: "rerurate",
    options,
    attributes: {
      "data-rerurate-initial": initial ? "on" : undefined,
    },
    styles: [{ moduleSpecifier: "@riebeckite/theme-rerurate/style.css" }],
    config,
  });
}
