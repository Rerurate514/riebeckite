import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertDeclaredDependencies,
  assertIsolatedInstall,
  assertNoMonorepoEscapeHatches,
  assertPublishedArtifacts,
  type RequiredInstallPath,
} from "./assertions.js";
import { cliText, runCli, runTypecheck } from "./cli.js";
import { createLogger, type Logger } from "./logger.js";
import { type PackageSpec, type PackedPackages, packPackages } from "./pack.js";
import { run } from "./process.js";
import {
  layerExternalConsumerTypes,
  type NodeNextProjectSpec,
  stageIsolatedSite,
  writeFileDependencies,
} from "./stage.js";

/** Fixture directories copied into the temporary workspace. */
export interface ExternalSiteFixture {
  /** Site fixture, copied to `<temp>/site`. */
  site: string;
  /** Vault fixture, copied to `<temp>/vault` (next to the site). */
  vault: string;
}

/** One CLI invocation performed against the installed site. */
export interface CliCommandSpec {
  /** Positional arguments, e.g. `["inspect", "config"]`. */
  args: readonly string[];
  /** Optional assertion over the combined CLI output. */
  assertOutput?: (output: string) => void;
}

/** A repo-specific programmatic check run after the generic install checks. */
export type SiteCheck = (
  workspace: ExternalSiteWorkspace,
  logger: Logger,
) => void;

/** The temporary workspace shared by the engine and the caller's callbacks. */
export interface ExternalSiteWorkspace {
  repoRoot: string;
  tempRoot: string;
  siteDir: string;
  vaultDir: string;
  tarballDir: string;
  packed: PackedPackages;
}

/** Repo-specific assertions supplied by the driver. */
export interface ExternalSiteAssertions {
  /** Assert on the built `dist/` output (and, if needed, the vault). */
  buildOutput(siteDir: string, vaultDir: string): void;
}

export interface ExternalSiteE2EConfig {
  /** Absolute repository root. */
  repoRoot: string;
  /** Packages to pack and inject as local tarball dependencies. */
  packages: readonly PackageSpec[];
  /** Fixture site and vault directories. */
  fixture: ExternalSiteFixture;
  /** Absolute path to the undeclared-dependency checker script. */
  dependencyCheckScript: string;
  /** Published package scope, e.g. `"@riebeckite"`. */
  scope: string;
  /** CLI name shown in step lines, e.g. `"riebeckite"`. */
  cliName: string;
  /** Resolve the installed CLI entry point from the site directory. */
  resolveCliEntry(siteDir: string): string;
  /** CLI invocations, in order, run after the install checks. */
  cliCommands: readonly CliCommandSpec[];
  /** Directory (relative to the site) the CLI runs from. Defaults to the site. */
  cliWorkingDirectory?: string;
  /** TypeScript projects to type-check after the build. */
  typecheckProjects?: readonly string[];
  /** Extra type libraries beyond `node`; verified after writing. */
  additionalTypeLibraries?: readonly string[];
  /** Extra `exclude` entries for the bundler project. */
  bundlerTypeExclude?: readonly string[];
  /** NodeNext project whose `include` is replaced, or omitted to skip. */
  nodeNextProject?: NodeNextProjectSpec;
  /** Paths that must exist inside the isolated install. */
  requiredInstallPaths?: readonly RequiredInstallPath[];
  /** Directory site sources must not traverse into. Defaults to `packages`. */
  monorepoPackagesDirectory?: string;
  /** Repo-specific checks run after the generic install assertions. */
  siteChecks?: readonly SiteCheck[];
  /** Build-output assertion supplied by the driver. */
  assertions: ExternalSiteAssertions;
  /**
   * Run after the build and type-checks, before the workspace is removed. Lets
   * a driver reuse the packed tarballs for a secondary site.
   */
  afterSiteChecks?: (workspace: ExternalSiteWorkspace) => void | Promise<void>;
  /** `pnpm pack` concurrency. Defaults to 4. */
  concurrency?: number;
  /** Logger label. Defaults to `"e2e"`. */
  stepLabel?: string;
  /** Final success message appended after `PASS: `. */
  passMessage?: string;
  /** Environment variable that keeps the temporary workspace. */
  keepEnv: string;
  /** Prefix for the temporary directory. Defaults to `"riebeckite-e2e-"`. */
  tempPrefix?: string;
  /** Logger to reuse; a new one is created when omitted. */
  logger?: Logger;
}

