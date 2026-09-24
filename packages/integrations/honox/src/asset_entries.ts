import fs from "node:fs";
import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";

export type GeneratedAssetPaths = {
  pluginStyles: string;
  themeStyles: string;
};

export function writeRiebeckiteAssetEntries(
  config: ResolvedRiebeckiteConfig,
  paths: GeneratedAssetPaths,
): void {
  writeGeneratedFile(paths.pluginStyles, createPluginStylesEntry(config));
  writeGeneratedFile(paths.themeStyles, createThemeStylesEntry(config));
}

function createPluginStylesEntry(config: ResolvedRiebeckiteConfig): string {
  return createStylesheetEntry(collectPluginStyleSpecifiers(config));
}

function createThemeStylesEntry(config: ResolvedRiebeckiteConfig): string {
  return createStylesheetEntry(
    config.theme.styles.map((style) => style.moduleSpecifier),
  );
}

function collectPluginStyleSpecifiers(
  config: ResolvedRiebeckiteConfig,
): string[] {
  return config.plugins.flatMap((plugin) =>
    (plugin.assets ?? [])
      .filter((asset) => asset.kind === "style")
      .map((asset) => asset.moduleSpecifier),
  );
}

function createStylesheetEntry(moduleSpecifiers: string[]): string {
  return uniqueStrings(moduleSpecifiers)
    .map((specifier) => `@import ${JSON.stringify(specifier)};`)
    .join("\n");
}

function writeGeneratedFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
