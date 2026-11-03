#!/usr/bin/env node
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const buildStatePath = path.join(
  repositoryRoot,
  ".riebeckite",
  "package-build-state.json",
);
const BUILD_STATE_VERSION = 1;

class BuildError extends Error {
  constructor(message, status = 1) {
    super(message);
    this.name = "BuildError";
    this.status = status;
  }
}

function readManifest(directory) {
  return JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, directory, "package.json"),
      "utf8",
    ),
  );
}

function getPackageGraph() {
  const manifests = new Map();
  const nameToDirectory = new Map();
  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = readManifest(directory);
    manifests.set(directory, manifest);
    nameToDirectory.set(manifest.name, directory);
  }

  const dependenciesByDirectory = new Map();
  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = manifests.get(directory);
    const dependencies = new Set();
    for (const section of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
    ]) {
      for (const dependencyName of Object.keys(manifest[section] ?? {})) {
        const dependencyDirectory = nameToDirectory.get(dependencyName);
        if (dependencyDirectory && dependencyDirectory !== directory) {
          dependencies.add(dependencyDirectory);
        }
      }
    }
    dependenciesByDirectory.set(directory, dependencies);
  }

  return { manifests, dependenciesByDirectory };
}

function computeBuildLayers(dependenciesByDirectory) {
  const built = new Set();
  const layers = [];

  while (built.size < PACKAGE_DIRECTORIES.length) {
    const layer = PACKAGE_DIRECTORIES.filter(
      (directory) =>
        !built.has(directory) &&
        [...dependenciesByDirectory.get(directory)].every((dependency) =>
          built.has(dependency),
        ),
    );
    if (layer.length === 0) {
      throw new BuildError(
        "Circular dependency among public packages; build order is undefined.",
      );
    }
    for (const directory of layer) built.add(directory);
    layers.push(layer);
  }

  return layers;
}

function getConcurrencyLimit() {
  const raw = process.env.RIEBECKITE_BUILD_CONCURRENCY;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BuildError(
        `RIEBECKITE_BUILD_CONCURRENCY must be a positive integer, received ${JSON.stringify(raw)}.`,
      );
    }
    return parsed;
  }

  return Math.max(1, availableParallelism() - 1);
}

function runBuild(directory, manifest) {
  return new Promise((resolve, reject) => {
    const shellCommand = process.platform === "win32";
    const child = shellCommand
      ? spawn(`pnpm --dir ${JSON.stringify(directory)} run build`, {
          cwd: repositoryRoot,
          stdio: "inherit",
          shell: true,
        })
      : spawn("pnpm", ["--dir", directory, "run", "build"], {
          cwd: repositoryRoot,
          stdio: "inherit",
        });
    child.on("error", (error) => {
      reject(
        new BuildError(
          `Failed to build ${manifest.name} (${directory}): ${error.message}`,
        ),
      );
    });
    child.on("exit", (status, signal) => {
      if (signal) {
        reject(
          new BuildError(
            `${manifest.name} (${directory}) build terminated by signal ${signal}.`,
          ),
        );
        return;
      }
      if (status !== 0) {
        reject(
          new BuildError(
            `${manifest.name} (${directory}) build failed with exit code ${status}.`,
            status ?? 1,
          ),
        );
        return;
      }
      resolve();
    });
  });
}

function readBuildState() {
  try {
    const state = JSON.parse(fs.readFileSync(buildStatePath, "utf8"));
    if (
      state?.version !== BUILD_STATE_VERSION ||
      typeof state.packages !== "object" ||
      state.packages === null
    ) {
      return {};
    }
    return state.packages;
  } catch {
    return {};
  }
}

function writeBuildState(packages) {
  fs.mkdirSync(path.dirname(buildStatePath), { recursive: true });
  fs.writeFileSync(
    buildStatePath,
    `${JSON.stringify({ version: BUILD_STATE_VERSION, packages }, null, 2)}\n`,
  );
}

function packageSourceFingerprint(directory, dependencyFingerprints) {
  const hash = crypto.createHash("sha256");
  hash.update(`build-state:${BUILD_STATE_VERSION}\0`);
  hash.update(fs.readFileSync(import.meta.filename));
  hashDirectory(hash, path.join(repositoryRoot, directory), "");
  for (const fingerprint of dependencyFingerprints.sort()) {
    hash.update(fingerprint);
  }
  return hash.digest("hex");
}

function hashDirectory(hash, directory, relativeDirectory) {
  for (const entry of fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))) {
    if (
      entry.name === "dist" ||
      entry.name === "node_modules" ||
      entry.name === "test" ||
      entry.name === "tests" ||
      entry.name === "README.md" ||
      entry.name === "README_ja.md"
    ) {
      continue;
    }
    const relativePath = path.join(relativeDirectory, entry.name);
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      hashDirectory(hash, filePath, relativePath);
      continue;
    }
    if (!entry.isFile()) continue;
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fs.readFileSync(filePath));
    hash.update("\0");
  }
}

function hasBuildOutput(directory) {
  return fs.existsSync(path.join(repositoryRoot, directory, "dist"));
}

async function runLayer(
  layer,
  manifests,
  state,
  concurrencyLimit,
  fingerprints,
  previousBuilds,
  dependenciesByDirectory,
) {
  const pending = layer.filter((directory) => {
    const fingerprint = packageSourceFingerprint(
      directory,
      [...dependenciesByDirectory.get(directory)].map((dependency) =>
        fingerprints.get(dependency),
      ),
    );
    fingerprints.set(directory, fingerprint);
    return (
      previousBuilds[directory] !== fingerprint || !hasBuildOutput(directory)
    );
  });
  state.skipped += layer.length - pending.length;
  for (let index = 0; index < pending.length; index += concurrencyLimit) {
    const batch = pending.slice(index, index + concurrencyLimit);
    const first = state.completed + 1;
    const last = state.completed + batch.length;
    if (batch.length === 1) {
      const directory = batch[0];
      console.error(
        `\n[build ${first}/${state.total}] ${manifests.get(directory).name}`,
      );
    } else {
      console.error(
        `\n[build ${first}-${last}/${state.total}] building ${batch.length} packages concurrently...`,
      );
      for (const directory of batch) {
        console.error(`  - ${manifests.get(directory).name}`);
      }
    }

    await Promise.all(
      batch.map((directory) => runBuild(directory, manifests.get(directory))),
    );
    state.completed += batch.length;
  }
}

async function main() {
  const { manifests, dependenciesByDirectory } = getPackageGraph();
  const layers = computeBuildLayers(dependenciesByDirectory);
  const concurrencyLimit = getConcurrencyLimit();
  const state = { completed: 0, skipped: 0, total: PACKAGE_DIRECTORIES.length };
  const previousBuilds = readBuildState();
  const fingerprints = new Map();

  console.error(
    `[build] ${state.total} public packages in ${layers.length} dependency layer(s); concurrency=${concurrencyLimit}`,
  );

  for (const layer of layers) {
    await runLayer(
      layer,
      manifests,
      state,
      concurrencyLimit,
      fingerprints,
      previousBuilds,
      dependenciesByDirectory,
    );
  }
  writeBuildState(Object.fromEntries(fingerprints));
  console.error(`[build] ${state.completed} built · ${state.skipped} reused`);
}

try {
  await main();
} catch (error) {
  if (error instanceof BuildError) {
    console.error(`\nbuild:packages failed: ${error.message}`);
    process.exitCode = error.status;
  } else {
    throw error;
  }
}
