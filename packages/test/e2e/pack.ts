import fs from "node:fs";
import path from "node:path";

import type { Logger } from "./logger.js";
import { runAsync } from "./process.js";

/** A package that should be packed and injected into the consumer project. */
export interface PackageSpec {
  /** Package directory, relative to the repository root. */
  directory: string;
  /** Published package name, e.g. `@scope/name` or `create-thing`. */
  name: string;
}

/** A tarball produced for one package. */
export interface PackedPackage {
  tarball: string;
  version: string;
}

/** Packed packages keyed by package name. */
export type PackedPackages = Map<string, PackedPackage>;

export interface PackPackagesOptions {
  /** Absolute repository root the package directories are resolved against. */
  repoRoot: string;
  /** Packages to pack. */
  packages: readonly PackageSpec[];
  /** Maximum number of `pnpm pack` processes in flight. Defaults to 4. */
  concurrency?: number;
  logger: Logger;
}

interface PackedResult {
  pkg: PackageSpec;
  version: string;
  tarball: string;
}

/**
 * Pack every package with `pnpm pack` into `tarballDir`, using a
 * limited-concurrency pool. Returns a map from package name to its tarball and
 * version. The first failure rejects the returned promise.
 */
type PackageManifest = {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly version: string;
};

function packageLevels(
  repoRoot: string,
  packages: readonly PackageSpec[],
): readonly (readonly PackageSpec[])[] {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const dependencies = new Map<string, readonly string[]>();
  for (const pkg of packages) {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot, pkg.directory, "package.json"),
        "utf8",
      ),
    ) as PackageManifest;
    dependencies.set(
      pkg.name,
      Object.keys(manifest.dependencies ?? {}).filter((name) =>
        byName.has(name),
      ),
    );
  }

  const remaining = new Set(byName.keys());
  const levels: PackageSpec[][] = [];
  while (remaining.size > 0) {
    const level = packages.filter(
      (pkg) =>
        remaining.has(pkg.name) &&
        (dependencies.get(pkg.name) ?? []).every(
          (dependency) => !remaining.has(dependency),
        ),
    );
    if (level.length === 0) {
      throw new Error("Workspace package dependency cycle");
    }
    levels.push(level);
    for (const pkg of level) remaining.delete(pkg.name);
  }
  return levels;
}
export async function packPackages(
  tarballDir: string,
  options: PackPackagesOptions,
): Promise<PackedPackages> {
  const { repoRoot, packages, logger, concurrency = 4 } = options;
  const levels = packageLevels(repoRoot, packages);
  logger.step(
    `packing ${packages.length} packages with pnpm pack (concurrency ${concurrency})`,
  );

  const packOne = async (pkg: PackageSpec): Promise<PackedResult> => {
    const packageDir = path.join(repoRoot, pkg.directory);
    if (!fs.existsSync(packageDir)) {
      logger.fail(`Package directory is missing: ${pkg.directory}`);
    }
    const manifest = JSON.parse(
      fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
    ) as { version: string };

    await runAsync("pnpm", ["pack", "--pack-destination", tarballDir], {
      cwd: packageDir,
    });

    const sanitized = pkg.name.replace(/^@/, "").replace(/\//g, "-");
    const tarball = path.join(
      tarballDir,
      `${sanitized}-${manifest.version}.tgz`,
    );
    if (!fs.existsSync(tarball)) {
      logger.fail(`pnpm pack did not produce the expected tarball: ${tarball}`);
    }
    console.log(`  packed ${pkg.name} -> ${path.basename(tarball)}`);
    return { pkg, version: manifest.version, tarball };
  };

  const results: PackedResult[] = [];
  for (const level of levels) {
    const levelResults: PackedResult[] = new Array(level.length);
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
      while (nextIndex < level.length) {
        const index = nextIndex;
        nextIndex += 1;
        const pkg = level[index];
        if (pkg === undefined) continue;
        levelResults[index] = await packOne(pkg);
      }
    };
    const batch = await Promise.allSettled(
      Array.from({ length: Math.min(concurrency, level.length) }, () =>
        worker(),
      ),
    );
    const failure = batch.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) throw failure.reason;
    results.push(...levelResults);
  }

  const packed: PackedPackages = new Map();
  for (const result of results) {
    packed.set(result.pkg.name, {
      tarball: result.tarball,
      version: result.version,
    });
  }
  return packed;
}
