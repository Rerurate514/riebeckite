import fs from "node:fs/promises";
import path from "node:path";
import type { RiebeckiteApplication } from "../../application_root";
import type { DoctorCheckResult } from "../types";

export async function checkEnvironment(
  application: RiebeckiteApplication,
): Promise<readonly DoctorCheckResult[]> {
  return await Promise.all([
    checkApplicationRoot(application),
    checkConfigurationFile(application),
  ]);
}

export async function checkStateDirectory(
  statePath: string,
): Promise<DoctorCheckResult> {
  const directory = path.dirname(statePath);
  try {
    const stat = await fs.stat(directory);
    if (!stat.isDirectory()) {
      return {
        id: "state-directory",
        label: "State directory",
        status: "error",
        message: "The incremental build state parent is not a directory.",
      };
    }
    await fs.access(directory, fs.constants.R_OK | fs.constants.W_OK);
    return {
      id: "state-directory",
      label: "State directory",
      status: "ok",
      message: "Available for build-time state.",
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return {
        id: "state-directory",
        label: "State directory",
        status: "skipped",
        message: "Will be created by the first build.",
      };
    }
    return unexpectedCheckFailure("state-directory", "State directory", error);
  }
}

async function checkApplicationRoot(
  application: RiebeckiteApplication,
): Promise<DoctorCheckResult> {
  try {
    if (!(await fs.stat(application.applicationRoot)).isDirectory()) {
      return {
        id: "application-root",
        label: "Application root",
        status: "error",
        message: "Resolved path is not a directory.",
      };
    }
    return {
      id: "application-root",
      label: "Application root",
      status: "ok",
      message: "Detected.",
    };
  } catch (error) {
    return unexpectedCheckFailure("application-root", "Application root", error);
  }
}

async function checkConfigurationFile(
  application: RiebeckiteApplication,
): Promise<DoctorCheckResult> {
  try {
    if (!(await fs.stat(application.configPath)).isFile()) {
      return {
        id: "configuration-file",
        label: "Configuration file",
        status: "error",
        message: "Resolved path is not a file.",
      };
    }
    return {
      id: "configuration-file",
      label: "Configuration file",
      status: "ok",
      message: path.basename(application.configPath),
    };
  } catch (error) {
    return unexpectedCheckFailure("configuration-file", "Configuration file", error);
  }
}

function unexpectedCheckFailure(
  id: string,
  label: string,
  cause: unknown,
): DoctorCheckResult {
  return {
    id,
    label,
    status: "error",
    message: "Unexpected diagnostic failure.",
    cause,
  };
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
