import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type GardenThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  userCss?: string[];
};

export function gardenTheme(options: GardenThemeOptions = {}) {
  return defineTheme({
    name: "garden",
    options,
    styles: [{ moduleSpecifier: "@riebeckite/theme-garden/style.css" }],
    config: options,
  });
}
