import type {
  PluginDependencyError,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { DoctorCheckResult } from "../types.js";

export function checkPlugins(
  config: ResolvedRiebeckiteConfig | undefined,
  resolutionError?: PluginDependencyError,
): DoctorCheckResult {
  if (resolutionError) {
    return {
      id: "plugins",
      label: "Plugins",
      status: "error",
      message: "Dependency resolution failed.",
      details: [resolutionError.message],
      cause: resolutionError.cause,
    };
  }
  if (!config) {
    return {
      id: "plugins",
      label: "Plugins",
      status: "skipped",
      message: "Skipped because configuration is unavailable.",
    };
  }

  return {
    id: "plugins",
    label: "Plugins",
    status: "ok",
    message: `${config.plugins.length} plugins resolved.`,
  };
}
