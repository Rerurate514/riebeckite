import { ConfigValidationError, PluginDependencyError } from "@riebeckite/core";
import type { RiebeckiteProject } from "../../application_root.js";
import { loadProjectConfig } from "../../load_config.js";
import type { DoctorCheckResult } from "../types.js";

export type ConfigurationCheck = {
  result: DoctorCheckResult;
  config?: Awaited<ReturnType<typeof loadProjectConfig>>;
  pluginResolutionError?: PluginDependencyError;
};

export async function checkConfiguration(
  project: RiebeckiteProject,
): Promise<ConfigurationCheck> {
  try {
    const config = await loadProjectConfig(project);
    return {
      config,
      result: {
        id: "configuration",
        label: "Configuration",
        status: "ok",
        message: "Valid.",
      },
    };
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return {
        result: {
          id: "configuration",
          label: "Configuration",
          status: "error",
          message: "Invalid.",
          details: error.issues.map(
            (issue) => `${issue.path}: ${issue.message}`,
          ),
        },
      };
    }
    if (error instanceof PluginDependencyError) {
      return {
        pluginResolutionError: error,
        result: {
          id: "configuration",
          label: "Configuration",
          status: "ok",
          message: "Valid.",
        },
      };
    }
    return {
      result: {
        id: "configuration",
        label: "Configuration",
        status: "error",
        message: "Could not be loaded.",
        cause: error,
      },
    };
  }
}
