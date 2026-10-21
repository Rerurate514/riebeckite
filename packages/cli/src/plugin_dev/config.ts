import fs from "node:fs/promises";
import path from "node:path";
import { resolveModuleSpecifier } from "../preview_site.js";
import type { LocalPluginPackage } from "./local_plugin.js";

export async function writePluginDevConfig(
  previewRoot: string,
  plugin: LocalPluginPackage,
): Promise<void> {
  const [core, colorMode, obsidianMarkdown, themeDefault, tocPlugin] =
    await Promise.all([
      resolveModuleSpecifier("@riebeckite/core"),
      resolveModuleSpecifier("@riebeckite/plugin-color-mode"),
      resolveModuleSpecifier("@riebeckite/plugin-obsidian-markdown"),
      resolveModuleSpecifier("@riebeckite/theme-default"),
      resolveModuleSpecifier("@riebeckite/plugin-toc"),
    ]);
  const factoryName = pluginFactoryName(plugin.name);
  const source = `import { defineConfig } from ${JSON.stringify(core)};
import { colorModePlugin } from ${JSON.stringify(colorMode)};
import { obsidianMarkdown } from ${JSON.stringify(obsidianMarkdown)};
import { tocPlugin } from ${JSON.stringify(tocPlugin)};
import { defaultTheme } from ${JSON.stringify(themeDefault)};
import * as pluginModule from ${JSON.stringify(plugin.entry)};

const moduleRecord = pluginModule as unknown as Record<string, unknown>;
const preferredFactory =
  moduleRecord[${JSON.stringify(factoryName)}] ??
  moduleRecord[${JSON.stringify(`${factoryName}Plugin`)}];
const fallbackFactory = Object.values(moduleRecord).find(
  (value) => typeof value === "function",
);
const factory = (
  typeof preferredFactory === "function" ? preferredFactory : fallbackFactory
) as (() => unknown) | undefined;

if (typeof factory !== "function") {
  throw new Error("Plugin entry must export a plugin factory.");
}

const plugin = factory();
if (
  !plugin ||
  typeof plugin !== "object" ||
  typeof (plugin as { name?: unknown }).name !== "string"
) {
  throw new Error("Plugin factory must return a Riebeckite Plugin.");
}

export default defineConfig({
  site: {
    title: ${JSON.stringify(`${plugin.name} preview`)},
    description: "Isolated Plugin preview",
    baseUrl: "",
    locale: "en",
  },
  content: { directory: "content" },
  theme: defaultTheme(),
  plugins: [obsidianMarkdown(), colorModePlugin(), tocPlugin(), plugin],
});
`;
  await fs.writeFile(
    path.join(previewRoot, "riebeckite.config.ts"),
    source,
    "utf8",
  );
}

export function pluginFactoryName(packageName: string): string {
  const bare = packageName.split("/").at(-1) ?? packageName;
  const withoutPrefix = bare.startsWith("plugin-")
    ? bare.slice("plugin-".length)
    : bare;
  return withoutPrefix.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}
