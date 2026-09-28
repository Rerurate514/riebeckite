import type {
  ProfileReport,
  ProfileSpanAggregate,
} from "./profile_trace_sink.js";

const contentLabels: Readonly<Record<string, string>> = {
  "content.scan": "Scan",
  "content.process": "Process",
  "content.manifest": "Manifest",
  "content.graph": "Graph",
};

export function renderProfile(report: ProfileReport, failed = false): string {
  const lines = [
    failed ? "Riebeckite Partial Build Profile" : "Riebeckite Build Profile",
  ];
  if (report.totalDurationMs !== undefined) {
    lines.push("", row("Total", formatDuration(report.totalDurationMs)));
  }
  appendContent(lines, report);
  appendIntegrations(lines, report);
  appendPlugins(lines, report);
  appendIncremental(lines, report);
  appendCache(lines, report);
  appendDiagnostics(lines, report);
  appendSlowOperations(lines, report);
  return lines.join("\n");
}

function appendIntegrations(lines: string[], report: ProfileReport): void {
  if (report.integrations.size === 0) return;
  lines.push("", "Integrations");
  for (const [name, duration] of report.integrations) {
    appendSpanAggregate(lines, name.replace("integration.", ""), duration);
  }
}

function appendContent(lines: string[], report: ProfileReport): void {
  if (report.content.size === 0) return;
  lines.push("", "Content");
  for (const name of Object.keys(contentLabels)) {
    const duration = report.content.get(name);
    if (!duration) continue;
    appendSpanAggregate(lines, contentLabels[name] ?? name, duration);
  }
}

function appendPlugins(lines: string[], report: ProfileReport): void {
  if (report.plugins.length === 0) return;
  lines.push("", "Plugins (cumulative work)");
  for (const plugin of report.plugins) {
    lines.push(
      row(
        `${plugin.name} (${plugin.duration.calls} calls)`,
        formatDuration(plugin.duration.cumulativeDurationMs),
        2,
      ),
    );
  }
}

function appendSpanAggregate(
  lines: string[],
  label: string,
  duration: ProfileSpanAggregate,
): void {
  if (duration.wallDurationMs !== undefined) {
    lines.push(row(label, formatDuration(duration.wallDurationMs), 2));
    return;
  }
  lines.push(row(`${label} (${duration.calls} calls)`, "", 2));
  lines.push(
    row("Cumulative", formatDuration(duration.cumulativeDurationMs), 4),
  );
  lines.push(row("Average", formatDuration(duration.averageDurationMs), 4));
  lines.push(row("Max", formatDuration(duration.maxDurationMs), 4));
}

function appendIncremental(lines: string[], report: ProfileReport): void {
  if (!report.incremental) return;
  lines.push("", "Incremental");
  lines.push(row("Added", String(report.incremental.added), 2));
  lines.push(row("Changed", String(report.incremental.changed), 2));
  lines.push(row("Removed", String(report.incremental.removed), 2));
  lines.push(row("Unchanged", String(report.incremental.unchanged), 2));
  lines.push(row("Affected", String(report.incremental.affected), 2));
}

function appendCache(lines: string[], report: ProfileReport): void {
  if (!report.cache) return;
  lines.push("", "Cache");
  lines.push(row("Hits", String(report.cache.hits), 2));
  lines.push(row("Misses", String(report.cache.misses), 2));
  if (report.cache.hitRate !== undefined) {
    lines.push(
      row("Hit rate", `${(report.cache.hitRate * 100).toFixed(1)}%`, 2),
    );
  }
}

function appendDiagnostics(lines: string[], report: ProfileReport): void {
  if (!report.diagnostics) return;
  lines.push("", "Diagnostics");
  lines.push(row("Run", formatDuration(report.diagnostics.durationMs), 2));
  if (report.diagnostics.calls > 1) {
    lines.push(row("Calls", String(report.diagnostics.calls), 2));
  }
  lines.push(row("Total", String(report.diagnostics.total), 2));
  lines.push(row("Errors", String(report.diagnostics.errors), 2));
  lines.push(row("Warnings", String(report.diagnostics.warnings), 2));
  lines.push(row("Info", String(report.diagnostics.info), 2));
}

function appendSlowOperations(lines: string[], report: ProfileReport): void {
  if (report.slowestOperations.length === 0) return;
  lines.push("", "Slowest operations");
  for (const operation of report.slowestOperations) {
    lines.push(
      row(
        `${operation.plugin} render`,
        `${formatDuration(operation.durationMs)}  ${operation.contentPath}`,
        2,
      ),
    );
  }
}

function row(label: string, value: string, indent = 0): string {
  return `${" ".repeat(indent)}${label.padEnd(28 - indent)}${value}`;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1) return `${durationMs.toFixed(2)}ms`;
  if (durationMs < 1_000)
    return `${durationMs.toFixed(durationMs < 10 ? 1 : 0)}ms`;
  return `${(durationMs / 1_000).toFixed(2)}s`;
}
