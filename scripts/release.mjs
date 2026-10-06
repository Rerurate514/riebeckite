#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

const scaffoldVersionFile = path.join(
  "packages",
  "create-riebeckite",
  "src",
  "scaffold",
  "version.ts",
);

const PUBLISH_CONCURRENCY = 8;
const NPM_VIEW_CONCURRENCY = 8;

const PUBLISH_TIMEOUT_MS = 10 * 60_000;
const NPM_VIEW_TIMEOUT_MS = 60_000;

const SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const usage = `Usage:
  node scripts/release.mjs <version> [--dry-run] [--otp <code>]
  node scripts/release.mjs <version> --stage-only
  node scripts/release.mjs --check-only
  node scripts/release.mjs --help

Release flow:
  bump:version
  -> build:packages
  -> checks
  -> inspect published and staged versions
  -> pnpm pack + npm stage publish (no 2FA)
  -> npm stage approve (2FA)
  -> git commit + tag

Options:
  <version>     Next semantic version for all public packages.
  --dry-run     Rehearse without staging, approving, or creating git objects.
  --stage-only  Stage packages and stop before approval and git commit.
  --otp <code>  One-time password used to approve staged packages.
  --check-only  Run package checks only.
  --help        Show this help.`;

class ReleaseError extends Error {
  constructor(message, status = 1) {
    super(message);
    this.name = "ReleaseError";
    this.status = status;
  }
}

class PublishError extends ReleaseError {
  constructor(
    message,
    {
      status = 1,
      stdout = "",
      stderr = "",
      authenticationRequired = false,
    } = {},
  ) {
    super(message, status);

    this.name = "PublishError";
    this.stdout = stdout;
    this.stderr = stderr;
    this.authenticationRequired = authenticationRequired;
  }
}

function runCommand(command, args, cwd = repositoryRoot, options = {}) {
  const shellCommand =
    process.platform === "win32" && (command === "pnpm" || command === "npm");

  const result = shellCommand
    ? spawnSync([command, ...args].join(" "), {
        cwd,
        stdio: "inherit",
        shell: true,
        timeout: options.timeout,
      })
    : spawnSync(command, args, {
        cwd,
        stdio: "inherit",
        timeout: options.timeout,
      });

  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      throw new ReleaseError(
        `${options.label ?? command} timed out after ${Math.round(
          (options.timeout ?? 0) / 1000,
        )}s.`,
      );
    }

    throw new ReleaseError(`Failed to run ${command}: ${result.error.message}`);
  }

  if (result.signal) {
    throw new ReleaseError(`${command} terminated by signal ${result.signal}.`);
  }

  return result.status;
}

function runStep(label, command, args, cwd = repositoryRoot, options = {}) {
  console.log(`\n[step] ${label}`);

  const status = runCommand(command, args, cwd, {
    ...options,
    label,
  });

  if (status !== 0) {
    throw new ReleaseError(`${label} failed with exit code ${status}.`, status);
  }
}

function runChecks() {
  runStep("check:packages", "pnpm", ["run", "check:packages"]);

  runStep("check:dependencies", "pnpm", ["run", "check:dependencies"]);

  runStep("check:docs", "pnpm", ["run", "check:docs"]);
}

function readPackageManifests() {
  const manifests = new Map();

  for (const directory of PACKAGE_DIRECTORIES) {
    const manifestPath = path.join(repositoryRoot, directory, "package.json");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    manifests.set(directory, manifest);
  }

  return manifests;
}

