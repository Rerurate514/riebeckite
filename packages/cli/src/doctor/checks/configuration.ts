import { ConfigValidationError, PluginDependencyError } from "@riebeckite/core";
import type { RiebeckiteApplication } from "../../application_root";
import { loadApplicationConfig } from "../../load_config";
import type { DoctorCheckResult } from "../types";

export type ConfigurationCheck = {
  result: DoctorCheckResult;
  config?: Awaited<ReturnType<typeof loadApplicationConfig>>;
  pluginResolutionError?: PluginDependencyError;
};

export async function checkConfiguration(
  application: RiebeckiteApplication,
): Promise<ConfigurationCheck> {
  try {
    const config = await loadApplicationConfig(application);
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
          details: error.issues.map((issue) => `${issue.path}: ${issue.message}`),
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
