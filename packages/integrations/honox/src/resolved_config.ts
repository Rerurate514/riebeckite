import path from "node:path";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { spaDiagnostics } from "./spa_diagnostics.js";

/**
 * Applies the application root to a resolved Riebeckite configuration. The
 * generated site bootstrap imports this through `@riebeckite/honox/runtime`
 * so the resolved config and content runtime stay framework-owned.
 */
export function resolveHonoxConfig(
  config: ResolvedRiebeckiteConfig,
  appRoot: string,
): ResolvedRiebeckiteConfig {
  return {
    ...config,
    plugins:
      config.spa === undefined
        ? config.plugins
        : [...config.plugins, spaDiagnostics()],
    buildDirectory: path.join(appRoot, ".riebeckite"),
    outputDirectory: path.join(appRoot, "dist"),
    content: {
      ...config.content,
      directory: path.resolve(appRoot, config.content.directory),
    },
  };
}