function computePublishLayers(manifests) {
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

function spawnBuffered(command, args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const shell =
      process.platform === "win32" && (command === "pnpm" || command === "npm");

    const child = shell
      ? spawn([command, ...args].join(" "), {
          cwd,
          shell: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: options.env ?? process.env,
        })
      : spawn(command, args, {
          cwd,
          stdio: ["ignore", "pipe", "pipe"],
          env: options.env ?? process.env,
        });

    let stdout = "";
    let stderr = "";
    let settled = false;

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });

    const timeout =
      options.timeout === undefined
        ? null
        : setTimeout(() => {
            if (settled) {
              return;
            }

            settled = true;
            child.kill();

            reject(
              new ReleaseError(
                `${options.label ?? command} timed out after ${Math.round(
                  options.timeout / 1000,
                )}s.`,
              ),
            );
          }, options.timeout);

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      reject(new ReleaseError(`Failed to run ${command}: ${error.message}`));
    });

    child.on("close", (status, signal) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      if (signal) {
        reject(new ReleaseError(`${command} terminated by signal ${signal}.`));

        return;
      }

      resolve({
        status: status ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function spawnInteractive(command, args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const shell =
      process.platform === "win32" && (command === "pnpm" || command === "npm");

    const child = shell
      ? spawn([command, ...args].join(" "), {
          cwd,
          shell: true,
          stdio: "inherit",
          env: options.env ?? process.env,
        })
      : spawn(command, args, {
          cwd,
          stdio: "inherit",
          env: options.env ?? process.env,
        });

    let settled = false;

    const timeout =
      options.timeout === undefined
        ? null
        : setTimeout(() => {
            if (settled) {
              return;
            }

            settled = true;
            child.kill();

            reject(
              new ReleaseError(
                `${options.label ?? command} timed out after ${Math.round(
                  options.timeout / 1000,
                )}s.`,
              ),
            );
          }, options.timeout);

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      reject(new ReleaseError(`Failed to run ${command}: ${error.message}`));
    });

    child.on("close", (status, signal) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      if (signal) {
        reject(new ReleaseError(`${command} terminated by signal ${signal}.`));

        return;
      }

      resolve({
        status: status ?? 1,
      });
    });
  });
}

