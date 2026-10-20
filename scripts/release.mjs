#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PACKAGE_DIRECTORIES } from "./package_metadata.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

const scaffoldVersionFile = path.join(
  "packages",
  "create-riebeckite",
  "src",
  "scaffold",
  "version.ts",
);

const scaffoldGoldenDirectory = path.join(
  "packages",
  "create-riebeckite",
  "test",
  "__golden__",
  "scaffold",
);

const PUBLISH_CONCURRENCY = 8;
const NPM_VIEW_CONCURRENCY = 8;

const PUBLISH_TIMEOUT_MS = 10 * 60_000;
const NPM_VIEW_TIMEOUT_MS = 60_000;

const VERIFY_TIMEOUT_MS = 15 * 60_000;
const VERIFY_INTERVAL_MS = 5_000;

const REGISTRY_QUERY_ATTEMPTS = 3;
const REGISTRY_QUERY_DELAY_MS = 2_000;
const PUBLISH_ATTEMPTS = 3;
const PUBLISH_RETRY_DELAY_MS = 5_000;

const SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const PACKAGE_STATE = {
  PUBLISHED: "published",
  UNPUBLISHED: "unpublished",
  UNKNOWN: "unknown",
};

export const PUBLISH_FAILURE = {
  AUTHENTICATION: "authentication",
  PERMISSION: "permission",
  VERSION_CONFLICT: "version-conflict",
  NOT_FOUND: "not-found",
  TRANSIENT: "transient",
  UNKNOWN: "unknown",
};

const usage = `Usage:
  node scripts/release.mjs <version> [--dry-run]
  node scripts/release.mjs --check-only
  node scripts/release.mjs --help

Release flow:
  version validation
  -> ensure tag does not already exist
  -> version bump
  -> build:packages
  -> scaffold golden update
  -> checks
  -> inspect published versions
  -> compute dependency layers
  -> interactive first publish
  -> parallel dependency-layer publish
  -> bounded retry for transient failures
  -> interactive retry for authentication failures
  -> verify every version is live
  -> git commit + tag
  -> push instructions

The release is idempotent and resumable. Re-running it for the same version
skips everything already published on the registry and processes only the
remaining packages, so a partial or interrupted release can be continued.

Options:
  <version>     Next semantic version for all public packages.
  --dry-run     Rehearse without publishing or creating git objects.
  --check-only  Run package checks only.
  --help        Show this help.

Publishing:
  Packages are published directly from this machine with pnpm. When the npm
  CLI needs interactive authentication (security key, passkey, or one-time
  password), it prompts in this terminal; this script never implements its own
  authentication flow or its own one-time password prompt.

Version conflicts:
  A version conflict is never retried blindly. The script re-checks the
  registry after every failed publish. It continues only when that version is
  confirmed published; otherwise it stops so the conflict can be inspected.`;

export class ReleaseError extends Error {
  constructor(message, status = 1) {
    super(message);
    this.name = "ReleaseError";
    this.status = status;
  }
}

export class PublishError extends ReleaseError {
  constructor(
    message,
    {
      status = 1,
      stdout = "",
      stderr = "",
      category = PUBLISH_FAILURE.UNKNOWN,
    } = {},
  ) {
    super(message, status);

    this.name = "PublishError";
    this.stdout = stdout;
    this.stderr = stderr;
    this.category = category;
  }

