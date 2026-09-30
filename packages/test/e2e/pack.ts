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
export async function packPackages(
  tarballDir: string,
  options: PackPackagesOptions,
): Promise<PackedPackages> {
  const { repoRoot, packages, logger, concurrency = 4 } = options;
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

  // Limited-concurrency pool: keep at most `concurrency` pnpm pack processes
  // in flight. Logs appear in completion order; the result array below is
  // filled in input order.
  const results: PackedResult[] = new Array(packages.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < packages.length) {
      const index = nextIndex;
      nextIndex += 1;
      const pkg = packages[index];
      if (pkg === undefined) continue;
      results[index] = await packOne(pkg);
    }
  };

  const batch = await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, packages.length) }, () =>
      worker(),
    ),
  );
  const failure = batch.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) {
    // All in-flight jobs have settled by now; surface the first failure.
    throw failure.reason;
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