async function mapWithConcurrency(items, concurrency, callback) {
  if (items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await callback(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

function requiresInteractiveAuthentication(stdout, stderr) {
  const output = `${stdout}\n${stderr}`.toLowerCase();

  return (
    output.includes("err_pnpm_otp_non_interactive") ||
    output.includes("requires additional authentication") ||
    output.includes("pnpm is not running in an interactive terminal") ||
    output.includes("provide the --otp option") ||
    output.includes("eneedauth") ||
    output.includes("e401") ||
    output.includes("e403")
  );
}

async function ensureAuthentication() {
  const currentUser = await spawnBuffered("npm", ["whoami"], repositoryRoot, {
    timeout: NPM_VIEW_TIMEOUT_MS,
    label: "npm whoami",
  });

  if (currentUser.status === 0) {
    const name = currentUser.stdout.trim();

    console.log(
      `\n[authentication] npm is signed in${name ? ` as ${name}` : ""}.`,
    );

    return;
  }

  console.log("\n[authentication] npm is not signed in for publishing.");

  console.log("Starting npm login; finish the browser or terminal prompt.");

  const login = await spawnInteractive("npm", ["login"], repositoryRoot, {
    timeout: PUBLISH_TIMEOUT_MS,
    label: "npm login",
  });

  if (login.status !== 0) {
    throw new ReleaseError(
      `npm login failed with exit code ${login.status}.`,
      login.status,
    );
  }

  const verifiedUser = await spawnBuffered("npm", ["whoami"], repositoryRoot, {
    timeout: NPM_VIEW_TIMEOUT_MS,
    label: "npm whoami",
  });

  if (verifiedUser.status !== 0) {
    throw new ReleaseError(
      "npm is still not signed in after npm login; aborting before publish.\n" +
        verifiedUser.stderr.trim(),
      verifiedUser.status,
    );
  }

  console.log(`\n[authentication] signed in as ${verifiedUser.stdout.trim()}.`);
}

async function isPackageVersionPublished(packageName, version) {
  const packageSpec = `${packageName}@${version}`;

  const result = await spawnBuffered(
    "npm",
    ["view", packageSpec, "version", "--json"],
    repositoryRoot,
    {
      timeout: NPM_VIEW_TIMEOUT_MS,
      label: `npm view ${packageSpec}`,
    },
  );

  if (result.status === 0) {
    return true;
  }

  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();

  const notFound =
    output.includes("e404") ||
    output.includes("404 not found") ||
    output.includes("is not in this registry");

  if (notFound) {
    return false;
  }

  throw new ReleaseError(
    `Could not determine whether ${packageSpec} is published.\n` +
      result.stderr.trim(),
    result.status,
  );
}

async function readStagedPackages() {
  const result = await spawnBuffered(
    "npm",
    ["stage", "list", "--json"],
    repositoryRoot,
    {
      timeout: NPM_VIEW_TIMEOUT_MS,
      label: "npm stage list",
    },
  );

  if (result.status !== 0) {
    throw new ReleaseError(
      `Could not list staged packages.\n${result.stderr.trim()}`,
      result.status,
    );
  }

  const start = result.stdout.indexOf("[");
  const end = result.stdout.lastIndexOf("]");

  if (start === -1 || end < start) {
    throw new ReleaseError(
      "Could not parse staged package list from npm stage list output.",
    );
  }

  let items;

  try {
    items = JSON.parse(result.stdout.slice(start, end + 1));
  } catch (error) {
    throw new ReleaseError(
      `Could not parse staged package list: ${error.message}`,
    );
  }

  if (!Array.isArray(items)) {
    throw new ReleaseError("Unexpected npm stage list response.");
  }

  return items.filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.packageName === "string" &&
      typeof item.version === "string",
  );
}

async function inspectRegistryState(manifests, version, dryRun) {
  const published = new Set();
  const staged = new Map();

  if (dryRun) {
    return { published, staged };
  }

  console.log(
    `\n[step] inspecting registry state (concurrency ${NPM_VIEW_CONCURRENCY})`,
  );

  const checks = await mapWithConcurrency(
    PACKAGE_DIRECTORIES,
    NPM_VIEW_CONCURRENCY,
    async (directory) => {
      const manifest = manifests.get(directory);

      return {
        directory,
        manifest,
        published: await isPackageVersionPublished(manifest.name, version),
      };
    },
  );

  for (const check of checks) {
    if (check.published) {
      published.add(check.directory);
    }
  }

  const stagedItems = await readStagedPackages();
  const stagedBySpec = new Map();

  for (const item of stagedItems) {
    stagedBySpec.set(`${item.packageName}@${item.version}`, item);
  }

  for (const check of checks) {
    const item = stagedBySpec.get(`${check.manifest.name}@${version}`);

    if (item && !published.has(check.directory)) {
      staged.set(check.directory, item);
    }
  }

  for (const check of checks) {
    let state = "pending  ";

    if (published.has(check.directory)) {
      state = "published";
    } else if (staged.has(check.directory)) {
      state = "staged   ";
    }

    console.log(`  ${state} ${check.manifest.name}@${version}`);
  }

  return { published, staged };
}

function findTarballPath(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].toLowerCase().endsWith(".tgz")) {
      return lines[index];
    }
  }

  return null;
}

function parseStageId(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");

  if (start === -1 || end < start) {
    return null;
  }

  let parsed;

  try {
    parsed = JSON.parse(stdout.slice(start, end + 1));
  } catch {
    return null;
  }

  return typeof parsed?.stageId === "string" ? parsed.stageId : null;
}

function printCommandOutput(stdout, stderr) {
  if (stdout.trim()) {
    process.stdout.write(`${stdout.trimEnd()}\n`);
  }

  if (stderr.trim()) {
    process.stderr.write(`${stderr.trimEnd()}\n`);
  }
}

