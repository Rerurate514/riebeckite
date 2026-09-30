#!/usr/bin/env node
// Unifies the release flow for every public Riebeckite package:
//   bump:version -> build:packages -> check:packages + check:dependencies + check:docs + check:docs
//   -> publish (workspace topological order) -> git commit + tag
//
// Rehearse the same flow with --dry-run (no versions, tarballs, or git
// objects are created). Use --check-only to run just the validation gates.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const scaffoldVersionFile = path.join(
  "packages",
  "integrations",
  "honox",
  "src",
  "scaffold",
  "version.ts",
);

const SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const usage = `Usage:
  node scripts/release.mjs <version> [--dry-run]
  node scripts/release.mjs --check-only
  node scripts/release.mjs --help

Unified release flow for every public Riebeckite package:
  bump:version -> build:packages -> check:packages + check:dependencies + check:docs
  -> publish (workspace topological order) -> git commit + tag

Options:
  <version>     Next semantic version for all public packages.
  --dry-run     Rehearse bump/build/check/publish without side effects.
  --check-only  Run package checks only (no bump/build/publish/git).
  --help        Show this help.`;

class ReleaseError extends Error {
  constructor(message, status = 1) {
    super(message);
    this.name = "ReleaseError";
    this.status = status;
  }
}

function runCommand(command, args, cwd = repositoryRoot) {
  // pnpm is a .cmd shim on Windows and needs the shell to resolve. Passing a
  // single command string (instead of args) avoids Node's shell+args warning.
  const shellCommand = process.platform === "win32" && command === "pnpm";
  const result = shellCommand
    ? spawnSync([command, ...args].join(" "), {
        cwd,
        stdio: "inherit",
        shell: true,
      })
    : spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw new ReleaseError(`Failed to run ${command}: ${result.error.message}`);
  }
  if (result.signal) {
    throw new ReleaseError(`${command} terminated by signal ${result.signal}.`);
  }
  return result.status;
}

function runStep(label, command, args, cwd) {
  console.log(`\n[step] ${label}`);
  const status = runCommand(command, args, cwd);
  if (status !== 0) {
    throw new ReleaseError(`${label} failed with exit code ${status}.`, status);
  }
}

function runChecks() {
  runStep("check:packages", "pnpm", ["run", "check:packages"]);
  runStep("check:dependencies", "pnpm", ["run", "check:dependencies"]);
  runStep("check:docs", "pnpm", ["run", "check:docs"]);
}

// Publish layers in dependency order (dependencies of a layer are always
// published earlier); ties keep PACKAGE_DIRECTORIES order.
function computePublishOrder() {
  const nameToDirectory = new Map();
  const manifests = new Map();
  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, directory, "package.json"),
        "utf8",
      ),
    );
    nameToDirectory.set(manifest.name, directory);
    manifests.set(directory, manifest);
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
      for (const name of Object.keys(manifest[section] ?? {})) {
        const dependencyDirectory = nameToDirectory.get(name);
        if (dependencyDirectory && dependencyDirectory !== directory) {
          dependencies.add(dependencyDirectory);
        }
      }
    }
    internalDependencies.set(directory, dependencies);
  }

  const published = new Set();
  const order = [];
  while (order.length < PACKAGE_DIRECTORIES.length) {
    const ready = PACKAGE_DIRECTORIES.filter(
      (directory) =>
        !published.has(directory) &&
        [...internalDependencies.get(directory)].every((dependency) =>
          published.has(dependency),
        ),
    );
    if (ready.length === 0) {
      throw new ReleaseError(
        "Circular dependency among public packages; publish order is undefined.",
      );
    }
    for (const directory of ready) {
      published.add(directory);
      order.push(directory);
    }
  }
  return order;
}

function isPackageVersionPublished(packageName, version) {
  const packageSpec = `${packageName}@${version}`;
  // npm is a .cmd shim on Windows and needs the shell to resolve, just like
  // pnpm in runCommand. If npm itself cannot be started, fail closed instead
  // of treating the package as unpublished and attempting a duplicate publish.
  const shellCommand = process.platform === "win32";
  const result = shellCommand
    ? spawnSync(`npm view ${packageSpec} version`, {
        cwd: repositoryRoot,
        shell: true,
      })
    : spawnSync("npm", ["view", packageSpec, "version"], {
        cwd: repositoryRoot,
      });
  if (result.error) {
    throw new ReleaseError(
      `Could not check whether ${packageSpec} is published: ${result.error.message}`,
    );
  }
  if (result.signal) {
    throw new ReleaseError(
      `npm view ${packageSpec} terminated by signal ${result.signal}.`,
    );
  }
  return result.status === 0;
}

