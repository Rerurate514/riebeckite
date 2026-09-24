import type { Diagnostic, DiagnosticCode } from "@riebeckite/core";
import type { DiagnosticsReport, DiagnosticsSummary } from "./types.js";

const SEVERITY_ORDER: Record<Diagnostic["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export class DiagnosticsFailure extends Error {
  constructor(public readonly report: DiagnosticsReport) {
    super(
      `diagnostics failed: ${report.summary.error} error(s) found (${report.summary.total} diagnostic(s) total)`,
    );
    this.name = "DiagnosticsFailure";
  }
}

export function buildReport(diagnostics: Diagnostic[]): DiagnosticsReport {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];
  const infos: Diagnostic[] = [];
  for (const diagnostic of diagnostics) {
    switch (diagnostic.severity) {
      case "error":
        errors.push(diagnostic);
        break;
      case "warning":
        warnings.push(diagnostic);
        break;
      default:
        infos.push(diagnostic);
        break;
    }
  }

  return {
    diagnostics,
    errors,
    warnings,
    infos,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    summary: summarize(diagnostics),
    byCode: groupByCode(diagnostics),
  };
}

export function summarize(diagnostics: Diagnostic[]): DiagnosticsSummary {
  let error = 0;
  let warning = 0;
  let info = 0;
  for (const diagnostic of diagnostics) {
    switch (diagnostic.severity) {
      case "error":
        error++;
        break;
      case "warning":
        warning++;
        break;
      default:
        info++;
        break;
    }
  }
  return { total: diagnostics.length, error, warning, info };
}

export function groupByCode(
  diagnostics: Diagnostic[],
): Map<DiagnosticCode, Diagnostic[]> {
  const byCode = new Map<DiagnosticCode, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    const group = byCode.get(diagnostic.code) ?? [];
    group.push(diagnostic);
    byCode.set(diagnostic.code, group);
  }
  return byCode;
}

export function assertNoErrors(report: DiagnosticsReport): void {
  if (report.hasErrors) throw new DiagnosticsFailure(report);
}

export function formatDiagnostics(
  input: Diagnostic[] | DiagnosticsReport,
  options: { color?: boolean } = {},
): string {
  const report = Array.isArray(input) ? buildReport(input) : input;
  if (report.diagnostics.length === 0) return "No diagnostics found.";

  const useColor = options.color ?? hasColorSupport();
  const color = useColor ? ansiColors : noColors;
  const lines: string[] = [];

  const summary = report.summary;
  lines.push(
    `${color.bold}${color.error}${summary.error} errors${color.reset}, ` +
      `${color.yellow}${summary.warning} warnings${color.reset}, ` +
      `${color.cyan}${summary.info} infos${color.reset} ` +
      `${color.dim}(${summary.total} total)${color.reset}`,
  );
  lines.push("");

  const ordered = [...report.diagnostics].sort(compareDiagnostics);
  for (const diagnostic of ordered) {
    const icon = {
      error: `${color.error}✖`,
      warning: `${color.yellow}⚠`,
      info: `${color.cyan}ℹ`,
    }[diagnostic.severity];
    const location = [
      diagnostic.filePath ?? "",
      diagnostic.line != null
        ? `:${diagnostic.line}${diagnostic.column != null ? `:${diagnostic.column}` : ""}`
        : "",
    ].join("");

    lines.push(`${icon} ${color.reset}[${diagnostic.code}] ${location}`);
    lines.push(`    ${diagnostic.message}`);
    if (diagnostic.target) {
      lines.push(`    ${color.dim}target: ${diagnostic.target}${color.reset}`);
    }
    if (diagnostic.suggestion) {
      lines.push(`    ${color.cyan}→ ${diagnostic.suggestion}${color.reset}`);
    }
  }

  return lines.join("\n");
}

function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (severityDiff !== 0) return severityDiff;
  const fileDiff = (a.filePath ?? "").localeCompare(b.filePath ?? "");
  if (fileDiff !== 0) return fileDiff;
  const lineDiff = (a.line ?? 0) - (b.line ?? 0);
  if (lineDiff !== 0) return lineDiff;
  return (a.column ?? 0) - (b.column ?? 0);
}

function hasColorSupport(): boolean {
  if (typeof process === "undefined") return false;
  return Boolean(process.stdout?.isTTY);
}

const ansiColors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  error: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const noColors = {
  reset: "",
  bold: "",
  dim: "",
  error: "",
  yellow: "",
  cyan: "",
};
