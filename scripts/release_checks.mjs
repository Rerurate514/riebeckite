import fs from "node:fs";
import path from "node:path";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";
import { ReleaseError, repositoryRoot } from "./release_core.mjs";
import { runtime } from "./release_process.mjs";

export function validateChangeEntries() {
  try {
    return runtime.validateChanges();
  } catch (error) {
    throw new ReleaseError(error.message ?? String(error), error.status ?? 1);
  }
}

export function finalizeChangeEntries(version, date) {
  try {
    return runtime.finalizeChanges(version, date);
  } catch (error) {
    throw new ReleaseError(error.message ?? String(error), error.status ?? 1);
  }
}

export function runChecks() {
  runtime.runStep("check:packages", "pnpm", ["run", "check:packages"]);

  runtime.runStep("check:core-api", "pnpm", ["run", "check:core-api"]);

  runtime.runStep("check:dependencies", "pnpm", ["run", "check:dependencies"]);

  runtime.runStep("check:docs", "pnpm", ["run", "check:docs"]);

  runtime.runStep("check:changes", "pnpm", ["run", "check:changes"]);
}

export function readPackageManifests() {
  const manifests = new Map();

  for (const directory of PACKAGE_DIRECTORIES) {
    const manifestPath = path.join(repositoryRoot, directory, "package.json");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    manifests.set(directory, manifest);
  }

  return manifests;
}

export function computePublishLayers(manifests) {
  const nameToDirectory = new Map();

  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = manifests.get(directory);

    nameToDirectory.set(manifest.name, directory);
  }

  const internalDependencies = new Map();

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

    internalDependencies.set(directory, dependencies);
  }

  const resolved = new Set();
  const layers = [];

  while (resolved.size < PACKAGE_DIRECTORIES.length) {
    const ready = PACKAGE_DIRECTORIES.filter(
      (directory) =>
        !resolved.has(directory) &&
        [...internalDependencies.get(directory)].every((dependency) =>
          resolved.has(dependency),
        ),
    );

    if (ready.length === 0) {
      const unresolved = PACKAGE_DIRECTORIES.filter(
        (directory) => !resolved.has(directory),
      );

      throw new ReleaseError(
        "Circular dependency among public packages; " +
          "publish order is undefined: " +
          unresolved.join(", "),
      );
    }

    layers.push(ready);

    for (const directory of ready) {
      resolved.add(directory);
    }
  }

  return layers;
}
