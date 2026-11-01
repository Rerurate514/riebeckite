import {
  type ContentAssetInspection,
  ContentManager,
  inspectContentAssets,
} from "@riebeckite/core";
import {
  collectDevelopmentDiagnostics,
  createDiagnosticFromError,
  type DevelopmentDiagnostic,
  type DevelopmentDiagnosticReport,
  filterDevelopmentDiagnostics,
  sortDevelopmentDiagnostics,
  summarizeDevelopmentDiagnostics,
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

function mergeDoctorDiagnostics(
  report: DevelopmentDiagnosticReport,
  additions: readonly DevelopmentDiagnostic[],
): DevelopmentDiagnosticReport {
  if (additions.length === 0) return report;
  const diagnostics = sortDevelopmentDiagnostics([
    ...report.diagnostics,
    ...additions,
  ]);
  return {
    ...report,
    diagnostics,
    summary: summarizeDevelopmentDiagnostics(diagnostics),
  };
}

function assetDiagnostics(
  report: DevelopmentDiagnosticReport,
  inspection: ContentAssetInspection,
): readonly DevelopmentDiagnostic[] {
  const reportedUnused = new Set(
    report.diagnostics
      .filter((diagnostic) => diagnostic.code === "UNUSED_ASSET")
      .map((diagnostic) => diagnostic.subject.value),
  );
  const diagnostics: DevelopmentDiagnostic[] = [];
  for (const asset of inspection.assets) {
    if (asset.usage === "unused" && !reportedUnused.has(asset.path)) {
      diagnostics.push({
        code: "ASSET_UNUSED",
        category: "content",
        severity: "warning",
        message: `${asset.path} is not referenced by any note.`,
        subject: { kind: "content", value: asset.path },
        location: { file: asset.path },
        details: `${formatBytes(asset.size)} ${asset.kind} asset. ${asset.reasons.join("; ")}`,
        fix: {
          kind: "review",
          description:
            "Reference the asset from content or remove it. Nothing is deleted automatically.",
        },
      });
    }
    if (asset.usage === "possibly-unused") {
      diagnostics.push({
        code: "ASSET_POSSIBLY_UNUSED",
        category: "content",
        severity: "warning",
        message: `${asset.path} may not be used by published content.`,
        subject: { kind: "content", value: asset.path },
        location: { file: asset.path },
        details: asset.reasons.join("; "),
        fix: {
          kind: "review",
          description:
            "Confirm the reference is intentional, for example by moving it into published content.",
        },
      });
    }
  }
  for (const group of inspection.duplicates) {
    diagnostics.push({
      code: "ASSET_DUPLICATE",
      category: "content",
      severity: "warning",
      message: `${group.paths.length} assets have identical content.`,
      subject: { kind: "content", value: group.paths[0] },
      location: { file: group.paths[0] },
      details: `${formatBytes(group.size)} each, SHA-256 ${group.hash}. ${group.paths.join(", ")}`,
      fix: {
        kind: "review",
        description:
          "Choose one copy and update references. Nothing is deleted automatically.",
      },
    });
  }
  for (const optimization of inspection.optimizations) {
    diagnostics.push({
      code:
        optimization.kind === "large" ? "ASSET_LARGE" : "ASSET_LEGACY_FORMAT",
      category: "content",
      severity: "info",
      message: `${optimization.path} is ${formatBytes(optimization.size)}.`,
      subject: { kind: "content", value: optimization.path },
      location: { file: optimization.path },
      details: optimization.recommendation,
      fix: { kind: "manual", description: optimization.recommendation },
    });
  }
  return diagnostics;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
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
    const report = await collectDevelopmentDiagnostics({
      config: project.config,
      content,
    });
    let assets: ContentAssetInspection;
    try {
      assets = await inspectContentAssets(await content.getManifest(), source);
    } catch (error) {
      const diagnostic = createDiagnosticFromError(
        "content",
        "ASSET_INSPECTION_FAILED",
        "Asset inspection failed.",
        error,
      );
      return mergeDoctorDiagnostics(report, [diagnostic]);
    }
    return mergeDoctorDiagnostics(report, assetDiagnostics(report, assets));
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
