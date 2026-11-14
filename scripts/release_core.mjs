import { spawnSync } from "node:child_process";
import path from "node:path";

export const repositoryRoot = path.resolve(import.meta.dirname, "..");

export const scaffoldVersionFile = path.join(
  "packages",
  "create-riebeckite",
  "src",
  "scaffold",
  "version.ts",
);

export const scaffoldGoldenDirectory = path.join(
  "packages",
  "create-riebeckite",
  "test",
  "__golden__",
  "scaffold",
);

export const PUBLISH_CONCURRENCY = 8;
export const NPM_VIEW_CONCURRENCY = 8;

export const PUBLISH_TIMEOUT_MS = 10 * 60_000;
export const NPM_VIEW_TIMEOUT_MS = 60_000;

export const VERIFY_TIMEOUT_MS = 15 * 60_000;
export const VERIFY_INTERVAL_MS = 5_000;

export const REGISTRY_QUERY_ATTEMPTS = 3;
export const REGISTRY_QUERY_DELAY_MS = 2_000;
export const PUBLISH_ATTEMPTS = 3;
export const PUBLISH_RETRY_DELAY_MS = 5_000;

export const SEMVER_PATTERN =
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

export const usage = `Usage:
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
  -> published artifact coverage
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
export function runCommand(command, args, cwd = repositoryRoot, options = {}) {
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

export function runStep(
  label,
  command,
  args,
  cwd = repositoryRoot,
  options = {},
) {
  console.log(`\n[step] ${label}`);

  const status = runCommand(command, args, cwd, {
    ...options,
    label,
  });

  if (status !== 0) {
    throw new ReleaseError(`${label} failed with exit code ${status}.`, status);
  }
}