function hasStagedChanges(paths) {
  const result = spawnSync(
    "git",
    ["diff", "--cached", "--quiet", "--", ...paths],
    {
      cwd: repositoryRoot,
      stdio: "ignore",
    },
  );
  if (result.error) {
    throw new ReleaseError(
      `Could not inspect staged release changes: ${result.error.message}`,
    );
  }
  if (result.signal) {
    throw new ReleaseError(`git diff terminated by signal ${result.signal}.`);
  }
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  throw new ReleaseError(
    `Could not inspect staged release changes; git diff exited with ${result.status}.`,
    result.status,
  );
}

function publishPackages(order, dryRun, version) {
  console.log("\nPublishing in workspace topological order:");
  for (const directory of order) {
    console.log(`  - ${directory}`);
  }
  const args = ["publish", "--no-git-checks"];
  if (dryRun) args.push("--dry-run");
  for (const directory of order) {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, directory, "package.json"),
        "utf8",
      ),
    );
    if (!dryRun && isPackageVersionPublished(manifest.name, version)) {
      console.log(`\n[step] publish ${directory}`);
      console.log(
        `${manifest.name}@${version} is already published; skipping.`,
      );
      continue;
    }
    runStep(
      `publish ${directory}`,
      "pnpm",
      args,
      path.join(repositoryRoot, directory),
    );
  }
}

function ensureTagDoesNotExist(version) {
  const result = spawnSync(
    "git",
    ["rev-parse", "-q", "--verify", `refs/tags/v${version}`],
    { cwd: repositoryRoot, stdio: "ignore" },
  );
  if (result.status === 0) {
    throw new ReleaseError(`Tag v${version} already exists; aborting.`);
  }
}

// Commit exactly the bumped manifests so unrelated working-tree changes are
// never swept in. The tag is created locally but intentionally not pushed.
function commitAndTag(version) {
  const tagName = `v${version}`;
  const manifests = PACKAGE_DIRECTORIES.map((directory) =>
    path.join(directory, "package.json"),
  );
  const releaseFiles = [...manifests, scaffoldVersionFile];
  runStep("git add", "git", ["add", "--", ...releaseFiles]);
  const createdCommit = hasStagedChanges(releaseFiles);
  if (createdCommit) {
    runStep("git commit", "git", [
      "commit",
      "-m",
      `release ${tagName}`,
      "--",
      ...releaseFiles,
    ]);
  } else {
    console.log("\n[step] git commit");
    console.log("No staged release changes; skipping commit.");
  }
  runStep("git tag", "git", ["tag", tagName]);
  if (createdCommit) {
    console.log(`\nCommitted and tagged ${tagName} locally (tag not pushed).`);
  } else {
    console.log(`\nTagged ${tagName} locally (tag not pushed).`);
  }
}

function printPushInstructions(version) {
  console.log("\nPush the locally created commit and tag when ready:");
  console.log("  git push");
  console.log(`  git push origin v${version}`);
}

function parseArguments(rawArguments) {
  const options = {
    dryRun: false,
    checkOnly: false,
    help: false,
    version: null,
  };
  for (const argument of rawArguments) {
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--check-only") {
      options.checkOnly = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument.startsWith("-")) {
      throw new ReleaseError(`Unknown option: ${argument}`);
    } else if (options.version !== null) {
      throw new ReleaseError(`Unexpected extra argument: ${argument}`);
    } else {
      options.version = argument;
    }
  }
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(usage);
    return;
  }

  if (options.checkOnly) {
    runChecks();
    console.log("\ncheck-only: metadata and dependency checks passed.");
    return;
  }

  const { dryRun, version } = options;
  if (!version) {
    throw new ReleaseError(`Missing <version>.\n\n${usage}`);
  }
  if (!SEMVER_PATTERN.test(version)) {
    throw new ReleaseError(
      `Expected an exact semantic version, received ${JSON.stringify(version)}.`,
    );
  }

  console.log(
    `\nRiebeckite release ${dryRun ? "(dry-run) " : ""}v${version} ` +
      `for ${PACKAGE_DIRECTORIES.length} public packages.`,
  );

  if (!dryRun) ensureTagDoesNotExist(version);

  const bumpArgs = ["scripts/bump_version.mjs", version];
  if (dryRun) bumpArgs.push("--dry-run");
  runStep("version bump", process.execPath, bumpArgs);

  runStep("build:packages", "pnpm", ["run", "build:packages"]);
  runChecks();

  const publishOrder = computePublishOrder();
  publishPackages(publishOrder, dryRun, version);

  if (dryRun) {
    console.log(
      "\nDry-run finished: no versions, tarballs, or git objects created.",
    );
    return;
  }

  commitAndTag(version);
  printPushInstructions(version);
}

try {
  main();
} catch (error) {
  if (error instanceof ReleaseError) {
    console.error(`\nrelease failed: ${error.message}`);
    process.exitCode = error.status;
  } else {
    throw error;
  }
}
