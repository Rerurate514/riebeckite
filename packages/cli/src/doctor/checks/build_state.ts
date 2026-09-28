import path from "node:path";
import {
  readContentBuildStateStatus,
  resolveContentBuildStatePath,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { DoctorCheckResult } from "../types";

export async function checkBuildState(
  config: ResolvedRiebeckiteConfig | undefined,
): Promise<{ result: DoctorCheckResult; statePath?: string }> {
  if (!config) {
    return {
      result: {
        id: "build-state",
        label: "Incremental build state",
        status: "skipped",
        message: "Skipped because configuration is unavailable.",
      },
    };
  }

  const statePath = resolveContentBuildStatePath(config, undefined);
  try {
    const status = await readContentBuildStateStatus(statePath);
    if (status.kind === "valid") {
      return {
        statePath,
        result: {
          id: "build-state",
          label: "Incremental build state",
          status: "ok",
          message: "Valid.",
        },
      };
    }
    if (status.kind === "missing") {
      return {
        statePath,
        result: {
          id: "build-state",
          label: "Incremental build state",
          status: "skipped",
          message: "No incremental build state yet.",
        },
      };
    }
    return {
      statePath,
      result: {
        id: "build-state",
        label: "Incremental build state",
        status: "warning",
        message: "Invalid state will fall back to a full build.",
      },
    };
  } catch (error) {
    return {
      statePath,
      result: {
        id: "build-state",
        label: "Incremental build state",
        status: "error",
        message: "Could not read state.",
        cause: error,
      },
    };
  }
}

export function stateDirectoryPath(statePath: string): string {
  return path.dirname(statePath);
}