/**
 * Run the generic external-consumer end-to-end sequence:
 *
 * pack -> make temp workspace -> copy fixture -> write consumer manifest and
 * tsconfig -> `npm install` -> isolation / escape-hatch / artifact /
 * declared-dependency assertions -> repo-specific checks -> CLI checks ->
 * build-output assertion -> type-checks -> optional `afterSiteChecks`.
 *
 * Everything repo-specific (repository root, package list, fixtures, marker
 * assertions, CLI shape, keep-temp variable) is injected through `config`. The
 * temporary workspace is removed in `finally` unless `config.keepEnv` is set.
 */
export async function runExternalSiteE2E(
  config: ExternalSiteE2EConfig,
): Promise<void> {
  const logger = config.logger ?? createLogger(config.stepLabel ?? "e2e");
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), config.tempPrefix ?? "riebeckite-e2e-"),
  );
  const siteDir = path.join(tempRoot, "site");
  const vaultDir = path.join(tempRoot, "vault");
  const tarballDir = path.join(tempRoot, "tarballs");
  fs.mkdirSync(tarballDir, { recursive: true });

  logger.step(`temporary workspace: ${tempRoot}`);
  try {
    const packed = await packPackages(tarballDir, {
      repoRoot: config.repoRoot,
      packages: config.packages,
      concurrency: config.concurrency,
      logger,
    });

    logger.step(
      "copying fixture site and vault (content stays outside the site root)",
    );
    stageIsolatedSite({
      fixtureSite: config.fixture.site,
      fixtureVault: config.fixture.vault,
      siteDir,
      vaultDir,
    });

    layerExternalConsumerTypes(siteDir, {
      additionalTypeLibraries: config.additionalTypeLibraries ?? [],
      exclude: config.bundlerTypeExclude,
      nodeNext: config.nodeNextProject,
      logger,
    });
    writeFileDependencies(siteDir, packed);

    logger.step("npm install (tarballs + normal registry dependencies)");
    run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
      cwd: siteDir,
    });

    assertIsolatedInstall(siteDir, tempRoot, {
      repoRoot: config.repoRoot,
      requiredPaths: config.requiredInstallPaths,
      logger,
    });
    assertNoMonorepoEscapeHatches(siteDir, {
      monorepoPackagesDirectory: config.monorepoPackagesDirectory,
      logger,
    });
    assertDeclaredDependencies(siteDir, {
      dependencyCheckScript: config.dependencyCheckScript,
      cwd: config.repoRoot,
      logger,
    });
    assertPublishedArtifacts(siteDir, {
      repoRoot: config.repoRoot,
      scope: config.scope,
      logger,
    });

    const workspace: ExternalSiteWorkspace = {
      repoRoot: config.repoRoot,
      tempRoot,
      siteDir,
      vaultDir,
      tarballDir,
      packed,
    };

    for (const check of config.siteChecks ?? []) check(workspace, logger);

    const cliCwd = config.cliWorkingDirectory
      ? path.join(siteDir, config.cliWorkingDirectory)
      : siteDir;
    const cliEntry = config.resolveCliEntry(siteDir);
    for (const command of config.cliCommands) {
      const result = runCli(command.args, {
        cliEntry,
        cwd: cliCwd,
        cliName: config.cliName,
        logger,
      });
      command.assertOutput?.(cliText(result));
    }

    config.assertions.buildOutput(siteDir, vaultDir);

    for (const project of config.typecheckProjects ?? []) {
      runTypecheck(siteDir, project, logger);
    }

    await config.afterSiteChecks?.(workspace);

    logger.step(
      `PASS: ${config.passMessage ?? "external site built from published artifacts"}`,
    );
  } finally {
    if (process.env[config.keepEnv]) {
      logger.step(`kept workspace: ${tempRoot}`);
    } else {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}
