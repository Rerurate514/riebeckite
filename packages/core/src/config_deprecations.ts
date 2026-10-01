import {
  createDeprecationDiagnostic,
  type DeprecationNotice,
} from "./deprecation.js";
import type { Diagnostic } from "./types/diagnostic.js";
import type { RiebeckiteConfig } from "./types/riebeckite_config.js";

export type ConfigDeprecationNotice = DeprecationNotice & {
  readonly kind: "config";
  readonly path: string;
};

const configDeprecations: readonly ConfigDeprecationNotice[] = [];

export function collectConfigDeprecationDiagnostics(
  config: RiebeckiteConfig,
  notices: readonly ConfigDeprecationNotice[] = configDeprecations,
): Diagnostic[] {
  return notices
    .filter((notice) => hasConfigPath(config, notice.path))
    .map(createDeprecationDiagnostic);
}

function hasConfigPath(config: RiebeckiteConfig, path: string): boolean {
  let value: unknown = config;
  for (const segment of path.split(".")) {
    if (!isRecord(value) || !(segment in value)) return false;
    value = value[segment];
  }
  return value !== undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
