import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const sandbox = path.join(here, ".work");
const site = path.join(sandbox, "site");
const vault = path.join(sandbox, "vault");
const dist = path.join(site, "dist");
const cli = path.join(repoRoot, "packages", "cli", "bin", "riebeckite.mjs");

const packageLinks: Record<string, string> = {
  core: "packages/core",
  node: "packages/node",
  honox: "packages/integrations/honox",
  spa: "packages/spa",
  runtime: "packages/runtime",
  ui: "packages/ui",
  "theme-default": "packages/themes/default",
  "plugin-alias": "packages/plugins/alias",
  "plugin-calculator": "packages/plugins/calculator",
  "plugin-hover-preview": "packages/plugins/hover-preview",
  "plugin-l10n": "packages/plugins/l10n",
  "plugin-obsidian-markdown": "packages/plugins/obsidian-markdown",
  "plugin-permalink": "packages/plugins/permalink",
};

function run(
  command: string,
  arguments_: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const result = spawnSync(command, arguments_, {
    cwd,
    stdio: "inherit",
    env,
  });
  assert.equal(result.status, 0, `${command} ${arguments_.join(" ")} failed`);
}

function runCli(...arguments_: string[]) {
  run(process.execPath, [cli, ...arguments_], site);
}

function runCliWithEnvironment(
  arguments_: readonly string[],
  env: NodeJS.ProcessEnv,
) {
  run(process.execPath, [cli, ...arguments_], site, env);
}

function runCliJson(
  arguments_: readonly string[],
  statuses: readonly number[] = [0],
) {
  const result = spawnSync(process.execPath, [cli, ...arguments_], {
    cwd: site,
    encoding: "utf8",
    env: process.env,
  });
  assert.ok(
    result.status !== null && statuses.includes(result.status),
    `${result.stdout}\n${result.stderr}`.trim(),
  );
  return JSON.parse(result.stdout) as unknown;
}

function runCliText(...arguments_: string[]) {
  const result = spawnSync(process.execPath, [cli, ...arguments_], {
    cwd: site,
    encoding: "utf8",
    env: process.env,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function link(target: string, linkPath: string) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(
    target,
    linkPath,
    process.platform === "win32" ? "junction" : "dir",
  );
}

function linkDependencies() {
  const modules = path.join(site, "node_modules");
  fs.mkdirSync(modules, { recursive: true });
  for (const [name, directory] of Object.entries(packageLinks)) {
    link(
      path.join(repoRoot, directory),
      path.join(modules, "@riebeckite", name),
    );
  }
  const cliModules = path.join(repoRoot, "packages", "cli", "node_modules");
  for (const entry of fs.readdirSync(cliModules, { withFileTypes: true })) {
    if (entry.name === "@riebeckite" || entry.name === ".bin") continue;
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name.startsWith("@")) {
      for (const child of fs.readdirSync(path.join(cliModules, entry.name))) {
        link(
          path.join(cliModules, entry.name, child),
          path.join(modules, entry.name, child),
        );
      }
      continue;
    }
    link(path.join(cliModules, entry.name), path.join(modules, entry.name));
  }
  const nodeServerStore = path.join(repoRoot, "node_modules", ".pnpm");
  const nodeServerEntry = fs
    .readdirSync(nodeServerStore)
    .find((entry) => entry.startsWith("@hono+node-server@"));
  assert(nodeServerEntry, "@hono/node-server is not installed");
  link(
    path.join(
      nodeServerStore,
      nodeServerEntry,
      "node_modules",
      "@hono",
      "node-server",
    ),
    path.join(modules, "@hono", "node-server"),
  );
}

function hashTree(root: string): string {
  const hash = createHash("sha256");
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(root);
  files.sort();
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    hash.update(`${relative}\0`);
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

type BuildMarker = {
  publicationFingerprint?: string;
  artifactFingerprint?: string;
};

function markerPath(): string {
  return path.join(site, ".riebeckite", "build-output.json");
}

function readBuildMarker(): BuildMarker {
  return JSON.parse(fs.readFileSync(markerPath(), "utf8")) as BuildMarker;
}

type ProvenanceState = {
  provenance?: {
    sources: readonly { path: string }[];
    transforms: readonly { id: string; type: string; status: string }[];
    outputs: readonly { path: string; status: string }[];
    artifacts?: readonly { path: string }[];
  };
};

function readBuildState(): ProvenanceState {
  return JSON.parse(
    fs.readFileSync(
      path.join(site, ".riebeckite", "build", "content-state.json"),
      "utf8",
    ),
  );
}

function read(relative: string): string {
  return fs.readFileSync(path.join(site, relative), "utf8");
}

function readVault(relative: string): string {
  return fs.readFileSync(path.join(vault, relative), "utf8");
}

function exists(relative: string): boolean {
  return fs.existsSync(path.join(site, relative));
}

function vaultExists(relative: string): boolean {
  return fs.existsSync(path.join(vault, relative));
}

function outputText(): string {
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(html|json|js|xml)$/u.test(entry.name))
        files.push(fs.readFileSync(full, "utf8"));
    }
  };
  walk(dist);
  return files.join("\n");
}

