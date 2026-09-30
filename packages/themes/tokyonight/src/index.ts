import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type TokyonightThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  density?: "cozy" | "compact";
  heading?: "tech" | "plain";
  neon?: boolean;
  userCss?: string[];
};

export function tokyonightTheme(options: TokyonightThemeOptions = {}) {
  const {
    density = "cozy",
    heading = "tech",
    neon = false,
    ...config
  } = options;

  return defineTheme({
    name: "tokyonight",
    options,
    attributes: {
      "data-tokyonight-density": density,
      "data-tokyonight-heading": heading,
      "data-tokyonight-neon": neon ? "on" : undefined,
    },
    styles: [{ moduleSpecifier: "@riebeckite/theme-tokyonight/style.css" }],
    config,
  });
}