async function stagePackage(
  directory,
  manifest,
  version,
  packDirectory,
  position,
  total,
) {
  const packageSpec = `${manifest.name}@${version}`;

  console.log(`[stage ${position}/${total}] packing ${packageSpec}`);

  const packResult = await spawnBuffered(
    "pnpm",
    ["pack", "--pack-destination", packDirectory],
    path.join(repositoryRoot, directory),
    {
      timeout: PUBLISH_TIMEOUT_MS,
      label: `pnpm pack ${packageSpec}`,
    },
  );

  if (packResult.status !== 0) {
    console.error(`\n[stage ${position}/${total}] ${packageSpec}`);
    printCommandOutput(packResult.stdout, packResult.stderr);

    throw new PublishError(
      `pnpm pack ${packageSpec} failed with exit code ${packResult.status}.`,
      {
        status: packResult.status,
        stdout: packResult.stdout,
        stderr: packResult.stderr,
      },
    );
  }

  const tarball = findTarballPath(`${packResult.stdout}\n${packResult.stderr}`);

  if (!tarball) {
    throw new PublishError(
      `Could not locate the packed tarball for ${packageSpec}.`,
      {
        status: 1,
        stdout: packResult.stdout,
        stderr: packResult.stderr,
      },
    );
  }

  const stageResult = await spawnBuffered(
    "npm",
    ["stage", "publish", tarball, "--json"],
    repositoryRoot,
    {
      timeout: PUBLISH_TIMEOUT_MS,
      label: `npm stage publish ${packageSpec}`,
    },
  );

  console.log(`\n[stage ${position}/${total}] ${packageSpec}`);

  printCommandOutput(stageResult.stdout, stageResult.stderr);

  if (stageResult.status !== 0) {
    throw new PublishError(
      `npm stage publish ${packageSpec} failed with exit code ${stageResult.status}.`,
      {
        status: stageResult.status,
        stdout: stageResult.stdout,
        stderr: stageResult.stderr,
        authenticationRequired: requiresInteractiveAuthentication(
          stageResult.stdout,
          stageResult.stderr,
        ),
      },
    );
  }

  console.log(`[stage ${position}/${total}] staged ${packageSpec}`);

  return parseStageId(stageResult.stdout);
}

async function stagePackages(
  layers,
  manifests,
  published,
  staged,
  version,
  dryRun,
  packDirectory,
) {
  const isPending = (directory) =>
    !published.has(directory) && !staged.has(directory);

  if (dryRun) {
    const pending = layers.flat().filter(isPending);

    console.log(`\n[dry-run] would stage ${pending.length} package(s).`);

    for (const directory of pending) {
      console.log(`  - ${manifests.get(directory).name}@${version}`);
    }

    return new Map();
  }

  const total = layers.flat().filter(isPending).length;

  if (total === 0) {
    console.log("\nAll packages are already published or staged.");

    return new Map();
  }

  console.log(
    `\nStaging ${total} package(s) with concurrency ${PUBLISH_CONCURRENCY}.`,
  );

  const stagedIds = new Map();
  let position = 0;

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const items = layers[layerIndex].filter(isPending).map((directory) => {
      position += 1;

      return { directory, position };
    });

    if (items.length === 0) {
      continue;
    }

    console.log(`\n[stage layer ${layerIndex + 1}/${layers.length}]`);

    const results = await mapWithConcurrency(
      items,
      PUBLISH_CONCURRENCY,
      async ({ directory, position: packagePosition }) => {
        const manifest = manifests.get(directory);

        try {
          const stageId = await stagePackage(
            directory,
            manifest,
            version,
            packDirectory,
            packagePosition,
            total,
          );

          return {
            directory,
            stageId,
            error: null,
          };
        } catch (error) {
          return {
            directory,
            stageId: null,
            error,
          };
        }
      },
    );

    const failures = results.filter(({ error }) => error !== null);

    if (failures.length > 0) {
      console.error(`\nStaging layer ${layerIndex + 1} failed:`);

      for (const { directory, error } of failures) {
        console.error(`  - ${manifests.get(directory).name}: ${error.message}`);
      }

      const firstError = failures[0].error;

      throw new ReleaseError(
        `${failures.length} package(s) failed to stage in layer ${
          layerIndex + 1
        }. Later layers were not started.`,
        firstError instanceof ReleaseError ? firstError.status : 1,
      );
    }

    for (const { directory, stageId } of results) {
      if (stageId) {
        stagedIds.set(directory, stageId);
      }
    }

    console.log(`\n[stage layer ${layerIndex + 1}] complete`);
  }

  return stagedIds;
}

