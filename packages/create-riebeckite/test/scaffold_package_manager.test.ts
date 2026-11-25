import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { withTemporaryDirectory } from "@riebeckite/test/fixtures";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import { formatScaffoldNextSteps } from "../src/scaffold/next-steps.js";

test("pnpm sites use pnpm in package metadata, docs, and workflows", async () => {
  await withTemporaryDirectory(async (directory) => {
    const targetDirectory = path.join(directory, "site");
    await scaffoldRiebeckiteSite({
      targetDirectory,
      preset: "minimal",
      site: { locale: "en" },
      deployment: { type: "github-actions", content: { type: "local" } },
      packageManager: "pnpm",
    });
    const read = (relativePath: string) =>
      fs.readFile(path.join(targetDirectory, relativePath), "utf8");

    const packageJson = JSON.parse(await read("package.json")) as {
      packageManager?: string;
    };
    assert.equal(packageJson.packageManager, "pnpm@11.5.3");

    const readme = await read("README.md");
    assert.ok(readme.includes("pnpm install"));
    assert.ok(readme.includes("pnpm exec riebeckite dev"));
    assert.ok(!/^npm install$/m.test(readme));

    const workspace = await read("pnpm-workspace.yaml");
    assert.ok(workspace.startsWith("# pnpm skips install scripts"));

    const workflow = await read(".github/workflows/publish.yml");
    assert.ok(workflow.includes("cache: pnpm"));
    assert.ok(workflow.includes("pnpm install --frozen-lockfile"));
    assert.ok(workflow.includes("run: pnpm exec riebeckite build"));
    assert.ok(!workflow.includes("run: npm exec"));
  });
});

test("pnpm next steps use pnpm", () => {
  const text = formatScaffoldNextSteps("site", { packageManager: "pnpm" });
  assert.ok(text.includes("  pnpm install"));
  assert.ok(text.includes("  pnpm exec riebeckite dev"));
  assert.ok(!text.includes("  npm exec"));
});
