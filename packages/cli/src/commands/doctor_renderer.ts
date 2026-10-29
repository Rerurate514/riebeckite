import type {
  DevelopmentDiagnosticCategory,
  DevelopmentDiagnosticReport,
} from "@riebeckite/diagnostics";

const categories: readonly DevelopmentDiagnosticCategory[] = [
  "environment",
  "configuration",
  "plugins",
  "content",
  "output",
  "theme",
];

export function renderDoctorReport(
  report: DevelopmentDiagnosticReport,
  options: {
    readonly explain?: boolean;
    readonly fix?: boolean;
    readonly dryRun?: boolean;
  } = {},
): string {
  const lines = ["Riebeckite Doctor 2.0", ""];
  for (const category of categories) {
    const diagnostics = report.diagnostics.filter(
      (diagnostic) => diagnostic.category === category,
    );
    const errors = diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    );
    const warnings = diagnostics.filter(
      (diagnostic) => diagnostic.severity === "warning",
    );
    const unavailable =
      diagnostics.length > 0 &&
      diagnostics.every(
        (diagnostic) =>
          diagnostic.status === "unavailable" ||
          diagnostic.code.endsWith("_UNAVAILABLE"),
      );
    const status =
      errors.length > 0
        ? "ERROR"
        : warnings.length > 0
          ? "WARNING"
          : unavailable
            ? "SKIPPED"
            : "PASS";
    lines.push(`${status} ${category} (${diagnostics.length})`);
    for (const diagnostic of diagnostics) {
      const location = diagnostic.location?.file
        ? ` (${diagnostic.location.file}${diagnostic.location.line ? `:${diagnostic.location.line}` : ""})`
        : "";
      lines.push(`  [${diagnostic.code}] ${diagnostic.message}${location}`);
      if (options.explain) {
        lines.push(`    Fingerprint: ${diagnostic.fingerprint ?? "legacy"}`);
        if (diagnostic.cause) lines.push(`    Cause: ${diagnostic.cause}`);
        if (diagnostic.details)
          lines.push(`    Details: ${diagnostic.details}`);
        if (diagnostic.fix)
          lines.push(
            `    Fix (${diagnostic.fix.kind}): ${diagnostic.fix.description}`,
          );
      }
    }
  }
  lines.push(
    "",
    "Summary",
    `${report.summary.errors} errors`,
    `${report.summary.warnings} warnings`,
    `${report.summary.info} info`,
    ...(report.summary.unavailable
      ? [`${report.summary.unavailable} unavailable`]
      : []),
    ...(report.summary.byCode
      ? [
          "",
          "By code",
          ...Object.entries(report.summary.byCode).map(
            ([code, count]) => `  ${code} ${count}`,
          ),
        ]
      : []),
  );
  if (options.fix) {
    lines.push(
      "",
      options.dryRun
        ? "Dry run: no safe automatic fixes are available."
        : "No safe automatic fixes are available.",
    );
  }
  return lines.join("\n");
}