function promptOtp(
  message = "Enter the one-time password for staged approval",
) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      reject(
        new ReleaseError(
          "Approving staged packages requires a one-time password. " +
            "Pass --otp <code> or run in an interactive terminal.",
        ),
      );

      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`\n${message}: `, (answer) => {
      rl.close();

      const value = answer.trim();

      if (value.length === 0) {
        reject(new ReleaseError("No one-time password provided."));

        return;
      }

      resolve(value);
    });
  });
}

async function approvePackage(directory, manifest, version, stageId, otp) {
  const packageSpec = `${manifest.name}@${version}`;

  const args = ["stage", "approve", stageId];

  if (otp) {
    args.push("--otp", otp);
  }

  const result = await spawnBuffered("npm", args, repositoryRoot, {
    timeout: PUBLISH_TIMEOUT_MS,
    label: `npm stage approve ${packageSpec}`,
  });

  if (result.status === 0) {
    console.log(`[approve] published ${packageSpec}`);

    return { directory, error: null, otpRequired: false };
  }

  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();

  const otpRequired =
    output.includes("eotp") ||
    output.includes("one-time pass") ||
    output.includes("otp") ||
    output.includes("e401");

  return {
    directory,
    error: new PublishError(
      `npm stage approve ${packageSpec} failed with exit code ${result.status}.`,
      {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
      },
    ),
    otpRequired,
  };
}

async function approvePackages(
  layers,
  manifests,
  version,
  otpOption,
  stagedIds,
) {
  const directoryByName = new Map();

  for (const directory of PACKAGE_DIRECTORIES) {
    directoryByName.set(manifests.get(directory).name, directory);
  }

  const stageIdByDirectory = new Map(stagedIds ?? []);

  const stagedItems = await readStagedPackages();

  for (const item of stagedItems) {
    if (item.version !== version) {
      continue;
    }

    const directory = directoryByName.get(item.packageName);

    if (directory && !stageIdByDirectory.has(directory)) {
      stageIdByDirectory.set(directory, item.id);
    }
  }

  const targets = layers
    .flat()
    .filter((directory) => stageIdByDirectory.has(directory));

  if (targets.length === 0) {
    console.log("\nNo staged package versions require approval.");

    return 0;
  }

  console.log(
    `\nApproving ${targets.length} staged package version(s) with 2FA.`,
  );

  let otp = otpOption;

  if (!otp) {
    otp = await promptOtp();
  }

  let approved = 0;

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layerTargets = layers[layerIndex].filter((directory) =>
      stageIdByDirectory.has(directory),
    );

    if (layerTargets.length === 0) {
      continue;
    }

    console.log(`\n[approve layer ${layerIndex + 1}/${layers.length}]`);

    let results = await mapWithConcurrency(
      layerTargets,
      PUBLISH_CONCURRENCY,
      (directory) =>
        approvePackage(
          directory,
          manifests.get(directory),
          version,
          stageIdByDirectory.get(directory),
          otp,
        ),
    );

    if (results.some((result) => result.otpRequired) && process.stdin.isTTY) {
      otp = await promptOtp(
        "The one-time password was rejected; enter the current one-time password",
      );

      const retryTargets = results
        .filter((result) => result.otpRequired)
        .map((result) => result.directory);

      const retried = await mapWithConcurrency(
        retryTargets,
        PUBLISH_CONCURRENCY,
        (directory) =>
          approvePackage(
            directory,
            manifests.get(directory),
            version,
            stageIdByDirectory.get(directory),
            otp,
          ),
      );

      results = results.filter((result) => !result.otpRequired).concat(retried);
    }

    const failures = results.filter((result) => result.error !== null);

    if (failures.length > 0) {
      console.error(`\nApproval layer ${layerIndex + 1} failed:`);

      for (const { directory, error } of failures) {
        console.error(`  - ${manifests.get(directory).name}: ${error.message}`);
      }

      const firstError = failures[0].error;

      throw new ReleaseError(
        `${failures.length} package(s) failed to approve in layer ${
          layerIndex + 1
        }.`,
        firstError instanceof ReleaseError ? firstError.status : 1,
      );
    }

    approved += results.length;

    console.log(`\n[approve layer ${layerIndex + 1}] complete`);
  }

  return approved;
}

