import type {
  ApiLifecycleDefinition,
  ContentManager,
  Diagnostic,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { collectApiLifecycleDiagnostics } from "./api.js";
import {
  compareDiagnostics,
  fromCoreDiagnostic,
  skipped,
} from "./collect_output_plan.js";
import {
  collectContentDiagnostics,
  collectOutputDiagnostics,
  configurationDiagnostics,
  environmentDiagnostics,
  pluginDiagnostics,
  themeDiagnostics,
} from "./collect_sources.js";
import { createDiagnosticFingerprint } from "./fingerprint.js";
import type {
  DevelopmentDiagnostic,
  DevelopmentDiagnosticCategory,
  DevelopmentDiagnosticReport,
  DevelopmentDiagnosticSeverity,
} from "./model.js";

export {
  createDiagnosticFromError,
  diagnoseOutputPlan,
} from "./collect_output_plan.js";

type InspectableContent = Pick<
  ContentManager,
  "inspect" | "getOutputChangeSet"
>;

export type DevelopmentDiagnosticsInput = {
  readonly config: ResolvedRiebeckiteConfig;
  readonly content?: InspectableContent;
  readonly contentDiagnostics?: readonly Diagnostic[];
  readonly actualOutputPaths?: Iterable<string>;
  readonly revision?: number;
  readonly includeOutput?: boolean;
  readonly apiLifecycle?: readonly ApiLifecycleDefinition[];
};

export async function collectDevelopmentDiagnostics(
  input: DevelopmentDiagnosticsInput,
): Promise<DevelopmentDiagnosticReport> {
  const diagnostics: DevelopmentDiagnostic[] = [
    ...environmentDiagnostics(),
    ...configurationDiagnostics(input.config),
    ...pluginDiagnostics(input.config),
    ...themeDiagnostics(input.config),
    ...collectApiLifecycleDiagnostics(input.config, input.apiLifecycle),
  ];
  if (input.contentDiagnostics) {
    diagnostics.push(...input.contentDiagnostics.map(fromCoreDiagnostic));
  } else if (input.content) {
    await collectContentDiagnostics(input.content, diagnostics);
    if (input.includeOutput !== false) {
      await collectOutputDiagnostics(
        input.content,
        input.actualOutputPaths,
        diagnostics,
      );
    }
  } else {
    diagnostics.push(
      skipped(
        "content",
        "CONTENT_UNAVAILABLE",
        "Content inspection is unavailable.",
      ),
    );
    if (input.includeOutput !== false) {
      diagnostics.push(
        skipped(
          "output",
          "OUTPUT_UNAVAILABLE",
          "Output inspection is unavailable.",
        ),
      );
    }
  }
  const ordered = sortDevelopmentDiagnostics(diagnostics);
  return {
    version: 1,
    revision: input.revision ?? 0,
    diagnostics: ordered,
    summary: summarizeDevelopmentDiagnostics(ordered),
  };
}

export function sortDevelopmentDiagnostics(
  diagnostics: readonly DevelopmentDiagnostic[],
): readonly DevelopmentDiagnostic[] {
  const unique = new Map<string, DevelopmentDiagnostic>();
  for (const diagnostic of diagnostics) {
    const fingerprint =
      diagnostic.fingerprint ?? createDiagnosticFingerprint(diagnostic);
    const normalized = { ...diagnostic, fingerprint };
    unique.set(JSON.stringify(normalized), normalized);
  }
  return [...unique.values()].sort(compareDiagnostics);
}

export function summarizeDevelopmentDiagnostics(
  diagnostics: readonly DevelopmentDiagnostic[],
): DevelopmentDiagnosticReport["summary"] {
  const byCategory: Partial<Record<DevelopmentDiagnosticCategory, number>> = {};
  const byCode: Record<string, number> = {};
  let errors = 0;
  let warnings = 0;
  let info = 0;
  let unavailable = 0;
  let skipped = 0;
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === "error") errors += 1;
    if (diagnostic.severity === "warning") warnings += 1;
    if (diagnostic.severity === "info") info += 1;
    if (diagnostic.status === "unavailable") unavailable += 1;
    if (diagnostic.status === "skipped") skipped += 1;
    byCategory[diagnostic.category] =
      (byCategory[diagnostic.category] ?? 0) + 1;
    byCode[diagnostic.code] = (byCode[diagnostic.code] ?? 0) + 1;
  }
  return { errors, warnings, info, unavailable, skipped, byCategory, byCode };
}

export function filterDevelopmentDiagnostics(
  report: DevelopmentDiagnosticReport,
  options: {
    readonly codes?: readonly string[];
    readonly severities?: readonly DevelopmentDiagnosticSeverity[];
  },
): DevelopmentDiagnosticReport {
  const codes = options.codes?.length ? new Set(options.codes) : undefined;
  const severities = options.severities?.length
    ? new Set(options.severities)
    : undefined;
  const diagnostics = report.diagnostics.filter(
    (diagnostic) =>
      (!codes || codes.has(diagnostic.code)) &&
      (!severities || severities.has(diagnostic.severity)),
  );
  return {
    ...report,
    diagnostics,
    summary: summarizeDevelopmentDiagnostics(diagnostics),
  };
}
