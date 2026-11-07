import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  addNote,
  appendParagraph,
  deleteNote,
  generateVault,
  moveNote,
  profileConfig,
} from "./lib/vault.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ContentManager, NoopLogger, NoopTracer, defineConfig, resolveConfig } =
  await import(pathToFileURL(path.join(root, "packages/core/index.ts")));
const { FileSystemContentSource } = await import(
  pathToFileURL(path.join(root, "packages/node/index.ts"))
);

export async function runChaos({ size = 100, seed = 4242, directory } = {}) {
  const temporary = directory === undefined;
  const runDirectory =
    directory ??
    (await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-chaos-")));
  const vault = path.join(runDirectory, "vault");
  const cache = path.join(runDirectory, "cache");
  const config = profileConfig("chaos");
  await generateVault(vault, { size, profile: "chaos", seed });
  const baseline = await build(vault, cache);
  const scenarios = [
    ["warm", async () => {}],
    [
      "single-edit",
      () => appendParagraph(vault, config.depth, size - 1, "Chaos edit."),
    ],
    ["add", () => addNote(vault, config.depth, size)],
    ["delete", () => deleteNote(vault, config.depth, size - 2)],
    ["move", () => moveNote(vault, config.depth, 1, "archive/note-00001.md")],
    ["corrupt-cache", () => corruptJsonCaches(vault, cache)],
  ];
  const rows = [];
  for (const [name, mutate] of scenarios) {
    if (name !== "warm") await restore(vault, cache, size, seed);
    await mutate();
    const incremental = await build(vault, cache);
    await clearState(vault, cache);
    const cold = await build(vault, path.join(runDirectory, `cold-${name}`));
    const equivalent = JSON.stringify(incremental) === JSON.stringify(cold);
    rows.push({
      scenario: name,
      equivalent,
      entries: incremental.entries.length,
    });
  }
  const result = { size, seed, baselineEntries: baseline.entries.length, rows };
  if (temporary) await fs.rm(runDirectory, { recursive: true, force: true });
  return result;
}

async function restore(vault, cache, size, seed) {
  await fs.rm(vault, { recursive: true, force: true });
  await fs.rm(cache, { recursive: true, force: true });
  await generateVault(vault, { size, profile: "chaos", seed });
  await build(vault, cache);
}

async function build(directory, cacheDirectory) {
  const config = resolveConfig(
    defineConfig({
      site: { title: "Chaos" },
      content: { directory, filters: { publishStrategy: "selective" } },
      cache: { enabled: true, directory: cacheDirectory },
      plugins: [
        {
          name: "chaos",
          cacheVersion: "1",
          processedContentCache: { version: "1", dependencyMode: "tracked" },
        },
      ],
    }),
  );
  const manager = new ContentManager(
    new FileSystemContentSource(directory),
    [],
    {
      config,
      observability: { logger: new NoopLogger(), tracer: new NoopTracer() },
    },
  );
  const manifest = await manager.build({ incremental: true });
  const snapshot = {
    entries: manifest.entries
      .map((entry) => ({
        aliases: [...(entry.aliases ?? [])].sort(),
        contentId: entry.contentId ?? null,
        html: entry.html,
        links: (entry.links ?? [])
          .map((link) => `${link.kind}:${link.slug ?? link.raw}`)
          .sort(),
        permalink: entry.permalink,
        publishing: entry.publishing ?? null,
        slug: entry.slug,
        tags: [...(entry.tags ?? [])].sort(),
        title: entry.title,
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug)),
    generatedOutputs: (manifest.generatedOutputs ?? [])
      .map((output) => `${output.kind}:${output.path}`)
      .sort(),
    pagePaths: [...(manifest.pagePaths ?? [])].sort(),
  };
  await manager.dispose();
  return snapshot;
}

async function clearState(vault, cache) {
  await fs.rm(path.join(vault, ".riebeckite"), {
    recursive: true,
    force: true,
  });
  await fs.rm(cache, { recursive: true, force: true });
}

async function corruptJsonCaches(...roots) {
  for (const root of roots) {
    for (const file of await files(root)) {
      if (file.endsWith(".json")) await fs.writeFile(file, "{broken", "utf8");
    }
  }
}

async function files(directory) {
  const entries = await fs.readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const size = Number(
    process.argv.find((argument) => argument.startsWith("--size="))?.slice(7) ??
      100,
  );
  const result = await runChaos({ size });
  for (const row of result.rows) console.log(JSON.stringify(row));
  assert.ok(
    result.rows.every((row) => row.equivalent),
    "Chaos equivalence failed",
  );
}
