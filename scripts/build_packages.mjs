#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

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

  return Math.max(1, Math.min(6, availableParallelism() - 1));
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

async function runLayer(layer, manifests, state, concurrencyLimit) {
  for (let index = 0; index < layer.length; index += concurrencyLimit) {
    const batch = layer.slice(index, index + concurrencyLimit);
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
  const state = { completed: 0, total: PACKAGE_DIRECTORIES.length };

  console.error(
    `[build] ${state.total} public packages in ${layers.length} dependency layer(s); concurrency=${concurrencyLimit}`,
  );

  for (const layer of layers) {
    await runLayer(layer, manifests, state, concurrencyLimit);
  }
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
