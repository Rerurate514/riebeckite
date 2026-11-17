import type { ScaffoldThemeSpec } from "./presets_types.js";

export const defaultTheme = {
  package: "@riebeckite/theme-default",
  factory: "defaultTheme",
} satisfies ScaffoldThemeSpec;

export const gardenTheme = {
  package: "@riebeckite/theme-garden",
  factory: "gardenTheme",
} satisfies ScaffoldThemeSpec;

export const editorialTheme = {
  package: "@riebeckite/theme-editorial",
  factory: "editorialTheme",
} satisfies ScaffoldThemeSpec;

export const folioTheme = {
  package: "@riebeckite/theme-folio",
  factory: "folioTheme",
} satisfies ScaffoldThemeSpec;

export const minimalTheme = {
  package: "@riebeckite/theme-minimal",
  factory: "minimalTheme",
} satisfies ScaffoldThemeSpec;
