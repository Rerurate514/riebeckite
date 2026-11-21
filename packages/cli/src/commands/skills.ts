import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { aiSkillFiles } from "create-riebeckite/scaffold";

const require = createRequire(import.meta.url);

export type SkillSyncOptions = {
  contentDirectory?: string;
  title?: string;
  locale?: string;
  externalContent?: boolean;
};

type SkillFile = { path: string; content: string };

type SkillUpdate = {
  name: string;
  before?: string;
  after?: string;
  files: SkillFile[];
  outdated: boolean;
};

export async function syncSkills(
  root: string,
  confirm: (message: string, initial: boolean) => Promise<boolean>,
  mode: "review" | "reset",
  options: SkillSyncOptions = {},
): Promise<void> {
  const version = require("@riebeckite/cli/package.json").version as string;
  const directory = path.join(root, ".agents", "skills");
  const existingSiteSkill = await fs
    .readFile(path.join(directory, "riebeckite-site", "SKILL.md"), "utf8")
    .catch(() => undefined);
  const contentDirectory = options.contentDirectory ?? "content";
  const externalContent =
    options.externalContent ??
    (await isExternalContentProject(root, contentDirectory, existingSiteSkill));
  const files = aiSkillFiles(
    {
      name: "",
      title: options.title ?? "",
      description: "",
      baseUrl: "",
      locale: options.locale ?? "",
      externalContent,
    },
    { contentDirectory },
    version,
  ).filter(
    (file): file is SkillFile =>
      file.path.startsWith(".agents/skills/") &&
      typeof file.content === "string",
  );
  const updates: SkillUpdate[] = [];
  for (const [name, group] of groupBySkill(files)) {
    const target = path.join(directory, name, "SKILL.md");
    const before = await fs.readFile(target, "utf8").catch(() => undefined);
    const outdated = !before || versionOf(before) !== version;
    const filesToWrite = outdated ? group : await missingFiles(root, group);
    if (filesToWrite.length === 0) continue;
    updates.push({
      name,
      before,
      after: group.find((file) => file.path.endsWith("/SKILL.md"))?.content,
      files: filesToWrite,
      outdated,
    });
  }
  for (const update of updates) {
    if (update.before === undefined) {
      process.stdout.write(
        `--- .agents/skills/${update.name}\n+++ new\n${update.files.map((file) => file.path).join("\n")}\n`,
      );
    } else if (update.outdated) {
      process.stdout.write(
        `--- .agents/skills/${update.name}/SKILL.md\n+++ updated\n${update.before}\n${update.after ?? ""}\n`,
      );
    } else {
      process.stdout.write(
        `--- .agents/skills/${update.name}\n+++ add missing files\n${update.files.map((file) => file.path).join("\n")}\n`,
      );
    }
  }
  if (updates.length === 0) return;
  if (mode === "reset") {
    if (!(await confirm(`Apply all ${updates.length} Skill updates?`, false)))
      return;
    await Promise.all(
      updates.flatMap((update) => writeSkillFiles(root, update.files)),
    );
    return;
  }
  for (const update of updates) {
    const action = update.outdated
      ? update.before === undefined
        ? "Add"
        : "Update"
      : "Restore missing files in";
    if (await confirm(`${action} ${update.name}?`, false))
      await Promise.all(writeSkillFiles(root, update.files));
  }
}

function groupBySkill(files: readonly SkillFile[]): Map<string, SkillFile[]> {
  const groups = new Map<string, SkillFile[]>();
  for (const file of files) {
    const name = file.path.split("/")[2];
    if (!name) continue;
    groups.set(name, [...(groups.get(name) ?? []), file]);
  }
  return groups;
}

async function missingFiles(
  root: string,
  files: readonly SkillFile[],
): Promise<SkillFile[]> {
  const missing: SkillFile[] = [];
  for (const file of files) {
    const exists = await fs
      .access(path.join(root, file.path))
      .then(() => true)
      .catch(() => false);
    if (!exists) missing.push(file);
  }
  return missing;
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

async function isExternalContentProject(
  root: string,
  contentDirectory: string,
  siteSkill: string | undefined,
): Promise<boolean> {
  const explicit = /riebeckite:content-source\s+(external|local)/.exec(
    siteSkill ?? "",
  )?.[1];
  if (explicit) return explicit === "external";
  if (siteSkill?.includes("git-ignored content repository")) return true;
  const gitignore = await fs
    .readFile(path.join(root, ".gitignore"), "utf8")
    .catch(() => undefined);
  const ignored = new Set(
    (gitignore ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
  return (
    ignored.has(`${contentDirectory}/`) ||
    ignored.has(contentDirectory) ||
    ignored.has(`/${contentDirectory}/`)
  );
}

function versionOf(content: string): string | undefined {
  return /^riebeckiteVersion:\s*["']?([^"'\n]+)["']?/m.exec(content)?.[1];
}
