import type { ResolvedTheme } from "@riebeckite/core";

export type ThemeConfigInspection = {
  readonly name: string;
  readonly colorMode: "light" | "dark" | "system";
  readonly layout: string;
  readonly styles: readonly string[];
  readonly stylesheets: readonly string[];
  readonly settings: {
    readonly values: Readonly<Record<string, string | number | boolean>>;
    readonly attributes: Readonly<Record<string, string>>;
    readonly style: string;
  };
};

export function inspectThemeConfig(
  theme: ResolvedTheme,
): ThemeConfigInspection {
  return {
    name: theme.name,
    colorMode: theme.colorMode,
    layout: theme.layout,
    styles: theme.styles.map((style) => style.moduleSpecifier),
    stylesheets: [...theme.stylesheets],
    settings: {
      values: { ...theme.settings.values },
      attributes: { ...theme.settings.attributes },
      style: theme.settings.style,
    },
  };
}
