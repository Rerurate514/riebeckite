import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { aiSkillFiles } from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../src/application_root.js";
import { runAiSetup } from "../src/commands/ai_setup.js";
import { syncSkills } from "../src/commands/skills.js";

const require = createRequire(import.meta.url);
const version = require("@riebeckite/cli/package.json").version as string;
const skills = aiSkillFiles(
  {
    name: "site",
    title: "Site",
    description: "",
    baseUrl: "https://example.com",
    locale: "en",
  },
  { contentDirectory: "notes" },
  version,
);

test("adds missing Skills and keeps the project content directory", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-skills-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await writeFiles(
    directory,
    skills.filter((file) => !file.path.includes("/riebeckite-component/")),
  );

  await syncSkills(directory, async () => true, "reset", {
    contentDirectory: "notes",
    title: "Site",
    locale: "en",
  });

  await fs.access(
    path.join(
      directory,
      ".agents",
      "skills",
      "riebeckite-component",
      "SKILL.md",
    ),
  );
  assert.match(
    await fs.readFile(
      path.join(directory, ".agents", "skills", "riebeckite-site", "SKILL.md"),
      "utf8",
    ),
    /`notes\/`/,
  );
});

test("restores a missing Skill file without replacing the SKILL", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-skills-restore-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await writeFiles(directory, skills);
  const skillPath = path.join(
    directory,
    ".agents",
    "skills",
    "riebeckite-theme",
    "SKILL.md",
  );
  await fs.writeFile(
    skillPath,
    `${await fs.readFile(skillPath, "utf8")}
custom
`,
  );
  await fs.rm(
    path.join(
      directory,
      ".agents",
      "skills",
      "riebeckite-theme",
      "references",
      "guide.md",
    ),
  );

  await syncSkills(directory, async () => true, "review", {
    contentDirectory: "notes",
    title: "Site",
    locale: "en",
  });

  assert.match(await fs.readFile(skillPath, "utf8"), /custom/);
  await fs.access(
    path.join(
      directory,
      ".agents",
      "skills",
      "riebeckite-theme",
      "references",
      "guide.md",
    ),
  );
});

test("detects external content from .gitignore", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-skills-external-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, ".gitignore"), "notes/\n");
  await writeFiles(
    directory,
    skills.filter((file) => !file.path.includes("/riebeckite-site/")),
  );

  await syncSkills(directory, async () => true, "reset", {
    contentDirectory: "notes",
  });

  assert.match(
    await fs.readFile(
      path.join(directory, ".agents", "skills", "riebeckite-site", "SKILL.md"),
      "utf8",
    ),
    /riebeckite:content-source external/,
  );
});

test("ai setup adds MCP, lint, rules, and Skills without overwriting AGENTS.md", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-ai-setup-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(directory, "package.json"),
    `${JSON.stringify({ name: "site", scripts: {}, devDependencies: {} }, null, 2)}\n`,
  );
  const project = {
    projectRoot: directory,
    contentRoot: path.join(directory, "notes"),
    config: {
      site: {
        title: "Site",
        description: "",
        baseUrl: "https://example.com",
        locale: "en",
      },
      content: { directory: "notes" },
    },
  } as RiebeckiteProject;

  await runAiSetup(project, async () => true);

  const manifest = JSON.parse(
    await fs.readFile(path.join(directory, "package.json"), "utf8"),
  ) as {
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  assert.equal(manifest.scripts["content:lint"], "riebeckite check");
  assert.match(manifest.devDependencies["@riebeckite/mcp"] ?? "", /^\^/);
  assert.match(
    await fs.readFile(path.join(directory, "RIEBECKITE_AI.md"), "utf8"),
    /`notes\/`/,
  );
  assert.match(
    await fs.readFile(path.join(directory, "AGENTS.md"), "utf8"),
    /RIEBECKITE_AI\.md/,
  );
  await fs.access(
    path.join(
      directory,
      ".agents",
      "skills",
      "riebeckite-deployment",
      "SKILL.md",
    ),
  );

  await fs.writeFile(path.join(directory, "AGENTS.md"), "custom\n");
  await runAiSetup(project, async () => true);
  assert.equal(
    await fs.readFile(path.join(directory, "AGENTS.md"), "utf8"),
    "custom\n",
  );
});

async function writeFiles(
  root: string,
  files: readonly { path: string; content: string | Uint8Array }[],
): Promise<void> {
  for (const file of files) {
    const target = path.join(root, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content);
  }
}
