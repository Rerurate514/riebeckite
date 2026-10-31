import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileSystemContentMutation } from "../../packages/node/index.ts";

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
  ui: "packages/ui",
  "theme-default": "packages/themes/default",
  "plugin-obsidian-markdown": "packages/plugins/obsidian-markdown",
  "plugin-media": "packages/plugins/media",
  "plugin-attachment": "packages/plugins/attachment",
  "plugin-seo": "packages/plugins/seo",
};

function run(command: string, arguments_: readonly string[], cwd: string) {
  const result = spawnSync(command, arguments_, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  assert.equal(result.status, 0, `${command} ${arguments_.join(" ")} failed`);
}

function runCli(...arguments_: string[]) {
  run(process.execPath, [cli, ...arguments_], site);
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

function readBuildMarker(): {
  publicationFingerprint?: string;
  artifactFingerprint?: string;
} {
  const marker = path.join(site, ".riebeckite", "build-output.json");
  return JSON.parse(fs.readFileSync(marker, "utf8"));
}

function read(relative: string): string {
  return fs.readFileSync(path.join(site, relative), "utf8");
}

function exists(relative: string): boolean {
  return fs.existsSync(path.join(site, relative));
}

async function main() {
  fs.rmSync(sandbox, { recursive: true, force: true });
  fs.cpSync(path.join(here, "fixture", "site"), site, { recursive: true });
  fs.cpSync(path.join(here, "fixture", "vault"), vault, { recursive: true });
  linkDependencies();

  console.log("Initial full build");
  runCli("build", "--full");
  const baselineHash = hashTree(dist);
  const baselineMarker = readBuildMarker();

  runCli("build", "--full");
  assert.equal(
    hashTree(dist),
    baselineHash,
    "clean baseline build is not deterministic",
  );

  console.log("Applying content mutation");
  const mutation = new FileSystemContentMutation(vault);
  const plan = await mutation.plan([
    {
      kind: "batch",
      operations: [
        {
          kind: "frontmatter",
          path: "notes/target.md",
          set: { title: "Moved Target", summary: "Updated by mutation" },
        },
        { kind: "move", from: "notes/target.md", to: "moved/target.md" },
        {
          kind: "asset-move",
          from: "assets/image.svg",
          to: "assets/images/image.svg",
        },
        {
          kind: "create",
          path: "notes/created.md",
          content:
            "---\ntitle: Created Note\nid: mutation-created\npublish: true\n---\n\n# Created Note\n\nRIEBECKITE_MUTATION_CREATED_MARKER\n",
        },
      ],
    },
  ]);
  assert.deepEqual(plan.conflicts, [], "mutation plan has conflicts");
  const applied = await mutation.apply(plan);
  assert.equal(applied.applied, true, "mutation was not applied");
  assert.equal(
    applied.conflicts.length,
    0,
    "mutation apply reported conflicts",
  );

  const source = fs.readFileSync(
    path.join(vault, "notes", "source.md"),
    "utf8",
  );
  assert.match(source, /\[\[moved\/target\|Target\]\]/);
  assert.match(source, /\[Target\]\(\.\.\/moved\/target\.md\)/);
  assert.match(source, /!\[\[assets\/images\/image\.svg\]\]/);
  const moved = fs.readFileSync(path.join(vault, "moved", "target.md"), "utf8");
  assert.match(moved, /title: Moved Target/);
  assert.equal(fs.existsSync(path.join(vault, "notes", "target.md")), false);
  assert.equal(fs.existsSync(path.join(vault, "assets", "image.svg")), false);

  console.log("Incremental build after mutation");
  runCli("build");
  const incrementalHash = hashTree(dist);
  const incrementalMarker = readBuildMarker();
  assert.notEqual(
    incrementalMarker.publicationFingerprint,
    baselineMarker.publicationFingerprint,
    "publication fingerprint did not change after mutation",
  );

  assert.equal(exists("dist/moved/target.html"), true, "moved page missing");
  assert.equal(
    exists("dist/notes/target.html"),
    false,
    "old page still exists",
  );
  assert.equal(exists("dist/notes/created.html"), true, "created page missing");
  assert.equal(exists("dist/notes/draft.html"), false, "draft leaked");
  assert.equal(
    exists("dist/notes/scheduled.html"),
    false,
    "scheduled post leaked",
  );
  assert.equal(
    exists("dist/notes/unlisted.html"),
    true,
    "unlisted page missing",
  );

  const movedHtml = read("dist/moved/target.html");
  const sourceHtml = read("dist/notes/source.html");
  const createdHtml = read("dist/notes/created.html");
  const unlistedHtml = read("dist/notes/unlisted.html");
  const sitemap = read("dist/sitemap.xml");
  assert.match(movedHtml, /RIEBECKITE_MUTATION_TARGET_MARKER/);
  assert.match(sourceHtml, /\/moved\/target/);
  assert.match(sourceHtml, /\/assets\/images\/image\.svg/);
  assert.match(createdHtml, /RIEBECKITE_MUTATION_CREATED_MARKER/);
  assert.match(unlistedHtml, /RIEBECKITE_MUTATION_UNLISTED_MARKER/);
  assert.match(sitemap, /\/moved\/target/);
  assert.doesNotMatch(sitemap, /notes\/draft/);
  assert.doesNotMatch(sitemap, /notes\/scheduled/);
  assert.doesNotMatch(sitemap, /notes\/unlisted/);

  console.log("No-change build");
  runCli("build");
  assert.equal(
    hashTree(dist),
    incrementalHash,
    "no-change build changed output",
  );

  console.log("Clean full rebuild");
  runCli("clean", "--all");
  runCli("build", "--full");
  assert.equal(
    hashTree(dist),
    incrementalHash,
    "clean rebuild differs from incremental build",
  );
  assert.equal(
    readBuildMarker().artifactFingerprint,
    incrementalMarker.artifactFingerprint,
  );

  console.log("Content mutation integration OK");
  console.log(`baseline=${baselineHash}`);
  console.log(`incremental=${incrementalHash}`);
  console.log(`publication=${incrementalMarker.publicationFingerprint}`);
}

await main();
