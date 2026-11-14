import type { ScaffoldLanguage } from "./presets.js";

export const HELPERS = {
  en: "https://github.com/Rerurate514/riebeckite/blob/main/docs/README.md",
  ja: "https://github.com/Rerurate514/riebeckite/blob/main/docs/README.ja.md",
};

export const PLUGIN_INDEX_URL =
  "https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins";
export const THEMES_INDEX_URL =
  "https://github.com/Rerurate514/riebeckite/tree/main/packages/themes";
export const GALLERY_PACKAGE = "@riebeckite/plugin-gallery";

export type LocalizedText = Record<ScaffoldLanguage, string>;

export function read(text: LocalizedText, language: ScaffoldLanguage): string {
  return text[language];
}

export function frontmatter(): string {
  return ["---", "publish: true", "---", ""].join("\n");
}

export function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

export function codeBlock(language: string, code: string): string {
  return `\`\`\`${language}\n${code}\n\`\`\`\n`;
}

export function pluginReadmeUrl(slug: string): string {
  return `https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/${slug}/README.md`;
}

export function themeReadmeUrl(slug: string): string {
  return `https://github.com/Rerurate514/riebeckite/blob/main/packages/themes/${slug}/README.md`;
}
