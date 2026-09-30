import fs from "node:fs";
import path from "node:path";

import { walkFiles } from "./files.js";
import type { Logger } from "./logger.js";
import { run } from "./process.js";

/** True when `child` is `parent` or lives underneath it. */
function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

/** A path that must exist after installation, with its failure message. */
export interface RequiredInstallPath {
  /** Label used in the success line, e.g. `"vite/client"`. */
  label: string;
  /** Path relative to the site directory. */
  relativePath: string;
  /** Message thrown when the path is missing. */
  missingMessage: string;
  /** Include the path in the success line. Defaults to true. */
  report?: boolean;
}

export interface AssertIsolatedInstallOptions {
  /** Absolute repository root the workspace must live outside of. */
  repoRoot: string;
  /** Paths that must exist inside the isolated install. */
  requiredPaths?: readonly RequiredInstallPath[];
  logger: Logger;
}

/**
 * Verify the install is genuinely standalone: the workspace lives outside the
 * repository, no pnpm workspace state leaked in, and the locally installed
 * tooling the type-check phase depends on is present.
 */
export function assertIsolatedInstall(
  siteDir: string,
  tempRoot: string,
  options: AssertIsolatedInstallOptions,
): void {
  const { repoRoot, requiredPaths = [], logger } = options;
  logger.step("verifying standalone install (no pnpm/monorepo inheritance)");

  if (isInside(repoRoot, tempRoot)) {
    logger.fail("the external workspace must live outside the repository");
  }

  const forbiddenState = [
    path.join(tempRoot, "pnpm-workspace.yaml"),
    path.join(tempRoot, "pnpm-lock.yaml"),
    path.join(siteDir, "pnpm-workspace.yaml"),
    path.join(siteDir, "pnpm-lock.yaml"),
    path.join(siteDir, "node_modules", ".pnpm"),
  ];
  for (const file of forbiddenState) {
    if (fs.existsSync(file)) {
      logger.fail(
        `external site must not inherit pnpm workspace state: ${path.relative(
          tempRoot,
          file,
        )}`,
      );
    }
  }

  const nodeModules = path.join(siteDir, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    logger.fail("the isolated install did not create site/node_modules");
  }

  const probes: string[] = [];
  for (const required of requiredPaths) {
    const absolute = path.join(siteDir, required.relativePath);
    if (!fs.existsSync(absolute)) {
      logger.fail(required.missingMessage);
    }
    if (required.report ?? true) {
      probes.push(`${required.label} -> ${path.relative(siteDir, absolute)}`);
    }
  }

  const nodeModulesLabel = path
    .relative(path.dirname(siteDir), nodeModules)
    .split(path.sep)
    .join("/");
  const suffix = probes.length > 0 ? `; ${probes.join("; ")}` : "";
  console.log(`  ${nodeModulesLabel} is local${suffix}`);
}

export interface AssertNoMonorepoEscapeHatchesOptions {
  /**
   * Directory under the repository root that site sources must not reach into
   * via a relative parent traversal. Defaults to `"packages"`.
   */
  monorepoPackagesDirectory?: string;
  logger: Logger;
}

/**
 * Return true when `contents` contains a `directory/` reference that is
 * preceded by at least `minimumTraversals` immediate `../` segments. This
 * replaces a hardcoded regex so the engine stays monorepo-agnostic.
 */
function reachesDirectory(
  contents: string,
  directory: string,
  minimumTraversals: number,
): boolean {
  const needle = `${directory}/`;
  const parent = `${"."}${"."}/`;
  let index = contents.indexOf(needle);
  while (index !== -1) {
    let cursor = index;
    let traversals = 0;
    while (
      cursor - parent.length >= 0 &&
      contents.slice(cursor - parent.length, cursor) === parent
    ) {
      traversals += 1;
      cursor -= parent.length;
    }
    if (traversals >= minimumTraversals) return true;
    index = contents.indexOf(needle, index + needle.length);
  }
  return false;
}

