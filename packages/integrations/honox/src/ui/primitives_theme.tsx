import { type ResolvedRiebeckiteConfig, uniqueStrings } from "@riebeckite/core";
import { useSiteContext } from "./context.js";
import type { ThemeRootProps } from "./primitives_types.js";

export function themeRootAttributes(
  theme: ResolvedRiebeckiteConfig["theme"],
): Record<string, string | undefined> {
  return {
    ...theme.settings.attributes,
    "data-rb-theme": theme.name,
    "data-rb-mode": theme.colorMode === "system" ? undefined : theme.colorMode,
    "data-rb-layout": theme.layout,
  };
}

export function ThemeRoot(props: ThemeRootProps) {
  const site = useSiteContext();
  const theme = props.theme ?? site?.config.theme;
  const lang = props.lang ?? site?.language ?? site?.config.site.locale;
  if (!theme) return <html lang={lang}>{props.children}</html>;

  return (
    <html lang={lang} {...themeRootAttributes(theme)}>
      {props.children}
    </html>
  );
}

export function getThemeStyle(
  theme: ResolvedRiebeckiteConfig["theme"],
): string {
  return theme.settings.style;
}

export function getThemeStylesheets(stylesheets: readonly string[]): string[] {
  return uniqueStrings([...stylesheets]);
}

export function joinClassNames(
  ...classNames: Array<string | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}
