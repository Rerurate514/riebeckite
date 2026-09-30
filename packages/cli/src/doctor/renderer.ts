import { renderCliError } from "../error_renderer.js";
import type { DoctorCheckResult } from "./types.js";

const statusMarker = {
  ok: "✓",
  warning: "⚠",
  error: "✗",
  skipped: "-",
} as const;

export function renderDoctorResults(
  results: readonly DoctorCheckResult[],
): string {
  const lines = ["Riebeckite Doctor", ""];
  for (const result of results) {
    lines.push(result.label);
    lines.push(
      `${statusMarker[result.status]} ${result.message ?? result.status}`,
    );
    for (const detail of result.details ?? []) lines.push(`  ${detail}`);
    if (result.cause !== undefined) {
      lines.push(`  ${renderCliError(result.cause).replace(/\n/g, "\n  ")}`);
    }
  }

  const errors = results.filter((result) => result.status === "error").length;
  const warnings = results.filter(
    (result) => result.status === "warning",
  ).length;
  lines.push("", "Summary", `${warnings} warnings`, `${errors} errors`);
  return lines.join("\n");
}