/**
 * Fail if the staged site contains any way to escape into the repository:
 * `workspace:` protocol references, a copied package directory, or source
 * files that traverse into the monorepo's package directory.
 */
export function assertNoMonorepoEscapeHatches(
  siteDir: string,
  options: AssertNoMonorepoEscapeHatchesOptions,
): void {
  const { monorepoPackagesDirectory = "packages", logger } = options;
  logger.step("checking the site for monorepo escape hatches");

  const manifest = JSON.parse(
    fs.readFileSync(path.join(siteDir, "package.json"), "utf8"),
  ) as Record<string, unknown>;
  if (JSON.stringify(manifest).includes("workspace:")) {
    logger.fail(
      "site/package.json must not contain `workspace:` protocol references",
    );
  }

  const sourceFiles = walkFiles(siteDir, (full) => {
    const relative = path.relative(siteDir, full);
    if (relative.startsWith(`node_modules${path.sep}`)) return false;
    if (relative.startsWith(`dist${path.sep}`)) return false;
    return /\.(ts|tsx|mts|cts|js|mjs|json)$/.test(full);
  });

  for (const file of sourceFiles) {
    const contents = fs.readFileSync(file, "utf8");
    if (contents.includes("workspace:")) {
      logger.fail(`${path.relative(siteDir, file)} contains \`workspace:\``);
    }
    if (reachesDirectory(contents, monorepoPackagesDirectory, 2)) {
      logger.fail(
        `${path.relative(
          siteDir,
          file,
        )} reaches into the monorepo \`${monorepoPackagesDirectory}/\``,
      );
    }
  }

  if (fs.existsSync(path.join(siteDir, monorepoPackagesDirectory))) {
    logger.fail(
      `site must not contain a \`${monorepoPackagesDirectory}/\` directory`,
    );
  }
}

export interface AssertPublishedArtifactsOptions {
  /** Absolute repository root published packages must not resolve into. */
  repoRoot: string;
  /** Published package scope, e.g. `"@scope"`. */
  scope: string;
  logger: Logger;
}

/**
 * Verify every installed scoped package resolves to a real installed directory
 * outside the repository (never a symlink back into the monorepo).
 */
export function assertPublishedArtifacts(
  siteDir: string,
  options: AssertPublishedArtifactsOptions,
): void {
  const { repoRoot, scope, logger } = options;
  logger.step(`verifying ${scope}/* resolves to installed tarballs only`);
  const scopeDir = path.join(siteDir, "node_modules", ...scope.split("/"));
  if (!fs.existsSync(scopeDir)) {
    logger.fail(`no ${scope}/* packages were installed`);
  }

  for (const entry of fs.readdirSync(scopeDir)) {
    const full = path.join(scopeDir, entry);
    const real = fs.realpathSync(full);
    if (isInside(repoRoot, real)) {
      logger.fail(
        `${scope}/${entry} resolves into the repository (${real}); ` +
          "the fixture must use installed tarballs only",
      );
    }
    if (fs.lstatSync(full).isSymbolicLink()) {
      logger.fail(
        `${scope}/${entry} is a symlink; expected a real installed directory`,
      );
    }
    console.log(`  ${scope}/${entry} -> ${real}`);
  }
}

export interface AssertDeclaredDependenciesOptions {
  /** Absolute path to the undeclared-dependency checker script. */
  dependencyCheckScript: string;
  /** Working directory for the checker. Defaults to `process.cwd()`. */
  cwd?: string;
  logger: Logger;
}

/**
 * Run the repository's dependency checker against the site so it cannot
 * silently rely on hoisted (undeclared) packages.
 */
export function assertDeclaredDependencies(
  siteDir: string,
  options: AssertDeclaredDependenciesOptions,
): void {
  const { dependencyCheckScript, cwd, logger } = options;
  logger.step("checking the site for undeclared (hoisted) dependencies");
  run(process.execPath, [dependencyCheckScript, siteDir], { cwd });
}
