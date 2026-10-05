import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";

/**
 * Root directory for Riebeckite-managed persistent state: content build state,
 * plugin cache, persistent content cache, and the SSG output cache. The root is
 * reproducible and safe to remove; missing paths are not an error.
 */
export function resolveManagedStateRoot(
  config: ResolvedRiebeckiteConfig | undefined,
): string | undefined {
  const directory = config?.buildDirectory;
  return directory ? path.resolve(directory) : undefined;
}

/**
 * Directory for the built site. Missing paths are not an error.
 */
export function resolveBuildOutputDirectory(
  config: ResolvedRiebeckiteConfig | undefined,
): string | undefined {
  const directory = config?.outputDirectory;
  return directory ? path.resolve(directory) : undefined;
}
