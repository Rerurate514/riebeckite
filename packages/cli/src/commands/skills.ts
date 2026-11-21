import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { aiSkillFiles } from "create-riebeckite/scaffold";

const require = createRequire(import.meta.url);

export async function syncSkills(
  root: string,
  confirm: (message: string, initial: boolean) => Promise<boolean>,
  mode: "review" | "reset",
): Promise<void> {
  const version = require("@riebeckite/cli/package.json").version as string;
  const directory = path.join(root, ".agents", "skills");
  const current = await fs
    .readdir(directory, { withFileTypes: true })
    .catch(() => []);
  const updates: {
    name: string;
    before: string;
    after: string;
    files: readonly { path: string; content: string }[];
  }[] = [];
  for (const item of current) {
    if (!item.isDirectory()) continue;
    const target = path.join(directory, item.name, "SKILL.md");
    const before = await fs.readFile(target, "utf8").catch(() => undefined);
    if (!before || versionOf(before) === version) continue;
    const external = before.includes("git-ignored content repository");
    const files = aiSkillFiles(
      {
        name: "",
        title: "",
        description: "",
        baseUrl: "",
        locale: "",
        externalContent: external,
      },
      {},
      version,
    ).filter(
      (file): file is { path: string; content: string } =>
        file.path.startsWith(`.agents/skills/${item.name}/`) &&
        typeof file.content === "string",
    );
    const template = files.find(
      (file) => file.path === `.agents/skills/${item.name}/SKILL.md`,
    );
    if (!template || typeof template.content !== "string") continue;
    updates.push({ name: item.name, before, after: template.content, files });
  }
  for (const update of updates) {
    process.stdout.write(
      `--- .agents/skills/${update.name}/SKILL.md\n+++ updated\n${update.before}\n${update.after}\n`,
    );
  }
  if (updates.length === 0) return;
  if (mode === "reset") {
    if (
      !(await confirm(`Replace all ${updates.length} outdated Skills?`, false))
    )
      return;
    await Promise.all(
      updates.flatMap((update) => writeSkillFiles(root, update.files)),
    );
    return;
  }
  for (const update of updates) {
    if (await confirm(`Update ${update.name}?`, false))
      await Promise.all(writeSkillFiles(root, update.files));
  }
}

function writeSkillFiles(
  root: string,
  files: readonly { path: string; content: string }[],
): Promise<void>[] {
  return files.map(async (file) => {
    const target = path.join(root, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content);
  });
}

function versionOf(content: string): string | undefined {
  return /^riebeckiteVersion:\s*["']?([^"'\n]+)["']?/m.exec(content)?.[1];
}