function previewSlugs(): Set<string> {
  const index = JSON.parse(
    read("dist/_riebeckite/hover-preview/index.json"),
  ) as Record<string, { slug?: string }>;
  return new Set(
    Object.values(index)
      .map((entry) => entry.slug)
      .filter((slug): slug is string => slug !== undefined),
  );
}

type MigrationPlan = {
  id: string;
  conflicts: readonly { code: string }[];
  impact: { moved: number; frontmatter: number };
  verification: { derivedViews: number };
};

type MigrationApply = {
  applied: boolean;
  skipped: boolean;
  changedPaths: readonly string[];
  conflicts: readonly { code: string }[];
};

type MigrationStatus = {
  entries: readonly { planId?: string; status: string }[];
};

type RollbackResult = {
  rolledBack: boolean;
  skipped: boolean;
  restoredPaths?: readonly string[];
  conflicts: readonly { code: string; message: string }[];
};

type GateResult = {
  allowed: boolean;
  reasons?: readonly string[];
  artifactIssues?: readonly { code: string }[];
};

async function main() {
  fs.rmSync(sandbox, { recursive: true, force: true });
  fs.cpSync(path.join(here, "fixture", "site"), site, { recursive: true });
  fs.cpSync(path.join(here, "fixture", "vault"), vault, { recursive: true });
  linkDependencies();

  console.log("Initial clean build");
  runCli("build", "--full");
  const baselineHash = hashTree(dist);
  const baselineMarker = readBuildMarker();
  assert.ok(baselineMarker.publicationFingerprint);
  const baselinePreview = previewSlugs();
  assert.ok(baselinePreview.has("notes/legacy"));
  assert.ok(baselinePreview.has("notes/other"));
  assert.ok(baselinePreview.has("unlisted"));
  assert.equal(baselinePreview.has("draft"), false);
  assert.ok(exists("dist/notes/legacy.html"));
  assert.ok(exists("dist/notes/other.html"));
  assert.ok(exists("dist/ja/n/legacy.html"));
  assert.ok(exists("dist/old-legacy.html"));
  assert.match(read("dist/n/home.html"), /href="\/notes\/legacy"/);
  assert.match(read("dist/notes/legacy.html"), /ja\/n\/legacy/);
  assert.match(read("dist/n/calculator.html"), /data-calculator/);
  assert.match(
    read("dist/n/calculator.html"),
    /data-calculator-output="" aria-live="polite">14</,
  );
  assert.equal(
    read("dist/notes/other.html").includes("data-calculator"),
    false,
  );
  assert.equal(read("dist/n/home.html").includes("data-calculator"), false);

  console.log("Plugin CLI extension");
  const echoed = runCliJson([
    "fixture",
    "echo",
    "--message",
    "hello",
    "--json",
  ]) as { message: string; length: number };
  assert.equal(echoed.message, "hello");
  assert.equal(echoed.length, 5);
  assert.equal(
    runCliText("fixture", "echo", "--message", "hi").trim(),
    "fixture echo: hi",
  );
  assert.match(runCliText("completion", "bash", "--project"), /fixture echo/);

  runCli("build", "--full");
  assert.equal(
    hashTree(dist),
    baselineHash,
    "clean build is not deterministic",
  );

  console.log("Migration plan and dry run");
  const plan = runCliJson(["migrate", "plan", "--json"]) as MigrationPlan;
  assert.deepEqual(plan.conflicts, []);
  assert.equal(plan.impact.moved, 4);
  assert.ok(plan.impact.frontmatter >= 4);
  assert.ok(plan.verification.derivedViews >= 1);
  const vaultBeforeDryRun = hashTree(vault);
  const dryRun = runCliJson(["migrate", "apply", "--json"]) as MigrationPlan;
  assert.deepEqual(dryRun.conflicts, []);
  assert.equal(hashTree(vault), vaultBeforeDryRun, "dry run wrote content");

  console.log("Migration apply");
  const applied = runCliJson([
    "migrate",
    "apply",
    "--apply",
    "--json",
  ]) as MigrationApply;
  assert.equal(applied.applied, true);
  assert.deepEqual(applied.conflicts, []);
  assert.ok(applied.changedPaths.length >= 6);
  assert.equal(vaultExists("notes/legacy.md"), false);
  assert.ok(vaultExists("guides/legacy.md"));
  assert.match(readVault("guides/legacy.md"), /previous_urls:/);
  assert.match(readVault("guides/legacy.md"), /- \/notes\/legacy/);
  assert.doesNotMatch(readVault("guides/legacy.md"), /redirect_from/);
  assert.match(readVault("index.md"), /\[\[guides\/legacy\]\]/);
  assert.match(readVault("index.md"), /!\[\[guides\/legacy\]\]/);
  assert.match(readVault("index.md"), /guides\/legacy\.md/);
  assert.match(readVault("guides/other.md"), /\[\[guides\/legacy\]\]/);

  console.log("Incremental build after migration");
  runCli("build");
  const incrementalHash = hashTree(dist);
  const incrementalMarker = readBuildMarker();
  assert.notEqual(incrementalHash, baselineHash);
  assert.notEqual(
    incrementalMarker.publicationFingerprint,
    baselineMarker.publicationFingerprint,
  );
  assert.ok(exists("dist/guides/legacy.html"));
  assert.ok(exists("dist/notes/other.html"));
  assert.match(read("dist/notes/legacy.html"), /\/guides\/legacy/);
  assert.match(read("dist/guides/legacy.html"), /\/notes\/other/);
  assert.ok(exists("dist/ja/n/legacy.html"));
  assert.match(read("dist/ja/n/legacy.html"), /\/ja\/n\/legacy/);
  assert.ok(vaultExists("guides/calculator.md"));
  assert.ok(exists("dist/n/calculator.html"));
  assert.match(read("dist/n/calculator.html"), /data-calculator/);
  const incrementalPreview = previewSlugs();
  assert.ok(incrementalPreview.has("guides/legacy"));
  assert.ok(incrementalPreview.has("unlisted"));
  assert.equal(incrementalPreview.has("draft"), false);
  assert.equal(incrementalPreview.has("scheduled"), false);
  const rendered = outputText();
  assert.equal(rendered.includes("DRAFT_SECRET_MARKER"), false);
  assert.equal(rendered.includes("SCHEDULED_SECRET_MARKER"), false);
  assert.ok(exists("dist/n/unlisted.html"));
  assert.equal(exists("dist/n/draft.html"), false);
  assert.equal(exists("dist/n/scheduled.html"), false);

  console.log("Provenance and publication");
  const state = readBuildState();
  assert.ok(state.provenance);
  assert.ok(
    state.provenance.sources.some(
      (source) => source.path === "guides/legacy.md",
    ),
  );
  assert.ok(
    state.provenance.transforms.some(
      (transform) => transform.id === "transform:derived:hover-preview.index",
    ),
  );
  assert.ok(
    state.provenance.outputs.some(
      (output) => output.path === "guides/legacy.html",
    ),
  );
  assert.ok(
    state.provenance.transforms.some(
      (transform) => transform.type === "plugin-hook",
    ),
  );
  assert.ok(
    state.provenance.artifacts?.some(
      (artifact) => artifact.path === "guides/legacy.html",
    ),
  );
  const gate = runCliJson(["publish", "gate", "--json"]) as GateResult;
  assert.equal(gate.allowed, true);

  console.log("Stale artifact rejection");
  const otherSource = readVault("guides/other.md");
  fs.writeFileSync(
    path.join(vault, "guides", "other.md"),
    `${otherSource}\nexternal edit\n`,
  );
  const staleGate = runCliJson(
    ["publish", "gate", "--json"],
    [1],
  ) as GateResult;
  assert.equal(staleGate.allowed, false);
  assert.ok(staleGate.reasons?.includes("artifact-invalid"));
  assert.equal(staleGate.artifactIssues?.[0].code, "artifact-stale");
  fs.writeFileSync(path.join(vault, "guides", "other.md"), otherSource);
  runCli("build");
  assert.equal(hashTree(dist), incrementalHash);

  console.log("No-change and clean builds match incremental output");
  runCli("build");
  assert.equal(hashTree(dist), incrementalHash, "no-change build differs");
  runCli("clean", "--all");
  runCli("build", "--full");
  assert.equal(hashTree(dist), incrementalHash, "clean build differs");
  assert.equal(
    readBuildMarker().publicationFingerprint,
    incrementalMarker.publicationFingerprint,
  );
  assert.equal(
    readBuildMarker().artifactFingerprint,
    incrementalMarker.artifactFingerprint,
  );

  console.log("Provenance can be disabled without changing outputs");
  runCliWithEnvironment(["build", "--full"], {
    ...process.env,
    RIEBECKITE_DISABLE_PROVENANCE: "1",
  });
  assert.equal(hashTree(dist), incrementalHash);
  assert.equal(readBuildState().provenance, undefined);
  runCli("build", "--full");
  assert.equal(hashTree(dist), incrementalHash);
  assert.ok(readBuildState().provenance);

  console.log("Rollback restores the baseline");
  const status = runCliJson(["migrate", "status", "--json"]) as MigrationStatus;
  const planId = status.entries[0]?.planId;
  assert.ok(planId, "migration status has no plan id");
  const rolledBack = runCliJson([
    "migrate",
    "rollback",
    planId,
    "--apply",
    "--json",
  ]) as RollbackResult;
  assert.equal(rolledBack.rolledBack, true);
  assert.equal(rolledBack.conflicts.length, 0);
  assert.equal(vaultExists("guides/legacy.md"), false);
  assert.ok(vaultExists("notes/legacy.md"));
  runCli("build");
  assert.equal(hashTree(dist), baselineHash, "rollback output differs");
  assert.ok(exists("dist/notes/legacy.html"));
  assert.equal(exists("dist/guides/legacy.html"), false);

  console.log("Rollback rejects external changes");
  const reapplied = runCliJson([
    "migrate",
    "apply",
    "--apply",
    "--json",
  ]) as MigrationApply;
  assert.equal(reapplied.applied, true, "migration was not reapplied");
  runCli("build");
  assert.equal(hashTree(dist), incrementalHash);
  const legacyPath = path.join(vault, "guides", "legacy.md");
  const legacySource = fs.readFileSync(legacyPath, "utf8");
  fs.writeFileSync(legacyPath, `${legacySource}\nexternal edit\n`);
  const appliedStatus = runCliJson([
    "migrate",
    "status",
    "--json",
  ]) as MigrationStatus;
  const appliedPlanId = appliedStatus.entries[0]?.planId;
  assert.ok(appliedPlanId, "migration status has no plan id");
  const rejected = runCliJson(
    ["migrate", "rollback", appliedPlanId, "--apply", "--json"],
    [1],
  ) as RollbackResult;
  assert.equal(rejected.rolledBack, false);
  assert.equal(rejected.conflicts[0]?.code, "rollback-conflict");
  assert.match(fs.readFileSync(legacyPath, "utf8"), /external edit/);
  fs.writeFileSync(legacyPath, legacySource);

  console.log(`baseline      ${baselineHash}`);
  console.log(`incremental   ${incrementalHash}`);
  console.log(`no-change     ${incrementalHash}`);
  console.log(`clean         ${incrementalHash}`);
  console.log(`rollback      ${baselineHash}`);
}

await main();
