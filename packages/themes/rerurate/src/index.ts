import { defineTheme, type ThemeConfig } from "@riebeckite/core";

export type RerurateInitialSize = "small" | "medium" | "large";

export type RerurateThemeOptions = Omit<ThemeConfig, "name" | "userCss"> & {
  initial?: boolean | RerurateInitialSize;
  largeHeadings?: boolean;
  headingMarks?: boolean;
  motion?: boolean;
  userCss?: string[];
};

export function rerurateTheme(options: RerurateThemeOptions = {}) {
  const {
    initial = false,
    largeHeadings = false,
    headingMarks = true,
    motion = true,
    ...config
  } = options;
  const initialEnabled = initial !== false;
  const initialSize: RerurateInitialSize =
    typeof initial === "string" ? initial : "medium";

  return defineTheme({
    name: "rerurate",
    options,
    attributes: {
      "data-rerurate-initial": initialEnabled ? "on" : undefined,
      "data-rerurate-initial-size": initialEnabled ? initialSize : undefined,
      "data-rerurate-headings": largeHeadings ? "large" : undefined,
      "data-rerurate-heading-marks": headingMarks ? undefined : "off",
      "data-rerurate-motion": motion ? undefined : "off",
    },
    styles: [{ moduleSpecifier: "@riebeckite/theme-rerurate/style.css" }],
    config,
  });
}
