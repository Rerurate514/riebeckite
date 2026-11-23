import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { resolveConfig } from "@riebeckite/core";
import type { RiebeckiteProject } from "../src/application_root.js";
import { runDoctorCommand } from "../src/commands/doctor.js";

const require = createRequire(import.meta.url);
const version = require("@riebeckite/cli/package.json").version as string;

test("doctor stays quiet when AI setup is absent", async () => {
  const root = await createProject();
  try {
    assert.deepEqual(await aiCodes(root), []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("doctor accepts a complete AI setup", async () => {
  const root = await createProject();
  try {
    await writeGuidance(root, version);
    await writeSkill(root, "riebeckite-site", version);
    await fs.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({
        devDependencies: {
          "@riebeckite/ai": "^0.1.0",
          "@riebeckite/mcp": "^0.1.0",
        },
      })}\n`,
    );
    assert.deepEqual(await aiCodes(root), []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("doctor reports incomplete and outdated AI setup", async () => {
  const root = await createProject();
  try {
    await fs.writeFile(
      path.join(root, "RIEBECKITE_AI.md"),
      `---\nriebeckiteVersion: "0.0.0"\n---\n`,
    );
    await writeSkill(root, "riebeckite-site", "0.0.0");
    const codes = await aiCodes(root);
    assert.ok(codes.includes("AI_GUIDANCE_INCOMPLETE"));
    assert.ok(codes.includes("AI_RULES_OUTDATED"));
    assert.ok(codes.includes("AI_SKILLS_OUTDATED"));
    assert.ok(codes.includes("AI_MCP_DEPENDENCY_MISSING"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("doctor reports a missing MCP dependency", async () => {
  const root = await createProject();
  try {
    await writeGuidance(root, version);
    await writeSkill(root, "riebeckite-site", version);
    await fs.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({
        devDependencies: { "@riebeckite/ai": "^0.1.0" },
      })}\n`,
    );
    assert.deepEqual(await aiCodes(root), ["AI_MCP_DEPENDENCY_MISSING"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

async function createProject(): Promise<string> {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-doctor-ai-"),
  );
  await fs.mkdir(path.join(root, "content"), { recursive: true });
  return root;
}

async function writeGuidance(root: string, value: string): Promise<void> {
  await fs.writeFile(path.join(root, "AGENTS.md"), "guidance\n");
  await fs.writeFile(
    path.join(root, "RIEBECKITE_AI.md"),
    `---\nriebeckiteVersion: "${value}"\n---\n`,
  );
}

async function writeSkill(
  root: string,
  name: string,
  value: string,
): Promise<void> {
  const directory = path.join(root, ".agents", "skills", name);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "SKILL.md"),
    `---\nname: ${name}\nriebeckiteVersion: "${value}"\n---\n`,
  );
}

async function aiCodes(root: string): Promise<readonly string[]> {
  const project: RiebeckiteProject = {
    invocationCwd: root,
    projectRoot: root,
    configRoot: root,
    configPath: path.join(root, "riebeckite.config.ts"),
    appRoot: root,
    contentRoot: path.join(root, "content"),
    config: resolveConfig({
      site: { title: "Doctor" },
      content: { directory: path.join(root, "content") },
    }),
  };
  const output: string[] = [];
  const original = console.log;
  console.log = (value: unknown) => {
    output.push(String(value));
  };
  try {
    await runDoctorCommand(project, { json: true });
  } finally {
    console.log = original;
  }
  const report = JSON.parse(output.join("\n")) as {
    diagnostics: { code: string; category: string }[];
  };
  return report.diagnostics
    .filter((diagnostic) => diagnostic.category === "ai")
    .map((diagnostic) => diagnostic.code);
}
