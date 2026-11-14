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

/**
 * The showcasing tiers also set every theme option so `riebeckite.config.ts`
 * demonstrates the theme configuration surface.
 */
export const showCaseTheme: ScaffoldThemeSpec = {
  package: "@riebeckite/theme-default",
  factory: "defaultTheme",
  options: '{ colorMode: "system" }',
};

export const minimalTheme = {
  package: "@riebeckite/theme-minimal",
  factory: "minimalTheme",
} satisfies ScaffoldThemeSpec;
