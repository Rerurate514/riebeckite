import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";

test("adds selected AI development support", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-scaffold-ai-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await scaffoldRiebeckiteSite({
    targetDirectory: directory,
    preset: "minimal",
    ai: { mcp: true, lint: true, rules: true, skills: true },
  });
  const manifest = JSON.parse(
    await fs.readFile(path.join(directory, "package.json"), "utf8"),
  ) as {
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  assert.equal(manifest.scripts["content:lint"], "riebeckite check");
  assert.ok(manifest.devDependencies["@riebeckite/ai"]);
  assert.ok(manifest.devDependencies["@riebeckite/mcp"]);
  assert.match(
    await fs.readFile(path.join(directory, "RIEBECKITE_AI.md"), "utf8"),
    /`content\/`/,
  );
  assert.match(
    await fs.readFile(path.join(directory, "AGENTS.md"), "utf8"),
    /RIEBECKITE_AI\.md/,
  );
  assert.match(
    await fs.readFile(
      path.join(directory, ".agents", "skills", "riebeckite-site", "SKILL.md"),
      "utf8",
    ),
    /publishStrategy/,
  );
  assert.match(
    await fs.readFile(
      path.join(directory, ".agents", "skills", "riebeckite-theme", "SKILL.md"),
      "utf8",
    ),
    /riebeckiteVersion: "0\.1\.0"/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-component",
        "references",
        "guide.md",
      ),
      "utf8",
    ),
    /Choose the right boundary/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-content-migration",
        "references",
        "guide.md",
      ),
      "utf8",
    ),
    /Route impact/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-deployment",
        "references",
        "guide.md",
      ),
      "utf8",
    ),
    /External content repository/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-plugin-catalog",
        "references",
        "guide.md",
      ),
      "utf8",
    ),
    /Official Plugin catalog/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-plugin",
        "references",
        "guide.md",
      ),
      "utf8",
    ),
    /dependencyMode[\s\S]*global/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-theme",
        "assets",
        "checklist.md",
      ),
      "utf8",
    ),
    /reduced.motion/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-theme",
        "references",
        "guide.md",
      ),
      "utf8",
    ),
    /data-rb-mode="dark"/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-component",
        "references",
        "guide.md",
      ),
      "utf8",
    ),
    /createContentRoute/,
  );
  assert.match(
    await fs.readFile(
      path.join(
        directory,
        ".agents",
        "skills",
        "riebeckite-upgrade",
        "references",
        "guide.md",
      ),
      "utf8",
    ),
    /does not install/,
  );
  for (const name of [
    "riebeckite-site",
    "riebeckite-plugin-catalog",
    "riebeckite-plugin",
    "riebeckite-component",
    "riebeckite-content-migration",
    "riebeckite-deployment",
    "riebeckite-theme",
    "riebeckite-configuration",
    "riebeckite-troubleshooting",
    "riebeckite-upgrade",
  ]) {
    await fs.access(
      path.join(directory, ".agents", "skills", name, "SKILL.md"),
    );
  }
});

test("adds external-content guidance and no Skills when disabled", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-scaffold-ai-external-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await scaffoldRiebeckiteSite({
    targetDirectory: directory,
    preset: "minimal",
    ai: { skills: true },
    deployment: {
      type: "github-actions",
      content: {
        type: "external",
        contentRepository: "owner/content",
        siteRepository: "owner/site",
      },
    },
  });
  assert.match(
    await fs.readFile(
      path.join(directory, ".agents", "skills", "riebeckite-site", "SKILL.md"),
      "utf8",
    ),
    /external content repository/,
  );
  assert.match(
    await fs.readFile(
      path.join(directory, ".agents", "skills", "riebeckite-site", "SKILL.md"),
      "utf8",
    ),
    /riebeckite:content-source external/,
  );
  const withoutSkills = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-scaffold-no-skills-"),
  );
  t.after(() => fs.rm(withoutSkills, { recursive: true, force: true }));
  await scaffoldRiebeckiteSite({
    targetDirectory: withoutSkills,
    preset: "minimal",
    ai: { skills: false },
  });
  await assert.rejects(
    fs.access(path.join(withoutSkills, ".agents", "skills")),
    { code: "ENOENT" },
  );
  await assert.rejects(fs.access(path.join(withoutSkills, "AGENTS.md")), {
    code: "ENOENT",
  });
});