function ensureTagDoesNotExist(version) {
  const result = spawnSync(
    "git",
    ["rev-parse", "-q", "--verify", `refs/tags/v${version}`],
    {
      cwd: repositoryRoot,
      stdio: "ignore",
    },
  );

  if (result.error) {
    throw new ReleaseError(
      `Could not inspect tag v${version}: ${result.error.message}`,
    );
  }

  if (result.status === 0) {
    throw new ReleaseError(`Tag v${version} already exists; aborting.`);
  }
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

  if (result.status === 0) {
    return false;
  }

  if (result.status === 1) {
    return true;
  }

  throw new ReleaseError(
    `Could not inspect staged release changes; git diff exited with ${result.status}.`,
    result.status,
  );
}

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
    stageOnly: false,
    help: false,
    otp: null,
    version: null,
  };

  for (let index = 0; index < rawArguments.length; index += 1) {
    const argument = rawArguments[index];

    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--check-only") {
      options.checkOnly = true;
    } else if (argument === "--stage-only") {
      options.stageOnly = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--otp") {
      const value = rawArguments[index + 1];

      if (!value) {
        throw new ReleaseError("--otp requires a value.");
      }

      options.otp = value;
      index += 1;
    } else if (argument.startsWith("--otp=")) {
      options.otp = argument.slice("--otp=".length);
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

async function main() {
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

  const { dryRun, version, stageOnly } = options;

  if (!version) {
    throw new ReleaseError(`Missing <version>.\n\n${usage}`);
  }

  if (!SEMVER_PATTERN.test(version)) {
    throw new ReleaseError(
      `Expected an exact semantic version, received ${JSON.stringify(
        version,
      )}.`,
    );
  }

  console.log(
    `\nRiebeckite release ${dryRun ? "(dry-run) " : ""}v${version} for ${
      PACKAGE_DIRECTORIES.length
    } public packages.`,
  );

  if (!dryRun) {
    ensureTagDoesNotExist(version);
  }

  const bumpArgs = ["scripts/bump_version.mjs", version];

  if (dryRun) {
    bumpArgs.push("--dry-run");
  }

  runStep("version bump", process.execPath, bumpArgs);

  runStep("build:packages", "pnpm", ["run", "build:packages"]);

  runChecks();

  const manifests = readPackageManifests();

  const publishLayers = computePublishLayers(manifests);

  const packDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-release-"),
  );

  try {
    if (dryRun) {
      const { published, staged } = await inspectRegistryState(
        manifests,
        version,
        true,
      );

      await stagePackages(
        publishLayers,
        manifests,
        published,
        staged,
        version,
        true,
        packDirectory,
      );

      console.log(
        "\nDry-run finished: no versions, tarballs, or git objects created.",
      );

      return;
    }

    await ensureAuthentication();

    const { published, staged } = await inspectRegistryState(
      manifests,
      version,
      false,
    );

    console.log(
      `\n${published.size}/${PACKAGE_DIRECTORIES.length} package(s) already ` +
        `published, ${staged.size} staged, as ${version}.`,
    );

    const stagedIds = await stagePackages(
      publishLayers,
      manifests,
      published,
      staged,
      version,
      false,
      packDirectory,
    );

    if (stageOnly) {
      console.log(
        `\nStaged release v${version}. Approval requires 2FA.\n` +
          "Re-run without --stage-only to approve and finish the release, " +
          "or approve the staged versions on npmjs.com.",
      );

      return;
    }

    const approved = await approvePackages(
      publishLayers,
      manifests,
      version,
      options.otp,
      stagedIds,
    );

    console.log(`\nApproved and published ${approved} package version(s).`);

    commitAndTag(version);

    printPushInstructions(version);
  } finally {
    fs.rmSync(packDirectory, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof ReleaseError) {
    console.error(`\nrelease failed: ${error.message}`);

    process.exitCode = error.status;
  } else {
    throw error;
  }
}
