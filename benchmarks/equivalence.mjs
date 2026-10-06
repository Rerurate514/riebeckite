import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  appendParagraph,
  editAsset,
  editFrontmatter,
  generateVault,
  moveNote,
  profileConfig,
} from "./lib/vault.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ContentManager, NoopLogger, SinkTracer, defineConfig, resolveConfig } =
  await import(pathToFileURL(path.join(root, "packages/core/index.ts")));

const args = parseArgs(process.argv.slice(2));
const size = Number(args.size ?? 500);
const profile = args.profile ?? "realistic";
const scenarioNames = (
  args.scenarios ?? "single-edit,frontmatter-edit,hub-edit,rename"
)
  .split(",")
  .map((part) => part.trim())
  .filter(Boolean);
const baseDir = path.join(os.tmpdir(), "riebeckite-vault-equivalence");

const SCENARIOS = {
  "single-edit": ({ directory, config, size }) => {
    const depth = config.depth;
    return () =>
      appendParagraph(directory, depth, size - 1, "Equivalence edit.");
  },
  "frontmatter-edit": ({ directory, config }) => {
    const depth = config.depth;
    return () =>
      editFrontmatter(directory, depth, 0, (yaml) =>
        yaml.includes("tags:")
          ? yaml.replace(/tags:.*/, 'tags: ["edited-tag"]')
          : `${yaml}\ntags: ["edited-tag"]`,
      );
  },
  "hub-edit": ({ directory, config, size }) => {
    const depth = config.depth;
    void size;
    return () => appendParagraph(directory, depth, 0, "Hub edit.");
  },
  rename: ({ directory, config }) => {
    const depth = config.depth;
    return () => moveNote(directory, depth, 0, "archive/note-00000.md");
  },
  "asset-edit": ({ directory }) => {
    return () => editAsset(directory, 0, "png", `changed ${Date.now()}`);
  },
  "plugin-edit": () => () => {},
};

const results = [];
for (const scenarioName of scenarioNames) {
  const definition = SCENARIOS[scenarioName];
  if (!definition) throw new Error(`Unknown scenario: ${scenarioName}`);
  const runDir = path.join(baseDir, `${profile}-${size}-${scenarioName}`);
  await fs.rm(runDir, { recursive: true, force: true });
  const directory = path.join(runDir, "vault");
  const config = profileConfig(profile);
  await generateVault(directory, { size, profile, seed: 4242 });

  const pluginVersionFor = (name) => (name === "plugin-edit" ? "v2" : "v1");

  const initial = await buildOnce({
    directory,
    cacheDirectory: path.join(runDir, "cache"),
    pluginVersion: "v1",
  });
  void initial;

  const mutate = definition({ directory, config, size });
  await mutate();

  const incremental = await buildOnce({
    directory,
    cacheDirectory: path.join(runDir, "cache"),
    pluginVersion: pluginVersionFor(scenarioName),
  });

  await fs.rm(path.join(directory, ".riebeckite"), {
    recursive: true,
    force: true,
  });

  const cold = await buildOnce({
    directory,
    cacheDirectory: path.join(runDir, "cache-cold"),
    pluginVersion: pluginVersionFor(scenarioName),
  });

  const diffs = diff(incremental.snapshot, cold.snapshot);
  const row = {
    profile,
    size,
    scenario: scenarioName,
    incrementalProcessed: incremental.processed,
    incrementalReused: incremental.reused,
    incrementalAffected: incremental.affected,
    incrementalMs: incremental.wallClockMs,
    coldMs: cold.wallClockMs,
    equivalent: diffs.length === 0,
    diffCount: diffs.length,
    diffs: diffs.slice(0, 20),
  };
  results.push(row);
  console.log(JSON.stringify(row));
}

const outFile = path.join(
  root,
  "benchmarks",
  "results",
  `${timestamp()}-equivalence.json`,
);
await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(
  outFile,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), rows: results },
    null,
    2,
  ),
  "utf8",
);
console.log(`\nWrote ${outFile}`);
const failures = results.filter((row) => !row.equivalent);
if (failures.length > 0) {
  console.error(
    `\n${failures.length} scenario(s) produced non-equivalent output.`,
  );
  process.exitCode = 1;
} else {
  console.log("All scenarios equivalent to fresh cold build.");
}

