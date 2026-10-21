import fs from "node:fs/promises";
import path from "node:path";

export const pluginDevFixtureMarker = "PLUGIN_DEV_FIXTURE_MARKER";

export async function writePluginDevFixture(
  previewRoot: string,
  pluginName: string,
): Promise<void> {
  const contentRoot = path.join(previewRoot, "content");
  await fs.rm(contentRoot, { recursive: true, force: true });
  await fs.mkdir(contentRoot, { recursive: true });
  await fs.writeFile(
    path.join(contentRoot, "index.md"),
    pluginDevContent(pluginName),
    "utf8",
  );
}

function pluginDevContent(pluginName: string): string {
  return [
    "---",
    `title: ${JSON.stringify(`${pluginName} preview`)}`,
    "visibility: public",
    "---",
    "",
    `# ${pluginName} preview`,
    "",
    pluginDevFixtureMarker,
    "",
    "This page is rendered by the local plugin inside an isolated fixture site.",
    "",
    "## Code tabs",
    "",
    '```ts tab="TypeScript"',
    'const message = "plugin preview";',
    "```",
    "",
    '```js tab="JavaScript"',
    'const message = "plugin preview";',
    "```",
    "",
  ].join("\n");
}