  get authenticationRequired() {
    return this.category === PUBLISH_FAILURE.AUTHENTICATION;
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
        env: options.env,
      })
    : spawnSync(command, args, {
        cwd,
        stdio: "inherit",
        timeout: options.timeout,
        env: options.env,
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

export const runtime = {
  spawnBuffered: (...args) => spawnBuffered(...args),
  spawnInteractive: (...args) => spawnInteractive(...args),
  runStep: (...args) => runStep(...args),
  spawnSync: (...args) => spawnSync(...args),
  isInteractive: () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now: () => Date.now(),
};

function runChecks() {
  runtime.runStep("check:packages", "pnpm", ["run", "check:packages"]);

  runtime.runStep("check:dependencies", "pnpm", ["run", "check:dependencies"]);

  runtime.runStep("check:docs", "pnpm", ["run", "check:docs"]);
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

function combineOutput(stdout, stderr) {
  return `${stdout ?? ""}\n${stderr ?? ""}`;
}

export function isVersionConflictOutput(output) {
  const lower = output.toLowerCase();

  return (
    /\be409\b/.test(lower) ||
    (/\b409\b/.test(lower) && lower.includes("conflict"))
  );
}

export function isAuthenticationOutput(output) {
  const lower = output.toLowerCase();

  return (
    lower.includes("err_pnpm_otp_non_interactive") ||
    lower.includes("requires additional authentication") ||
    lower.includes("not running in an interactive terminal") ||
    lower.includes("provide the --otp option") ||
    lower.includes("eneedauth") ||
    /\be401\b/.test(lower) ||
    /\beotp\b/.test(lower) ||
    lower.includes("one-time password") ||
    lower.includes("one-time pass")
  );
}

export function isPermissionOutput(output) {
  const lower = output.toLowerCase();

  return (
    /\be403\b/.test(lower) ||
    lower.includes("forbidden") ||
    lower.includes("you do not have permission") ||
    lower.includes("permission to publish")
  );
}

export function isNotFoundOutput(output) {
  const lower = output.toLowerCase();

  return (
    lower.includes("e404") ||
    lower.includes("404 not found") ||
    lower.includes("is not in this registry") ||
    lower.includes("could not be found")
  );
}

export function isTransientOutput(output) {
  const lower = output.toLowerCase();

  return (
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("econnrefused") ||
    lower.includes("eai_again") ||
    lower.includes("enotfound") ||
    lower.includes("socket hang up") ||
    lower.includes("network") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    /\be50[0-4]\b/.test(lower) ||
    lower.includes("service unavailable") ||
    lower.includes("bad gateway") ||
    lower.includes("internal server error")
  );
}

export function classifyPublishFailure({ stdout = "", stderr = "" } = {}) {
  const output = combineOutput(stdout, stderr);

  if (isVersionConflictOutput(output)) {
    return PUBLISH_FAILURE.VERSION_CONFLICT;
  }

  if (isAuthenticationOutput(output)) {
    return PUBLISH_FAILURE.AUTHENTICATION;
  }

  if (isPermissionOutput(output)) {
    return PUBLISH_FAILURE.PERMISSION;
  }

  if (isNotFoundOutput(output)) {
    return PUBLISH_FAILURE.NOT_FOUND;
  }

  if (isTransientOutput(output)) {
    return PUBLISH_FAILURE.TRANSIENT;
  }

  return PUBLISH_FAILURE.UNKNOWN;
}

async function ensureAuthentication() {
  const currentUser = await runtime.spawnBuffered(
    "npm",
    ["whoami"],
    repositoryRoot,
    {
      timeout: NPM_VIEW_TIMEOUT_MS,
      label: "npm whoami",
    },
  );

  if (currentUser.status === 0) {
    const name = currentUser.stdout.trim();

    console.log(
      `\n[authentication] npm is signed in${name ? ` as ${name}` : ""}.`,
    );

    return;
  }

  console.log("\n[authentication] npm is not signed in for publishing.");

  console.log("Starting npm login; finish the browser or terminal prompt.");

  const login = await runtime.spawnInteractive(
    "npm",
    ["login"],
    repositoryRoot,
    {
      timeout: PUBLISH_TIMEOUT_MS,
      label: "npm login",
    },
  );

  if (login.status !== 0) {
    throw new ReleaseError(
      `npm login failed with exit code ${login.status}.`,
      login.status,
    );
  }

  const verifiedUser = await runtime.spawnBuffered(
    "npm",
    ["whoami"],
    repositoryRoot,
    {
      timeout: NPM_VIEW_TIMEOUT_MS,
      label: "npm whoami",
    },
  );

  if (verifiedUser.status !== 0) {
    throw new ReleaseError(
      "npm is still not signed in after npm login; aborting before publish.\n" +
        verifiedUser.stderr.trim(),
      verifiedUser.status,
    );
  }

  console.log(`\n[authentication] signed in as ${verifiedUser.stdout.trim()}.`);
}

async function queryPublishedState(packageName, version) {
  const packageSpec = `${packageName}@${version}`;

  for (let attempt = 1; attempt <= REGISTRY_QUERY_ATTEMPTS; attempt += 1) {
    let result;

    try {
      result = await runtime.spawnBuffered(
        "npm",
        ["view", packageSpec, "version", "--json"],
        repositoryRoot,
        {
          timeout: NPM_VIEW_TIMEOUT_MS,
          label: `npm view ${packageSpec}`,
        },
      );
    } catch (error) {
      if (attempt < REGISTRY_QUERY_ATTEMPTS) {
        await runtime.sleep(REGISTRY_QUERY_DELAY_MS);

        continue;
      }

      return {
        state: PACKAGE_STATE.UNKNOWN,
        reason: error.message,
      };
    }

    if (result.status === 0) {
      let publishedVersion;

      try {
        publishedVersion = JSON.parse(result.stdout);
      } catch {
        return {
          state: PACKAGE_STATE.UNKNOWN,
          reason: "npm view returned invalid JSON.",
        };
      }

      if (publishedVersion === version) {
        return {
          state: PACKAGE_STATE.PUBLISHED,
          reason: null,
        };
      }

      return {
        state: PACKAGE_STATE.UNKNOWN,
        reason: `npm view returned ${JSON.stringify(publishedVersion)}.`,
      };
    }

    const output = combineOutput(result.stdout, result.stderr);

    if (isNotFoundOutput(output)) {
      return {
        state: PACKAGE_STATE.UNPUBLISHED,
        reason: null,
      };
    }

    if (isTransientOutput(output) && attempt < REGISTRY_QUERY_ATTEMPTS) {
      await runtime.sleep(REGISTRY_QUERY_DELAY_MS);

      continue;
    }

    return {
      state: PACKAGE_STATE.UNKNOWN,
      reason: result.stderr.trim() || output.trim(),
    };
  }

  return {
    state: PACKAGE_STATE.UNKNOWN,
    reason: "registry state could not be established.",
  };
}

async function isPackageVersionPublished(packageName, version) {
  const { state, reason } = await queryPublishedState(packageName, version);

  if (state === PACKAGE_STATE.PUBLISHED) {
    return true;
  }

  if (state === PACKAGE_STATE.UNPUBLISHED) {
    return false;
  }

  throw new ReleaseError(
    `Could not determine whether ${packageName}@${version} is published: ${
      reason ?? "unknown registry error"
    }`,
  );
}

async function inspectPublishedPackages(manifests, version, dryRun, quiet) {
  if (dryRun) {
    return new Set();
  }

  if (!quiet) {
    console.log(
      "\n[step] checking published versions " +
        `(concurrency ${NPM_VIEW_CONCURRENCY})`,
    );
  }

  const checks = await mapWithConcurrency(
    PACKAGE_DIRECTORIES,
    NPM_VIEW_CONCURRENCY,
    async (directory) => {
      const manifest = manifests.get(directory);

      const published = await isPackageVersionPublished(manifest.name, version);

      if (!quiet) {
        console.log(
          `  ${
            published ? "published  " : "unpublished"
          } ${manifest.name}@${version}`,
        );
      }

      return {
        directory,
        published,
      };
    },
  );

  return new Set(
    checks
      .filter(({ published }) => published)
      .map(({ directory }) => directory),
  );
}

function findFirstPendingPackage(layers, publishedPackages) {
  for (const layer of layers) {
    for (const directory of layer) {
      if (!publishedPackages.has(directory)) {
        return directory;
      }
    }
  }

  return null;
}

async function publishInteractive(directory, manifest, version, reason) {
  const packageSpec = `${manifest.name}@${version}`;

  if (await isPackageVersionPublished(manifest.name, version)) {
    console.log(`\n[publish] skip ${packageSpec} (already published)`);

    return;
  }

  console.log("\n[interactive publish]");

  if (reason) {
    console.log(reason);
  }

  console.log(`Publishing ${packageSpec} interactively.`);

  console.log("Complete npm authentication when prompted.");

  const result = await runtime.spawnInteractive(
    "pnpm",
    ["publish", "--no-git-checks"],
    path.join(repositoryRoot, directory),
    {
      timeout: PUBLISH_TIMEOUT_MS,
      label: `interactive publish ${packageSpec}`,
    },
  );

  if (result.status === 0) {
    console.log(`[interactive publish] finished ${packageSpec}`);

    return;
  }

  const published = await queryPublishedState(manifest.name, version);

  if (published.state === PACKAGE_STATE.PUBLISHED) {
    console.log(
      `[interactive publish] ${packageSpec} is published despite a failed ` +
        "response; treating it as complete.",
    );

    return;
  }

  if (published.state === PACKAGE_STATE.UNKNOWN) {
    throw new ReleaseError(
      `Interactive publish ${packageSpec} failed with exit code ${result.status}, ` +
        `and its published state could not be confirmed: ${
          published.reason ?? "unknown registry error"
        }. Refusing to publish again.`,
      result.status,
    );
  }

  throw new PublishError(
    `Interactive publish ${packageSpec} failed with exit code ${result.status}.`,
    {
      status: result.status,
      category: PUBLISH_FAILURE.UNKNOWN,
    },
  );
}

async function publishPackage(
  directory,
  manifest,
  version,
  dryRun,
  position,
  total,
) {
  const packageSpec = `${manifest.name}@${version}`;

  if (await isPackageVersionPublished(manifest.name, version)) {
    console.log(
      `[publish ${position}/${total}] skip ${packageSpec} (already published)`,
    );

    return;
  }

  const args = ["publish", "--no-git-checks"];

  if (dryRun) {
    args.push("--dry-run");
  }

  for (let attempt = 1; attempt <= PUBLISH_ATTEMPTS; attempt += 1) {
    const suffix = attempt > 1 ? ` (attempt ${attempt})` : "";

    console.log(
      `[publish ${position}/${total}] starting ${packageSpec}${suffix}`,
    );

    let result = null;
    let failureMessage = null;

    try {
      result = await runtime.spawnBuffered(
        "pnpm",
        args,
        path.join(repositoryRoot, directory),
        {
          timeout: PUBLISH_TIMEOUT_MS,
          label: `publish ${packageSpec}`,
        },
      );
    } catch (error) {
      failureMessage = error.message;
    }

    if (result !== null) {
      console.log(`\n[publish ${position}/${total}] ${packageSpec}`);

      if (result.stdout.trim()) {
        process.stdout.write(`${result.stdout.trimEnd()}\n`);
      }

      if (result.stderr.trim()) {
        process.stderr.write(`${result.stderr.trimEnd()}\n`);
      }

      if (result.status === 0) {
        console.log(`[publish ${position}/${total}] finished ${packageSpec}`);

        return;
      }
    }

    const published = await queryPublishedState(manifest.name, version);

    if (published.state === PACKAGE_STATE.PUBLISHED) {
      console.log(
        `[publish ${position}/${total}] ${packageSpec} is published despite ` +
          "a failed response; treating it as complete.",
      );

      return;
    }

    if (published.state === PACKAGE_STATE.UNKNOWN) {
      throw new PublishError(
        `publish ${packageSpec} failed and its published state could not be confirmed: ${
          published.reason ?? "unknown registry error"
        }. Refusing to publish again.`,
        {
          status: result?.status ?? 1,
          stdout: result?.stdout ?? "",
          stderr: result?.stderr ?? "",
        },
      );
    }

    const category =
      result === null
        ? PUBLISH_FAILURE.TRANSIENT
        : classifyPublishFailure(result);

    if (category === PUBLISH_FAILURE.TRANSIENT && attempt < PUBLISH_ATTEMPTS) {
      console.log(
        `[publish ${position}/${total}] transient failure for ${packageSpec}; ` +
          "retrying after a short delay...",
      );

      await runtime.sleep(PUBLISH_RETRY_DELAY_MS);

      continue;
    }

    const message =
      result === null
        ? `publish ${packageSpec} did not complete: ${
            failureMessage ?? "unknown error"
          }.`
        : `publish ${packageSpec} failed with exit code ${result.status}.`;

    throw new PublishError(message, {
      status: result?.status ?? 1,
      stdout: result?.stdout ?? "",
      stderr: result?.stderr ?? "",
      category,
    });
  }
}

async function retryAuthenticationFailures(
  failures,
  manifests,
  version,
  publishedPackages,
) {
  await ensureAuthentication();

  for (const failure of failures) {
    const { directory } = failure;
    const manifest = manifests.get(directory);
    const packageSpec = `${manifest.name}@${version}`;

    console.log(`\n[authentication required] ${packageSpec}`);

    console.log("The parallel publish requested additional authentication.");

    const alreadyPublished = await isPackageVersionPublished(
      manifest.name,
      version,
    );

    if (alreadyPublished) {
      console.log(
        `${packageSpec} is already published; skipping interactive retry.`,
      );

      publishedPackages.add(directory);

      continue;
    }

    await publishInteractive(
      directory,
      manifest,
      version,
      "Retrying this package with an interactive terminal.",
    );

    publishedPackages.add(directory);

    console.log("Authentication refreshed. Parallel publishing will resume.");
  }
}

function failureCategory(error) {
  return error instanceof PublishError
    ? error.category
    : PUBLISH_FAILURE.UNKNOWN;
}

async function publishPackages(
  layers,
  manifests,
  publishedPackages,
  dryRun,
  version,
) {
  console.log("\nPublish dependency layers:");

  for (let index = 0; index < layers.length; index += 1) {
    console.log(`  layer ${index + 1}:`);

    for (const directory of layers[index]) {
      const manifest = manifests.get(directory);

      const suffix = publishedPackages.has(directory)
        ? " (already published)"
        : "";

      console.log(`    - ${manifest.name}${suffix}`);
    }
  }

  if (!dryRun) {
    await ensureAuthentication();

    const firstPending = findFirstPendingPackage(layers, publishedPackages);

    if (firstPending) {
      const manifest = manifests.get(firstPending);

      await publishInteractive(
        firstPending,
        manifest,
        version,
        "Authenticating with the first pending package before parallel publishing.",
      );

      publishedPackages.add(firstPending);
    }
  }

  const pendingCount = layers
    .flat()
    .filter((directory) => dryRun || !publishedPackages.has(directory)).length;

  if (!dryRun && pendingCount === 0) {
    console.log("\nAll packages are already published.");

    return;
  }

  if (dryRun) {
    console.log(`\n[dry-run] would publish ${pendingCount} package(s).`);
  } else {
    console.log(
      `\nStarting remaining publishes with concurrency ${PUBLISH_CONCURRENCY}.`,
    );
  }

  let publishPosition = 0;

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex];

    console.log(`\n[publish layer ${layerIndex + 1}/${layers.length}]`);

    const pending = [];

    for (const directory of layer) {
      const manifest = manifests.get(directory);

      if (!dryRun && publishedPackages.has(directory)) {
        console.log(`  skip ${manifest.name}@${version} (already published)`);

        continue;
      }

      publishPosition += 1;

      pending.push({
        directory,
        position: publishPosition,
      });
    }

    if (pending.length === 0) {
      console.log("  nothing to publish");

      continue;
    }

    const results = await mapWithConcurrency(
      pending,
      PUBLISH_CONCURRENCY,
      async ({ directory, position }) => {
        const manifest = manifests.get(directory);

        try {
          await publishPackage(
            directory,
            manifest,
            version,
            dryRun,
            position,
            pendingCount,
          );

          return {
            directory,
            error: null,
          };
        } catch (error) {
          return {
            directory,
            error,
          };
        }
      },
    );

    for (const { directory, error } of results) {
      if (error === null) {
        publishedPackages.add(directory);
      }
    }

    const authenticationFailures = results.filter(
      ({ error }) => failureCategory(error) === PUBLISH_FAILURE.AUTHENTICATION,
    );

    const otherFailures = results.filter(
      ({ error }) =>
        error !== null &&
        failureCategory(error) !== PUBLISH_FAILURE.AUTHENTICATION,
    );

    if (authenticationFailures.length > 0 && !dryRun) {
      console.log(
        `\n${authenticationFailures.length} package(s) require interactive authentication.`,
      );

      await retryAuthenticationFailures(
        authenticationFailures,
        manifests,
        version,
        publishedPackages,
      );
    }

    if (otherFailures.length > 0) {
      console.error(`\nPublish layer ${layerIndex + 1} failed:`);

      for (const { directory, error } of otherFailures) {
        const manifest = manifests.get(directory);
        const category = failureCategory(error);

        console.error(
          `  - ${manifest.name}@${version} [${category}] ${error.message}`,
        );

        if (category === PUBLISH_FAILURE.PERMISSION) {
          console.error(
            "    This is a permission error, not a missing sign-in. Check " +
              "organization membership, package access, and the account " +
              "two-factor policy before retrying.",
          );
        }

        if (category === PUBLISH_FAILURE.NOT_FOUND) {
          console.error(
            "    The registry reported this package spec as not found. " +
              "Verify the package name and that it can be created.",
          );
        }

        if (category === PUBLISH_FAILURE.VERSION_CONFLICT) {
          console.error(
            "    The registry rejected this version as a conflict. Confirm its " +
              "state before choosing a new version or retrying.",
          );
        }

        if (category === PUBLISH_FAILURE.UNKNOWN) {
          console.error(
            "    The registry state is unknown. Check it with " +
              `npm view ${manifest.name}@${version} version before retrying.`,
          );
        }
      }

      const firstError = otherFailures[0].error;

      throw new ReleaseError(
        `${otherFailures.length} package(s) failed in publish layer ${
          layerIndex + 1
        }. Later layers were not started.`,
        firstError instanceof ReleaseError ? firstError.status : 1,
      );
    }

    console.log(`\n[publish layer ${layerIndex + 1}] complete`);
  }
}

async function verifyPublishedPackages(manifests, version) {
  const total = PACKAGE_DIRECTORIES.length;
  const deadline = runtime.now() + VERIFY_TIMEOUT_MS;

  console.log(
    `\n[step] verifying published packages (timeout ${Math.round(
      VERIFY_TIMEOUT_MS / 1000,
    )}s)`,
  );

  while (true) {
    const published = await inspectPublishedPackages(
      manifests,
      version,
      false,
      true,
    );

    if (published.size === total) {
      console.log(`\n${published.size}/${total} published`);

      console.log("✓ Release publication verified");

      return published;
    }

    const missing = PACKAGE_DIRECTORIES.filter(
      (directory) => !published.has(directory),
    ).map((directory) => `${manifests.get(directory).name}@${version}`);

    if (runtime.now() >= deadline) {
      console.error("\nUnverified packages:");

      for (const spec of missing) {
        console.error(`  - ${spec}`);
      }

      throw new ReleaseError(
        `Final verification timed out: ${published.size}/${total} published, ` +
          `${missing.length} missing. Refusing to commit or tag. ` +
          "Re-run the release once the registry has propagated.",
      );
    }

    console.log(
      `\n${published.size}/${total} published; waiting for registry propagation...`,
    );

    await runtime.sleep(VERIFY_INTERVAL_MS);
  }
}

function assertReleaseComplete(published, version) {
  const total = PACKAGE_DIRECTORIES.length;

  if (published.size !== total) {
    throw new ReleaseError(
      `Release is not complete: ${published.size}/${total} package versions ` +
        "published. Refusing to create a commit or tag.",
    );
  }

  console.log(
    `\nRELEASE COMPLETE: ${published.size}/${total} package versions published as ${version}.`,
  );
}

function ensureTagDoesNotExist(version) {
  const result = runtime.spawnSync(
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
  const result = runtime.spawnSync(
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

  const releaseFiles = [
    ...manifests,
    scaffoldVersionFile,
    scaffoldGoldenDirectory,
  ];

  runtime.runStep("git add", "git", ["add", "--", ...releaseFiles]);

  const createdCommit = hasStagedChanges(releaseFiles);

  if (createdCommit) {
    runtime.runStep("git commit", "git", [
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

  runtime.runStep("git tag", "git", ["tag", tagName]);

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

export function parseArguments(rawArguments) {
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

export async function runRelease(rawArguments) {
  const options = parseArguments(rawArguments);

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

  runtime.runStep("version bump", process.execPath, bumpArgs);

  runtime.runStep("build:packages", "pnpm", ["run", "build:packages"]);

  if (!dryRun) {
    runtime.runStep(
      "scaffold golden update",
      "pnpm",
      ["--filter", "create-riebeckite", "run", "test:golden"],
      repositoryRoot,
      { env: { ...process.env, UPDATE_GOLDEN: "1" } },
    );
  }

  runChecks();

  const manifests = readPackageManifests();

  const published = await inspectPublishedPackages(
    manifests,
    version,
    dryRun,
    false,
  );

  if (!dryRun) {
    console.log(
      `\n${published.size}/${PACKAGE_DIRECTORIES.length} package(s) already ` +
        `published as ${version}.`,
    );
  }

  const publishLayers = computePublishLayers(manifests);

  await publishPackages(publishLayers, manifests, published, dryRun, version);

  if (dryRun) {
    console.log(
      "\nDry-run finished: no versions, tarballs, or git objects created.",
    );

    return;
  }

  const verified = await verifyPublishedPackages(manifests, version);

  assertReleaseComplete(verified, version);

  commitAndTag(version);

  printPushInstructions(version);
}

function isMainModule() {
  const entry = process.argv[1];

  if (!entry) {
    return false;
  }

  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

export async function main(rawArguments = process.argv.slice(2)) {
  try {
    await runRelease(rawArguments);

    return 0;
  } catch (error) {
    if (error instanceof ReleaseError) {
      console.error(`\nrelease failed: ${error.message}`);

      process.exitCode = error.status;

      return error.status;
    }

    throw error;
  }
}

if (isMainModule()) {
  await main();
}
