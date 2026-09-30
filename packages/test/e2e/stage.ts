import fs from "node:fs";
import path from "node:path";

import type { Logger } from "./logger.js";
import type { PackedPackages } from "./pack.js";

export interface StageIsolatedSiteOptions {
  /** Fixture site directory copied to `siteDir`. */
  fixtureSite: string;
  /** Fixture vault directory copied to `vaultDir` (next to the site). */
  fixtureVault: string;
  /** Destination site directory. */
  siteDir: string;
  /** Destination vault directory. */
  vaultDir: string;
}

/**
 * Copy the fixture site and vault into the temporary workspace. The vault is
 * staged next to the site, not inside it, so any code that assumes content
 * lives under the site root fails immediately.
 */
export function stageIsolatedSite(options: StageIsolatedSiteOptions): void {
  fs.cpSync(options.fixtureSite, options.siteDir, { recursive: true });
  fs.cpSync(options.fixtureVault, options.vaultDir, { recursive: true });
}

type DependencyMap = Record<string, string>;

interface ConsumerManifest {
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  overrides?: DependencyMap;
  [key: string]: unknown;
}

/**
 * Rewrite the staged site manifest so every packed package resolves to its
 * local tarball. Packages already declared as dev dependencies stay there;
 * everything else moves to `dependencies`. An `overrides` entry is added for
 * each package so transitive requirements also resolve locally.
 */
export function writeFileDependencies(
  siteDir: string,
  packed: PackedPackages,
): void {
  const manifestPath = path.join(siteDir, "package.json");
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as ConsumerManifest;
  const dependencies: DependencyMap = { ...manifest.dependencies };
  const devDependencies: DependencyMap = { ...manifest.devDependencies };
  const overrides: DependencyMap = { ...manifest.overrides };

  for (const [name, info] of packed) {
    const fileSpec = `file:${path
      .relative(siteDir, info.tarball)
      .split(path.sep)
      .join("/")}`;
    if (name in devDependencies) {
      devDependencies[name] = fileSpec;
    } else {
      dependencies[name] = fileSpec;
    }
    overrides[name] = fileSpec;
  }

  manifest.dependencies = dependencies;
  manifest.devDependencies = devDependencies;
  manifest.overrides = overrides;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** A NodeNext TypeScript project to constrain after staging. */
export interface NodeNextProjectSpec {
  /** Config path relative to the site directory. */
  config: string;
  /** Replacement `include` entries. */
  include: readonly string[];
}

export interface LayerExternalConsumerTypesOptions {
  /**
   * Type libraries to layer on top of the always-added `node` types. The
   * engine verifies each one after writing.
   */
  additionalTypeLibraries: readonly string[];
  /** Extra `exclude` entries for the bundler project. */
  exclude?: readonly string[];
  /** NodeNext project whose `include` is replaced, or omitted to skip. */
  nodeNext?: NodeNextProjectSpec;
  logger: Logger;
}

interface TypeScriptConfig {
  compilerOptions?: { types?: string[] };
  exclude?: string[];
  include?: string[];
  [key: string]: unknown;
}

/**
 * Layer the external-consumer type requirement onto the staged site before
 * installation:
 *
 * - add `node` plus `additionalTypeLibraries` to `site/tsconfig.json` and
 *   exclude the editor-only declarations;
 * - optionally restrict a NodeNext project to its published-entry import test.
 *
 * Everything is verified after writing so a silent no-op cannot pass.
 */
export function layerExternalConsumerTypes(
  siteDir: string,
  options: LayerExternalConsumerTypesOptions,
): void {
  const { additionalTypeLibraries, exclude, nodeNext, logger } = options;
  logger.step(
    `layering the external-consumer type libraries (${additionalTypeLibraries.join(", ")})`,
  );

  const configPath = path.join(siteDir, "tsconfig.json");
  const config = JSON.parse(
    fs.readFileSync(configPath, "utf8"),
  ) as TypeScriptConfig;
  const types = new Set(config.compilerOptions?.types ?? []);
  types.add("node");
  for (const library of additionalTypeLibraries) types.add(library);
  config.compilerOptions = { ...config.compilerOptions, types: [...types] };
  if (exclude !== undefined) config.exclude = [...exclude];
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  if (nodeNext) {
    const nodeNextConfigPath = path.join(siteDir, nodeNext.config);
    const nodeNextConfig = JSON.parse(
      fs.readFileSync(nodeNextConfigPath, "utf8"),
    ) as TypeScriptConfig;
    nodeNextConfig.include = [...nodeNext.include];
    fs.writeFileSync(
      nodeNextConfigPath,
      `${JSON.stringify(nodeNextConfig, null, 2)}\n`,
    );
  }

  const written = JSON.parse(
    fs.readFileSync(configPath, "utf8"),
  ) as TypeScriptConfig;
  const effective = new Set(written.compilerOptions?.types ?? []);
  for (const library of additionalTypeLibraries) {
    if (!effective.has(library)) {
      logger.fail(
        `external-consumer tsconfig is missing the ${library} type library`,
      );
    }
  }

  const label = path
    .relative(path.dirname(siteDir), configPath)
    .split(path.sep)
    .join("/");
  console.log(`  ${label} types: ${[...effective].join(", ")}`);
}