async function buildOnce(input) {
  const events = [];
  const spans = [];
  const tracer = new SinkTracer({
    onEvent: (event) => events.push(event),
    onSpan: (span) => spans.push(span),
  });
  const config = resolveConfig(
    defineConfig({
      site: { title: "Benchmark" },
      content: {
        directory: input.directory,
        filters: { publishStrategy: "selective" },
      },
      cache: { enabled: true, directory: input.cacheDirectory },
      plugins: [plugin(input.pluginVersion)],
    }),
  );
  const start = performance.now();
  const manager = new ContentManager(input.directory, [], {
    config,
    observability: { logger: new NoopLogger(), tracer },
  });
  const manifest = await manager.build({ incremental: true });
  const wallClockMs = Math.round(performance.now() - start);
  const snapshot = snapshotOf(manifest);
  await manager.dispose();
  return {
    wallClockMs,
    processed: spans.filter((span) => span.name === "content.process").length,
    reused: events.filter((event) => event.name === "content.reuse").length,
    affected: Number(
      events.find((event) => event.name === "build.incremental")?.attributes
        ?.affected ?? manifest.entries.length,
    ),
    snapshot,
  };
}

function plugin(version) {
  return {
    name: "benchmark-plugin",
    cacheVersion: version,
    processedContentCache: { version, dependencyMode: "tracked" },
  };
}

function snapshotOf(manifest) {
  return {
    entries: manifest.entries
      .map((entry) => ({
        slug: entry.slug,
        contentId: entry.contentId ?? null,
        title: entry.title,
        permalink: entry.permalink,
        publishing: entry.publishing ?? null,
        html: entry.html,
        aliases: [...(entry.aliases ?? [])].sort(),
        tags: [...(entry.tags ?? [])].sort(),
        links: (entry.links ?? [])
          .map((link) => `${link.kind}:${link.slug ?? link.raw}`)
          .sort(),
        backlinks: [...(entry.backlinks ?? [])].sort(),
        assets: (entry.assets ?? []).map((asset) => asset.path).sort(),
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug)),
    pagePaths: [...(manifest.pagePaths ?? [])].sort(),
    pageRoutes: [...(manifest.pageRoutes ?? [])]
      .map((route) => route.path ?? String(route))
      .sort(),
    generatedOutputs: (manifest.generatedOutputs ?? [])
      .map((output) => `${output.kind}:${output.path}`)
      .sort(),
  };
}

function diff(left, right) {
  const differences = [];
  walk("", left, right, differences);
  return differences;
}

function walk(prefix, left, right, differences) {
  if (differences.length >= 100) return;
  if (left === right) return;
  if (
    typeof left !== "object" ||
    typeof right !== "object" ||
    left === null ||
    right === null
  ) {
    if (left !== right) {
      differences.push(
        `${prefix}: ${JSON.stringify(summarizeValue(left))} != ${JSON.stringify(summarizeValue(right))}`,
      );
    }
    return;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (
      !Array.isArray(left) ||
      !Array.isArray(right) ||
      left.length !== right.length
    ) {
      differences.push(
        `${prefix}: length ${arrayLength(left)} != ${arrayLength(right)}`,
      );
      return;
    }
    for (let index = 0; index < left.length; index++) {
      walk(`${prefix}[${index}]`, left[index], right[index], differences);
    }
    return;
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    walk(prefix ? `${prefix}.${key}` : key, left[key], right[key], differences);
  }
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : typeof value;
}

function summarizeValue(value) {
  if (typeof value === "string" && value.length > 120) {
    return `${value.slice(0, 120)}…(${value.length})`;
  }
  return value;
}

function parseArgs(raw) {
  const parsed = {};
  for (let index = 0; index < raw.length; index++) {
    const token = raw[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = raw[index + 1];
    if (value === undefined || value.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
