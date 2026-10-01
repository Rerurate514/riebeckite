import {
  collectConfigDeprecationDiagnostics,
  type Diagnostic,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { DoctorCheckResult } from "../types.js";

export function checkDeprecations(
  config: ResolvedRiebeckiteConfig | undefined,
  diagnostics: readonly Diagnostic[] = config
    ? collectConfigDeprecationDiagnostics(config)
    : [],
): DoctorCheckResult {
  if (!config) {
    return {
      id: "deprecations",
      label: "Deprecated usage",
      status: "skipped",
      message: "Skipped because configuration is unavailable.",
    };
  }

  if (diagnostics.length === 0) {
    return {
      id: "deprecations",
      label: "Deprecated usage",
      status: "ok",
      message: "No deprecated usage detected.",
    };
  }

  return {
    id: "deprecations",
    label: "Deprecated usage",
    status: "warning",
    message: `${diagnostics.length} deprecated usage warning(s).`,
    details: diagnostics.flatMap(formatDiagnosticDetails),
  };
}

function formatDiagnosticDetails(diagnostic: Diagnostic): string[] {
  return [
    ...diagnostic.message.split("\n"),
    ...(diagnostic.suggestion ? [`Suggestion: ${diagnostic.suggestion}`] : []),
  ];
}
