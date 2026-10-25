import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type TechnicalThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function technicalTheme(options: TechnicalThemeOptions = {}) {
  return defineTheme({
    name: "technical",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-technical/style.css" }],
    config: options,
  });
}
