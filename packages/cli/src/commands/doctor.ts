import { ContentManager } from "@riebeckite/core";
import {
  collectDevelopmentDiagnostics,
  createDiagnosticFromError,
  type DevelopmentDiagnosticReport,
  filterDevelopmentDiagnostics,
} from "@riebeckite/diagnostics";
import type { RiebeckiteProject } from "../application_root.js";
import { resolveProjectContentSource } from "../content_source.js";
import { renderDoctorReport } from "./doctor_renderer.js";

export async function runDoctorCommand(
  project: RiebeckiteProject,
  options: {
    readonly json?: boolean;
    readonly explain?: boolean;
    readonly fix?: boolean;
    readonly dryRun?: boolean;
    readonly failOn?: "error" | "warning" | "info";
    readonly codes?: readonly string[];
  } = {},
): Promise<boolean> {
  const report = filterDevelopmentDiagnostics(
    await collectDoctorReport(project),
    {
      codes: options.codes,
    },
  );
  console.log(
    options.json
      ? JSON.stringify(report)
      : renderDoctorReport(report, {
          explain: options.explain,
          fix: options.fix,
          dryRun: options.dryRun,
        }),
  );
  return !report.diagnostics.some((diagnostic) =>
    meetsSeverityThreshold(diagnostic.severity, options.failOn ?? "error"),
  );
}

function meetsSeverityThreshold(
  severity: "error" | "warning" | "info",
  threshold: "error" | "warning" | "info",
): boolean {
  return (
    ({ info: 0, warning: 1, error: 2 }[severity] ?? 0) >=
    ({ info: 0, warning: 1, error: 2 }[threshold] ?? 2)
  );
}

async function collectDoctorReport(
  project: RiebeckiteProject,
): Promise<DevelopmentDiagnosticReport> {
  try {
    const source = resolveProjectContentSource(project.config, project);
    const content = new ContentManager(source, project.config.content.exclude, {
      config: project.config,
    });
    return await collectDevelopmentDiagnostics({
      config: project.config,
      content,
    });
  } catch (error) {
    const diagnostic = createDiagnosticFromError(
      "configuration",
      "DOCTOR_EXECUTION_FAILED",
      "Doctor could not prepare project diagnostics.",
      error,
    );
    return {
      version: 1,
      revision: 0,
      diagnostics: [diagnostic],
      summary: { errors: 1, warnings: 0, info: 0 },
    };
  }
}
