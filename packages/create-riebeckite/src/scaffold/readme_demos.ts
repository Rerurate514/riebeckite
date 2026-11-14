import type { ScaffoldPreset } from "./presets_types.js";
import { README_DEMOS_A } from "./readme_demos_a.js";
import { README_DEMOS_B } from "./readme_demos_b.js";
import type { ReadmeDemo } from "./readme_demos_types.js";

export { fence } from "./readme_demos_fence.js";

export const README_DEMOS: Readonly<Record<string, ReadmeDemo>> = {
  ...README_DEMOS_A,
  ...README_DEMOS_B,
};

/**
 * English-only content pages keep a `.en` suffix unless `en` is the default
 * language. `examples` is intentionally absent: it is localized like the
 * tour pages, with English as the fallback for untranslated languages.
 */
export const ENGLISH_ONLY_PAGES = new Set([
  "guide",
  "reference/plugins",
  "reference/themes",
]);

export function hasPlugin(
  preset: ScaffoldPreset,
  packageName: string,
): boolean {
  return preset.plugins.some((plugin) => plugin.package === packageName);
}

/**
 * A demo key is either `@scope/package` or `@scope/package/topic`. Recover the
 * package name: the first two `/`-separated segments form the scoped name.
 */
export function demoPackage(key: string): string {
  return key.split("/", 2).join("/");
}

export const README_DEMO_ORDER = [
  "@riebeckite/plugin-obsidian-markdown/callout",
  "@riebeckite/plugin-obsidian-markdown/wikilinks",
  "@riebeckite/plugin-code-enhance",
  "@riebeckite/plugin-code-tabs",
  "@riebeckite/plugin-mermaid-pele",
  "@riebeckite/plugin-d2",
  "@riebeckite/plugin-graphviz",
  "@riebeckite/plugin-chartjs",
  "@riebeckite/plugin-vega-lite",
  "@riebeckite/plugin-wavedrom",
  "@riebeckite/plugin-markmap",
  "@riebeckite/plugin-map",
  "@riebeckite/plugin-marp",
  "@riebeckite/plugin-qr-code",
  "@riebeckite/plugin-rich-embed",
  "@riebeckite/plugin-gallery",
  "@riebeckite/plugin-dataview",
  "@riebeckite/plugin-query",
  "@riebeckite/plugin-bases",
  "@riebeckite/plugin-kanban",
];
