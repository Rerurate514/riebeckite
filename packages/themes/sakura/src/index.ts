import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type SakuraThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  bloom?: "soft" | "vivid";
  roundness?: "soft" | "crisp";
  heading?: "decorated" | "plain";
  userCss?: string[];
};

export function sakuraTheme(options: SakuraThemeOptions = {}) {
  const {
    bloom = "soft",
    roundness = "soft",
    heading = "decorated",
    ...config
  } = options;

  return defineTheme({
    name: "sakura",
    options,
    attributes: {
      "data-sakura-bloom": bloom,
      "data-sakura-roundness": roundness,
      "data-sakura-heading": heading,
    },
    styles: [{ moduleSpecifier: "@riebeckite/theme-sakura/style.css" }],
    config,
  });
}
