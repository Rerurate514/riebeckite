import { PLUGIN_CATEGORIES } from "./content_pages_plugins_catalog.js";
import { PLUGINS_COPY } from "./content_pages_plugins_copy.js";
import {
  codeBlock,
  frontmatter,
  HELPERS,
  heading,
  PLUGIN_INDEX_URL,
  pluginReadmeUrl,
  read,
} from "./content_pages_shared.js";
import type { ScaffoldLanguage } from "./presets.js";

export function pluginsContent(language: ScaffoldLanguage): string {
  const copy = PLUGINS_COPY;
  const categories = PLUGIN_CATEGORIES;
  const lines: string[] = [frontmatter()];
  lines.push(heading(1, read(copy.title, language)), "");
  lines.push(read(copy.intro, language), "");
  lines.push(heading(2, read(copy.installHeading, language)), "");
  lines.push(read(copy.installStep1, language), "");
  lines.push(codeBlock("sh", "npm install @riebeckite/plugin-mermaid-pele"));
  lines.push(read(copy.installStep2, language), "");
  lines.push(
    codeBlock(
      "ts",
      [
        'import { defineConfig } from "@riebeckite/core";',
        'import { l10n } from "@riebeckite/plugin-l10n";',
        'import { mermaidPele } from "@riebeckite/plugin-mermaid-pele";',
        'import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";',
        "",
        "export default defineConfig({",
        "  // ...",
        "  plugins: [obsidianMarkdown(), l10n({ ... }), mermaidPele()],",
        "});",
      ].join("\n"),
    ),
  );
  lines.push(read(copy.fullList, language), "");
  lines.push(
    `[${read(copy.fullListLabel, language)}](${PLUGIN_INDEX_URL})`,
    "",
  );

  for (const category of categories) {
    lines.push(heading(2, read(category.title, language)), "");
    lines.push(read(category.summary, language), "");
    lines.push(
      `| ${read(copy.columnPlugin, language)} | ${read(copy.columnDescription, language)} |`,
    );
    lines.push("| --- | --- |");
    for (const plugin of category.plugins) {
      const packageName = `@riebeckite/plugin-${plugin.slug}`;
      lines.push(
        `| [\`${packageName}\`](${pluginReadmeUrl(plugin.slug)}) | ${read(plugin.desc, language)} |`,
      );
    }
    lines.push("");
  }

  lines.push("");
  lines.push(
    `Riebeckite: [documentation](${HELPERS.en}) · [日本語ドキュメント](${HELPERS.ja})`,
    "",
  );
  lines.push("");
  return lines.join("\n");
}
