import { uniqueStrings } from "@riebeckite/core";
import { config } from "../config";

type CssVariable = [name: string, value: string | undefined];

export function getThemeStyle(): string {
  const tokens = config.theme.tokens;
  const variables: CssVariable[] = [
    ["--rb-color-paper", tokens.color?.paper],
    ["--rb-color-ink", tokens.color?.ink],
    ["--rb-color-muted", tokens.color?.muted],
    ["--rb-color-accent", tokens.color?.accent],
    ["--rb-color-border", tokens.color?.border],
    ["--rb-color-border-strong", tokens.color?.borderStrong],
    ["--rb-color-surface", tokens.color?.surface],
    ["--rb-color-surface-hover", tokens.color?.surfaceHover],
    ["--rb-color-overlay", tokens.color?.overlay],
    ["--rb-color-danger", tokens.color?.danger],
    ["--rb-color-success", tokens.color?.success],
    ["--rb-color-code-background", tokens.color?.codeBackground],
    ["--rb-font-body", tokens.typography?.bodyFont],
    ["--rb-font-heading", tokens.typography?.headingFont],
    ["--rb-font-mono", tokens.typography?.monoFont],
    ["--rb-layout-page-max", tokens.layout?.pageMaxWidth],
    ["--rb-layout-article-max", tokens.layout?.articleMaxWidth],
    ["--rb-layout-sidebar", tokens.layout?.sidebarWidth],
    ["--rb-layout-gap", tokens.layout?.contentGap],
  ];

  const declarations = variables
    .filter((variable): variable is [string, string] => Boolean(variable[1]))
    .map(([name, value]) => `${name}: ${value};`);

  if (declarations.length === 0) return "";

  return `:root { ${declarations.join(" ")} }`;
}

export function getThemeStylesheets(): string[] {
  return uniqueStrings(config.theme.userCss);
}

export function getPluginScripts(): string[] {
  return [];
}
