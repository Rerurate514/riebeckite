import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import {
  applyScenario,
  compareSnapshots,
  createBenchmarkContent,
  removeSafeTemporaryDirectory,
  scenarioNames,
} from "./lib.mjs";

const execFileAsync = promisify(execFile);

test("preset benchmark prepares workspace packages and explicit package links", async () => {
  const runner = await fs.readFile(
    path.join(process.cwd(), "benchmarks", "preset-ssg", "runner.mjs"),
    "utf8",
  );
  assert.match(runner, /await buildWorkspacePackages\(\)/);
  assert.match(runner, /async function linkWorkspacePackages/);
  assert.match(runner, /"mermaid",\s*"node_modules",\s*"puppeteer"/);
  assert.match(runner, /manifestHooksExecuted/);
  assert.match(runner, /manifestHookDurationMs/);
});

test("official starter and showcase scaffolds preserve their plugin order", async (t) => {
  const { scaffoldRiebeckiteSite } = await import(
    "../../packages/create-riebeckite/src/scaffold/index.ts"
  );
  const { scaffoldPresets } = await import(
    "../../packages/create-riebeckite/src/scaffold/presets.ts"
  );
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-benchmark-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const preset of ["starter", "showcase"]) {
    const site = path.join(directory, preset);
    await scaffoldRiebeckiteSite({ targetDirectory: site, preset });
    const config = await fs.readFile(
      path.join(site, "riebeckite.config.ts"),
      "utf8",
    );
    const actual = [...config.matchAll(/^\s{4}(\w+)\(/gm)].map(
      (match) => match[1],
    );
    assert.deepEqual(
      actual,
      scaffoldPresets[preset].plugins.map((plugin) => plugin.factory),
    );
  }
});

test("benchmark content follows each preset capability and has the requested count", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-benchmark-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await createBenchmarkContent({
    contentDirectory: directory,
    count: 100,
    preset: "showcase",
  });
  const files = await findMarkdown(directory);
  assert.equal(files.length, 100);
  assert.match(await fs.readFile(files[0], "utf8"), /translation: benchmark-0/);
  const starter = path.join(directory, "starter");
  await createBenchmarkContent({
    contentDirectory: starter,
    count: 1,
    preset: "starter",
  });
  assert.doesNotMatch(
    await fs.readFile((await findMarkdown(starter))[0], "utf8"),
    /^lang:|^translation:/m,
  );
});

test("scenarios mutate independent content copies", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-benchmark-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await createBenchmarkContent({
    contentDirectory: directory,
    count: 2,
    preset: "starter",
  });
  await applyScenario({
    contentDirectory: directory,
    count: 2,
    scenario: "delete",
  });
  assert.equal((await findMarkdown(directory)).length, 1);
  assert.ok(scenarioNames.includes("rename"));
  await applyScenario({
    contentDirectory: directory,
    count: 2,
    scenario: "add",
  });
  assert.equal((await findMarkdown(directory)).length, 2);
});

test("publication-change changes a public note", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-benchmark-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await createBenchmarkContent({
    contentDirectory: directory,
    count: 2,
    preset: "starter",
  });

  await applyScenario({
    contentDirectory: directory,
    count: 2,
    scenario: "publication-change",
  });

  assert.match(
    await fs.readFile(
      path.join(directory, "benchmark", "section-000", "note-00001.md"),
      "utf8",
    ),
    /visibility: draft/,
  );
});

test("snapshot comparison detects output differences", () => {
  assert.deepEqual(compareSnapshots({ "a.html": "one" }, { "a.html": "two" }), {
    equivalent: false,
    differences: [{ file: "a.html", incremental: "one", clean: "two" }],
  });
});

test("temporary removal refuses a root directory and removes a child", async (t) => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-benchmark-"),
  );
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const child = path.join(root, "child");
  await fs.mkdir(child);
  await removeSafeTemporaryDirectory(child, root);
  await assert.rejects(() => removeSafeTemporaryDirectory(root, root));
});

test("runner executes the clean output comparison", {
  timeout: 360_000,
}, async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-benchmark-result-"),
  );
  const workRoot = path.join(directory, `preset-ssg-runner-test-${Date.now()}`);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "benchmarks/preset-ssg/runner.mjs",
      "--presets",
      "starter",
      "--sizes",
      "1",
      "--scenarios",
      "cold",
      "--workRoot",
      workRoot,
      "--out",
      directory,
    ],
    { cwd: process.cwd(), timeout: 340_000 },
  );
  const resultFile = (await fs.readdir(directory)).find((file) =>
    file.endsWith(".json"),
  );
  assert.ok(resultFile);
  const result = JSON.parse(
    await fs.readFile(path.join(directory, resultFile), "utf8"),
  );
  assert.equal(result.rows.length, 1);
  assert.equal(typeof result.rows[0].equivalence.equivalent, "boolean");
});

test("runner resumes without repeating completed scenarios", {
  timeout: 420_000,
}, async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preset-benchmark-resume-"),
  );
  const workRoot = path.join(
    directory,
    `preset-ssg-runner-resume-test-${Date.now()}`,
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const runner = [
    "--import",
    "tsx",
    "benchmarks/preset-ssg/runner.mjs",
    "--presets",
    "starter",
    "--sizes",
    "1",
    "--scenarios",
    "cold",
    "--workRoot",
    workRoot,
    "--out",
    directory,
  ];
  await execFileAsync(process.execPath, runner, {
    cwd: process.cwd(),
    timeout: 340_000,
  });
  const resultPath = path.join(
    directory,
    (await fs.readdir(directory)).find((file) => file.endsWith(".json")),
  );
  const { stdout } = await execFileAsync(
    process.execPath,
    [...runner, "--resume", resultPath],
    { cwd: process.cwd(), timeout: 340_000 },
  );
  const result = JSON.parse(await fs.readFile(resultPath, "utf8"));
  assert.match(stdout, /Skipping completed starter\/1\/cold/);
  assert.equal(result.rows.length, 1);
});

async function findMarkdown(directory) {
  const result = [];
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.name.endsWith(".md")) result.push(target);
    }
  }
  await walk(directory);
  return result;
}
