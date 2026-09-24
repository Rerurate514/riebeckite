import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type GruvboxThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  contrast?: "soft" | "medium" | "hard";
  userCss?: string[];
};

export function gruvboxTheme(options: GruvboxThemeOptions = {}) {
  const { contrast = "medium", ...config } = options;

  return defineTheme({
    name: "gruvbox",
    options,
    attributes: {
      "data-gruvbox-contrast": contrast,
    },
    styles: [{ moduleSpecifier: "@riebeckite/theme-gruvbox/style.css" }],
    config,
  });
}
